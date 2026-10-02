import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export function loadCatalog() {
  const context = { window: {} };
  vm.runInNewContext(readFileSync(new URL('../js/products.js', import.meta.url), 'utf8'), context);
  return {
    records: context.window.ART_PRODUCTS,
    products: context.window.SM.catalog.all(),
    collections: context.window.SM.catalog.collections()
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(loadCatalog()));
