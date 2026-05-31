"""
Unit tests for StealthyCrawler.

Tests verify:
- camelCase keys in return dict
- Section headers in content
- max_pages limit (via config)
- CAPTCHA solving triggered on bot detection
- Link prioritization
- Contact info extraction
- Debug logging behavior
"""

import pytest
from unittest.mock import Mock, patch, MagicMock


class TestCrawlReturnsCamelCaseKeys:
    """Verify crawl() returns dict with camelCase keys matching TypeScript interface."""

    def test_successful_crawl_has_camel_case_keys(self):
        """Verify successful crawl returns camelCase keys."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            page = Mock()
            page.goto = Mock()
            page.title.return_value = "Test Page"
            page.inner_text.return_value = "Test content " * 100
            page.evaluate = Mock(return_value=[])

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify camelCase keys
            assert "url" in result
            assert "success" in result
            assert "content" in result
            assert "pagesCrawled" in result  # camelCase, not pages_crawled
            assert result["success"] is True
            assert result["pagesCrawled"] >= 1

    def test_failed_crawl_has_camel_case_keys(self):
        """Verify failed crawl also returns camelCase keys."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks to simulate failure
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            page = Mock()
            page.goto = Mock(side_effect=Exception("Navigation failed"))
            page.title.return_value = "Test Page"

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify camelCase keys even on failure
            assert "url" in result
            assert "success" in result
            assert "pagesCrawled" in result
            assert result["success"] is False
            assert result["pagesCrawled"] == 0

    def test_bot_blocked_has_camel_case_keys(self):
        """Verify bot-blocked response has camelCase keys."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.solve_captcha = Mock()
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            page = Mock()
            page.goto = Mock()
            # Simulate bot detection - title stays blocked even after CAPTCHA attempt
            page.title.return_value = "Just a moment..."
            page.inner_text.return_value = "Checking your browser"

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify camelCase keys
            assert "blockedByBotProtection" in result  # camelCase
            assert result["blockedByBotProtection"] is True
            assert result["pagesCrawled"] == 0


class TestContentHasSectionHeaders:
    """Verify content includes section headers like '=== HOMEPAGE ==='."""

    def test_homepage_section_header(self):
        """Verify content starts with HOMEPAGE section header."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            page = Mock()
            page.goto = Mock()
            page.title.return_value = "Test Page"
            page.inner_text.return_value = "Homepage content here"
            page.evaluate = Mock(return_value=[])

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify section header
            assert "=== HOMEPAGE ===" in result["content"]

    def test_subpage_section_headers(self):
        """Verify subpages have section headers with title and URL."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw, patch("src.crawler.time"):
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            # Track page navigation
            current_url = ["https://example.com"]
            titles = {
                "https://example.com": "Example Home",
                "https://example.com/services": "Our Services",
            }
            contents = {
                "https://example.com": "Homepage content",
                "https://example.com/services": "Services content",
            }

            def mock_goto(url, **kwargs):
                current_url[0] = url

            def mock_title():
                return titles.get(current_url[0], "Unknown")

            def mock_inner_text(selector):
                return contents.get(current_url[0], "Content")

            def mock_evaluate(script):
                # Return links only on homepage
                if current_url[0] == "https://example.com":
                    return [{"href": "/services", "text": "Services"}]
                return []

            page = Mock()
            page.goto = Mock(side_effect=mock_goto)
            page.title = Mock(side_effect=mock_title)
            page.inner_text = Mock(side_effect=mock_inner_text)
            page.evaluate = Mock(side_effect=mock_evaluate)

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify section headers
            assert "=== HOMEPAGE ===" in result["content"]
            assert "=== OUR SERVICES" in result["content"]
            assert "https://example.com/services" in result["content"]


class TestMaxPagesLimit:
    """Verify crawler stops at max_pages from config."""

    def test_stops_at_max_pages(self):
        """Verify crawler doesn't exceed max_pages."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw, patch("src.crawler.time"):
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            page = Mock()
            page.goto = Mock()
            page.title.return_value = "Test Page"
            page.inner_text.return_value = "Content"

            # Return 50 links (more than max_pages)
            links = [{"href": f"/page{i}", "text": f"Page {i}"} for i in range(50)]
            page.evaluate = Mock(return_value=links)

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute with custom max_pages
            from src.crawler import StealthyCrawler, CrawlConfig

            config = CrawlConfig(max_pages=5, debug=False)
            crawler = StealthyCrawler(config)
            result = crawler.crawl("https://example.com")

            # Verify max pages limit
            assert result["pagesCrawled"] <= config.max_pages
            assert result["pagesCrawled"] == config.max_pages


class TestCaptchaSolving:
    """Verify sb.solve_captcha() is called when bot detection keywords found."""

    def test_captcha_solving_triggered_on_bot_detection(self):
        """Verify CAPTCHA solver is called when bot detection detected."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw, patch("src.crawler.time"):
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.solve_captcha = Mock()
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            # First call returns blocked title, second call returns normal title
            title_calls = [0]

            def mock_title():
                title_calls[0] += 1
                if title_calls[0] <= 2:  # First two calls (initial + after CAPTCHA)
                    return "Just a moment..."
                return "Test Page"

            page = Mock()
            page.goto = Mock()
            page.title = Mock(side_effect=mock_title)
            page.inner_text.return_value = "Content"
            page.evaluate = Mock(return_value=[])

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify CAPTCHA solver was called
            sb.solve_captcha.assert_called()

    def test_captcha_solving_success_allows_crawl(self):
        """Verify successful CAPTCHA solving allows crawl to continue."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw, patch("src.crawler.time"):
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.solve_captcha = Mock()
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            # First call returns blocked, after CAPTCHA returns normal
            title_calls = [0]

            def mock_title():
                title_calls[0] += 1
                if title_calls[0] == 1:
                    return "Just a moment..."
                return "Test Page"

            page = Mock()
            page.goto = Mock()
            page.title = Mock(side_effect=mock_title)
            page.inner_text.return_value = "Content after CAPTCHA solved"
            page.evaluate = Mock(return_value=[])

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify crawl succeeded after CAPTCHA
            assert result["success"] is True
            assert result["pagesCrawled"] >= 1


class TestLinkPrioritization:
    """Verify links are prioritized correctly."""

    def test_contact_pages_highest_priority(self):
        """Verify contact pages get highest priority (100)."""
        from src.crawler import StealthyCrawler, CrawlConfig

        crawler = StealthyCrawler(CrawlConfig(debug=False))

        links = [
            ("https://example.com/random", "Random Page"),
            ("https://example.com/services", "Services"),
            ("https://example.com/contact", "Contact Us"),
            ("https://example.com/about", "About"),
        ]

        prioritized = crawler._prioritize_links(links, "https://example.com")

        # Contact should be first (highest priority = 100)
        assert prioritized[0][0] == "https://example.com/contact"
        assert prioritized[0][2] is True  # is_contact flag

    def test_high_priority_links_before_low(self):
        """Verify high priority links (services, about) come before low priority."""
        from src.crawler import StealthyCrawler, CrawlConfig

        crawler = StealthyCrawler(CrawlConfig(debug=False))

        links = [
            ("https://example.com/random", "Random Page"),
            ("https://example.com/services", "Services"),
            ("https://example.com/gallery", "Gallery"),
            ("https://example.com/about", "About"),
            ("https://example.com/portfolio", "Portfolio"),
        ]

        prioritized = crawler._prioritize_links(links, "https://example.com")

        # Get indices
        urls = [p[0] for p in prioritized]
        
        # Services and About (HIGH) should come before Gallery and Portfolio (MEDIUM)
        services_idx = urls.index("https://example.com/services")
        about_idx = urls.index("https://example.com/about")
        gallery_idx = urls.index("https://example.com/gallery")
        portfolio_idx = urls.index("https://example.com/portfolio")
        
        assert services_idx < gallery_idx
        assert about_idx < portfolio_idx

    def test_skip_patterns_excluded(self):
        """Verify skip patterns (login, blog, etc.) are excluded."""
        from src.crawler import StealthyCrawler, CrawlConfig

        crawler = StealthyCrawler(CrawlConfig(debug=False))

        links = [
            ("https://example.com/services", "Services"),
            ("https://example.com/login", "Login"),
            ("https://example.com/blog", "Blog"),
            ("https://example.com/cart", "Cart"),
            ("https://example.com/about", "About"),
        ]

        prioritized = crawler._prioritize_links(links, "https://example.com")
        urls = [p[0] for p in prioritized]

        # Skip patterns should not be in result
        assert "https://example.com/login" not in urls
        assert "https://example.com/blog" not in urls
        assert "https://example.com/cart" not in urls


class TestContactExtraction:
    """Verify contact info extraction."""

    def test_email_extraction(self):
        """Verify emails are extracted from text."""
        from src.crawler import StealthyCrawler, CrawlConfig

        crawler = StealthyCrawler(CrawlConfig(debug=False))
        
        text = "Contact us at info@example.com or sales@company.org for inquiries."
        
        # Mock page for the extract method
        page = Mock()
        page.evaluate = Mock(return_value={"emails": [], "phones": [], "social": {}})
        
        contact = crawler._extract_contact_info(page, text)
        
        assert "info@example.com" in contact.emails
        assert "sales@company.org" in contact.emails

    def test_phone_extraction(self):
        """Verify phone numbers are extracted from text."""
        from src.crawler import StealthyCrawler, CrawlConfig

        crawler = StealthyCrawler(CrawlConfig(debug=False))
        
        text = "Call us at (555) 123-4567 or 555.987.6543 today!"
        
        page = Mock()
        page.evaluate = Mock(return_value={"emails": [], "phones": [], "social": {}})
        
        contact = crawler._extract_contact_info(page, text)
        
        assert len(contact.phones) >= 2


class TestRelevanceScoring:
    """Verify concrete-related relevance scoring."""

    def test_high_relevance_for_concrete_content(self):
        """Verify high relevance score for concrete-heavy content."""
        from src.crawler import StealthyCrawler, CrawlConfig

        crawler = StealthyCrawler(CrawlConfig(debug=False))
        
        text = """
        We specialize in concrete driveways, patios, and foundations.
        Our team handles stamped concrete, decorative overlays, and epoxy coatings.
        We also do sidewalks, retaining walls, and pool deck resurfacing.
        """
        
        score = crawler._calculate_relevance(text)
        
        # Should have high relevance (many keywords)
        assert score >= 0.5

    def test_low_relevance_for_unrelated_content(self):
        """Verify low relevance score for non-concrete content."""
        from src.crawler import StealthyCrawler, CrawlConfig

        crawler = StealthyCrawler(CrawlConfig(debug=False))
        
        text = """
        Welcome to our restaurant. We serve delicious food and beverages.
        Our menu includes pizza, pasta, and salads.
        Visit us for lunch or dinner.
        """
        
        score = crawler._calculate_relevance(text)
        
        # Should have low/zero relevance
        assert score < 0.2


class TestInvalidUrl:
    """Verify invalid URL handling."""

    def test_invalid_url_returns_error(self):
        """Verify invalid URL returns error response."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks - but they shouldn't be called for invalid URL
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("")

            assert result["success"] is False
            assert result["pagesCrawled"] == 0
            assert "error" in result
            # Browser should not have been launched for invalid URL
            mock_sb_cdp.Chrome.assert_not_called()


class TestBrowserCleanup:
    """Verify browser is properly cleaned up."""

    def test_browser_stopped_on_success(self):
        """Verify browser is stopped after successful crawl."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            page = Mock()
            page.goto = Mock()
            page.title.return_value = "Test Page"
            page.inner_text.return_value = "Content"
            page.evaluate = Mock(return_value=[])

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            crawler.crawl("https://example.com")

            # Verify browser was stopped
            sb.driver.stop.assert_called_once()

    def test_browser_stopped_on_error(self):
        """Verify browser is stopped even when crawl fails."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            # Make playwright raise an exception
            mock_pw.side_effect = Exception("Playwright error")

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify browser was still stopped
            sb.driver.stop.assert_called_once()
            assert result["success"] is False


class TestCrawlConfig:
    """Test CrawlConfig dataclass."""

    def test_default_values(self):
        """Verify default config values."""
        from src.crawler import CrawlConfig

        config = CrawlConfig()
        
        assert config.max_pages == 10
        assert config.max_depth == 2
        assert config.page_delay_ms == 1500
        assert config.page_timeout_ms == 15000
        assert config.max_content_length == 50000
        assert config.debug is False

    def test_custom_values(self):
        """Verify custom config values."""
        from src.crawler import CrawlConfig

        config = CrawlConfig(
            max_pages=5,
            max_depth=3,
            page_delay_ms=2000,
            debug=True,
        )
        
        assert config.max_pages == 5
        assert config.max_depth == 3
        assert config.page_delay_ms == 2000
        assert config.debug is True

    def test_from_env(self):
        """Verify config from environment variables."""
        import os
        from src.crawler import CrawlConfig

        # Set env vars
        os.environ["CRAWL_MAX_PAGES"] = "15"
        os.environ["DEBUG_CRAWL"] = "1"
        
        try:
            config = CrawlConfig.from_env()
            
            assert config.max_pages == 15
            assert config.debug is True
        finally:
            # Clean up
            del os.environ["CRAWL_MAX_PAGES"]
            del os.environ["DEBUG_CRAWL"]


class TestExtractedContacts:
    """Test that crawl returns extractedContacts in result."""

    def test_extracted_contacts_in_result(self):
        """Verify extractedContacts is included in successful crawl result."""
        with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
            "src.crawler.sync_playwright"
        ) as mock_pw:
            # Setup mocks
            sb = Mock()
            sb.get_endpoint_url.return_value = "ws://localhost:9222"
            sb.driver = Mock()
            sb.driver.stop = Mock()
            mock_sb_cdp.Chrome.return_value = sb

            page = Mock()
            page.goto = Mock()
            page.title.return_value = "Test Page"
            page.inner_text.return_value = "Contact us at test@example.com or call (555) 123-4567"
            page.evaluate = Mock(return_value={
                "emails": ["contact@example.com"],
                "phones": ["5551234567"],
                "social": {"facebook": "https://facebook.com/test"}
            })

            context = Mock()
            context.pages = [page]

            browser = Mock()
            browser.contexts = [context]

            pw_context = MagicMock()
            pw_context.__enter__ = Mock(return_value=pw_context)
            pw_context.__exit__ = Mock(return_value=False)
            pw_context.chromium.connect_over_cdp.return_value = browser
            mock_pw.return_value = pw_context

            # Execute
            from src.crawler import StealthyCrawler, CrawlConfig

            crawler = StealthyCrawler(CrawlConfig(debug=False))
            result = crawler.crawl("https://example.com")

            # Verify extractedContacts
            assert "extractedContacts" in result
            assert "emails" in result["extractedContacts"]
            assert "phones" in result["extractedContacts"]
            assert "socialLinks" in result["extractedContacts"]
