#!/usr/bin/env python3
"""Download all images from live site audit into site/public/images/"""

import os
import json
import urllib.parse
import urllib.request
import time

AUDIT_PATH = "/tmp/charliehv_audit.json"
BASE_DIR = "/Users/charlieherbozo-vidal/Desktop/ME/CharlieHV.Design/site/public/images"

def main():
    with open(AUDIT_PATH) as f:
        audit = json.load(f)

    # Slug mapping to public image directories
    dir_map = {
        "loyalty-and-strategy": "lnp",
        "point-of-sale": "pos",
        "ux-research": "uxr",
        "creative-direction": "creative-direction",
        "design-systems-engineering": "dse",
        "specialty-pharmacy": "sprx",
        "furniture-design": "furniture",
        "work": "covers"
    }

    manifest = {}

    for slug, folder_name in dir_map.items():
        if slug not in audit:
            continue
        page_data = audit[slug]
        images = page_data.get("images", [])
        dest_dir = os.path.join(BASE_DIR, folder_name)
        os.makedirs(dest_dir, exist_ok=True)

        print(f"\nDownloading {len(images)} images for {slug} into {dest_dir}...")
        page_manifest = []

        for idx, img in enumerate(images, 1):
            src = img["src"]
            # Clean URL: strip query parameters for download
            clean_url = src.split("?")[0]
            ext = os.path.splitext(clean_url)[1] or ".png"
            if "?" in ext:
                ext = ext.split("?")[0]

            filename = f"live_{idx:02d}{ext}"
            filepath = os.path.join(dest_dir, filename)

            # Download if not exists or small
            try:
                if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
                    req = urllib.request.Request(
                        src,
                        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
                    )
                    with urllib.request.urlopen(req, timeout=30) as resp, open(filepath, "wb") as out:
                        out.write(resp.read())
                    print(f"  [{idx}/{len(images)}] Downloaded: {filename} ({img.get('width')}x{img.get('height')})")
                    time.sleep(0.1)
                else:
                    print(f"  [{idx}/{len(images)}] Already exists: {filename}")

                web_path = f"/images/{folder_name}/{filename}"
                page_manifest.append({
                    "index": idx,
                    "filename": filename,
                    "web_path": web_path,
                    "width": img.get("width"),
                    "height": img.get("height"),
                    "orig_src": src
                })
            except Exception as e:
                print(f"  [ERROR] {filename} from {src}: {e}")

        manifest[slug] = page_manifest

    # Also handle the photography cover from work page
    if "work" in manifest and len(manifest["work"]) >= 8:
        photo_cover = manifest["work"][7] # 8th cover is photography
        photo_dir = os.path.join(BASE_DIR, "photography")
        os.makedirs(photo_dir, exist_ok=True)
        photo_cover_dest = os.path.join(photo_dir, "cover.jpg")
        import shutil
        src_path = os.path.join(BASE_DIR, "covers", photo_cover["filename"])
        if os.path.exists(src_path):
            shutil.copyfile(src_path, photo_cover_dest)
            print(f"\n--> Successfully set {photo_cover_dest} from work cover image #8!")

    manifest_path = "/tmp/charliehv_download_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nAll downloads completed! Manifest written to {manifest_path}")

if __name__ == "__main__":
    main()
