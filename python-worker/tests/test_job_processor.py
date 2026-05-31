"""
Unit tests for StealthyCrawlJobProcessor.

Tests verify:
- Atomic claiming via RPC
- Orphan recovery with SELECT-then-UPDATE pattern
- camelCase result storage
- Graceful shutdown
- Retry logic with exponential backoff
"""

import signal
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta


class TestStealthyCrawlJobProcessor:
    """Tests for StealthyCrawlJobProcessor."""

    @pytest.fixture
    def mock_supabase(self):
        """Mock Supabase client."""
        client = Mock()

        # Mock table operations - return chainable mock
        table_mock = Mock()
        client.table.return_value = table_mock

        # Mock RPC
        client.rpc.return_value = Mock(execute=Mock(return_value=Mock(data=[])))

        return client

    @pytest.fixture
    def processor(self, mock_supabase):
        """Create processor with mocked dependencies."""
        with patch("src.job_processor.create_client", return_value=mock_supabase), \
             patch("src.job_processor.StealthyCrawler") as mock_crawler_class, \
             patch("src.job_processor.signal.signal"):  # Don't actually register signals
            
            mock_crawler = Mock()
            mock_crawler_class.return_value = mock_crawler
            
            from src.job_processor import StealthyCrawlJobProcessor
            
            processor = StealthyCrawlJobProcessor(
                "https://test.supabase.co",
                "test-key"
            )
            processor.crawler = mock_crawler
            return processor

    def test_only_processes_stealthy_crawl(self, processor, mock_supabase):
        """Verify processor only claims stealthy_crawl jobs via RPC."""
        processor.supabase = mock_supabase
        
        # Mock RPC to return no jobs
        mock_supabase.rpc.return_value.execute.return_value.data = []

        processor._process_next_job()

        # Verify RPC was called with correct function name
        mock_supabase.rpc.assert_called_once_with("claim_stealthy_crawl_job")

    def test_atomic_claim_via_rpc(self, processor, mock_supabase):
        """Verify RPC is used for atomic claiming (not direct SELECT)."""
        processor.supabase = mock_supabase
        
        # Setup mock chain for update
        update_mock = Mock()
        eq_mock = Mock()
        eq_mock.execute.return_value = Mock()
        update_mock.eq.return_value = eq_mock
        mock_supabase.table.return_value.update.return_value = update_mock
        
        # Mock crawler to return success
        processor.crawler.crawl.return_value = {
            "url": "https://example.com",
            "success": True,
            "content": "Test content",
            "pagesCrawled": 1,
        }

        # First call returns job, second call returns empty (job already claimed)
        mock_supabase.rpc.return_value.execute.side_effect = [
            Mock(
                data=[
                    {
                        "id": "job-123",
                        "payload": {
                            "contractorId": "c-1",
                            "websiteUrl": "https://example.com",
                        },
                        "attempts": 1,
                        "max_attempts": 3,
                    }
                ]
            ),
            Mock(data=[]),  # Second call returns empty
        ]

        processor._process_next_job()
        processor._process_next_job()

        # Verify RPC was called twice
        assert mock_supabase.rpc.call_count == 2

    def test_stores_camel_case_result(self, processor, mock_supabase):
        """Verify result is stored with camelCase keys in crawlResult wrapper."""
        processor.supabase = mock_supabase

        crawl_result = {
            "url": "https://example.com",
            "success": True,
            "content": "Test content",
            "pagesCrawled": 5,  # camelCase
        }

        # Setup mock chain for update
        update_mock = Mock()
        eq_mock = Mock()
        eq_mock.execute.return_value = Mock()
        update_mock.eq.return_value = eq_mock
        mock_supabase.table.return_value.update.return_value = update_mock

        processor._handle_success("job-123", crawl_result)

        # Verify update was called with correct structure
        mock_supabase.table.assert_called_with("background_jobs")
        call_args = mock_supabase.table.return_value.update.call_args[0][0]
        
        assert "result" in call_args
        assert "crawlResult" in call_args["result"]
        assert call_args["result"]["crawlResult"]["pagesCrawled"] == 5
        assert call_args["status"] == "completed"
        assert "completed_at" in call_args

    def test_graceful_shutdown(self, processor):
        """Verify processor finishes current job on SIGTERM."""
        processor.current_job_id = "job-123"
        
        # Mock the logger to verify it's called
        processor.logger = Mock()

        # Simulate SIGTERM
        processor._handle_shutdown(signal.SIGTERM, None)

        # Verify running flag is set to False
        assert processor.running is False

        # Verify logger was called
        processor.logger.info.assert_called()

    def test_recover_orphaned_jobs_select_then_update(self, processor, mock_supabase):
        """Verify orphan recovery uses SELECT-then-UPDATE pattern."""
        processor.supabase = mock_supabase

        # Mock SELECT to return 2 orphaned jobs
        select_chain = Mock()
        select_chain.data = [{"id": "job-1"}, {"id": "job-2"}]
        
        # Build the chain: select -> eq -> eq -> lt -> execute
        lt_mock = Mock()
        lt_mock.execute.return_value = select_chain
        
        eq2_mock = Mock()
        eq2_mock.lt.return_value = lt_mock
        
        eq1_mock = Mock()
        eq1_mock.eq.return_value = eq2_mock
        
        select_mock = Mock()
        select_mock.eq.return_value = eq1_mock
        
        # Mock UPDATE chain
        in_mock = Mock()
        in_mock.execute.return_value = Mock()
        
        update_mock = Mock()
        update_mock.in_.return_value = in_mock
        
        # Mock INSERT chain
        insert_mock = Mock()
        insert_mock.execute.return_value = Mock()
        
        # Configure table mock to return different mocks based on method called
        def table_side_effect(table_name):
            table_mock = Mock()
            table_mock.select.return_value = select_mock
            table_mock.update.return_value = update_mock
            table_mock.insert.return_value = insert_mock
            return table_mock
        
        mock_supabase.table.side_effect = table_side_effect

        processor.recover_orphaned_jobs()

        # Verify SELECT was called on background_jobs
        mock_supabase.table.assert_any_call("background_jobs")
        
        # Verify UPDATE was called
        update_mock.in_.assert_called_once_with("id", ["job-1", "job-2"])
        
        # Verify INSERT was called twice (once per orphaned job) for system_logs
        assert insert_mock.execute.call_count == 2

    def test_recover_orphaned_jobs_logs_each_job(self, processor, mock_supabase):
        """Verify each recovered job is logged to system_logs."""
        processor.supabase = mock_supabase

        # Mock SELECT to return 2 orphaned jobs
        select_chain = Mock()
        select_chain.data = [{"id": "job-1"}, {"id": "job-2"}]
        
        # Build the chain
        lt_mock = Mock()
        lt_mock.execute.return_value = select_chain
        
        eq2_mock = Mock()
        eq2_mock.lt.return_value = lt_mock
        
        eq1_mock = Mock()
        eq1_mock.eq.return_value = eq2_mock
        
        select_mock = Mock()
        select_mock.eq.return_value = eq1_mock
        
        # Mock UPDATE chain
        in_mock = Mock()
        in_mock.execute.return_value = Mock()
        
        update_mock = Mock()
        update_mock.in_.return_value = in_mock
        
        # Track INSERT calls
        insert_calls = []
        
        def insert_side_effect(data):
            insert_calls.append(data)
            insert_mock = Mock()
            insert_mock.execute.return_value = Mock()
            return insert_mock
        
        # Configure table mock
        def table_side_effect(table_name):
            table_mock = Mock()
            table_mock.select.return_value = select_mock
            table_mock.update.return_value = update_mock
            table_mock.insert.side_effect = insert_side_effect
            return table_mock
        
        mock_supabase.table.side_effect = table_side_effect

        processor.recover_orphaned_jobs()

        # Verify INSERT was called with correct log structure for each job
        assert len(insert_calls) == 2
        
        for i, call_data in enumerate(insert_calls):
            assert call_data["log_type"] == "activity"
            assert call_data["category"] == "stealthy_crawl"
            assert call_data["action"] == "orphan_recovery"
            assert call_data["level"] == "warn"
            assert call_data["entity_type"] == "background_job"
            assert call_data["entity_id"] in ["job-1", "job-2"]

    def test_recover_orphaned_jobs_no_orphans(self, processor, mock_supabase):
        """Verify no updates when no orphaned jobs found."""
        processor.supabase = mock_supabase

        # Mock SELECT to return empty
        select_chain = Mock()
        select_chain.data = []
        
        lt_mock = Mock()
        lt_mock.execute.return_value = select_chain
        
        eq2_mock = Mock()
        eq2_mock.lt.return_value = lt_mock
        
        eq1_mock = Mock()
        eq1_mock.eq.return_value = eq2_mock
        
        select_mock = Mock()
        select_mock.eq.return_value = eq1_mock
        
        update_mock = Mock()
        
        def table_side_effect(table_name):
            table_mock = Mock()
            table_mock.select.return_value = select_mock
            table_mock.update.return_value = update_mock
            return table_mock
        
        mock_supabase.table.side_effect = table_side_effect

        processor.recover_orphaned_jobs()

        # Verify UPDATE was NOT called
        update_mock.in_.assert_not_called()

    def test_retry_delay_calculation(self, processor):
        """Verify retry delays match RETRY_DELAYS_MINUTES constant."""
        # attempts=1 -> index=0 -> delay=1min
        result1 = processor._calculate_next_retry_at(1)
        expected1 = datetime.now(timezone.utc) + timedelta(minutes=1)
        assert abs((result1 - expected1).total_seconds()) < 1

        # attempts=2 -> index=1 -> delay=5min
        result2 = processor._calculate_next_retry_at(2)
        expected2 = datetime.now(timezone.utc) + timedelta(minutes=5)
        assert abs((result2 - expected2).total_seconds()) < 1

        # attempts=3 -> index=2 -> delay=15min
        result3 = processor._calculate_next_retry_at(3)
        expected3 = datetime.now(timezone.utc) + timedelta(minutes=15)
        assert abs((result3 - expected3).total_seconds()) < 1

        # attempts=4 -> index=2 (capped) -> delay=15min
        result4 = processor._calculate_next_retry_at(4)
        expected4 = datetime.now(timezone.utc) + timedelta(minutes=15)
        assert abs((result4 - expected4).total_seconds()) < 1

    def test_handle_failure_schedules_retry(self, processor, mock_supabase):
        """Verify failure with remaining attempts schedules retry."""
        processor.supabase = mock_supabase

        # Setup mock chain for update
        update_mock = Mock()
        eq_mock = Mock()
        eq_mock.execute.return_value = Mock()
        update_mock.eq.return_value = eq_mock
        mock_supabase.table.return_value.update.return_value = update_mock

        processor._handle_failure("job-123", "Test error", attempts=1, max_attempts=3)

        # Verify update was called with pending status and next_retry_at
        call_args = mock_supabase.table.return_value.update.call_args[0][0]
        assert call_args["status"] == "pending"
        assert call_args["started_at"] is None
        assert call_args["last_error"] == "Test error"
        assert "next_retry_at" in call_args

    def test_handle_failure_terminal_failure(self, processor, mock_supabase):
        """Verify failure at max attempts marks job as failed."""
        processor.supabase = mock_supabase

        # Setup mock chain for update
        update_mock = Mock()
        eq_mock = Mock()
        eq_mock.execute.return_value = Mock()
        update_mock.eq.return_value = eq_mock
        mock_supabase.table.return_value.update.return_value = update_mock

        processor._handle_failure("job-123", "Test error", attempts=3, max_attempts=3)

        # Verify update was called with failed status
        call_args = mock_supabase.table.return_value.update.call_args[0][0]
        assert call_args["status"] == "failed"
        assert call_args["last_error"] == "Test error"
        assert "completed_at" in call_args

    def test_process_job_calls_crawler(self, processor, mock_supabase):
        """Verify _process_next_job calls crawler with correct URL."""
        processor.supabase = mock_supabase

        # Setup mock chain for update
        update_mock = Mock()
        eq_mock = Mock()
        eq_mock.execute.return_value = Mock()
        update_mock.eq.return_value = eq_mock
        mock_supabase.table.return_value.update.return_value = update_mock

        # Mock RPC to return a job
        mock_supabase.rpc.return_value.execute.return_value = Mock(
            data=[
                {
                    "id": "job-123",
                    "payload": {
                        "contractorId": "c-1",
                        "websiteUrl": "https://example.com",
                    },
                    "attempts": 1,
                    "max_attempts": 3,
                }
            ]
        )

        # Mock crawler to return success
        processor.crawler.crawl.return_value = {
            "url": "https://example.com",
            "success": True,
            "content": "Test content",
            "pagesCrawled": 1,
        }

        processor._process_next_job()

        # Verify crawler was called with correct URL
        processor.crawler.crawl.assert_called_once_with("https://example.com")

    def test_process_job_handles_crawler_exception(self, processor, mock_supabase):
        """Verify _process_next_job handles crawler exceptions."""
        processor.supabase = mock_supabase

        # Setup mock chain for update
        update_mock = Mock()
        eq_mock = Mock()
        eq_mock.execute.return_value = Mock()
        update_mock.eq.return_value = eq_mock
        mock_supabase.table.return_value.update.return_value = update_mock

        # Mock RPC to return a job
        mock_supabase.rpc.return_value.execute.return_value = Mock(
            data=[
                {
                    "id": "job-123",
                    "payload": {
                        "contractorId": "c-1",
                        "websiteUrl": "https://example.com",
                    },
                    "attempts": 1,
                    "max_attempts": 3,
                }
            ]
        )

        # Mock crawler to raise exception
        processor.crawler.crawl.side_effect = Exception("Crawler failed")

        processor._process_next_job()

        # Verify job was marked for retry (not failed, since attempts < max_attempts)
        call_args = mock_supabase.table.return_value.update.call_args[0][0]
        assert call_args["status"] == "pending"
        assert "Crawler failed" in call_args["last_error"]

    def test_constants_match_typescript(self, processor):
        """Verify constants match TypeScript job.schemas.ts."""
        assert processor.RETRY_DELAYS_MINUTES == [1, 5, 15]
        assert processor.ORPHAN_THRESHOLD_MINUTES == 30
