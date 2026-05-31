#!/usr/bin/env python3
"""
One-shot crawl script for local testing.

Usage:
    # Direct crawl (no Supabase, just test the crawler):
    uv run python scripts/oneshot_crawl.py --url https://example.com
    
    # Create a job and process it through Supabase:
    uv run python scripts/oneshot_crawl.py --url https://example.com --contractor-id <uuid>
    
    # With debug output:
    DEBUG_CRAWL=1 uv run python scripts/oneshot_crawl.py --url https://example.com
    
    # Process existing pending jobs:
    uv run python scripts/oneshot_crawl.py --process-pending

Environment:
    Source .env.local before running:
    export $(cat .env.local | xargs)
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime, timezone

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.crawler import StealthyCrawler, CrawlConfig
from src.job_processor import StealthyCrawlJobProcessor


def direct_crawl(url: str, debug: bool = False, headed: bool = False) -> dict:
    """Crawl a URL directly without Supabase."""
    config = CrawlConfig(
        max_pages=6,
        max_depth=2,
        debug=debug or os.environ.get('DEBUG_CRAWL') == '1',
        headed=headed or os.environ.get('CRAWL_HEADED') == '1',
    )
    
    crawler = StealthyCrawler(config)
    
    print(f"\n{'='*60}")
    print(f"Direct crawl: {url}")
    print(f"Config: max_pages={config.max_pages}, max_depth={config.max_depth}, debug={config.debug}")
    print(f"{'='*60}\n")
    
    result = crawler.crawl(url, config=config)
    
    print(f"\n{'='*60}")
    print("CRAWL RESULT")
    print(f"{'='*60}")
    print(f"Success: {result.get('success')}")
    print(f"Pages crawled: {result.get('pagesCrawled', 0)}")
    print(f"Content length: {len(result.get('content', ''))}")
    print(f"Blocked: {result.get('blockedByBotProtection', False)}")
    
    if result.get('error'):
        print(f"Error: {result.get('error')}")
    
    contacts = result.get('extractedContacts', {})
    if contacts:
        print(f"\nExtracted Contacts:")
        print(f"  Emails: {contacts.get('emails', [])}")
        print(f"  Phones: {contacts.get('phones', [])}")
        print(f"  Social: {list(contacts.get('socialLinks', {}).keys())}")
    
    services = result.get('detectedServiceTypes', [])
    if services:
        print(f"\nDetected Services:")
        for svc in services[:5]:
            print(f"  - {svc['slug']}: {svc['confidence']:.0%}")
    
    images = result.get('collectedImages', [])
    if images:
        print(f"\nCollected Images: {len(images)}")
        for img in images[:5]:
            print(f"  - {img.get('url', '')[:80]}...")
    
    print(f"{'='*60}\n")
    
    return result


def create_and_process_job(url: str, contractor_id: str) -> dict:
    """Create a stealthy_crawl job and process it."""
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        print("Run: export $(cat .env.local | xargs)")
        sys.exit(1)
    
    from supabase import create_client
    supabase = create_client(supabase_url, supabase_key)
    
    print(f"\n{'='*60}")
    print(f"Creating job for contractor {contractor_id}")
    print(f"URL: {url}")
    print(f"{'='*60}\n")
    
    # Fetch service type keywords for detection (keywords column may not exist in local)
    try:
        service_types_result = supabase.table('service_types').select('slug, keywords').execute()
        service_type_keywords = [
            {'slug': st['slug'], 'keywords': st.get('keywords', [])}
            for st in (service_types_result.data or [])
            if st.get('keywords')
        ]
    except Exception:
        # Fallback if keywords column doesn't exist
        service_type_keywords = []
        print("Note: service_types.keywords not available, proceeding without keyword detection")
    
    # Create job
    job_payload = {
        'contractorId': contractor_id,
        'websiteUrl': url,
        'serviceTypeKeywords': service_type_keywords,
        'crawlOptions': {
            'maxPages': 6,
            'maxDepth': 2,
            'debug': os.environ.get('DEBUG_CRAWL') == '1',
        }
    }
    
    job_result = supabase.table('background_jobs').insert({
        'job_type': 'stealthy_crawl',
        'status': 'pending',
        'payload': job_payload,
        'max_attempts': 3,
        'created_by': None,
    }).execute()
    
    job_id = job_result.data[0]['id']
    print(f"Created job: {job_id}")
    
    # Process the job
    processor = StealthyCrawlJobProcessor(supabase_url, supabase_key)
    processor._process_next_job()
    
    # Fetch result
    result = supabase.table('background_jobs').select('*').eq('id', job_id).single().execute()
    
    print(f"\n{'='*60}")
    print("JOB RESULT")
    print(f"{'='*60}")
    print(f"Status: {result.data.get('status')}")
    print(f"Attempts: {result.data.get('attempts')}")
    
    if result.data.get('result'):
        crawl_result = result.data['result'].get('crawlResult', {})
        print(f"Success: {crawl_result.get('success')}")
        print(f"Pages: {crawl_result.get('pagesCrawled')}")
        print(f"Content: {len(crawl_result.get('content', ''))} chars")
    
    if result.data.get('last_error'):
        print(f"Error: {result.data.get('last_error')}")
    
    print(f"{'='*60}\n")
    
    return result.data


def process_pending_jobs():
    """Process all pending stealthy_crawl jobs."""
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)
    
    from supabase import create_client
    supabase = create_client(supabase_url, supabase_key)
    
    # Check for pending jobs
    pending = supabase.table('background_jobs').select('id').eq('job_type', 'stealthy_crawl').eq('status', 'pending').execute()
    
    if not pending.data:
        print("No pending stealthy_crawl jobs found")
        return
    
    print(f"Found {len(pending.data)} pending jobs")
    
    processor = StealthyCrawlJobProcessor(supabase_url, supabase_key)
    
    for _ in range(len(pending.data)):
        processor._process_next_job()
    
    print("Done processing pending jobs")


def main():
    parser = argparse.ArgumentParser(description='One-shot crawl for local testing')
    parser.add_argument('--url', help='URL to crawl')
    parser.add_argument('--contractor-id', help='Contractor UUID (creates job if provided)')
    parser.add_argument('--process-pending', action='store_true', help='Process all pending jobs')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--headed', action='store_true', help='Use headed mode (for WSL2/local dev without Xvfb)')
    
    args = parser.parse_args()
    
    if args.debug:
        os.environ['DEBUG_CRAWL'] = '1'
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)
    
    if args.headed:
        os.environ['CRAWL_HEADED'] = '1'
    
    if args.process_pending:
        process_pending_jobs()
    elif args.url and args.contractor_id:
        create_and_process_job(args.url, args.contractor_id)
    elif args.url:
        direct_crawl(args.url, args.debug, args.headed)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
