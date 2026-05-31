"""
Pytest fixtures for crawler tests.

Provides mocked SeleniumBase and Playwright instances for unit testing.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch


@pytest.fixture
def mock_sb():
    """Mock SeleniumBase sb_cdp.Chrome instance."""
    sb = Mock()
    sb.get_endpoint_url.return_value = "ws://localhost:9222/devtools/browser/abc123"
    sb.solve_captcha = Mock()
    sb.driver = Mock()
    sb.driver.stop = Mock()
    return sb


@pytest.fixture
def mock_page():
    """Mock Playwright Page instance."""
    page = Mock()
    page.goto = Mock()
    page.title.return_value = "Test Page"
    page.inner_text.return_value = "Test content " * 100  # > 500 chars
    page.evaluate = Mock(return_value=[])
    page.query_selector_all = Mock(return_value=[])
    return page


@pytest.fixture
def mock_playwright_context(mock_page):
    """Mock Playwright sync_playwright context manager."""
    context = Mock()
    context.pages = [mock_page]

    browser = Mock()
    browser.contexts = [context]

    pw = MagicMock()
    pw.__enter__ = Mock(return_value=pw)
    pw.__exit__ = Mock(return_value=False)
    pw.chromium = Mock()
    pw.chromium.connect_over_cdp = Mock(return_value=browser)

    return pw, mock_page


@pytest.fixture
def mock_links():
    """Sample links for testing link extraction and prioritization."""
    return [
        {"href": "/services", "text": "Our Services"},
        {"href": "/contact", "text": "Contact Us"},
        {"href": "/about", "text": "About Us"},
        {"href": "/portfolio", "text": "Portfolio"},
        {"href": "/gallery", "text": "Gallery"},
        {"href": "/blog", "text": "Blog"},  # Should be skipped
        {"href": "/login", "text": "Login"},  # Should be skipped
        {"href": "/random-page", "text": "Random Page"},
    ]


@pytest.fixture
def crawler_with_mocks(mock_sb, mock_playwright_context):
    """
    Create a StealthyCrawler with mocked dependencies.

    Returns tuple of (crawler, mock_sb, mock_page).
    """
    pw, mock_page = mock_playwright_context

    with patch("src.crawler.sb_cdp") as mock_sb_cdp, patch(
        "src.crawler.sync_playwright"
    ) as mock_sync_pw:
        mock_sb_cdp.Chrome.return_value = mock_sb
        mock_sync_pw.return_value = pw

        from src.crawler import StealthyCrawler

        crawler = StealthyCrawler()
        yield crawler, mock_sb, mock_page, mock_sb_cdp, mock_sync_pw
