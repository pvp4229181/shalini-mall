import json
from pathlib import Path
import urllib.request
import sys
sys.stdout.reconfigure(encoding='utf-8')

root = Path(__file__).resolve().parent.parent
config = {}
for line in (root / '.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        config[k.strip()] = v.strip().strip('"').strip("'")
req = urllib.request.Request(f'https://api.printify.com/v1/shops/{config["PRINTIFY_SHOP_ID"]}/products.json?limit=50',
    headers={'Authorization': 'Bearer ' + config['PRINTIFY_TOKEN'], 'User-Agent': 'ShaliniMallAudit/1.0'})
with urllib.request.urlopen(req, timeout=90) as response:
    data = json.load(response)
(root / '.theme-header-update/printify-current.json').write_text(json.dumps(data, indent=2), encoding='utf-8')
receipt_path = root / 'shopify-setup/printify-products.json'
receipts = json.loads(receipt_path.read_text(encoding='utf-8'))
by_id = {p['id']: p for p in data['data']}
for record in receipts.values():
    product = by_id[record['product_id']]
    assert product['visible'] and not product['is_locked'], record['title']
    record['enabled_variants'] = [{k: v[k] for k in ['id', 'title', 'sku', 'price', 'cost']} for v in product['variants'] if v['is_enabled']]
receipt_path.write_text(json.dumps(receipts, indent=2) + '\n', encoding='utf-8')
for p in data['data']:
    print(p['title'], 'visible:', p['visible'], 'locked:', p['is_locked'],
          'external:', p.get('external'), 'enabled:',
          [(v['id'], v['title'], v['price'], v.get('cost')) for v in p['variants'] if v['is_enabled']])
