import os
import sys
import json
import re
import urllib.request
import ssl
import time

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "manabi_assets")
POSTERS_EIGO5 = os.path.join(OUT_DIR, "posters", "eigo5")
POSTERS_EIGO6 = os.path.join(OUT_DIR, "posters", "eigo6")

os.makedirs(POSTERS_EIGO5, exist_ok=True)
os.makedirs(POSTERS_EIGO6, exist_ok=True)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, context=ctx) as resp:
        return resp.read().decode("utf-8", errors="ignore")

def download_file(url, out_path):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        return True
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx) as resp:
            data = resp.read()
        with open(out_path, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"    ✗ Failed to download {url}: {e}")
        return False

print("=" * 60)
print("CRAWLING M-MANABI.JP FOR GRADES 5 & 6 VOCABULARY ASSETS")
print("=" * 60)

metadata = {
    "eigo5": [],
    "eigo6": []
}

# 1. Crawl Eigo 5
print("\n[1/2] Crawling Here We Go 5 (Grade 5)...")
for p_num in range(1, 35):
    sub_url = f"https://m-manabi.jp/06s/eigo5/u11/p{p_num}/index.html"
    try:
        html = fetch_html(sub_url)
    except Exception:
        # Page doesn't exist
        continue

    # Extract title
    title_match = re.search(r'<h2[^>]*>(.*?)</h2>', html)
    title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else f"Unit {p_num}"
    title = title.replace("&nbsp;", " ").strip()

    # Find poster images
    img_matches = re.findall(r'<img[^>]+src=["\']([^"\']+/eigo5/[^"\']+)["\']', html)
    downloaded_images = []
    
    for img_rel in img_matches:
        img_url = "https://m-manabi.jp" + img_rel if img_rel.startswith("/") else img_rel
        fname = os.path.basename(img_url)
        local_path = os.path.join(POSTERS_EIGO5, fname)
        if download_file(img_url, local_path):
            downloaded_images.append({
                "url": img_url,
                "filename": fname,
                "local_path": local_path,
                "size_kb": round(os.path.getsize(local_path) / 1024, 1)
            })

    if downloaded_images:
        print(f"  ✓ p{p_num:02d} [{title}]: {len(downloaded_images)} poster(s) downloaded")
        metadata["eigo5"].append({
            "page": p_num,
            "title": title,
            "url": sub_url,
            "images": downloaded_images
        })
    time.sleep(0.1)

# 2. Crawl Eigo 6
print("\n[2/2] Crawling Here We Go 6 (Grade 6)...")
for p_num in range(1, 35):
    sub_url = f"https://m-manabi.jp/06s/eigo6/u11/p{p_num}/index.html"
    try:
        html = fetch_html(sub_url)
    except Exception:
        continue

    title_match = re.search(r'<h2[^>]*>(.*?)</h2>', html)
    title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else f"Unit {p_num}"
    title = title.replace("&nbsp;", " ").strip()

    img_matches = re.findall(r'<img[^>]+src=["\']([^"\']+/eigo6/[^"\']+)["\']', html)
    downloaded_images = []
    
    for img_rel in img_matches:
        img_url = "https://m-manabi.jp" + img_rel if img_rel.startswith("/") else img_rel
        fname = os.path.basename(img_url)
        local_path = os.path.join(POSTERS_EIGO6, fname)
        if download_file(img_url, local_path):
            downloaded_images.append({
                "url": img_url,
                "filename": fname,
                "local_path": local_path,
                "size_kb": round(os.path.getsize(local_path) / 1024, 1)
            })

    if downloaded_images:
        print(f"  ✓ p{p_num:02d} [{title}]: {len(downloaded_images)} poster(s) downloaded")
        metadata["eigo6"].append({
            "page": p_num,
            "title": title,
            "url": sub_url,
            "images": downloaded_images
        })
    time.sleep(0.1)

# Save Metadata JSON
meta_path = os.path.join(OUT_DIR, "m_manabi_metadata.json")
with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

total_g5_imgs = sum(len(p["images"]) for p in metadata["eigo5"])
total_g6_imgs = sum(len(p["images"]) for p in metadata["eigo6"])

print(f"\nCrawling Complete!")
print(f"Grade 5: {len(metadata['eigo5'])} pages, {total_g5_imgs} posters downloaded")
print(f"Grade 6: {len(metadata['eigo6'])} pages, {total_g6_imgs} posters downloaded")
print(f"Metadata saved to: '{meta_path}'")
