#!/usr/bin/env node
/*
  Shalini Mall — Shopify store setup and audit (Admin GraphQL API).

  Usage (Node 18+):
    SHOPIFY_STORE=your-store.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_xxx node setup-store.mjs [steps] [--dry-run]

  Steps (default: definitions collections pages menus):
    definitions   Product + collection metafield definitions (namespace "custom")
    collections   Smart collections: originals, prints, earth-song — published to the Online Store
    pages         the-artist, about, contact, wishlist pages with their theme templates
    menus         main-menu (with the nested Shop mega menu), footer menus, shop-categories
    links         Original ↔ print product_reference metafields, paired by handle (run after products exist)
    audit         Read-only checks, incl. "originals never route to Printify"

  Custom app scopes needed: write_products, write_publications, write_online_store_pages,
  write_online_store_navigation (and read_products for audit).
  Optional for the audit: PRINTIFY_TOKEN (Printify API token) and PRINTIFY_SHOP_ID.

  Safe to re-run: existing definitions, collections, pages and menus are left as they are
  (menus are updated in place). Always try it on a development store first.
*/
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_VERSION = '2026-07';
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const CLI = process.argv.includes('--cli');
const DRY = process.argv.includes('--dry-run');
const steps = process.argv.slice(2).filter(a => !a.startsWith('--'));
const run = steps.length ? steps : ['definitions', 'collections', 'pages', 'menus'];

if (!STORE || (!TOKEN && !CLI)) {
  console.error('Set SHOPIFY_STORE (e.g. your-store.myshopify.com) and SHOPIFY_ADMIN_TOKEN.');
  process.exit(1);
}

let problems = 0;
const log = (icon, msg) => console.log(`${icon} ${msg}`);
const ok = msg => log('✓', msg);
const skip = msg => log('·', msg);
const warn = msg => { problems++; log('!', msg); };

async function gql(query, variables = {}) {
  if (CLI) {
    const dir = mkdtempSync(path.join(tmpdir(), 'shalini-shopify-'));
    try {
      const queryFile = path.join(dir, 'query.graphql');
      const variableFile = path.join(dir, 'variables.json');
      const outputFile = path.join(dir, 'result.json');
      writeFileSync(queryFile, query);
      writeFileSync(variableFile, JSON.stringify(variables));
      const args = ['store', 'execute', '--store', STORE, '--query-file', queryFile,
        '--variable-file', variableFile, '--output-file', outputFile, '--version', API_VERSION, '--json'];
      if (/^\s*mutation\b/.test(query)) args.push('--allow-mutations');
      const entry = process.env.SHOPIFY_CLI_ENTRY;
      execFileSync(entry ? process.execPath : 'shopify', entry ? [entry, ...args] : args,
        { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
      const result = JSON.parse(readFileSync(outputFile, 'utf8'));
      if (result.errors) throw new Error(JSON.stringify(result.errors));
      return result.data ?? result;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json, null, 1));
  return json.data;
}
const userErrors = (label, errs) => {
  if (!errs?.length) return false;
  const taken = errs.every(e => /taken|already exists|in use/i.test(e.message) || e.code === 'TAKEN');
  (taken ? skip : warn)(`${label}: ${errs.map(e => e.message).join('; ')}`);
  return true;
};

/* Artwork pairs (original ↔ print) from the approved Phase 1 catalogue. */
function pairs() {
  const js = readFileSync(path.join(HERE, '..', 'js', 'products.js'), 'utf8');
  const block = js.split('const RECORDS = [')[1].split('];')[0];
  const recs = [...block.matchAll(/id:\s*'([\w-]+)'.*?category:\s*'(\w+)'.*?pair:\s*'([\w-]+)'/g)].map(m => ({ id: m[1], category: m[2], pair: m[3] }));
  // Printify may give prints different handles; map them in print-handles.json: { "quiet-orbit-print": "quiet-orbit-canvas" }
  const mapFile = path.join(HERE, 'print-handles.json');
  const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : {};
  const h = id => map[id] || id;
  return recs.filter(r => r.category === 'Original').map(r => ({ original: h(r.id), print: h(r.pair) }));
}

/* ------------------------------------------------------------------ definitions */
const DEFINITIONS = [
  ['PRODUCT', 'medium', 'Medium', 'single_line_text_field', 'e.g. Oil and charcoal on canvas'],
  ['PRODUCT', 'dimensions', 'Dimensions', 'single_line_text_field', 'Shown to customers, e.g. 91 × 122 cm'],
  ['PRODUCT', 'width_cm', 'Width (cm)', 'number_decimal', 'Used for the true-scale wall drawing'],
  ['PRODUCT', 'height_cm', 'Height (cm)', 'number_decimal', 'Used for the true-scale wall drawing'],
  ['PRODUCT', 'size_band', 'Size band', 'single_line_text_field', 'Intimate / Medium / Large — used as a collection filter'],
  ['PRODUCT', 'year', 'Year', 'number_integer', 'Year the work was made'],
  ['PRODUCT', 'story', 'Artwork story', 'multi_line_text_field', 'Replaces the description in the Artwork story panel'],
  ['PRODUCT', 'materials', 'Materials', 'multi_line_text_field', 'Prints: material and finish'],
  ['PRODUCT', 'certificate', 'Certificate of authenticity', 'multi_line_text_field', 'Originals: authenticity text'],
  ['PRODUCT', 'edition_size', 'Edition size', 'number_integer', 'Prints: number in the signed edition'],
  ['PRODUCT', 'image_focus', 'Image focus', 'single_line_text_field', 'Optional CSS position for card crops, e.g. 58% center'],
  ['PRODUCT', 'related_print', 'Related print', 'product_reference', 'On an original: its canvas print product'],
  ['PRODUCT', 'related_original', 'Related original', 'product_reference', 'On a print: the original painting'],
  ['COLLECTION', 'eyebrow', 'Eyebrow', 'single_line_text_field', 'Small line above the title'],
  ['COLLECTION', 'heading', 'Story heading', 'single_line_text_field', 'Heading of the series story'],
  ['COLLECTION', 'story', 'Story', 'multi_line_text_field', 'The series story'],
  ['COLLECTION', 'image_focus', 'Image focus', 'single_line_text_field', 'Optional CSS position for the banner crop']
];
async function definitions() {
  for (const [ownerType, key, name, type, description] of DEFINITIONS) {
    if (DRY) { skip(`[dry] define ${ownerType.toLowerCase()}.custom.${key} (${type})`); continue; }
    const d = await gql(`mutation($d: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $d) { createdDefinition { id } userErrors { field message code } } }`,
      { d: { name, namespace: 'custom', key, type, ownerType, description, access: { storefront: 'PUBLIC_READ' } } });
    if (!userErrors(`${ownerType.toLowerCase()}.custom.${key}`, d.metafieldDefinitionCreate.userErrors)) ok(`defined ${ownerType.toLowerCase()}.custom.${key}`);
  }
}

/* ------------------------------------------------------------------ collections */
const COLLECTIONS = [
  { handle: 'originals', title: 'Original paintings', templateSuffix: 'originals', rule: { column: 'TYPE', relation: 'EQUALS', condition: 'Original' },
    descriptionHtml: '<p>Singular works built slowly by hand. Signed, documented, and ready for their next home.</p>' },
  { handle: 'prints', title: 'Canvas prints', templateSuffix: 'prints', rule: { column: 'TYPE', relation: 'EQUALS', condition: 'Fine Art Print' },
    descriptionHtml: '<p>Gallery-wrapped matte canvas editions, signed and ready to hang.</p>' },
  { handle: 'earth-song', title: 'Earth Song', templateSuffix: 'series', rule: { column: 'TAG', relation: 'EQUALS', condition: 'earth-song' },
    descriptionHtml: '<p>Original paintings and finely made prints shaped by land, memory, and the beauty of becoming.</p>',
    metafields: [
      { namespace: 'custom', key: 'eyebrow', type: 'single_line_text_field', value: 'The Earth Song series' },
      { namespace: 'custom', key: 'heading', type: 'single_line_text_field', value: 'Colour as a kind of remembering.' },
      { namespace: 'custom', key: 'story', type: 'multi_line_text_field', value: 'Built slowly in layers of mineral pigment, charcoal, and translucent washes, these works hold the trace of weather, wild gardens, and remembered places.' }
    ] }
];
async function onlineStorePublication() {
  const d = await gql(`{ publications(first: 25) { nodes { id name } } }`);
  return d.publications.nodes.find(p => /online store/i.test(p.name))?.id;
}
async function collections() {
  const publication = DRY ? null : await onlineStorePublication();
  if (!DRY && !publication) warn('Online Store publication not found — publish the collections manually.');
  for (const c of COLLECTIONS) {
    const found = await gql(`query($q: String!) { collections(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${c.handle}` });
    let id = found.collections.nodes.find(n => n.handle === c.handle)?.id;
    if (id) { skip(`collection "${c.handle}" exists`); }
    else if (DRY) { skip(`[dry] create smart collection "${c.handle}" (${c.rule.column} ${c.rule.relation} ${c.rule.condition})`); continue; }
    else {
      const input = { title: c.title, handle: c.handle, descriptionHtml: c.descriptionHtml, templateSuffix: c.templateSuffix,
        ruleSet: { appliedDisjunctively: false, rules: [c.rule] }, metafields: c.metafields || [] };
      const d = await gql(`mutation($i: CollectionInput!) { collectionCreate(input: $i) { collection { id } userErrors { field message } } }`, { i: input });
      if (userErrors(`collection ${c.handle}`, d.collectionCreate.userErrors)) continue;
      id = d.collectionCreate.collection.id;
      ok(`created collection "${c.handle}" (template: collection.${c.templateSuffix})`);
    }
    if (publication && id) {
      const d = await gql(`mutation($id: ID!, $p: ID!) { publishablePublish(id: $id, input: [{ publicationId: $p }]) { userErrors { field message } } }`, { id, p: publication });
      if (!userErrors(`publish ${c.handle}`, d.publishablePublish.userErrors)) ok(`"${c.handle}" published to the Online Store`);
    }
  }
}

/* ------------------------------------------------------------------ pages */
const PAGES = [
  { handle: 'the-artist', title: 'The Artist', templateSuffix: 'artist' },
  { handle: 'about', title: 'About the Studio', templateSuffix: 'about' },
  { handle: 'contact', title: 'Contact', templateSuffix: 'contact' },
  { handle: 'wishlist', title: 'Wishlist', templateSuffix: 'wishlist' }
];
async function pages() {
  for (const p of PAGES) {
    const found = await gql(`query($q: String!) { pages(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${p.handle}` });
    if (found.pages.nodes.some(n => n.handle === p.handle)) { skip(`page "${p.handle}" exists`); continue; }
    if (DRY) { skip(`[dry] create page "${p.handle}" (template page.${p.templateSuffix})`); continue; }
    const d = await gql(`mutation($p: PageCreateInput!) { pageCreate(page: $p) { page { id } userErrors { field message } } }`,
      { p: { title: p.title, handle: p.handle, templateSuffix: p.templateSuffix, isPublished: true, body: '' } });
    if (!userErrors(`page ${p.handle}`, d.pageCreate.userErrors)) ok(`created page "${p.handle}" (template page.${p.templateSuffix})`);
  }
}

/* ------------------------------------------------------------------ menus */
const L = (title, url, items = []) => ({ title, url, items });
const MENUS = {
  'main-menu': ['Main menu', [
    L('Home', '/'),
    L('Shop', '/collections/all', [
      L('Original art', '/collections/originals', [
        L('All originals', '/collections/originals'),
        L('Large-scale works', '/collections/originals?filter.p.m.custom.size_band=Large'),
        L('Intimate works', '/collections/originals?filter.p.m.custom.size_band=Intimate'),
        L('Why collect an original', '/pages/about#original-or-print')
      ]),
      L('Canvas prints', '/collections/prints', [
        L('All prints', '/collections/prints'),
        L('Smaller canvases · 8×10, 16×20 in', '/collections/prints?filter.v.option.size=8+%C3%97+10+in&filter.v.option.size=16+%C3%97+20+in'),
        L('Larger canvases · 24×30, 30×40 in', '/collections/prints?filter.v.option.size=24+%C3%97+30+in&filter.v.option.size=30+%C3%97+40+in'),
        L('Print size guide', '/pages/about#print-sizes')
      ]),
      L('Collections', '/collections', [L('Earth Song', '/collections/earth-song'), L('All collections', '/collections'), L('The artist', '/pages/the-artist')])
    ]),
    L('Originals', '/collections/originals'), L('Prints', '/collections/prints'), L('Collections', '/collections'),
    L('The Artist', '/pages/the-artist'), L('About', '/pages/about')
  ]],
  'shop-categories': ['Shop categories', [L('All works', '/collections/all'), L('Originals', '/collections/originals'), L('Prints', '/collections/prints'), L('Collections', '/collections')]],
  'footer-shop': ['Footer: Shop', [L('Originals', '/collections/originals'), L('Prints', '/collections/prints'), L('Collections', '/collections'), L('All artwork', '/collections/all')]],
  'footer-studio': ['Footer: Studio', [L('The artist', '/pages/the-artist'), L('About the studio', '/pages/about'), L('Contact', '/pages/contact')]],
  'footer-help': ['Footer: Help', [L('Shipping & care', '/pages/about#shipping'), L('Print sizes', '/pages/about#print-sizes'), L('FAQ', '/pages/contact#faq'), L('Wishlist', '/pages/wishlist')]],
  'search-suggestions': ['Search suggestions', [L('Original paintings', '/collections/originals'), L('Canvas prints', '/collections/prints'), L('Earth Song collection', '/collections/earth-song'), L('The artist', '/pages/the-artist')]]
};
const toItems = items => items.map(i => ({ title: i.title, type: 'HTTP', url: i.url, items: toItems(i.items) }));
async function menus() {
  const existing = (await gql(`{ menus(first: 50) { nodes { id handle } } }`)).menus.nodes;
  for (const [handle, [title, items]] of Object.entries(MENUS)) {
    const found = existing.find(m => m.handle === handle);
    if (DRY) { skip(`[dry] ${found ? 'update' : 'create'} menu "${handle}"`); continue; }
    if (found) {
      const d = await gql(`mutation($id: ID!, $t: String!, $h: String, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $t, handle: $h, items: $items) { menu { id } userErrors { field message } } }`,
        { id: found.id, t: title, h: handle, items: toItems(items) });
      if (!userErrors(`menu ${handle}`, d.menuUpdate.userErrors)) ok(`updated menu "${handle}"`);
    } else {
      const d = await gql(`mutation($t: String!, $h: String!, $items: [MenuItemCreateInput!]!) { menuCreate(title: $t, handle: $h, items: $items) { menu { id } userErrors { field message } } }`,
        { t: title, h: handle, items: toItems(items) });
      if (!userErrors(`menu ${handle}`, d.menuCreate.userErrors)) ok(`created menu "${handle}"`);
    }
  }
}

/* ------------------------------------------------------------------ links */
async function productId(handle) {
  const d = await gql(`query($q: String!) { products(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${handle}` });
  return d.products.nodes.find(n => n.handle === handle)?.id;
}
async function links() {
  for (const { original, print } of pairs()) {
    const [o, p] = [await productId(original), await productId(print)];
    if (!o || !p) { warn(`cannot link ${original} ↔ ${print}: ${!o ? original : print} not found (map Printify handles in print-handles.json)`); continue; }
    if (DRY) { skip(`[dry] link ${original} ↔ ${print}`); continue; }
    const d = await gql(`mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { metafields { id } userErrors { field message } } }`, { m: [
      { ownerId: o, namespace: 'custom', key: 'related_print', type: 'product_reference', value: p },
      { ownerId: p, namespace: 'custom', key: 'related_original', type: 'product_reference', value: o }
    ] });
    if (!userErrors(`link ${original}`, d.metafieldsSet.userErrors)) ok(`linked ${original} ↔ ${print}`);
  }
}

/* ------------------------------------------------------------------ audit */
async function products(query) {
  const d = await gql(`query($q: String!) { products(first: 100, query: $q) { nodes {
      handle title vendor productType tags status
      relatedPrint: metafield(namespace: "custom", key: "related_print") { value }
      relatedOriginal: metafield(namespace: "custom", key: "related_original") { value }
      variants(first: 50) { nodes { title sku inventoryPolicy inventoryItem { tracked } } } } } }`, { q: query });
  return d.products.nodes;
}
async function audit() {
  const originals = await products('product_type:Original');
  const prints = await products("product_type:'Fine Art Print'");
  console.log(`\nOriginals (${originals.length})`);
  for (const p of originals) {
    const v = p.variants.nodes;
    if (/printify/i.test(p.vendor) || p.tags.some(t => /printify/i.test(t))) warn(`${p.handle}: looks Printify-managed (vendor/tags) — originals must never route to Printify`);
    if (v.length !== 1) warn(`${p.handle}: an original should have exactly one variant (has ${v.length})`);
    if (v.some(x => !x.inventoryItem?.tracked || x.inventoryPolicy !== 'DENY')) warn(`${p.handle}: track inventory (qty 1) and deny overselling so it can only sell once`);
    if (!p.relatedPrint) skip(`${p.handle}: no related print linked (fine if there is no print edition)`);
    ok(`${p.handle}`);
  }
  console.log(`\nPrints (${prints.length})`);
  for (const p of prints) {
    if (p.tags.includes('printify-placeholder')) warn(`${p.handle}: preview placeholder — delete before launch once Printify creates the real product`);
    if (!p.relatedOriginal) skip(`${p.handle}: no related original linked`);
    if (p.variants.nodes.length < 2) skip(`${p.handle}: only ${p.variants.nodes.length} variant(s)`);
    ok(`${p.handle} (${p.variants.nodes.length} variants)`);
  }
  // Optional: confirm Printify has no product published to an original's handle.
  const { PRINTIFY_TOKEN, PRINTIFY_SHOP_ID } = process.env;
  if (PRINTIFY_TOKEN && PRINTIFY_SHOP_ID) {
    const originalHandles = new Set(originals.map(o => o.handle));
    let page = 1, seen = 0;
    for (;;) {
      const res = await fetch(`https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products.json?limit=50&page=${page}`, { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } });
      if (!res.ok) { warn(`Printify API: ${res.status}`); break; }
      const body = await res.json();
      for (const item of body.data || []) {
        seen++;
        if (item.external?.handle && originalHandles.has(item.external.handle)) warn(`Printify product "${item.title}" is published to ORIGINAL ${item.external.handle} — remove it from Printify`);
      }
      if (!body.next_page_url) break;
      page++;
    }
    ok(`checked ${seen} Printify products against ${originalHandles.size} originals`);
  } else {
    skip('Printify check skipped (set PRINTIFY_TOKEN and PRINTIFY_SHOP_ID to include it)');
  }
}

const STEPS = { definitions, collections, pages, menus, links, audit };
for (const step of run) {
  if (!STEPS[step]) { warn(`unknown step "${step}"`); continue; }
  console.log(`\n— ${step}${DRY ? ' (dry run)' : ''}`);
  try { await STEPS[step](); } catch (err) { warn(`${step} failed: ${err.message}`); }
}
console.log(problems ? `\n${problems} item(s) need attention.` : '\nDone.');
process.exit(problems ? 2 : 0);
