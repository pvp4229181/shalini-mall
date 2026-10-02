"""Copy the shared styles and carousel into the Shopify theme, preserving Shopify additions."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
assets = root / 'shopify-theme/assets'
theme = (assets / 'theme.css').read_text(encoding='utf-8')
for name in ['global', 'components', 'footer', 'animations']:
    marker = f'/* ===== {name}.css ===== */'
    start = theme.index(marker)
    end = theme.find('/* ===== ', start + len(marker))
    if end < 0:
        end = len(theme)
    theme = theme[:start] + marker + '\n' + (root / f'css/{name}.css').read_text(encoding='utf-8') + '\n\n' + theme[end:]
if '/* Sliders are enabled only on mobile;' in theme:
    theme = theme[:theme.index('/* Sliders are enabled only on mobile;')]
(assets / 'theme.css').write_text(theme.rstrip() + '\n', encoding='utf-8')
home = (assets / 'home.css').read_text(encoding='utf-8')
start = home.index('/* Shopify:')
end = home.find('/* Inspiration:', start)
if end < 0:
    end = len(home)
home = (root / 'css/home.css').read_text(encoding='utf-8') + '\n' + home[start:end]
(assets / 'home.css').write_text(home.rstrip() + '\n', encoding='utf-8')
for name in ['product-slider.js']:
    (assets / name).write_bytes((root / 'js' / name).read_bytes())
(assets / 'collections.css').write_bytes((root / 'css/collections.css').read_bytes())
template = root / 'shopify-theme/templates/index.json'
data = json.loads(template.read_text(encoding='utf-8'))
for key, caption in [('originals', 'The singular work'), ('prints', 'The signed edition'), ('collections', 'A shared story')]:
    data['sections']['art-types']['blocks'][key]['settings']['caption'] = caption
for key in ['featured-originals', 'featured-prints']:
    data['sections'][key]['settings'].update(limit=9, show_themes=True)
for section in data['sections'].values():
    if section['type'] == 'original-vs-print':
        section['blocks']['print']['settings']['points'] = 'Matte canvas stretched over a pinewood frame\nPrinted on demand through Printify\n8 × 10-inch portrait canvas\nCorner-protected, securely boxed, and ready to hang'
template.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print('Shopify styles, gallery captions and carousel synchronized.')
