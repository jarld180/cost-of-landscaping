"""
Supabase Job Processor for stealthy_crawl jobs.

Polls Supabase for pending stealthy_crawl jobs, claims them atomically,
calls the crawler, and stores results.

Enhanced with:
- Configurable crawl parameters from job payload
- Debug mode support (DEBUG_CRAWL=1)
- Verbose logging for step-by-step tracking
"""

import os
import signal
import sys
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from supabase import create_client, Client

from .crawler import StealthyCrawler, CrawlConfig, ServiceTypeKeyword


class StealthyCrawlJobProcessor:
    """
    Polls Supabase for stealthy_crawl jobs, processes them, and stores results.

    Uses atomic job claiming via RPC to prevent race conditions.
    Handles retries with exponential backoff.
    """

    # Constants (match TypeScript schema in job.schemas.ts)
    RETRY_DELAYS_MINUTES = [1, 5, 15]
    POLL_INTERVAL_SECONDS = 15
    ORPHAN_THRESHOLD_MINUTES = 30

    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize processor with Supabase client."""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.running = True
        self.current_job_id: Optional[str] = None
        
        # Create crawler with default config (can be overridden per-job)
        self.default_config = CrawlConfig.from_env()
        self.crawler = StealthyCrawler(self.default_config)

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        signal.signal(signal.SIGINT, self._handle_shutdown)

        # Setup logging
        log_level = logging.DEBUG if self.default_config.debug else logging.INFO
        logging.basicConfig(
            level=log_level,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        self.logger = logging.getLogger(__name__)
        
        self.logger.info(f"Initialized with config: max_pages={self.default_config.max_pages}, "
                        f"max_depth={self.default_config.max_depth}, debug={self.default_config.debug}")

    def start(self):
        """Start the job processing loop."""
        self.logger.info("Starting StealthyCrawlJobProcessor")

        # Recover orphaned jobs at startup
        self.recover_orphaned_jobs()

        # Main polling loop
        while self.running:
            try:
                self._process_next_job()
            except Exception as e:
                self.logger.error(f"Error in processing loop: {e}")

            time.sleep(self.POLL_INTERVAL_SECONDS)

        self.logger.info("StealthyCrawlJobProcessor stopped")

    def recover_orphaned_jobs(self):
        """
        Reset orphaned stealthy_crawl jobs at startup.

        ELIGIBILITY (ALL must match):
        - job_type = 'stealthy_crawl'
        - status = 'processing'
        - started_at < now() - INTERVAL '30 minutes'

        COLUMNS RESET:
        - status = 'pending'
        - started_at = NULL
        - last_error = 'Worker restarted - job was orphaned'
        - next_retry_at = NULL

        DOES NOT INCREMENT attempts (crash is not a retry)

        LOGGING: Log each recovered job to system_logs
        """
        threshold = (
            datetime.now(timezone.utc)
            - timedelta(minutes=self.ORPHAN_THRESHOLD_MINUTES)
        ).isoformat()

        # Step 1: SELECT orphaned job IDs first (supabase-py UPDATE doesn't return rows)
        select_result = (
            self.supabase.table("background_jobs")
            .select("id")
            .eq("job_type", "stealthy_crawl")
            .eq("status", "processing")
            .lt("started_at", threshold)
            .execute()
        )

        orphaned_ids = [job["id"] for job in (select_result.data or [])]

        if not orphaned_ids:
            self.logger.info("No orphaned jobs found")
            return

        self.logger.info(f"Recovering {len(orphaned_ids)} orphaned jobs")

        # Step 2: UPDATE using the selected IDs
        (
            self.supabase.table("background_jobs")
            .update(
                {
                    "status": "pending",
                    "started_at": None,
                    "last_error": "Worker restarted - job was orphaned",
                    "next_retry_at": None,
                }
            )
            .in_("id", orphaned_ids)
            .execute()
        )

        # Step 3: Log each recovered job to system_logs
        for job_id in orphaned_ids:
            (
                self.supabase.table("system_logs")
                .insert(
                    {
                        "log_type": "activity",
                        "category": "stealthy_crawl",
                        "action": "orphan_recovery",
                        "message": f"Reset orphaned job {job_id} to pending after worker restart",
                        "level": "warn",
                        "entity_type": "background_job",
                        "entity_id": job_id,
                    }
                )
                .execute()
            )
            self.logger.info(f"Recovered orphaned job {job_id}")

    def _process_next_job(self):
        """Claim and process next available job."""
        # Atomic claim via RPC
        result = self.supabase.rpc("claim_stealthy_crawl_job").execute()

        if not result.data or len(result.data) == 0:
            return  # No jobs available

        job = result.data[0]
        job_id = job["id"]
        payload = job["payload"]
        attempts = job["attempts"]  # POST-INCREMENT value from RPC
        max_attempts = job["max_attempts"]

        self.current_job_id = job_id
        self.logger.info(
            f"Processing job {job_id} (attempt {attempts}/{max_attempts})"
        )

        try:
            # Extract payload
            contractor_id = payload.get("contractorId")
            website_url = payload.get("websiteUrl")
            
            # Extract optional crawl config from payload
            crawl_options = payload.get("crawlOptions", {})
            
            # Extract service type keywords for detection
            raw_keywords = payload.get("serviceTypeKeywords", [])
            service_type_keywords = [
                ServiceTypeKeyword(slug=st["slug"], keywords=st.get("keywords", []))
                for st in raw_keywords
                if st.get("slug") and st.get("keywords")
            ]
            
            self.logger.info(
                f"Crawling {website_url} for contractor {contractor_id}"
            )
            if service_type_keywords:
                self.logger.debug(f"Service type keywords: {len(service_type_keywords)} types")
            
            # Build crawl config from payload options + defaults
            config = self._build_crawl_config(crawl_options)
            
            self.logger.debug(
                f"Crawl config: max_pages={config.max_pages}, max_depth={config.max_depth}, debug={config.debug}"
            )

            # Call crawler with config and service type keywords
            crawl_result = self.crawler.crawl(
                website_url, 
                config=config,
                service_type_keywords=service_type_keywords if service_type_keywords else None
            )

            # Log summary
            if crawl_result.get("success"):
                self.logger.info(
                    f"Crawl succeeded: pages={crawl_result.get('pagesCrawled')}, "
                    f"content_length={len(crawl_result.get('content', ''))}"
                )
                
                # Log extracted contacts if any
                contacts = crawl_result.get("extractedContacts", {})
                if contacts:
                    self.logger.info(
                        f"Extracted contacts: emails={contacts.get('emails', [])}, "
                        f"phones={contacts.get('phones', [])}, "
                        f"social={list(contacts.get('socialLinks', {}).keys())}"
                    )
                
                # Log detected service types if any
                detected_services = crawl_result.get("detectedServiceTypes", [])
                if detected_services:
                    top_services = [f"{s['slug']}({s['confidence']:.0%})" for s in detected_services[:5]]
                    self.logger.info(f"Detected service types: {', '.join(top_services)}")
            else:
                self.logger.warn(
                    f"Crawl failed: error={crawl_result.get('error')}, "
                    f"blocked={crawl_result.get('blockedByBotProtection')}"
                )

            # Store result
            self._handle_success(job_id, crawl_result)

        except Exception as e:
            self.logger.error(f"Job {job_id} failed: {e}")
            self._handle_failure(job_id, str(e), attempts, max_attempts)

        finally:
            self.current_job_id = None

    def _build_crawl_config(self, options: Dict[str, Any]) -> CrawlConfig:
        """Build crawl config from job options, falling back to defaults."""
        return CrawlConfig(
            max_pages=options.get("maxPages", self.default_config.max_pages),
            max_depth=options.get("maxDepth", self.default_config.max_depth),
            page_timeout_ms=options.get("pageTimeoutMs", self.default_config.page_timeout_ms),
            max_content_length=options.get("maxContentLength", self.default_config.max_content_length),
            max_consecutive_failures=options.get("maxConsecutiveFailures", self.default_config.max_consecutive_failures),
            # Human behavior simulation settings
            simulate_human=options.get("simulateHuman", self.default_config.simulate_human),
            scroll_pages=options.get("scrollPages", self.default_config.scroll_pages),
            mouse_movements=options.get("mouseMovements", self.default_config.mouse_movements),
            # Debug can be enabled via env OR payload
            debug=options.get("debug", self.default_config.debug),
        )

    def _handle_success(self, job_id: str, crawl_result: Dict[str, Any]):
        """
        Mark job as completed with result.

        Result structure (camelCase to match TypeScript):
        {
            "crawlResult": {
                "url": str,
                "success": bool,
                "content": str,
                "pagesCrawled": int,
                "error": Optional[str],
                "blockedByBotProtection": Optional[bool],
                "extractedContacts": Optional[dict]
            }
        }
        """
        (
            self.supabase.table("background_jobs")
            .update(
                {
                    "status": "completed",
                    "result": {"crawlResult": crawl_result},  # Wrap in crawlResult key
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", job_id)
            .execute()
        )

        self.logger.info(f"Job {job_id} completed successfully")

    def _handle_failure(
        self, job_id: str, error: str, attempts: int, max_attempts: int
    ):
        """Handle job failure with retry logic."""
        if attempts < max_attempts:
            # Schedule retry
            next_retry = self._calculate_next_retry_at(attempts)
            (
                self.supabase.table("background_jobs")
                .update(
                    {
                        "status": "pending",
                        "started_at": None,  # Reset for orphan detection
                        "last_error": error,
                        "next_retry_at": next_retry.isoformat(),
                    }
                )
                .eq("id", job_id)
                .execute()
            )

            self.logger.info(f"Job {job_id} scheduled for retry at {next_retry}")
        else:
            # Terminal failure
            (
                self.supabase.table("background_jobs")
                .update(
                    {
                        "status": "failed",
                        "last_error": error,
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("id", job_id)
                .execute()
            )

            self.logger.error(
                f"Job {job_id} failed permanently after {attempts} attempts"
            )

    def _calculate_next_retry_at(self, attempts: int) -> datetime:
        """
        Calculate next_retry_at based on attempts (post-increment value from RPC).

        Formula:
            delay_index = min(attempts - 1, len(RETRY_DELAYS_MINUTES) - 1)
            delay_minutes = RETRY_DELAYS_MINUTES[delay_index]
            next_retry_at = now() + timedelta(minutes=delay_minutes)

        Examples:
            attempts=1 -> index=0 -> delay=1min
            attempts=2 -> index=1 -> delay=5min
            attempts=3 -> index=2 -> delay=15min
            attempts=4 -> index=2 -> delay=15min (capped)
        """
        delay_index = min(attempts - 1, len(self.RETRY_DELAYS_MINUTES) - 1)
        delay_minutes = self.RETRY_DELAYS_MINUTES[delay_index]
        return datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)

    def _handle_shutdown(self, signum, frame):
        """Handle graceful shutdown on SIGTERM/SIGINT."""
        self.logger.info("Shutdown signal received")
        self.running = False

        # If currently processing a job, wait for it to finish
        if self.current_job_id:
            self.logger.info(
                f"Waiting for current job {self.current_job_id} to finish"
            )
            # The job will complete in the current iteration


def main():
    """Entry point for the job processor."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)

    processor = StealthyCrawlJobProcessor(supabase_url, supabase_key)
    processor.start()


if __name__ == "__main__":
    main()
