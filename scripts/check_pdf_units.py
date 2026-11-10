import re

with open("letstry_data/Let's Try 2 - Teacher Guide English Version.pdf", "rb") as f:
    raw = f.read().decode('latin1', errors='ignore')

# find "Unit 6" in pdf
matches = re.findall(r'Unit\s+6[^\n\r]+', raw)
print("Unit 6 mentions in G4 Teacher Guide:")
for m in set(matches[:10]):
    print(" ", m[:80])

matches_all = re.findall(r'Unit\s+[1-9]:?[^\n\r]+', raw)
print("\nAll unit mentions:")
for m in sorted(set(matches_all[:20])):
    print(" ", m[:80])
