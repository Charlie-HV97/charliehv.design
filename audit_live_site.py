#!/usr/bin/env python3
"""Audit all images and layouts across charliehv.design against local site."""

import os
import sys
import time
import json
import urllib.parse
from playwright.sync_api import sync_playwright

BASE_URL = "https://www.charliehv.design"
PASSWORD = "CharlieHV"

PROJECT_PAGES = [
    "loyalty-and-strategy",
    "point-of-sale",
    "ux-research",
    "creative-direction",
    "design-systems-engineering",
    "specialty-pharmacy",
    "furniture-design",
    "work",
]

def auto_scroll(page):
    """Scroll down to trigger lazy loading of all images."""
    page.evaluate("""
        async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        }
    """)
    time.sleep(2)
    # Scroll back to top
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(1)

def extract_page_elements(page):
    """Extract ordered DOM content including headings, paragraphs, and images."""
    return page.evaluate("""
        () => {
            const items = [];
            const container = document.querySelector('main, .project-content, .content, body') || document.body;
            
            // Query all content blocks, modules, and images
            const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, img, picture, figure, .project-module, .image-module, .text-module');
            
            const seenImages = new Set();

            for (const el of elements) {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                
                if (el.tagName === 'IMG') {
                    const src = el.currentSrc || el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-srcset');
                    if (src && !seenImages.has(src) && !src.includes('data:image/svg+xml') && !src.includes('favicon')) {
                        seenImages.add(src);
                        items.push({
                            type: 'image',
                            src: src,
                            alt: el.getAttribute('alt') || '',
                            width: el.naturalWidth || el.width,
                            height: el.naturalHeight || el.height,
                            className: el.className || '',
                        });
                    }
                } else if (['H1','H2','H3','H4','H5','H6'].includes(el.tagName)) {
                    const text = el.innerText.trim();
                    if (text) {
                        items.push({
                            type: 'heading',
                            level: el.tagName.toLowerCase(),
                            text: text
                        });
                    }
                } else if (el.tagName === 'P') {
                    const text = el.innerText.trim();
                    if (text && text.length > 2) {
                        items.push({
                            type: 'paragraph',
                            text: text
                        });
                    }
                }
            }
            return items;
        }
    """)

def main():
    report = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print("Opening homepage to enter password...")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)

        # Check for password
        pwd_input = page.query_selector('input[type="password"]')
        if pwd_input:
            print("Entering password...")
            pwd_input.fill(PASSWORD)
            btn = page.query_selector('button[type="submit"], input[type="submit"], form button')
            if btn:
                btn.click()
            else:
                pwd_input.press("Enter")
            page.wait_for_load_state("networkidle", timeout=15000)
            time.sleep(3)

        # Check navigation links on live site to see the exact href for photography!
        nav_links = page.evaluate("""
            () => {
                const links = [];
                document.querySelectorAll('a').forEach(a => {
                    links.push({
                        text: a.innerText ? a.innerText.trim() : '',
                        href: a.getAttribute('href') || ''
                    });
                });
                return links;
            }
        """)
        print("\nAll nav links found on live site:")
        for l in nav_links:
            if l['text']:
                print(f"  [{l['text']}] -> {l['href']}")

        # Look specifically for Photography link
        photo_link = None
        for l in nav_links:
            if 'photo' in l['text'].lower() or 'photo' in l['href'].lower():
                photo_link = l
                print(f"\n--> Found Photography link target: {l}")
                break

        pages_to_audit = list(PROJECT_PAGES)
        if photo_link and photo_link['href'] and photo_link['href'] not in pages_to_audit:
            clean_href = photo_link['href'].strip('/')
            if clean_href not in pages_to_audit:
                pages_to_audit.append(clean_href)

        for slug in pages_to_audit:
            url = f"{BASE_URL}/{slug}" if not slug.startswith('http') else slug
            print(f"\n==========================================")
            print(f"Auditing: {url}")
            try:
                resp = page.goto(url, wait_until="networkidle", timeout=25000)
                time.sleep(2)

                # Check if password prompt reappeared
                pwd_input = page.query_selector('input[type="password"]')
                if pwd_input:
                    pwd_input.fill(PASSWORD)
                    pwd_input.press("Enter")
                    page.wait_for_load_state("networkidle", timeout=15000)
                    time.sleep(2)

                if resp and resp.status == 404:
                    print("  404 Not Found")
                    report[slug] = {"status": 404, "images": []}
                    continue

                auto_scroll(page)
                elements = extract_page_elements(page)

                images = [e for e in elements if e['type'] == 'image']
                print(f"  Found {len(images)} images on this page.")
                for idx, img in enumerate(images, 1):
                    src_clean = img['src'].split('?')[0]
                    filename = src_clean.split('/')[-1]
                    print(f"    [{idx}] {filename} ({img.get('width')}x{img.get('height')})")

                report[slug] = {
                    "status": 200,
                    "url": page.url,
                    "title": page.title(),
                    "image_count": len(images),
                    "images": images,
                    "elements": elements
                }

            except Exception as e:
                print(f"  Error loading {url}: {e}")
                report[slug] = {"error": str(e), "images": []}

        browser.close()

    output_path = "/tmp/charliehv_audit.json"
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nAudit complete! Saved to {output_path}")

if __name__ == "__main__":
    main()
