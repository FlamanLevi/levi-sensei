import urllib.request
import re
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def get_links(url, base_url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    # find all links to p*/index.html
    all_hrefs = re.findall(r'href=["\']([^"\']+)["\']', html)
    p_links = [h for h in all_hrefs if re.search(r'p\d+', h)]
    seen = set()
    unique = []
    for l in p_links:
        if l not in seen:
            seen.add(l)
            unique.append(l)
    return unique

print("Fetching Eigo 5 index...")
eigo5_links = get_links("https://m-manabi.jp/06s/eigo5/u11/index.html", "https://m-manabi.jp/06s/eigo5/u11/")
print(f"Eigo 5 subpages ({len(eigo5_links)}):", eigo5_links)

print("\nFetching Eigo 6 index...")
eigo6_links = get_links("https://m-manabi.jp/06s/eigo6/u11/index.html", "https://m-manabi.jp/06s/eigo6/u11/")
print(f"Eigo 6 subpages ({len(eigo6_links)}):", eigo6_links)
