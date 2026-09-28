// After Printify finishes publishing, assign the theme's handles and collection type.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const receiptPath = path.join(here, 'printify-products.json');
const records = JSON.parse(readFileSync(receiptPath, 'utf8'));
const dir = mkdtempSync(path.join(tmpdir(), 'shalini-product-sync-'));
function gql(query, variables = {}) {
  const queryFile = path.join(dir, 'query.graphql');
  const variablesFile = path.join(dir, 'variables.json');
  const output = path.join(dir, 'output.json');
  writeFileSync(queryFile, query);
  writeFileSync(variablesFile, JSON.stringify(variables));
  const args = ['store', 'execute', '--store', 'wuw0vt-0q.myshopify.com',
    '--query-file', queryFile, '--variable-file', variablesFile, '--output-file', output, '--json'];
  if (query.startsWith('mutation')) args.push('--allow-mutations');
  execFileSync(process.execPath, [process.env.SHOPIFY_CLI_ENTRY, ...args], { stdio: 'pipe' });
  const result = JSON.parse(readFileSync(output, 'utf8'));
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  return result.data ?? result;
}
try {
  const data = gql(`query { shop { currencyCode } products(first:100) { nodes {
    id title handle status media(first:10) { nodes { status } }
    variants(first:10) { nodes { price } }
  } } }`);
  if (data.shop.currencyCode !== 'USD') throw new Error('Store currency must be USD.');
  const updates = Object.values(records).map(record => {
    const matches = data.products.nodes.filter(p => p.title === `${record.title} — Canvas Print`);
    if (matches.length !== 1) throw new Error(`${record.title}: publishing incomplete or ambiguous.`);
    const product = matches[0];
    if (!product.media.nodes.length || product.media.nodes.some(m => m.status !== 'READY')) {
      throw new Error(`${record.title}: images still processing.`);
    }
    if (product.variants.nodes.some(v => Math.round(Number(v.price) * 100) !== record.price_cents)) {
      throw new Error(`${record.title}: unexpected Shopify price.`);
    }
    return { record, product };
  });
  const declarations = updates.map((_, i) => `$p${i}: ProductUpdateInput!`).join(',');
  const operations = updates.map((_, i) => `p${i}: productUpdate(product:$p${i}) {
    product { id handle productType } userErrors { field message }
  }`).join('\n');
  const variables = Object.fromEntries(updates.map(({ record, product }, i) => [`p${i}`, {
    id: product.id, handle: record.handle, productType: 'Fine Art Print',
    tags: ['print', 'earth-song', 'shalini-mall'],
    metafields: [
      { namespace: 'custom', key: 'width_cm', type: 'number_decimal', value: '20.32' },
      { namespace: 'custom', key: 'height_cm', type: 'number_decimal', value: '25.4' },
      { namespace: 'custom', key: 'dimensions', type: 'single_line_text_field', value: '20.32 × 25.4 cm' }
    ]
  }]));
  const result = gql(`mutation(${declarations}) { ${operations} }`, variables);
  for (const [i, { record }] of updates.entries()) {
    const row = result[`p${i}`];
    if (row.userErrors.length) throw new Error(JSON.stringify(row.userErrors));
    record.shopify_product_id = row.product.id;
    record.url = `https://wuw0vt-0q.myshopify.com/products/${row.product.handle}`;
    console.log(`${record.title}: ${record.url}`);
  }
  writeFileSync(receiptPath, JSON.stringify(records, null, 2) + '\n');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
