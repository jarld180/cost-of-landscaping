"""
Main entry point for the stealthy crawler worker.

Flow:
1. Recover orphaned jobs (at startup)
2. Start health check server in background thread
3. Start job processor polling loop
"""

import os
import sys
import logging
import threading
from supabase import create_client, Client

from .job_processor import StealthyCrawlJobProcessor
from .health import HealthServer


def main():
    """Main entry point."""
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    # Load environment variables
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
        sys.exit(1)
    
    # Create Supabase client
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Create job processor
    processor = StealthyCrawlJobProcessor(supabase_url, supabase_key)
    
    # Start health check server in background thread
    health_server = HealthServer(port=8080, supabase_client=supabase)
    health_thread = threading.Thread(target=health_server.start, daemon=True)
    health_thread.start()
    logger.info("Health check server started in background")
    
    # Start job processor (blocks until shutdown)
    logger.info("Starting job processor")
    processor.start()
    
    # Cleanup
    health_server.stop()
    logger.info("Worker shutdown complete")


if __name__ == '__main__':
    main()
