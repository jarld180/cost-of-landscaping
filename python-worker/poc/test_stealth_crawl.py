#!/usr/bin/env python3
import sys
import time
import os
from playwright.sync_api import sync_playwright
from seleniumbase import sb_cdp


def crawl_site(url: str, timeout_seconds: int = 30) -> dict:
    sb = None
    try:
        sb = sb_cdp.Chrome(locale="en")
        endpoint_url = sb.get_endpoint_url()
        
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(endpoint_url)
            context = browser.contexts[0]
            page = context.pages[0]
            
            try:
                page.goto(url, wait_until="networkidle", timeout=timeout_seconds * 1000)
            except Exception as e:
                print(f"    Navigation error: {str(e)}")
                return {
                    "url": url,
                    "success": False,
                    "error": f"Navigation failed: {str(e)}",
                }
            
            time.sleep(2)
            
            title = page.title().lower()
            
            blocked_keywords = ['403', 'cloudflare', 'just a moment', 'access denied', 'blocked']
            is_blocked = any(keyword in title for keyword in blocked_keywords)
            
            if is_blocked:
                try:
                    sb.solve_captcha()
                    time.sleep(2)
                    title = page.title().lower()
                    is_blocked = any(keyword in title for keyword in blocked_keywords)
                except Exception as e:
                    print(f"    CAPTCHA solve error: {str(e)}")
            
            try:
                content = page.inner_text("body")
            except Exception as e:
                content = ""
                print(f"    Content extraction error: {str(e)}")
            
            content_length = len(content) if content else 0
            
            return {
                "url": url,
                "title": title,
                "content_length": content_length,
                "blocked": is_blocked,
                "success": not is_blocked and content_length > 500,
            }
    except Exception as e:
        return {
            "url": url,
            "success": False,
            "error": str(e),
        }
    finally:
        if sb:
            try:
                sb.driver.stop()
            except:
                pass


def main():
    sites = [
        "https://www.bing.com/turing/captcha/challenge",
        "https://www.cloudflare.com/login",
    ]
    
    results = []
    
    for site in sites:
        print(f"\nTesting Site: {site}")
        try:
            result = crawl_site(site, timeout_seconds=30)
            results.append(result)
            
            if result.get("success"):
                print(f"  Title: {result.get('title', 'N/A')}")
                print(f"  Content length: {result.get('content_length', 0)} characters")
                print(f"  Bot detection: {'YES' if result.get('blocked') else 'NO'}")
                print(f"  Result: PASS")
            else:
                error = result.get("error", "Unknown error")
                print(f"  Error: {error}")
                print(f"  Result: FAIL")
        except Exception as e:
            print(f"  EXCEPTION: {str(e)}")
            results.append({
                "url": site,
                "success": False,
                "error": str(e),
            })
    
    passed = sum(1 for r in results if r.get("success", False))
    total = len(results)
    
    print(f"\n{'='*60}")
    if passed == total:
        print(f"Overall: ✅ POC PASSED ({passed}/{total} sites)")
    else:
        print(f"Overall: ❌ POC FAILED ({passed}/{total} sites)")
    print(f"{'='*60}")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
