import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

deploy_dir = r"c:\Antigravity\levi-sensei (new)\trimmed_assets\letstry_images"
svg_files = [f for f in os.listdir(deploy_dir) if f.endswith('.svg')]

updated = 0
for f in svg_files:
    p = os.path.join(deploy_dir, f)
    with open(p, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    # Check if viewBox already exists
    if 'viewBox' in content or 'viewbox' in content:
        continue
        
    # Match width and height in <svg ...>
    w_m = re.search(r'width="(\d+)"', content)
    h_m = re.search(r'height="(\d+)"', content)
    
    if w_m and h_m:
        w, h = w_m.group(1), h_m.group(1)
        # Inject viewBox right after <svg
        new_content = re.sub(r'<svg\s+', f'<svg viewBox="0 0 {w} {h}" ', content, count=1)
        with open(p, 'w', encoding='utf-8') as fp:
            fp.write(new_content)
        updated += 1

print(f"✅ Successfully injected viewBox into {updated} / {len(svg_files)} SVGs!")
