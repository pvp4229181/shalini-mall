from pathlib import Path
import json, shutil
from PIL import Image
items=json.loads(Path('assets/images/generated-art-manifest.json').read_text(encoding='utf-8-sig'))
for item in items:
 target=Path('assets/images')/(item['id']+'-hq.png')
 with Image.open(target) as im:
  assert im.width>=1024 and im.height>=1024
  im.save(target.with_suffix('.webp'),'WEBP',quality=94,method=6)
 shutil.copyfile(target.with_suffix('.webp'),Path('shopify-theme/assets')/(item['id']+'-hq.webp'))
print('Saved high-resolution masters and optimized website images:',len(items))
