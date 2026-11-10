import json

with open('scripts/pipeline/dictionary_asset_audit_report.json', 'r', encoding='utf-8') as f:
    report = json.load(f)

g6_anomalies = report['ES_G6']['anomalies']
non_flags = [a for a in g6_anomalies if 'world_flags' not in a['card_image']]
print(f"Grade 6 non-flag anomalies count: {len(non_flags)}")
for nf in non_flags:
    print(f"  {nf['english']}: {nf['card_image']} -> {nf['issues']}")
