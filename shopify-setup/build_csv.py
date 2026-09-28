"""Generate Shopify product-import CSVs from the approved Phase 1 catalogue (js/products.js).

  products-originals.csv       The one-of-one originals. Shopify-managed, manual fulfilment,
                               inventory 1 with overselling denied. Never created in Printify.
  products-prints-preview.csv  OPTIONAL temporary print products so the theme can be previewed
                               before Printify is connected. Tagged "printify-placeholder".
                               Delete them once Printify has created the real print products.

Metafield definitions must exist before importing (run setup-store.mjs first).
Facts the studio has not provided (medium, year, weight) are left blank on purpose.
"""
import csv, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'js', 'products.js')
SITE = 'https://shalini-mall.vercel.app/'  # images are imported from the deployed Phase 1 site

js = open(SRC, encoding='utf8').read()
images = dict(re.findall(r"'([\w-]+)':\s*'(assets/images/[\w-]+\.webp)'", js.split('const COLLECTIONS')[0]))
material = re.search(r"const PRINT_MATERIAL = '([^']+)'", js).group(1)


def field(line, name):
    m = re.search(rf"{name}:\s*(?:'((?:[^'\\]|\\.)*)'|(\d+))", line)
    return None if not m else (m.group(1) if m.group(1) is not None else int(m.group(2)))


records = []
for line in js.split('const RECORDS = [')[1].split('];')[0].splitlines():
    if "id:" not in line:
        continue
    records.append({k: field(line, k) for k in ['id', 'title', 'category', 'price', 'size', 'status', 'pair', 'description']})

BASE = ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published', 'Option1 Name', 'Option1 Value',
        'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
        'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping', 'Variant Taxable',
        'Image Src', 'Image Position', 'Image Alt Text', 'SEO Title', 'SEO Description', 'Status']
MF = lambda label, key: f'{label} (product.metafields.custom.{key})'


def size_band(w, h):
    longest = max(w, h)
    return 'Intimate' if longest <= 80 else 'Medium' if longest <= 120 else 'Large'


def base_row(r, kind):
    img = SITE + images.get(r['id'], 'assets/images/collection-hero.webp')
    label = 'original painting' if kind == 'Original' else 'stretched canvas print'
    return {
        'Handle': r['id'], 'Title': r['title'], 'Body (HTML)': f"<p>{r['description']}</p>", 'Vendor': 'Shalini Mall',
        'Published': 'TRUE', 'Variant Requires Shipping': 'TRUE', 'Variant Taxable': 'TRUE',
        'Image Src': img, 'Image Position': '1', 'Image Alt Text': f"{r['title']}, {label} by Shalini Mall",
        'SEO Title': f"{r['title']} — {'Original Painting' if kind == 'Original' else 'Canvas Print'} — Shalini Mall",
        'SEO Description': r['description'], 'Status': 'active',
    }


# Originals ---------------------------------------------------------------------------
orig_cols = BASE + [MF('Dimensions', 'dimensions'), MF('Width (cm)', 'width_cm'), MF('Height (cm)', 'height_cm'), MF('Size band', 'size_band')]
with open(os.path.join(HERE, 'products-originals.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=orig_cols)
    w.writeheader()
    for r in records:
        if r['category'] != 'Original':
            continue
        width, height = map(float, re.findall(r'[\d.]+', r['size'])[:2])
        row = base_row(r, 'Original')
        row.update({
            'Type': 'Original', 'Tags': 'original, earth-song', 'Option1 Name': 'Title', 'Option1 Value': 'Default Title',
            'Variant SKU': f"SM-ORIG-{r['id'].upper()}", 'Variant Grams': '',
            'Variant Inventory Tracker': 'shopify', 'Variant Inventory Qty': '1', 'Variant Inventory Policy': 'deny',
            'Variant Fulfillment Service': 'manual', 'Variant Price': f"{r['price']:.2f}",
            MF('Dimensions', 'dimensions'): r['size'], MF('Width (cm)', 'width_cm'): f'{width:g}', MF('Height (cm)', 'height_cm'): f'{height:g}',
            MF('Size band', 'size_band'): size_band(width, height),
        })
        w.writerow(row)

# Print placeholders (preview only) ----------------------------------------------------
print_cols = BASE + [MF('Edition size', 'edition_size'), MF('Materials', 'materials')]
with open(os.path.join(HERE, 'products-prints-preview.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=print_cols)
    w.writeheader()
    for r in records:
        if r['category'] != 'Print':
            continue
        sizes = [s.strip() for s in r['size'].split('·')]
        edition = re.search(r'Edition of (\d+)', r['status'] or '')
        for i, size in enumerate(sizes):
            row = {'Handle': r['id'], 'Option1 Value': size, 'Variant SKU': f"SM-PRINT-{r['id'].upper()}-{re.sub(r'[^0-9X]', '', size.upper().replace('×', 'X'))}",
                   'Variant Inventory Tracker': '', 'Variant Inventory Policy': 'deny', 'Variant Fulfillment Service': 'manual',
                   'Variant Price': f"{r['price']:.2f}", 'Variant Requires Shipping': 'TRUE', 'Variant Taxable': 'TRUE'}
            if i == 0:
                row.update(base_row(r, 'Print'))
                row.update({'Type': 'Fine Art Print', 'Tags': 'print, earth-song, printify-placeholder', 'Option1 Name': 'Size',
                            MF('Materials', 'materials'): f'{material}, signed and numbered by the artist.',
                            MF('Edition size', 'edition_size'): edition.group(1) if edition else ''})
            w.writerow(row)

print(f"originals: {sum(r['category'] == 'Original' for r in records)}, print placeholders: {sum(r['category'] == 'Print' for r in records)}")
print('image sources:', sorted(set(images.values())))
