import urllib.request
import ssl
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://m-manabi.jp/06s/eigo6/u11/p1/index.html', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, context=ctx) as r:
    html = r.read().decode('utf-8', errors='ignore')

print('Eigo 6 p1 images:', re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html))
