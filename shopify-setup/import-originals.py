"""Import original paintings through the authenticated Shopify CLI.

Run with --publish to create missing products and publish verified originals.
Existing products are never overwritten or restocked.
"""
import csv
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent.parent
STORE = 'wuw0vt-0q.myshopify.com'
CLI = Path(os.environ['APPDATA']) / 'npm/node_modules/@shopify/cli/bin/run.js'


def gql(query, variables=None):
    with tempfile.TemporaryDirectory(prefix='shalini-originals-') as directory:
        folder = Path(directory)
        (folder / 'query.graphql').write_text(query, encoding='utf-8')
        (folder / 'variables.json').write_text(json.dumps(variables or {}), encoding='utf-8')
        args = ['node', str(CLI), 'store', 'execute', '--store', STORE,
                '--version', '2026-07', '--query-file', str(folder / 'query.graphql'),
                '--variable-file', str(folder / 'variables.json'),
                '--output-file', str(folder / 'result.json'), '--json']
        if query.lstrip().startswith('mutation'):
            args.append('--allow-mutations')
        result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', timeout=120)
        if result.returncode:
            raise RuntimeError(result.stderr or result.stdout)
        data = json.loads((folder / 'result.json').read_text(encoding='utf-8'))
        if data.get('errors'):
            raise RuntimeError(data['errors'])
        data = data.get('data', data)
        for value in data.values():
            if isinstance(value, dict) and value.get('userErrors'):
                raise RuntimeError(value['userErrors'])
        return data


def upload(image):
    target = gql('''mutation($input:[StagedUploadInput!]!) {
      stagedUploadsCreate(input:$input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }''', {'input': [{'filename': image.name, 'mimeType': 'image/webp',
                     'httpMethod': 'POST', 'resource': 'PRODUCT_IMAGE',
                     'fileSize': str(image.stat().st_size)}]})['stagedUploadsCreate']['stagedTargets'][0]
    boundary = uuid.uuid4().hex
    parts = []
    for item in target['parameters']:
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{item["name"]}"\r\n\r\n{item["value"]}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{image.name}"\r\nContent-Type: image/webp\r\n\r\n'.encode())
    parts.extend([image.read_bytes(), f'\r\n--{boundary}--\r\n'.encode()])
    request = urllib.request.Request(target['url'], data=b''.join(parts),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}, method='POST')
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status not in (200, 201, 204):
            raise RuntimeError(f'Upload failed: {response.status}')
    return target['resourceUrl']


def main():
    with (ROOT / 'shopify-setup/products-originals.csv').open(encoding='utf-8-sig', newline='') as source:
        rows = list(csv.DictReader(source))
    data = gql('''query {
      shop { currencyCode }
      products(first:100) { nodes { id handle productType } pageInfo { hasNextPage } }
      locations(first:20) { nodes { id name isActive fulfillsOnlineOrders fulfillmentService { id } } }
      publications(first:20) { nodes { id name } }
    }''')
    if data['shop']['currencyCode'] != 'USD' or data['products']['pageInfo']['hasNextPage']:
        raise RuntimeError('Unexpected currency or product count; review before importing.')
    locations = [p for p in data['locations']['nodes'] if p['isActive'] and p['fulfillsOnlineOrders'] and not p['fulfillmentService']]
    if len(locations) != 1:
        raise RuntimeError(f'Select a studio location explicitly: {locations}')
    location = locations[0]
    publication = next(p['id'] for p in data['publications']['nodes'] if p['name'] == 'Online Store')
    existing = {p['handle']: p for p in data['products']['nodes']}
    for row in rows:
        image = ROOT / 'assets/images' / row['Image Src'].rsplit('/', 1)[1]
        if not image.is_file() or row['Type'] != 'Original' or row['Variant Inventory Qty'] != '1' or row['Variant Fulfillment Service'] != 'manual':
            raise RuntimeError(f'Invalid original: {row["Handle"]}')
        if row['Handle'] in existing and existing[row['Handle']]['productType'] != 'Original':
            raise RuntimeError(f'Handle collision: {row["Handle"]}')
    print(f'{len(rows)} originals; USD; manual location: {location["name"]}', flush=True)
    if '--publish' not in sys.argv:
        return
    receipt = []
    for row in rows:
        product = existing.get(row['Handle'])
        if not product:
            image = ROOT / 'assets/images' / row['Image Src'].rsplit('/', 1)[1]
            metadata = [('dimensions', 'Dimensions', 'single_line_text_field'),
                        ('width_cm', 'Width (cm)', 'number_decimal'),
                        ('height_cm', 'Height (cm)', 'number_decimal'),
                        ('size_band', 'Size band', 'single_line_text_field')]
            fields = [{'namespace': 'custom', 'key': key, 'type': kind,
                       'value': row[f'{label} (product.metafields.custom.{key})']}
                      for key, label, kind in metadata]
            payload = {'title': row['Title'], 'handle': row['Handle'],
                'descriptionHtml': row['Body (HTML)'], 'vendor': row['Vendor'],
                'productType': 'Original', 'tags': [t.strip() for t in row['Tags'].split(',')],
                'status': 'DRAFT', 'metafields': fields,
                'seo': {'title': row['SEO Title'], 'description': row['SEO Description']},
                'files': [{'originalSource': upload(image), 'contentType': 'IMAGE', 'alt': row['Image Alt Text']}],
                'productOptions': [{'name': 'Title', 'values': [{'name': 'Default Title'}]}],
                'variants': [{'optionValues': [{'optionName': 'Title', 'name': 'Default Title'}],
                    'price': row['Variant Price'], 'sku': row['Variant SKU'], 'taxable': True,
                    'inventoryPolicy': 'DENY', 'inventoryItem': {'tracked': True, 'requiresShipping': True},
                    'inventoryQuantities': [{'locationId': location['id'], 'name': 'available', 'quantity': 1}]}]}
            product = gql('''mutation($input:ProductSetInput!) {
              productSet(input:$input, synchronous:true) { product { id handle } userErrors { field message } }
            }''', {'input': payload})['productSet']['product']
            print(f'Created {row["Title"]}', flush=True)
        receipt.append({'id': product['id'], 'handle': row['Handle'], 'price': row['Variant Price']})
    (ROOT / 'shopify-setup/original-products.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    for record in receipt:
        product = gql('''query($id:ID!) { product(id:$id) {
          id media(first:10) { nodes { status } }
          variants(first:10) { nodes { price inventoryQuantity inventoryPolicy inventoryItem {
            tracked inventoryLevels(first:10) { nodes { location { id fulfillmentService { id } } } }
          } } }
        } }''', {'id': record['id']})['product']
        variants = product['variants']['nodes']
        if not product['media']['nodes'] or any(m['status'] != 'READY' for m in product['media']['nodes']):
            raise RuntimeError('Images still processing; rerun --publish to verify and publish.')
        if len(variants) != 1:
            raise RuntimeError('Unexpected variants.')
        variant = variants[0]
        from decimal import Decimal
        if Decimal(variant['price']) != Decimal(record['price']) or variant['inventoryQuantity'] != 1 or variant['inventoryPolicy'] != 'DENY' or not variant['inventoryItem']['tracked']:
            raise RuntimeError(f'Unexpected price/inventory: {record["handle"]}')
        levels = variant['inventoryItem']['inventoryLevels']['nodes']
        if len(levels) != 1 or levels[0]['location']['id'] != location['id'] or levels[0]['location']['fulfillmentService']:
            raise RuntimeError('Original must use studio manual fulfillment only.')
    for record in receipt:
        gql('''mutation($input:ProductUpdateInput!) {
          productUpdate(product:$input) { product { id status } userErrors { field message } }
        }''', {'input': {'id': record['id'], 'status': 'ACTIVE'}})
        gql('''mutation($id:ID!, $publication:ID!) {
          publishablePublish(id:$id,input:[{publicationId:$publication}]) { userErrors { field message } }
        }''', {'id': record['id'], 'publication': publication})
        print(f'Published https://{STORE}/products/{record["handle"]}', flush=True)


if __name__ == '__main__':
    main()
