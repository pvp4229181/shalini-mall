"""Read-only audit of the complete Shopify and Printify catalog."""
import json
from pathlib import Path
import subprocess
import urllib.request
import sys
sys.stdout.reconfigure(encoding='utf-8')
from importlib.util import spec_from_file_location, module_from_spec

root = Path(__file__).resolve().parent.parent
spec = spec_from_file_location('originals', root / 'shopify-setup/import-originals.py')
originals = module_from_spec(spec)
spec.loader.exec_module(originals)
catalog = json.loads(subprocess.check_output(['node', str(root / 'shopify-setup/export-catalog.mjs')], text=True, encoding='utf-8'))
data = originals.gql('''query { shop { currencyCode } products(first:100) {
  pageInfo { hasNextPage } nodes {
    id handle title status productType tags
    media(first:30) { nodes { status } }
    resourcePublicationsV2(first:10) { nodes { isPublished publication { name } } }
    metafields(first:30) { nodes { namespace key value } }
    variants(first:20) { nodes { price sku inventoryQuantity inventoryPolicy inventoryItem {
      tracked inventoryLevels(first:10) { nodes { location { id name fulfillmentService { id } } } }
    } } }
  }
} }''')
assert data['shop']['currencyCode'] == 'USD'
assert not data['products']['pageInfo']['hasNextPage']
shopify = {p['handle']: p for p in data['products']['nodes']}
receipts = json.loads((root / 'shopify-setup/printify-products.json').read_text(encoding='utf-8'))
config = {}
for line in (root / '.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        config[k.strip()] = v.strip().strip('"').strip("'")
request = urllib.request.Request(f'https://api.printify.com/v1/shops/{config["PRINTIFY_SHOP_ID"]}/products.json?limit=50',
    headers={'Authorization': 'Bearer ' + config['PRINTIFY_TOKEN'], 'User-Agent': 'ShaliniMallAudit/1.0'})
with urllib.request.urlopen(request, timeout=90) as response:
    remote = json.load(response)
assert not remote.get('next_page_url'), 'Printify pagination required'
prints = {p['id']: p for p in remote['data']}
results = []
for artwork in catalog['products']:
    p = shopify.get(artwork['id'])
    assert p, f'Missing Shopify product: {artwork["id"]}'
    assert p['status'] == 'ACTIVE', artwork['id']
    assert any(x['isPublished'] and x['publication']['name'] == 'Online Store' for x in p['resourcePublicationsV2']['nodes']), f'Not on Online Store: {artwork["id"]}'
    assert p['media']['nodes'] and all(m['status'] == 'READY' for m in p['media']['nodes']), f'Media not ready: {artwork["id"]}'
    assert artwork['collection'] in p['tags'], f'Missing collection tag: {artwork["id"]}'
    variants = p['variants']['nodes']
    v = variants[0]
    fields = {x['key']: x['value'] for x in p['metafields']['nodes'] if x['namespace'] == 'custom'}
    if artwork['type'] == 'original':
        assert len(variants) == 1
        assert p['productType'] == 'Original'
        assert v['inventoryItem']['tracked'] and v['inventoryPolicy'] == 'DENY'
        assert v['inventoryQuantity'] in (0, 1)
        levels = v['inventoryItem']['inventoryLevels']['nodes']
        assert levels and all(not x['location']['fulfillmentService'] for x in levels), f'Original fulfillment: {artwork["id"]}'
        assert float(v['price']) == artwork['price'], f'Original price: {artwork["id"]}'
        pair = shopify[artwork['relatedPrintId']]['id']
        assert fields.get('related_print') == pair, f'Original/print link: {artwork["id"]}'
    else:
        assert p['productType'] == 'Fine Art Print'
        r = receipts[artwork['id']]
        managed = prints[r['product_id']]
        assert managed.get('visible') and not managed.get('is_locked'), f'Printify publication incomplete: {artwork["id"]}'
        assert str(managed['external']['id']) == p['id'].rsplit('/', 1)[1], f'Printify Shopify ID: {artwork["id"]}'
        enabled = [x for x in managed['variants'] if x['is_enabled']]
        assert any(x['id'] == 95212 for x in enabled)
        assert len(variants) == len(enabled)
        assert all(any(x['sku'] == variant['sku'] and x['price'] == round(float(variant['price']) * 100) for x in enabled) for variant in variants)
        assert fields.get('related_original') == shopify[artwork['relatedOriginalId']]['id']
    results.append({'handle': artwork['id'], 'type': artwork['type'], 'status': p['status'], 'price': v['price'], 'variant_count': len(variants), 'media_count': len(p['media']['nodes'])})
report = {'currency': 'USD', 'originals': sum(r['type'] == 'original' for r in results),
          'prints': sum(r['type'] == 'print' for r in results), 'products': results}
(root / 'shopify-setup/deployment-verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'PASS: {report["originals"]} originals + {report["prints"]} Printify prints; active, published, linked, media ready, correct fulfillment and prices.')
