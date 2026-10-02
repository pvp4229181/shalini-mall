"""Create the site's six 8x10 canvas prints as drafts; publish explicitly afterward.

Uses .env credentials without printing them. Records remote IDs for safe resumes.
"""
import base64
import io
import json
import math
import pathlib
import sys
import subprocess
import urllib.error
import urllib.request
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = {}
for line in (ROOT / '.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        CONFIG[key.strip()] = value.strip().strip('"').strip("'")
SHOP = CONFIG['PRINTIFY_SHOP_ID']
if SHOP != '29119430':
    raise SystemExit('Expected the Shalini Mall Printify shop.')
RECEIPT = ROOT / 'shopify-setup' / 'printify-products.json'
records = json.loads(RECEIPT.read_text()) if RECEIPT.exists() else {}
catalog = json.loads(subprocess.check_output(['node', str(ROOT / 'shopify-setup/export-catalog.mjs')], text=True, encoding='utf-8'))
ART = [p for p in catalog['products'] if p['type'] == 'print']
VARIANT = 95212

def api(path, data=None, method=None):
    req = urllib.request.Request('https://api.printify.com/v1/' + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Authorization': 'Bearer ' + CONFIG['PRINTIFY_TOKEN'],
                 'User-Agent': 'ShaliniMallSetup/1.0', 'Content-Type': 'application/json'},
        method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            body = response.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors='replace')
        raise RuntimeError(f'Printify {error.code}: {detail[:1500]}') from None

def save():
    RECEIPT.write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')

shop = next(s for s in api('shops.json') if str(s['id']) == SHOP)
if shop['title'] != 'Shalini Mall' or shop['sales_channel'] != 'shopify':
    raise SystemExit('The selected shop must be Shalini Mall connected to Shopify.')

for artwork in ART:
    title, handle = artwork['title'], artwork['id']
    image_path = ROOT / artwork['images'][0]['src']
    image_name = image_path.stem
    record = records.setdefault(handle, {'title': title, 'handle': handle})
    record['collection'] = artwork['collection']
    if '--publish' not in sys.argv:
        if record.get('publish_requested'):
            print('Already submitted for publishing: ' + title, flush=True)
            continue
        if not record.get('image_id'):
            master = image_path.with_suffix('.png')
            with Image.open(master if master.exists() else image_path) as image:
                buffer = io.BytesIO()
                image.save(buffer, format='PNG')
            uploaded = api('uploads/images.json', {
                'file_name': image_name + '.png',
                'contents': base64.b64encode(buffer.getvalue()).decode()})
            record['image_id'] = uploaded['id']
            save()
        if not record.get('product_id'):
            product = api(f'shops/{SHOP}/products.json', {
                'title': title + ' — Canvas Print',
                'description': f'<p>{artwork["description"]}</p>'
                    '<p>Art reproduction on matte stretched canvas. Portrait format, '
                    '8 × 10 inches, with a 0.75-inch frame depth. Printed on demand.</p>',
                'blueprint_id': 937, 'print_provider_id': 105,
                'tags': ['print', artwork['collection'], 'shalini-mall'],
                'visible': False,
                # Temporary draft-only price, replaced from the returned cost below.
                'variants': [{'id': VARIANT, 'price': 10000, 'is_enabled': True}],
                'print_areas': [{'variant_ids': [VARIANT], 'placeholders': [
                    {'position': 'front', 'images': [{'id': record['image_id'],
                     'x': 0.5, 'y': 0.5, 'scale': 1, 'angle': 0}]}]}]})
            record['product_id'] = product['id']
            save()
        product = api(f"shops/{SHOP}/products/{record['product_id']}.json")
        variant = next(v for v in product['variants'] if v['id'] == VARIANT)
        cost = variant.get('cost')
        if not isinstance(cost, int) or cost <= 0:
            raise SystemExit('Production cost unavailable; draft remains unpublished.')
        price = math.ceil(cost / 0.60)
        api(f"shops/{SHOP}/products/{record['product_id']}.json", {
            'variants': [{'id': VARIANT, 'price': price, 'is_enabled': True}],
            'visible': False}, method='PUT')
        record.update(cost_cents=cost, price_cents=price, currency='USD',
                      size='8 × 10 in', pricing='40% margin on production cost')
        save()
        print(f'Draft ready: {title} | cost ${cost / 100:.2f} | retail ${price / 100:.2f}', flush=True)
    else:
        if not record.get('price_cents') or not record.get('product_id'):
            raise SystemExit('Create and price every draft before publishing.')
        if not record.get('publish_requested'):
            api(f"shops/{SHOP}/products/{record['product_id']}.json", {'visible': True}, method='PUT')
            api(f"shops/{SHOP}/products/{record['product_id']}/publish.json", {
                'title': True, 'description': True, 'images': True, 'variants': True,
                'tags': True, 'keyFeatures': True, 'shipping_template': True})
            record['publish_requested'] = True
            save()
        print('Publish requested: ' + title, flush=True)
