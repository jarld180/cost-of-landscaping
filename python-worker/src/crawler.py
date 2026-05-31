"""
Stealthy Web Crawler using SeleniumBase CDP Mode + Playwright.

SeleniumBase provides: Stealth browser launch, CAPTCHA solving
Playwright provides: Navigation, content extraction, waiting

Enhanced with:
- Verbose debug logging (DEBUG_CRAWL=1 or debug=True)
- Configurable max_pages and max_depth
- Structured content extraction (header, footer, main)
- Direct contact info extraction (email, phone, social)
- Concrete-specific relevance scoring
- Pretty-printed colored output for human debugging
"""

import os
import sys
import time
import random
import math
import re
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright, Page
from seleniumbase import sb_cdp


# =====================================================
# HUMAN BEHAVIOR SIMULATION
# =====================================================

class HumanBehavior:
    """
    Simulates human-like behavior to defeat bot detection.
    
    Key techniques:
    - Gaussian-distributed delays (not uniform random)
    - Mouse movement simulation
    - Scroll behavior that mimics reading
    - Variable timing based on page content
    """
    
    def __init__(self, page: Page, sb: Any, pretty_logger: Optional[Any] = None):
        self.page = page
        self.sb = sb  # SeleniumBase CDP instance for stealth actions
        self.pretty = pretty_logger
        
    def _log(self, message: str):
        """Log to pretty logger if available."""
        if self.pretty:
            self.pretty.debug(message)
    
    def gaussian_delay(self, mean: float, std_dev: float = 0.3, 
                       min_val: float = 0.3, max_val: float = 8.0) -> float:
        """
        Generate human-like delay using Gaussian distribution.
        Humans don't have uniform reaction times - they cluster around a mean.
        """
        delay = random.gauss(mean, std_dev * mean)  # std_dev as percentage of mean
        return max(min_val, min(delay, max_val))
    
    def wait_after_navigation(self, is_first_page: bool = False):
        """
        Wait after page navigation to simulate human reading/processing.
        First page gets longer delay (human orienting themselves).
        """
        if is_first_page:
            delay = self.gaussian_delay(3.0, 0.4)  # 3s ± 40% for first page
        else:
            delay = self.gaussian_delay(2.0, 0.3)  # 2s ± 30% for subsequent pages
        
        self._log(f"Human delay: {delay:.1f}s (orientation)")
        time.sleep(delay)
    
    def wait_between_pages(self):
        """
        Wait between navigating to different pages.
        Longer, more variable delays to simulate decision-making.
        """
        delay = self.gaussian_delay(2.5, 0.5)  # 2.5s ± 50%
        self._log(f"Human delay: {delay:.1f}s (between pages)")
        time.sleep(delay)
    
    def wait_reading_time(self, content_length: int):
        """
        Simulate time spent reading page content.
        Longer content = longer reading time.
        """
        # Assume ~200 words per minute reading speed, ~5 chars per word
        words = content_length / 5
        reading_minutes = words / 200
        reading_seconds = reading_minutes * 60
        
        # Cap at 5 seconds, minimum 1 second
        base_delay = max(1.0, min(reading_seconds, 5.0))
        delay = self.gaussian_delay(base_delay, 0.3)
        
        self._log(f"Human delay: {delay:.1f}s (reading ~{int(words)} words)")
        time.sleep(delay)
    
    def simulate_scroll_reading(self):
        """
        Simulate a human scrolling through page content.
        Humans scroll in chunks, pause to read, sometimes scroll back up.
        """
        try:
            # Get page dimensions
            scroll_height = self.page.evaluate("document.body.scrollHeight")
            viewport_height = self.page.evaluate("window.innerHeight")
            
            if scroll_height <= viewport_height:
                # Page fits in viewport, just a small pause
                time.sleep(self.gaussian_delay(1.0, 0.3))
                return
            
            current_pos = 0
            scroll_count = 0
            max_scrolls = 4  # Don't scroll forever
            
            while current_pos < scroll_height and scroll_count < max_scrolls:
                # Random scroll distance (30-80% of viewport)
                scroll_pct = random.uniform(0.3, 0.8)
                scroll_distance = int(viewport_height * scroll_pct)
                
                current_pos += scroll_distance
                
                # Smooth scroll using CSS behavior
                self.page.evaluate(f"""
                    window.scrollTo({{
                        top: {min(current_pos, scroll_height)},
                        behavior: 'smooth'
                    }});
                """)
                
                # Pause to "read" (0.5-2 seconds)
                read_pause = self.gaussian_delay(1.0, 0.4, min_val=0.4, max_val=2.5)
                time.sleep(read_pause)
                
                scroll_count += 1
                
                # Occasionally scroll back up a bit (10% chance)
                if random.random() < 0.1 and current_pos > viewport_height:
                    back_scroll = int(viewport_height * random.uniform(0.2, 0.4))
                    current_pos -= back_scroll
                    self.page.evaluate(f"""
                        window.scrollTo({{
                            top: {max(0, current_pos)},
                            behavior: 'smooth'
                        }});
                    """)
                    time.sleep(self.gaussian_delay(0.5, 0.3))
            
            # Scroll back to top before navigating away (common human behavior)
            self.page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' });")
            time.sleep(self.gaussian_delay(0.5, 0.2))
            
            self._log(f"Scrolled page {scroll_count} times")
            
        except Exception as e:
            self._log(f"Scroll simulation failed: {e}")
    
    def simulate_mouse_movement(self, target_x: Optional[int] = None, target_y: Optional[int] = None):
        """
        Simulate natural mouse movement.
        Uses the page to generate movements since we can't use PyAutoGUI in headless.
        """
        try:
            viewport = self.page.viewport_size
            if not viewport:
                return
                
            # If no target, pick a random point
            if target_x is None:
                target_x = random.randint(100, viewport['width'] - 100)
            if target_y is None:
                target_y = random.randint(100, viewport['height'] - 100)
            
            # Start from a random position
            start_x = random.randint(50, viewport['width'] - 50)
            start_y = random.randint(50, viewport['height'] - 50)
            
            # Move in steps with slight randomization
            steps = random.randint(8, 15)
            for i in range(steps):
                t = i / steps
                # Ease-out curve for natural deceleration
                t = 1 - (1 - t) ** 2
                
                current_x = start_x + (target_x - start_x) * t
                current_y = start_y + (target_y - start_y) * t
                
                # Add jitter
                jitter_x = random.uniform(-3, 3)
                jitter_y = random.uniform(-3, 3)
                
                self.page.mouse.move(current_x + jitter_x, current_y + jitter_y)
                time.sleep(random.uniform(0.01, 0.04))
            
            self._log(f"Mouse moved to ({target_x}, {target_y})")
            
        except Exception as e:
            self._log(f"Mouse movement failed: {e}")
    
    def pre_navigation_ritual(self):
        """
        Perform human-like actions before navigating to a new page.
        This helps establish a "trusted" behavior pattern.
        """
        # 50% chance to do a quick mouse movement
        if random.random() < 0.5:
            self.simulate_mouse_movement()
        
        # Small thinking pause
        time.sleep(self.gaussian_delay(0.3, 0.2, min_val=0.1, max_val=0.8))
    
    def post_navigation_ritual(self, is_first_page: bool = False):
        """
        Perform human-like actions after a page loads.
        """
        # Wait for page to settle
        self.wait_after_navigation(is_first_page)
        
        # 70% chance to do some scrolling (humans usually scroll to see content)
        if random.random() < 0.7:
            self.simulate_scroll_reading()
        
        # Small mouse movement (shows page interaction)
        if random.random() < 0.4:
            self.simulate_mouse_movement()


# =====================================================
# ANSI COLOR CODES (for terminal output)
# =====================================================

class Colors:
    """ANSI escape codes for terminal colors."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    
    # Standard colors
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    
    # Bright colors
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"
    
    # Background
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"


# =====================================================
# PRETTY LOGGER (for debug mode)
# =====================================================

class PrettyLogger:
    """
    Human-friendly colored logger for debug mode.
    Writes to a dedicated log file for easy tailing with colors preserved.
    
    Usage:
        Set DEBUG_CRAWL=1 to enable
        Set DEBUG_LOG_FILE=/path/to/file.log (default: /tmp/crawler-debug.log)
        
        Then: tail -f /tmp/crawler-debug.log
    """
    
    # Icons for different log types
    ICONS = {
        "start": "🚀",
        "success": "✅",
        "error": "❌",
        "warning": "⚠️ ",
        "info": "ℹ️ ",
        "debug": "🔍",
        "browser": "🌐",
        "navigate": "🧭",
        "extract": "📄",
        "contact": "📞",
        "link": "🔗",
        "page": "📑",
        "complete": "🏁",
        "skip": "⏭️ ",
        "wait": "⏳",
    }
    
    def __init__(self, name: str, use_colors: bool = True):
        self.name = name
        self.use_colors = use_colors
        self._indent_level = 0
        
        # Get log file path from env, default to /tmp/crawler-debug.log
        self.log_file_path = os.environ.get("DEBUG_LOG_FILE", "/tmp/crawler-debug.log")
        self._file_handle = None
        self._open_log_file()
    
    def _open_log_file(self):
        """Open the log file for writing."""
        try:
            # Open in append mode, line-buffered for real-time tailing
            self._file_handle = open(self.log_file_path, "a", buffering=1, encoding="utf-8")
            # Write a startup marker
            self._write_raw(f"\n{'='*60}\n")
            self._write_raw(f"  Debug session started: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            self._write_raw(f"{'='*60}\n\n")
        except Exception as e:
            # Fall back to stdout if file can't be opened
            print(f"Warning: Could not open debug log file {self.log_file_path}: {e}")
            self._file_handle = None
    
    def _write_raw(self, text: str):
        """Write raw text to log file or stdout."""
        if self._file_handle:
            self._file_handle.write(text)
            self._file_handle.flush()
        else:
            print(text, end="")
    
    def close(self):
        """Close the log file."""
        if self._file_handle:
            self._write_raw(f"\n{'='*60}\n")
            self._write_raw(f"  Debug session ended: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            self._write_raw(f"{'='*60}\n\n")
            self._file_handle.close()
            self._file_handle = None
    
    def _colorize(self, text: str, color: str) -> str:
        """Apply color - always enabled for file output."""
        if self.use_colors:
            return f"{color}{text}{Colors.RESET}"
        return text
    
    def _print(self, text: str):
        """Print to log file instead of stdout."""
        self._write_raw(text + "\n")
    
    def _format_value(self, value: Any) -> str:
        """Format a value for display."""
        if isinstance(value, bool):
            return self._colorize("true" if value else "false", 
                                  Colors.GREEN if value else Colors.RED)
        elif isinstance(value, (int, float)):
            return self._colorize(str(value), Colors.CYAN)
        elif isinstance(value, str):
            if value.startswith("http"):
                return self._colorize(value, Colors.BLUE)
            return self._colorize(f'"{value}"', Colors.YELLOW)
        elif isinstance(value, list):
            if len(value) == 0:
                return self._colorize("[]", Colors.DIM)
            return self._colorize(f"[{len(value)} items]", Colors.MAGENTA)
        elif isinstance(value, dict):
            if len(value) == 0:
                return self._colorize("{}", Colors.DIM)
            return self._colorize(f"{{{len(value)} keys}}", Colors.MAGENTA)
        return str(value)
    
    def _get_indent(self) -> str:
        """Get current indentation."""
        return "  " * self._indent_level
    
    def indent(self):
        """Increase indentation."""
        self._indent_level += 1
    
    def dedent(self):
        """Decrease indentation."""
        self._indent_level = max(0, self._indent_level - 1)
    
    def divider(self, char: str = "─", width: int = 60):
        """Print a divider line."""
        line = char * width
        self._print(self._colorize(line, Colors.DIM))
    
    def header(self, text: str):
        """Print a section header."""
        self._print("")
        self.divider("═")
        icon = self.ICONS.get("start", "")
        header_text = f" {icon} {text.upper()} "
        self._print(self._colorize(header_text, Colors.BOLD + Colors.BRIGHT_CYAN))
        self.divider("═")
    
    def subheader(self, text: str, icon_key: str = "info"):
        """Print a subsection header."""
        self._print("")
        icon = self.ICONS.get(icon_key, "")
        self._print(f"{self._get_indent()}{icon} {self._colorize(text, Colors.BOLD + Colors.WHITE)}")
        self._print(f"{self._get_indent()}{self._colorize('─' * 40, Colors.DIM)}")
    
    def log(self, icon_key: str, message: str, **kwargs):
        """Log a message with icon and optional key-value pairs."""
        icon = self.ICONS.get(icon_key, "•")
        indent = self._get_indent()
        
        # Main message
        self._print(f"{indent}{icon} {message}")
        
        # Key-value pairs on separate lines, indented
        if kwargs:
            for key, value in kwargs.items():
                formatted_value = self._format_value(value)
                key_display = self._colorize(f"  {key}:", Colors.DIM)
                self._print(f"{indent}   {key_display} {formatted_value}")
    
    def success(self, message: str, **kwargs):
        """Log a success message."""
        msg = self._colorize(message, Colors.GREEN)
        self.log("success", msg, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log an error message."""
        msg = self._colorize(message, Colors.BRIGHT_RED)
        self.log("error", msg, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log a warning message."""
        msg = self._colorize(message, Colors.YELLOW)
        self.log("warning", msg, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log an info message."""
        self.log("info", message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log a debug message."""
        msg = self._colorize(message, Colors.DIM)
        self.log("debug", msg, **kwargs)
    
    def page_crawled(self, url: str, title: str, content_length: int,
                     emails: int, phones: int, relevance: float, 
                     is_contact: bool = False, images: int = 0):
        """Log a successfully crawled page with formatted output."""
        icon = "contact" if is_contact else "page"
        page_type = self._colorize("[CONTACT]", Colors.BRIGHT_MAGENTA) if is_contact else ""
        
        self._print("")
        self.log(icon, f"Page Crawled {page_type}")
        
        # URL in blue
        self._print(f"{self._get_indent()}   {self._colorize('url:', Colors.DIM)} {self._colorize(url, Colors.BLUE)}")
        
        # Title
        title_display = title[:50] + "..." if len(title) > 50 else title
        self._print(f"{self._get_indent()}   {self._colorize('title:', Colors.DIM)} {self._colorize(title_display, Colors.WHITE)}")
        
        # Stats in a compact format
        stats = []
        stats.append(f"{self._colorize(str(content_length), Colors.CYAN)} chars")
        
        if emails > 0:
            stats.append(f"{self._colorize(str(emails), Colors.GREEN)} emails")
        if phones > 0:
            stats.append(f"{self._colorize(str(phones), Colors.GREEN)} phones")
        if images > 0:
            stats.append(f"{self._colorize(str(images), Colors.BRIGHT_CYAN)} images")
        
        # Relevance with color coding
        if relevance >= 0.7:
            rel_color = Colors.BRIGHT_GREEN
        elif relevance >= 0.4:
            rel_color = Colors.YELLOW
        else:
            rel_color = Colors.DIM
        stats.append(f"relevance: {self._colorize(f'{relevance:.0%}', rel_color)}")
        
        self._print(f"{self._get_indent()}   {self._colorize('stats:', Colors.DIM)} {' | '.join(stats)}")
    
    def links_found(self, total: int, contact: int, high: int, medium: int, low: int):
        """Log links discovery summary."""
        self.log("link", "Links Discovered")
        
        parts = []
        if contact > 0:
            parts.append(f"{self._colorize(str(contact), Colors.BRIGHT_MAGENTA)} contact")
        if high > 0:
            parts.append(f"{self._colorize(str(high), Colors.GREEN)} high-priority")
        if medium > 0:
            parts.append(f"{self._colorize(str(medium), Colors.YELLOW)} medium")
        if low > 0:
            parts.append(f"{self._colorize(str(low), Colors.DIM)} low")
        
        self._print(f"{self._get_indent()}   {self._colorize('breakdown:', Colors.DIM)} {', '.join(parts)}")
        self._print(f"{self._get_indent()}   {self._colorize('total:', Colors.DIM)} {self._colorize(str(total), Colors.CYAN)} links to crawl")
    
    def crawl_complete(self, pages: int, emails: List[str], phones: List[str], 
                       social: Dict[str, str], content_length: int,
                       images_collected: int = 0, images_total_found: int = 0):
        """Log crawl completion summary."""
        self.header("CRAWL COMPLETE")
        
        # Pages
        self._print(f"  📑 Pages Crawled: {self._colorize(str(pages), Colors.BRIGHT_CYAN)}")
        self._print(f"  📝 Content Length: {self._colorize(f'{content_length:,}', Colors.CYAN)} characters")
        
        # Images
        if images_collected > 0:
            deduped_info = f" ({images_total_found} total, {images_total_found - images_collected} duplicates)" if images_total_found > images_collected else ""
            self._print(f"  🖼️  Images Collected: {self._colorize(str(images_collected), Colors.BRIGHT_CYAN)} unique{deduped_info}")
        
        # Contact info
        self._print("")
        self._print(f"  {self._colorize('Contact Information Found:', Colors.BOLD)}")
        
        if emails:
            self._print(f"    📧 Emails: {self._colorize(str(len(emails)), Colors.GREEN)}")
            for email in emails[:3]:  # Show first 3
                self._print(f"       • {self._colorize(email, Colors.BLUE)}")
            if len(emails) > 3:
                self._print(f"       {self._colorize(f'... and {len(emails) - 3} more', Colors.DIM)}")
        else:
            self._print(f"    📧 Emails: {self._colorize('none found', Colors.DIM)}")
        
        if phones:
            self._print(f"    📞 Phones: {self._colorize(str(len(phones)), Colors.GREEN)}")
            for phone in phones[:3]:
                self._print(f"       • {self._colorize(phone, Colors.CYAN)}")
            if len(phones) > 3:
                self._print(f"       {self._colorize(f'... and {len(phones) - 3} more', Colors.DIM)}")
        else:
            self._print(f"    📞 Phones: {self._colorize('none found', Colors.DIM)}")
        
        if social:
            self._print(f"    🌐 Social: {self._colorize(str(len(social)), Colors.GREEN)} platforms")
            for platform, url in list(social.items())[:4]:
                self._print(f"       • {self._colorize(platform, Colors.MAGENTA)}: {self._colorize(url[:40] + '...', Colors.BLUE)}")
        else:
            self._print(f"    🌐 Social: {self._colorize('none found', Colors.DIM)}")
        
        self.divider("═")
        self._print("")


# =====================================================
# CONFIGURATION
# =====================================================

@dataclass
class CrawlConfig:
    """Configuration for a crawl job."""
    max_pages: int = 20
    max_depth: int = 2
    page_timeout_ms: int = 30000
    max_content_length: int = 50000
    max_consecutive_failures: int = 3
    
    simulate_human: bool = True
    scroll_pages: bool = True
    mouse_movements: bool = True
    
    debug: bool = False
    
    @classmethod
    def from_env(cls) -> "CrawlConfig":
        """Create config from environment variables."""
        return cls(
            max_pages=int(os.environ.get("CRAWL_MAX_PAGES", 20)),
            max_depth=int(os.environ.get("CRAWL_MAX_DEPTH", 2)),
            page_timeout_ms=int(os.environ.get("CRAWL_PAGE_TIMEOUT_MS", 30000)),
            max_content_length=int(os.environ.get("CRAWL_MAX_CONTENT_LENGTH", 50000)),
            max_consecutive_failures=int(os.environ.get("CRAWL_MAX_CONSECUTIVE_FAILURES", 3)),
            simulate_human=os.environ.get("CRAWL_SIMULATE_HUMAN", "1").lower() in ("1", "true", "yes"),
            scroll_pages=os.environ.get("CRAWL_SCROLL_PAGES", "1").lower() in ("1", "true", "yes"),
            mouse_movements=os.environ.get("CRAWL_MOUSE_MOVEMENTS", "1").lower() in ("1", "true", "yes"),
            debug=os.environ.get("DEBUG_CRAWL", "").lower() in ("1", "true", "yes"),
        )


@dataclass
class ExtractedContact:
    """Structured contact info extracted directly from page."""
    emails: List[str] = field(default_factory=list)
    phones: List[str] = field(default_factory=list)
    social_links: Dict[str, str] = field(default_factory=dict)


@dataclass
class NavigationResult:
    """Result of a page navigation attempt."""
    success: bool
    error_type: Optional[str] = None  # "timeout", "bot_blocked", "connection", "unknown"
    error_message: Optional[str] = None
    page_title: Optional[str] = None  # For bot detection, capture what title we got


@dataclass 
class PageData:
    """Data extracted from a single page."""
    url: str
    title: str
    depth: int
    content: str
    header_content: str = ""
    footer_content: str = ""
    contact_info: ExtractedContact = field(default_factory=ExtractedContact)
    is_contact_page: bool = False
    relevance_score: float = 0.0


@dataclass
class ServiceTypeKeyword:
    slug: str
    keywords: List[str]


@dataclass
class ServiceTypeMatch:
    slug: str
    confidence: float
    matched_keywords: List[str]
    source_urls: List[str]


@dataclass
class CollectedImage:
    """Image URL collected during crawl."""
    url: str
    alt: str
    source_url: str  # Page where the image was first found


# =====================================================
# CRAWLER
# =====================================================

class StealthyCrawler:
    """
    Stealth web crawler using SeleniumBase CDP Mode + Playwright.

    SeleniumBase provides: Stealth browser launch, CAPTCHA solving
    Playwright provides: Navigation, content extraction, waiting
    """

    # Category synonyms for intelligent link classification
    CATEGORY_SYNONYMS = {
        "contact": ["contact", "contact-us", "get-in-touch", "reach-us", "reach", "connect"],
        "about": ["about", "about-us", "who-we-are", "our-team", "company", "our-company", "our-story"],
        "services": ["services", "service", "what-we-do", "our-services", "solutions", "offerings"],
        "gallery": ["gallery", "photos", "images", "photo-gallery", "pictures"],
        "portfolio": ["portfolio", "our-work", "work", "projects", "case-studies", "completed-projects"],
        "locations": ["locations", "location", "areas", "service-areas", "service-area", "find-us", "branches"],
    }
    
    # Category caps: hub = max hub pages, children = max child pages under hub
    CATEGORY_CAPS = {
        "contact": {"hub": 1, "children": 0},
        "about": {"hub": 1, "children": 0},
        "services": {"hub": 1, "children": 5},
        "gallery": {"hub": 1, "children": 2},
        "portfolio": {"hub": 1, "children": 2},
        "locations": {"hub": 1, "children": 0},
    }
    
    # Concrete service keywords - boost priority when found in service context
    CONCRETE_SERVICE_KEYWORDS = [
        "driveway", "driveways",
        "patio", "patios",
        "foundation", "foundations",
        "sidewalk", "sidewalks",
        "stamped", "stamped-concrete",
        "decorative", "decorative-concrete",
        "pool-deck", "pool-decks", "pooldeck",
        "retaining-wall", "retaining-walls", "retaining",
        "slab", "slabs",
        "garage", "garage-floor", "garage-floors",
        "walkway", "walkways",
        "repair", "concrete-repair",
        "resurfacing",
        "residential", "commercial",
        "flatwork", "curb", "gutter",
        "polished", "polished-concrete",
        "epoxy", "overlay",
    ]
    
    # Generic anchor text to ignore for priority boosting
    GENERIC_ANCHORS = [
        "learn more", "read more", "click here", "more info", "details",
        "view", "see more", "explore", "discover", "get started",
    ]

    # Skip these patterns entirely
    SKIP_PATTERNS = [
        "blog", "news", "article", "post",
        "career", "job", "hiring", "employment",
        "privacy", "terms", "cookie", "legal", "disclaimer",
        "login", "sign-in", "signin", "register", "account",
        "cart", "checkout", "shop", "store", "product",
        "search", "?s=", "/page/", "?page=",
        "archive", "category", "tag",
        ".pdf", ".jpg", ".png", ".gif", ".webp", ".svg", ".doc", ".docx",
        "facebook.com", "twitter.com", "instagram.com", "linkedin.com",
        "youtube.com", "yelp.com", "google.com", "bbb.org",
        "tel:", "mailto:", "#", "javascript:",
    ]

    # Bot detection keywords
    BOT_DETECTION_KEYWORDS = [
        "403",
        "forbidden",
        "access denied",
        "attention required",
        "just a moment",
        "checking your browser",
        "please wait",
        "ddos protection",
        "blocked",
        "cloudflare",
    ]
    
    # Concrete-related keywords for relevance scoring
    CONCRETE_KEYWORDS = [
        "concrete", "cement", "foundation", "slab", "driveway", "patio",
        "sidewalk", "flatwork", "stamped", "decorative", "colored",
        "polished", "epoxy", "overlay", "resurfacing", "pool deck",
        "retaining wall", "masonry", "brick", "block", "paver",
        "curb", "gutter", "footing", "pour", "rebar", "aggregate",
    ]
    
    # Regex patterns for contact extraction
    EMAIL_PATTERN = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
    )
    PHONE_PATTERNS = [
        re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'),  # (123) 456-7890
        re.compile(r'\+?1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'),  # +1 (123) 456-7890
    ]

    def __init__(self, config: Optional[CrawlConfig] = None):
        """Initialize the crawler with configuration."""
        self.config = config or CrawlConfig.from_env()
        self._sb: Optional[Any] = None
        self._setup_logging()

    def _setup_logging(self):
        """Setup logging based on debug flag."""
        self.logger = logging.getLogger("StealthyCrawler")
        
        # Pretty logger for human-readable debug output
        self.pretty = PrettyLogger("StealthyCrawler", use_colors=True) if self.config.debug else None
        
        # Set level based on debug flag
        if self.config.debug:
            self.logger.setLevel(logging.DEBUG)
            # Ensure we have a handler that outputs to journald/stdout
            if not self.logger.handlers:
                handler = logging.StreamHandler()
                handler.setLevel(logging.DEBUG)
                formatter = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
                handler.setFormatter(formatter)
                self.logger.addHandler(handler)
        else:
            self.logger.setLevel(logging.INFO)

    def _log(self, level: str, message: str, **kwargs):
        """Log with optional structured data."""
        extra = " | ".join(f"{k}={v}" for k, v in kwargs.items()) if kwargs else ""
        full_message = f"{message} | {extra}" if extra else message
        
        if level == "debug":
            self.logger.debug(full_message)
        elif level == "info":
            self.logger.info(full_message)
        elif level == "warn":
            self.logger.warning(full_message)
        elif level == "error":
            self.logger.error(full_message)

    def crawl(
        self, 
        url: str, 
        config: Optional[CrawlConfig] = None,
        service_type_keywords: Optional[List[ServiceTypeKeyword]] = None
    ) -> Dict:
        """
        Crawl a website starting from the given URL.

        Args:
            url: The starting URL to crawl
            config: Optional override config for this crawl
            service_type_keywords: Optional list of service types with keywords for detection
            
        Returns dict with camelCase keys matching TypeScript CrawlResult interface.
        """
        # Use provided config or instance config
        cfg = config or self.config
        
        # Pretty output for debug mode
        if self.pretty:
            self.pretty.header(f"CRAWLING: {url}")
            self.pretty.info("Configuration", max_pages=cfg.max_pages, max_depth=cfg.max_depth)
        
        self._log("info", "Starting crawl", url=url, max_pages=cfg.max_pages, max_depth=cfg.max_depth, debug=cfg.debug)
        
        self._sb = None
        try:
            # Normalize URL
            base_url = self._normalize_url(url)
            if not base_url:
                self._log("error", "Invalid URL", url=url)
                if self.pretty:
                    self.pretty.error("Invalid URL provided", url=url)
                return {
                    "url": url,
                    "success": False,
                    "content": "",
                    "pagesCrawled": 0,
                    "error": "Invalid URL",
                }

            self._log("debug", "Normalized URL", original=url, normalized=base_url)

            # 1. Launch browser
            if self.pretty:
                self.pretty.log("browser", "Launching stealth browser...")
            self._log("debug", "Launching stealth browser...")
            self._sb = sb_cdp.Chrome(locale="en", headless=True)
            endpoint_url = self._sb.get_endpoint_url()
            if self.pretty:
                self.pretty.success("Browser launched", endpoint=endpoint_url)
            self._log("debug", "Browser launched", endpoint=endpoint_url)

            with sync_playwright() as p:
                browser = p.chromium.connect_over_cdp(endpoint_url)
                context = browser.contexts[0]
                page = context.pages[0]
                
                # Initialize human behavior simulator
                human = HumanBehavior(page, self._sb, self.pretty) if cfg.simulate_human else None

                pages_data: List[PageData] = []
                visited_urls: set = set()
                all_contacts = ExtractedContact()
                
                # Track collected images (URL-based deduplication across all pages)
                seen_image_urls: set = set()
                all_collected_images: List[CollectedImage] = []

                # Track failure diagnostics
                failure_counts: Dict[str, int] = {"timeout": 0, "bot_blocked": 0, "connection": 0, "unknown": 0}
                failed_urls: List[Dict[str, Any]] = []
                
                # 2. Crawl homepage (depth 0)
                if self.pretty:
                    self.pretty.subheader("Crawling Homepage", "navigate")
                self._log("debug", "Navigating to homepage...", url=base_url)
                homepage_result = self._navigate_to_page(page, base_url, human, is_first_page=True)
                if not homepage_result.success:
                    self._log("warn", "Homepage navigation failed", url=base_url, 
                             error_type=homepage_result.error_type, error=homepage_result.error_message)
                    if self.pretty:
                        self.pretty.error(f"Homepage failed: {homepage_result.error_type}", url=base_url)
                    return {
                        "url": url,
                        "success": False,
                        "content": "",
                        "pagesCrawled": 0,
                        "blockedByBotProtection": homepage_result.error_type == "bot_blocked",
                        "diagnostics": {
                            "homepageError": homepage_result.error_type,
                            "homepageErrorMessage": homepage_result.error_message,
                            "homepageTitle": homepage_result.page_title,
                        }
                    }

                # Extract structured content from homepage
                homepage_data = self._extract_page_data(page, base_url, depth=0)
                pages_data.append(homepage_data)
                visited_urls.add(base_url)
                self._merge_contacts(all_contacts, homepage_data.contact_info)
                
                # Extract images from homepage (deduplication handled internally)
                homepage_images = self._extract_images(page, base_url, seen_image_urls)
                all_collected_images.extend(homepage_images)
                
                self._log("info", "Homepage crawled", 
                         title=homepage_data.title,
                         content_length=len(homepage_data.content),
                         emails_found=len(homepage_data.contact_info.emails),
                         phones_found=len(homepage_data.contact_info.phones),
                         relevance=homepage_data.relevance_score,
                         images_found=len(homepage_images))
                
                if self.pretty:
                    self.pretty.page_crawled(
                        url=base_url,
                        title=homepage_data.title,
                        content_length=len(homepage_data.content),
                        emails=len(homepage_data.contact_info.emails),
                        phones=len(homepage_data.contact_info.phones),
                        relevance=homepage_data.relevance_score,
                        images=len(homepage_images)
                    )

                # 3. Extract and prioritize links
                links = self._extract_links(page, base_url)
                prioritized_links = self._prioritize_links(links, base_url)
                
                self._log("debug", "Links extracted", 
                         total_links=len(links),
                         prioritized_count=len(prioritized_links))
                
                # Count by priority for pretty output
                if self.pretty:
                    contact_count = sum(1 for _, _, is_c, _, _ in prioritized_links if is_c)
                    high_count = sum(1 for _, p, is_c, _, _ in prioritized_links if not is_c and p >= 80)
                    medium_count = sum(1 for _, p, is_c, _, _ in prioritized_links if not is_c and 50 <= p < 80)
                    low_count = sum(1 for _, p, is_c, _, _ in prioritized_links if not is_c and 0 < p < 50)
                    self.pretty.links_found(
                        total=len(prioritized_links),
                        contact=contact_count,
                        high=high_count,
                        medium=medium_count,
                        low=low_count
                    )
                
                if cfg.debug:
                    for i, (link, priority, is_contact, category, is_hub) in enumerate(prioritized_links[:10]):
                        self._log("debug", f"  Link {i+1}", url=link, priority=priority, 
                                 is_contact=is_contact, category=category, is_hub=is_hub)
                
                # Initialize category cap counters
                category_counts: Dict[str, Dict[str, int]] = {
                    cat: {"hub": 0, "children": 0} for cat in self.CATEGORY_CAPS
                }

                # 4. Crawl additional pages (respecting max_pages and max_depth)
                if self.pretty and prioritized_links:
                    self.pretty.subheader(f"Crawling Subpages (max {cfg.max_pages})", "page")
                
                consecutive_failures = 0
                
                for link, priority, is_contact, category, is_hub in prioritized_links:
                    if len(pages_data) >= cfg.max_pages:
                        self._log("debug", "Max pages reached", max_pages=cfg.max_pages)
                        if self.pretty:
                            self.pretty.warning(f"Max pages limit reached ({cfg.max_pages})")
                        break
                    
                    # Stop if too many consecutive failures (likely being blocked)
                    if consecutive_failures >= cfg.max_consecutive_failures:
                        self._log("warn", "Too many consecutive failures, stopping crawl", 
                                 failures=consecutive_failures, 
                                 max_allowed=cfg.max_consecutive_failures)
                        if self.pretty:
                            self.pretty.error(f"Stopping: {consecutive_failures} consecutive failures (likely blocked)")
                        break

                    if link in visited_urls:
                        continue
                    
                    # Check category caps (dequeue-time enforcement)
                    if category and category in self.CATEGORY_CAPS:
                        caps = self.CATEGORY_CAPS[category]
                        counts = category_counts[category]
                        if is_hub:
                            if counts["hub"] >= caps["hub"]:
                                self._log("debug", "Skipping - hub cap reached", 
                                         url=link, category=category, cap=caps["hub"])
                                continue
                        else:
                            if counts["children"] >= caps["children"]:
                                self._log("debug", "Skipping - children cap reached", 
                                         url=link, category=category, cap=caps["children"])
                                continue

                    # Calculate depth (simplified: all linked from homepage = depth 1)
                    current_depth = 1
                    if current_depth > cfg.max_depth:
                        self._log("debug", "Skipping - exceeds max depth", url=link, depth=current_depth, max_depth=cfg.max_depth)
                        continue

                    # Human-like delay between pages (replaced fixed delay)
                    if human:
                        human.wait_between_pages()
                    else:
                        # Fallback: Gaussian delay around 2.5 seconds
                        delay = random.gauss(2.5, 0.75)
                        delay = max(1.0, min(delay, 5.0))
                        if self.pretty:
                            self.pretty.log("wait", f"Waiting {delay:.1f}s...")
                        self._log("debug", f"Waiting {delay:.1f}s before next page...")
                        time.sleep(delay)

                    self._log("debug", "Navigating to page", url=link, priority=priority, 
                             is_contact=is_contact, category=category, is_hub=is_hub)
                    
                    nav_result = self._navigate_to_page(page, link, human)
                    if nav_result.success:
                        consecutive_failures = 0  # Reset on success
                        page_data = self._extract_page_data(page, link, depth=current_depth)
                        page_data.is_contact_page = is_contact
                        pages_data.append(page_data)
                        visited_urls.add(link)
                        self._merge_contacts(all_contacts, page_data.contact_info)
                        
                        # Increment category counter after successful crawl
                        if category and category in category_counts:
                            if is_hub:
                                category_counts[category]["hub"] += 1
                            else:
                                category_counts[category]["children"] += 1
                        
                        # Extract images from this page (deduplication handled internally)
                        page_images = self._extract_images(page, link, seen_image_urls)
                        all_collected_images.extend(page_images)
                        
                        self._log("info", "Page crawled",
                                 url=link,
                                 title=page_data.title,
                                 is_contact=is_contact,
                                 content_length=len(page_data.content),
                                 emails_found=len(page_data.contact_info.emails),
                                 phones_found=len(page_data.contact_info.phones),
                                 relevance=page_data.relevance_score,
                                 images_new=len(page_images))
                        
                        if self.pretty:
                            self.pretty.page_crawled(
                                url=link,
                                title=page_data.title,
                                content_length=len(page_data.content),
                                emails=len(page_data.contact_info.emails),
                                phones=len(page_data.contact_info.phones),
                                relevance=page_data.relevance_score,
                                is_contact=is_contact,
                                images=len(page_images)
                            )
                    else:
                        consecutive_failures += 1
                        # Track failure diagnostics
                        error_type = nav_result.error_type or "unknown"
                        failure_counts[error_type] = failure_counts.get(error_type, 0) + 1
                        failed_urls.append({
                            "url": link,
                            "error": error_type,
                            "message": nav_result.error_message[:100] if nav_result.error_message else None
                        })
                        
                        self._log("warn", "Failed to navigate to page", 
                                 url=link, 
                                 error_type=error_type,
                                 consecutive_failures=consecutive_failures)
                        if self.pretty:
                            self.pretty.warning(f"Failed: {error_type} ({consecutive_failures}/{cfg.max_consecutive_failures})", url=link)

                # 5. Format content with section headers
                formatted_content = self._format_content(pages_data)

                # Truncate if too long
                if len(formatted_content) > cfg.max_content_length:
                    self._log("debug", "Content truncated", 
                             original_length=len(formatted_content),
                             max_length=cfg.max_content_length)
                    formatted_content = (
                        formatted_content[: cfg.max_content_length]
                        + "\n\n[Content truncated...]"
                    )

                # Build extracted contacts summary
                extracted_contacts = {
                    "emails": list(set(all_contacts.emails)),
                    "phones": list(set(all_contacts.phones)),
                    "socialLinks": all_contacts.social_links,
                }
                
                # Build diagnostics summary
                total_failures = sum(failure_counts.values())
                diagnostics = None
                if total_failures > 0:
                    diagnostics = {
                        "failedPages": total_failures,
                        "failuresByType": {k: v for k, v in failure_counts.items() if v > 0},
                        "stoppedEarly": consecutive_failures >= cfg.max_consecutive_failures,
                        "failedUrls": failed_urls[:5],  # First 5 failures for debugging
                    }
                
                # Build collected images list (camelCase for TypeScript)
                collected_images = [
                    {
                        "url": img.url,
                        "alt": img.alt,
                        "sourceUrl": img.source_url,
                    }
                    for img in all_collected_images
                ]
                
                self._log("info", "Crawl complete",
                         pages_crawled=len(pages_data),
                         failed_pages=total_failures,
                         failure_types=failure_counts,
                         total_emails=len(extracted_contacts["emails"]),
                         total_phones=len(extracted_contacts["phones"]),
                         social_platforms=list(extracted_contacts["socialLinks"].keys()),
                         content_length=len(formatted_content),
                         images_collected=len(collected_images))
                
                # Pretty summary
                if self.pretty:
                    self.pretty.crawl_complete(
                        pages=len(pages_data),
                        emails=extracted_contacts["emails"],
                        phones=extracted_contacts["phones"],
                        social=extracted_contacts["socialLinks"],
                        content_length=len(formatted_content),
                        images_collected=len(collected_images)
                    )
                    if diagnostics:
                        self.pretty.info(f"Failures: {total_failures} pages", 
                                        breakdown=diagnostics["failuresByType"],
                                        stopped_early=diagnostics["stoppedEarly"])

                # Detect service types if keywords provided
                detected_service_types = []
                if service_type_keywords:
                    detected_service_types = self._detect_service_types(pages_data, service_type_keywords)
                    if self.pretty and detected_service_types:
                        self.pretty.info(f"Service types detected: {len(detected_service_types)}")
                        for st in detected_service_types[:5]:
                            self.pretty.debug(f"  {st['slug']}: {st['confidence']:.0%} ({', '.join(st['matchedKeywords'][:3])})")

                result = {
                    "url": base_url,
                    "success": True,
                    "content": formatted_content,
                    "pagesCrawled": len(pages_data),
                    "extractedContacts": extracted_contacts,
                    "detectedServiceTypes": detected_service_types,
                    "collectedImages": collected_images,
                }
                if diagnostics:
                    result["diagnostics"] = diagnostics
                
                return result

        except Exception as e:
            self._log("error", "Crawl failed with exception", error=str(e))
            if self.pretty:
                self.pretty.error("Crawl failed with exception", error=str(e))
            return {
                "url": url,
                "success": False,
                "content": "",
                "pagesCrawled": 0,
                "error": str(e),
            }
        finally:
            if self._sb:
                try:
                    self._log("debug", "Stopping browser...")
                    self._sb.driver.stop()
                except Exception:
                    pass

    def _navigate_to_page(self, page: Page, url: str, 
                          human: Optional[HumanBehavior] = None,
                          is_first_page: bool = False) -> NavigationResult:
        """
        Navigate to URL with human-like behavior, handle bot detection, solve CAPTCHA if needed.
        
        The key anti-detection strategies:
        1. Pre-navigation ritual (mouse movement, small pause)
        2. Let page fully settle after load
        3. Post-navigation ritual (scrolling, reading simulation)
        4. Automatic CAPTCHA detection and solving via SeleniumBase
        """
        try:
            # Pre-navigation: simulate human "deciding" to click
            if human:
                human.pre_navigation_ritual()
                if self.pretty:
                    self.pretty.log("navigate", f"Navigating to page...")
            
            self._log("debug", "page.goto starting", url=url, timeout=self.config.page_timeout_ms)
            
            # Navigate using Playwright (SeleniumBase handles the stealth)
            page.goto(url, wait_until="domcontentloaded", timeout=self.config.page_timeout_ms)
            
            # Wait for network to settle (more patient than networkidle)
            try:
                page.wait_for_load_state("networkidle", timeout=10000)
            except Exception:
                pass  # Page might not reach networkidle, that's okay
            
            self._log("debug", "page.goto complete")
            
            # Post-navigation: human behavior simulation
            if human:
                human.post_navigation_ritual(is_first_page=is_first_page)
            else:
                # Fallback: basic settle time
                time.sleep(2)

            # Check for bot detection AFTER human behavior (gives JS time to run)
            if self._is_bot_blocked(page):
                page_title = page.title() if page else None
                self._log("debug", "Bot detection triggered, attempting CAPTCHA solve...", page_title=page_title)
                if self.pretty:
                    self.pretty.warning("Bot detection triggered, solving CAPTCHA...")
                
                if self._sb:
                    try:
                        # SeleniumBase's CAPTCHA solver handles Cloudflare, reCAPTCHA, etc.
                        self._sb.solve_captcha()
                        
                        # Wait for CAPTCHA resolution
                        if human:
                            human.wait_after_navigation(is_first_page=False)
                        else:
                            time.sleep(3)
                        
                        self._log("debug", "CAPTCHA solve attempted")
                        if self.pretty:
                            self.pretty.success("CAPTCHA solve attempted")
                    except Exception as e:
                        self._log("debug", "CAPTCHA solve failed", error=str(e))

                # Check again
                if self._is_bot_blocked(page):
                    self._log("warn", "Still blocked after CAPTCHA attempt", url=url)
                    return NavigationResult(
                        success=False,
                        error_type="bot_blocked",
                        error_message="Bot detection triggered, CAPTCHA solve failed",
                        page_title=page_title
                    )

            self._log("debug", "Navigation successful", url=url)
            return NavigationResult(success=True)
            
        except Exception as e:
            error_str = str(e)
            # Classify error type
            if "Timeout" in error_str:
                error_type = "timeout"
            elif "net::" in error_str or "Connection" in error_str:
                error_type = "connection"
            else:
                error_type = "unknown"
            
            self._log("error", "Navigation failed", url=url, error=error_str, error_type=error_type)
            return NavigationResult(
                success=False,
                error_type=error_type,
                error_message=error_str[:200]  # Truncate long errors
            )

    def _extract_page_data(self, page: Page, url: str, depth: int) -> PageData:
        """Extract structured data from a page."""
        self._log("debug", "Extracting page data...", url=url)
        
        title = ""
        try:
            title = page.title() or "Untitled"
        except Exception:
            pass
        
        # Extract header content
        header_content = self._extract_section(page, "header")
        self._log("debug", "Header extracted", length=len(header_content))
        
        # Extract footer content  
        footer_content = self._extract_section(page, "footer")
        self._log("debug", "Footer extracted", length=len(footer_content))
        
        # Extract main content (excluding header/footer)
        main_content = self._extract_content(page)
        self._log("debug", "Main content extracted", length=len(main_content))
        
        # Extract contact info from all sections
        all_text = f"{header_content} {footer_content} {main_content}"
        contact_info = self._extract_contact_info(page, all_text)
        
        # Calculate relevance score
        relevance_score = self._calculate_relevance(all_text)
        
        # Combine content with structure markers
        combined_content = main_content
        if header_content:
            combined_content = f"[HEADER]\n{header_content}\n[/HEADER]\n\n{combined_content}"
        if footer_content:
            combined_content = f"{combined_content}\n\n[FOOTER]\n{footer_content}\n[/FOOTER]"
        
        return PageData(
            url=url,
            title=title,
            depth=depth,
            content=combined_content,
            header_content=header_content,
            footer_content=footer_content,
            contact_info=contact_info,
            relevance_score=relevance_score,
        )

    def _extract_section(self, page: Page, section: str) -> str:
        """Extract content from header or footer section."""
        selectors = {
            "header": ['header', '.header', '[role="banner"]', '.site-header', '#header'],
            "footer": ['footer', '.footer', '[role="contentinfo"]', '.site-footer', '#footer'],
        }
        
        for selector in selectors.get(section, []):
            try:
                content = page.evaluate(f"""
                    () => {{
                        const el = document.querySelector('{selector}');
                        if (!el) return '';
                        
                        // Clone to avoid modifying original
                        const clone = el.cloneNode(true);
                        
                        // Remove scripts and styles
                        clone.querySelectorAll('script, style, noscript').forEach(e => e.remove());
                        
                        return clone.innerText || '';
                    }}
                """)
                if content and len(content.strip()) > 10:
                    # Clean up whitespace
                    content = re.sub(r'\s+', ' ', content)
                    return content.strip()
            except Exception:
                continue
        
        return ""

    def _extract_content(self, page: Page) -> str:
        """Extract main page content using Playwright."""
        try:
            # Remove noise elements via JavaScript, but preserve header/footer for separate extraction
            content = page.evaluate(
                """
                () => {
                    // Clone body to avoid modifying the page
                    const body = document.body.cloneNode(true);
                    
                    const selectorsToRemove = [
                        'script', 'style', 'noscript', 'iframe', 'svg',
                        'aside', 'nav',
                        '.cookie-banner', '.popup', '.modal', '.advertisement',
                        '.ad', '.ads', '[class*="cookie"]', '[class*="popup"]',
                        'header', 'footer', '.header', '.footer'
                    ];
                    selectorsToRemove.forEach(selector => {
                        body.querySelectorAll(selector).forEach(el => el.remove());
                    });

                    return body.innerText || '';
                }
            """
            )

            # Clean up whitespace
            content = re.sub(r"\s+", " ", content)
            content = re.sub(r"\n\s*\n", "\n", content)
            return content.strip()
        except Exception as e:
            self._log("error", "Content extraction failed", error=str(e))
            return ""

    def _extract_contact_info(self, page: Page, text: str) -> ExtractedContact:
        """Extract contact information from page and text."""
        contact = ExtractedContact()
        
        # 1. Extract emails from text using regex
        emails = self.EMAIL_PATTERN.findall(text)
        # Filter out image files and common false positives
        contact.emails = [
            e for e in emails 
            if not any(e.lower().endswith(ext) for ext in ['.png', '.jpg', '.gif', '.webp', '.svg'])
            and not e.lower().startswith('example@')
        ]
        
        # 2. Extract phones from text using regex
        for pattern in self.PHONE_PATTERNS:
            phones = pattern.findall(text)
            contact.phones.extend(phones)
        contact.phones = list(set(contact.phones))  # Dedupe
        
        # 3. Extract from mailto: and tel: links
        try:
            link_data = page.evaluate("""
                () => {
                    const data = { emails: [], phones: [], social: {} };
                    
                    // mailto links
                    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
                        const email = a.href.replace('mailto:', '').split('?')[0];
                        if (email && !data.emails.includes(email)) {
                            data.emails.push(email);
                        }
                    });
                    
                    // tel links
                    document.querySelectorAll('a[href^="tel:"]').forEach(a => {
                        const phone = a.href.replace('tel:', '').replace(/[^0-9+]/g, '');
                        if (phone && !data.phones.includes(phone)) {
                            data.phones.push(phone);
                        }
                    });
                    
                    // Social media links
                    const socialPatterns = {
                        facebook: /facebook\\.com/i,
                        instagram: /instagram\\.com/i,
                        twitter: /twitter\\.com|x\\.com/i,
                        linkedin: /linkedin\\.com/i,
                        youtube: /youtube\\.com/i,
                        yelp: /yelp\\.com/i,
                    };
                    
                    document.querySelectorAll('a[href]').forEach(a => {
                        const href = a.href;
                        for (const [platform, pattern] of Object.entries(socialPatterns)) {
                            if (pattern.test(href) && !data.social[platform]) {
                                data.social[platform] = href;
                            }
                        }
                    });
                    
                    return data;
                }
            """)
            
            # Merge with regex-extracted data
            for email in link_data.get("emails", []):
                if email not in contact.emails:
                    contact.emails.append(email)
            
            for phone in link_data.get("phones", []):
                if phone not in contact.phones:
                    contact.phones.append(phone)
            
            contact.social_links = link_data.get("social", {})
            
        except Exception as e:
            self._log("debug", "Link extraction failed", error=str(e))
        
        self._log("debug", "Contact info extracted",
                 emails=contact.emails,
                 phones=contact.phones,
                 social=list(contact.social_links.keys()))
        
        return contact

    def _calculate_relevance(self, text: str) -> float:
        """Calculate relevance score based on concrete-related keywords."""
        text_lower = text.lower()
        
        # Count keyword occurrences
        keyword_count = sum(1 for kw in self.CONCRETE_KEYWORDS if kw in text_lower)
        
        # Normalize to 0-1 scale (10+ keywords = max score)
        score = min(keyword_count / 10.0, 1.0)
        
        return round(score, 2)

    def _merge_contacts(self, target: ExtractedContact, source: ExtractedContact):
        """Merge contact info from source into target."""
        for email in source.emails:
            if email not in target.emails:
                target.emails.append(email)
        
        for phone in source.phones:
            if phone not in target.phones:
                target.phones.append(phone)
        
        for platform, url in source.social_links.items():
            if platform not in target.social_links:
                target.social_links[platform] = url

    # External service domains to skip when collecting images
    EXTERNAL_SERVICE_PATTERNS = [
        "maps.googleapis.com",
        "maps.gstatic.com", 
        "google.com/maps",
        "googleusercontent.com",
        "facebook.com",
        "fbcdn.net",
        "twitter.com",
        "twimg.com",
        "instagram.com",
        "cdninstagram.com",
        "linkedin.com",
        "youtube.com",
        "ytimg.com",
        "yelp.com",
        "yelpcdn.com",
        "bbb.org",
        "homeadvisor.com",
        "angieslist.com",
        "angi.com",
        "houzz.com",
        "thumbtack.com",
        "googleapis.com/maps",
        "tile.openstreetmap.org",
        "api.mapbox.com",
        "google-analytics.com",
        "googletagmanager.com",
        "doubleclick.net",
        "facebook.net",
        "connect.facebook.net",
        "platform.twitter.com",
        "gravatar.com",
        "wp.com/latex",  # WordPress LaTeX images
        "pixel.",  # Tracking pixels
        "beacon.",
        "track.",
        "analytics.",
    ]

    def _is_external_service_image(self, url: str) -> bool:
        """Check if URL is from an external service we should skip."""
        url_lower = url.lower()
        return any(pattern in url_lower for pattern in self.EXTERNAL_SERVICE_PATTERNS)

    def _extract_images(self, page: Page, source_url: str, seen_urls: set) -> List[CollectedImage]:
        """
        Extract image URLs from page.
        
        Uses currentSrc (actual rendered image after srcset evaluation) with fallbacks
        to src and common lazy-load data attributes.
        
        Args:
            page: Playwright page object
            source_url: URL of the page being extracted (for tracking where image was found)
            seen_urls: Set of already-collected image URLs (for deduplication)
            
        Returns:
            List of newly collected images (not in seen_urls)
        """
        try:
            # Extract all images via JavaScript
            # Priority: currentSrc > src > data-src > data-lazy-src > data-original
            raw_images = page.evaluate("""
                () => {
                    const images = [];
                    document.querySelectorAll('img').forEach(img => {
                        // Get the best available URL
                        // currentSrc = actual rendered image after srcset/lazy-load
                        // src = standard attribute
                        // data-* = common lazy-load patterns
                        const url = img.currentSrc 
                            || img.src 
                            || img.getAttribute('data-src')
                            || img.getAttribute('data-lazy-src')
                            || img.getAttribute('data-original')
                            || '';
                        
                        if (url) {
                            // Resolve to absolute URL using document.baseURI
                            let absoluteUrl = url;
                            try {
                                absoluteUrl = new URL(url, document.baseURI).href;
                            } catch (e) {
                                // Invalid URL, skip
                                return;
                            }
                            
                            images.push({
                                url: absoluteUrl,
                                alt: img.alt || ''
                            });
                        }
                    });
                    return images;
                }
            """)
            
            collected = []
            for img_data in raw_images:
                url = img_data.get("url", "")
                
                # Skip data: and blob: URLs (not fetchable, often placeholders)
                if url.startswith("data:") or url.startswith("blob:"):
                    continue
                
                # Skip external service URLs (maps, analytics, tracking, etc.)
                if self._is_external_service_image(url):
                    continue
                
                # Normalize: strip fragment only, keep query params (CDNs use them)
                parsed = urlparse(url)
                normalized_url = parsed._replace(fragment="").geturl()
                
                # Skip if already seen
                if normalized_url in seen_urls:
                    continue
                
                # Add to seen set and collected list
                seen_urls.add(normalized_url)
                collected.append(CollectedImage(
                    url=normalized_url,
                    alt=img_data.get("alt", ""),
                    source_url=source_url
                ))
            
            return collected
            
        except Exception as e:
            self._log("debug", "Image extraction failed", error=str(e), url=source_url)
            return []

    def _extract_links(self, page: Page, base_url: str) -> List[Tuple[str, str]]:
        """Extract and filter links for crawling. Returns (url, anchor_text) tuples."""
        try:
            base_host = urlparse(base_url).netloc

            # Get all anchor tags
            raw_links = page.evaluate(
                """
                () => {
                    const links = [];
                    document.querySelectorAll('a[href]').forEach(a => {
                        const href = a.getAttribute('href');
                        const text = a.textContent?.trim() || '';
                        if (href && text) {
                            links.push({ href, text });
                        }
                    });
                    return links;
                }
            """
            )

            # Filter and normalize links
            seen: set = set()
            valid_links: List[Tuple[str, str]] = []

            for link_data in raw_links:
                href = link_data.get("href", "")
                text = link_data.get("text", "")

                # Resolve relative URLs
                absolute_url = self._resolve_url(href, base_url)
                if not absolute_url:
                    continue

                # Skip external links
                try:
                    link_host = urlparse(absolute_url).netloc
                    if link_host != base_host:
                        continue
                except Exception:
                    continue

                # Skip if matches skip patterns
                combined_text = f"{href} {text}".lower()
                if any(pattern in combined_text for pattern in self.SKIP_PATTERNS):
                    continue

                # Dedupe
                if absolute_url in seen:
                    continue
                seen.add(absolute_url)

                valid_links.append((absolute_url, text))

            return valid_links
        except Exception as e:
            self._log("error", "Link extraction failed", error=str(e))
            return []

    def _canonicalize_url(self, url: str) -> str:
        """
        Canonicalize URL for deduplication.
        - Strip trailing slash (except for root)
        - Lowercase scheme and host
        - Remove fragments
        - Remove common tracking params
        """
        try:
            parsed = urlparse(url)
            
            # Normalize path: strip trailing slash except for root
            path = parsed.path
            if path != "/" and path.endswith("/"):
                path = path.rstrip("/")
            
            # Remove common tracking params
            tracking_params = {"utm_source", "utm_medium", "utm_campaign", "utm_term", 
                            "utm_content", "gclid", "fbclid", "ref", "source"}
            if parsed.query:
                from urllib.parse import parse_qs, urlencode
                params = parse_qs(parsed.query, keep_blank_values=True)
                filtered = {k: v for k, v in params.items() if k.lower() not in tracking_params}
                query = urlencode(filtered, doseq=True) if filtered else ""
            else:
                query = ""
            
            # Rebuild URL without fragment
            canonical = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{path}"
            if query:
                canonical += f"?{query}"
            
            return canonical
        except Exception:
            return url

    def _classify_link(self, url: str, anchor_text: str) -> Tuple[Optional[str], bool, bool]:
        """
        Classify a link into a category.
        
        Returns: (category, is_hub, has_concrete_keyword)
        - category: 'contact', 'about', 'services', 'gallery', 'portfolio', 'locations', or None
        - is_hub: True if this is a hub page (e.g., /services), False if child (e.g., /services/driveways)
        - has_concrete_keyword: True if URL or anchor contains concrete service keyword
        """
        parsed = urlparse(url)
        path = parsed.path.lower().strip("/")
        segments = [s for s in path.split("/") if s]
        anchor_lower = anchor_text.lower()
        
        # Check for concrete service keywords
        combined = f"{path} {anchor_lower}"
        has_concrete_keyword = any(kw in combined for kw in self.CONCRETE_SERVICE_KEYWORDS)
        
        # Try to match category from path segments and anchor
        matched_category = None
        match_segment_index = -1
        
        for category, synonyms in self.CATEGORY_SYNONYMS.items():
            # Check path segments
            for i, segment in enumerate(segments):
                if segment in synonyms or any(syn in segment for syn in synonyms):
                    matched_category = category
                    match_segment_index = i
                    break
            
            # Check anchor text if no path match
            if not matched_category:
                if any(syn in anchor_lower for syn in synonyms):
                    matched_category = category
                    match_segment_index = 0
                    break
            
            if matched_category:
                break
        
        # If URL has concrete keyword at root level, treat as services child
        if not matched_category and has_concrete_keyword and len(segments) <= 1:
            matched_category = "services"
            match_segment_index = 0
        
        # Determine if hub or child
        is_hub = False
        if matched_category:
            # Hub: category term is last segment OR only 1-2 segments total
            if len(segments) <= 1:
                is_hub = True
            elif match_segment_index == len(segments) - 1:
                is_hub = True
            # Child: has segments after the category term
            else:
                is_hub = False
        
        return (matched_category, is_hub, has_concrete_keyword)

    def _prioritize_links(self, links: List[Tuple[str, str]], base_url: str) -> List[Tuple[str, int, bool, Optional[str], bool]]:
        """
        Sort links by priority with intelligent category-based scoring.
        
        Returns: List of (url, priority_score, is_contact_page, category, is_hub) tuples.
        
        Priority levels:
        - 100: Contact pages (must-crawl)
        - 90: Service pages with concrete keywords
        - 85: Service hub
        - 80: About pages
        - 75: Portfolio/gallery hubs
        - 70: Portfolio/gallery children
        - 60: Locations hub
        - 50: Service children
        - 10: Generic/other pages
        - -100: Skip (location children, blog, etc.)
        """
        prioritized: List[Tuple[str, int, bool, Optional[str], bool]] = []
        seen_canonical: set = set()

        for link, text in links:
            # Canonicalize for deduplication
            canonical = self._canonicalize_url(link)
            if canonical in seen_canonical:
                continue
            seen_canonical.add(canonical)
            
            # Skip patterns
            combined = f"{link} {text}".lower()
            if any(pattern in combined for pattern in self.SKIP_PATTERNS):
                continue
            
            # Classify the link
            category, is_hub, has_concrete_keyword = self._classify_link(link, text)
            is_contact = (category == "contact")
            
            # Base priority scoring
            if is_contact:
                priority = 100
            elif category == "services":
                if is_hub:
                    priority = 85
                elif has_concrete_keyword:
                    priority = 90
                else:
                    priority = 50
            elif category == "about":
                priority = 80
            elif category in ("portfolio", "gallery"):
                priority = 75 if is_hub else 70
            elif category == "locations":
                if is_hub:
                    priority = 60
                else:
                    priority = -100  # Skip location children entirely
            else:
                # Generic page
                priority = 10
            
            # Boost if anchor contains concrete keyword (1.5x only for relevant anchors)
            anchor_lower = text.lower()
            is_generic_anchor = any(ga in anchor_lower for ga in self.GENERIC_ANCHORS)
            if has_concrete_keyword and not is_generic_anchor and priority > 0:
                priority = min(priority + 15, 100)
            
            # Penalize deep paths slightly
            path_depth = link.count('/') - 3
            if priority > 0:
                priority -= max(0, path_depth * 2)
            
            prioritized.append((link, priority, is_contact, category, is_hub))

        # Sort by priority (highest first)
        prioritized.sort(key=lambda x: x[1], reverse=True)
        
        return prioritized

    def _is_bot_blocked(self, page: Page) -> bool:
        """Check if page shows bot detection."""
        try:
            title = page.title().lower()
            body_text = ""
            try:
                body_text = page.inner_text("body")[:500].lower()
            except Exception:
                pass
            
            combined = f"{title} {body_text}"
            blocked = any(keyword in combined for keyword in self.BOT_DETECTION_KEYWORDS)
            
            if blocked:
                self._log("debug", "Bot detection keywords found", title=title[:50])
            
            return blocked
        except Exception:
            return False

    def _format_content(self, pages_data: List[PageData]) -> str:
        """
        Format crawled content with section headers.

        Example output:
        === HOMEPAGE ===
        [content]

        === CONTACT (https://example.com/contact) ===
        [content]
        
        === SERVICES (https://example.com/services) ===
        [content]
        """
        sections = []
        
        # Sort: homepage first, then contact pages, then by relevance
        sorted_pages = sorted(
            pages_data,
            key=lambda p: (p.depth == 0, p.is_contact_page, p.relevance_score),
            reverse=True
        )
        
        for page_data in sorted_pages:
            if page_data.depth == 0:
                header = "=== HOMEPAGE ==="
            elif page_data.is_contact_page:
                header = f"=== CONTACT ({page_data.url}) ==="
            else:
                title = page_data.title.upper() if page_data.title else "UNTITLED"
                header = f"=== {title} ({page_data.url}) ==="

            content = page_data.content
            sections.append(f"{header}\n{content}\n")

        return "\n".join(sections)

    def _detect_service_types(
        self, 
        pages_data: List[PageData], 
        service_type_keywords: List[ServiceTypeKeyword]
    ) -> List[Dict[str, Any]]:
        """
        Detect service types from crawled pages using keyword matching.
        
        Confidence scoring per service type:
        - URL path contains keyword: +0.4 (high signal)
        - Page title contains keyword: +0.3
        - Content keyword match: +0.1 per keyword (capped at 0.3)
        
        Returns matches with confidence >= 0.4
        """
        service_scores: Dict[str, Dict] = {}
        
        for st in service_type_keywords:
            slug = st.slug
            keywords = [kw.lower() for kw in st.keywords]
            
            if not keywords:
                continue
                
            service_scores[slug] = {
                "confidence": 0.0,
                "matched_keywords": set(),
                "source_urls": set(),
            }
            
            for page in pages_data:
                url_path = urlparse(page.url).path.lower()
                title_lower = page.title.lower() if page.title else ""
                content_lower = page.content.lower()
                
                page_contributed = False
                
                for keyword in keywords:
                    kw_lower = keyword.lower()
                    
                    # URL path match - highest signal
                    # Match as path segment (e.g., /driveways or /driveways/)
                    url_pattern = f"/{kw_lower.replace(' ', '-')}"
                    if url_pattern in url_path or f"/{kw_lower.replace(' ', '_')}" in url_path:
                        service_scores[slug]["confidence"] += 0.4
                        service_scores[slug]["matched_keywords"].add(keyword)
                        service_scores[slug]["source_urls"].add(page.url)
                        page_contributed = True
                        continue  # Don't double-count same keyword
                    
                    # Title match - medium signal
                    if kw_lower in title_lower:
                        service_scores[slug]["confidence"] += 0.3
                        service_scores[slug]["matched_keywords"].add(keyword)
                        if not page_contributed:
                            service_scores[slug]["source_urls"].add(page.url)
                            page_contributed = True
                        continue
                    
                    # Content match - lower signal, capped contribution per page
                    if kw_lower in content_lower:
                        # Cap content contribution at 0.1 per keyword, 0.3 per page
                        current_content_score = min(0.1, 0.3 - (service_scores[slug]["confidence"] % 0.3))
                        if current_content_score > 0:
                            service_scores[slug]["confidence"] += current_content_score
                            service_scores[slug]["matched_keywords"].add(keyword)
                            if not page_contributed:
                                service_scores[slug]["source_urls"].add(page.url)
                                page_contributed = True
        
        # Filter and format results (confidence >= 0.4)
        results = []
        for slug, data in service_scores.items():
            confidence = min(data["confidence"], 1.0)  # Cap at 1.0
            if confidence >= 0.4:
                results.append({
                    "slug": slug,
                    "confidence": round(confidence, 2),
                    "matchedKeywords": sorted(list(data["matched_keywords"])),
                    "sourceUrls": sorted(list(data["source_urls"])),
                })
        
        # Sort by confidence descending
        results.sort(key=lambda x: x["confidence"], reverse=True)
        
        self._log("debug", f"Service type detection complete", 
                 total_types=len(service_type_keywords),
                 detected=len(results))
        
        return results

    def _normalize_url(self, url: str) -> Optional[str]:
        """Normalize a URL to a standard format."""
        try:
            # Reject empty or whitespace-only URLs
            if not url or not url.strip():
                return None

            url = url.strip()

            # Add protocol if missing
            if not url.startswith("http://") and not url.startswith("https://"):
                url = "https://" + url

            parsed = urlparse(url)

            # Must have a valid netloc (domain)
            if not parsed.netloc:
                return None

            # Return base URL without trailing slash
            normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
            return normalized
        except Exception:
            return None

    def _resolve_url(self, href: str, base: str) -> Optional[str]:
        """Resolve a relative URL to absolute."""
        try:
            return urljoin(base, href)
        except Exception:
            return None
