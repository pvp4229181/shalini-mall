# Shalini Mall on Shopify — setup guide

This folder turns the approved Phase 1 site into a working Shopify store. The theme itself is in [`../shopify-theme`](../shopify-theme) (Online Store 2.0).

| File | What it does |
|---|---|
| `setup-store.mjs` | Creates metafield definitions, collections, pages and menus; links originals ↔ prints; audits the store |
| `build_csv.py` | Regenerates the two CSVs below from `js/products.js` (run it whenever the catalogue changes) |
| `products-originals.csv` | The six one-of-one originals: manual fulfilment, inventory 1, overselling denied |
| `products-prints-preview.csv` | **Optional**, temporary print products for previewing the theme before Printify is connected. Tagged `printify-placeholder`; delete them before launch |

> Everything below was verified with Shopify's theme checker and a local storefront simulator, **not yet on a real store**. Run it on a development store first.

---

## 1. Store basics

1. Create a store, or a development store from a Shopify Partner account.
2. **Settings → Store details → Store currency.** Decide this before importing products. The Phase 1 catalogue currently has prices in **USD**, but its copy still promises *complimentary shipping on originals across India*. The theme follows whatever currency the store uses.
3. **Settings → Policies.** Write the refund, privacy, terms and shipping policies. The footer links to them automatically.
4. Install **Shopify Search & Discovery** (free). It powers the collection filters.

## 2. Admin API access for the setup script

You can also use the authenticated Shopify CLI without copying an Admin API token. In PowerShell:

```powershell
shopify store auth --store wuw0vt-0q.myshopify.com --scopes write_online_store_pages,write_online_store_navigation,write_products,write_publications
$env:SHOPIFY_STORE = 'wuw0vt-0q.myshopify.com'
$env:SHOPIFY_CLI_ENTRY = Join-Path (Split-Path (Get-Command shopify).Source) 'node_modules/@shopify/cli/bin/run.js'
node shopify-setup/setup-store.mjs pages collections menus --cli
```

Run these commands from the project root. Theme uploads deploy layouts; this separate command creates the page and collection records and navigation that make the URLs available. Products still need to be imported or published separately.

1. **Settings → Apps → Develop apps → Create an app.**
2. Give it these scopes: `write_products`, `write_publications`, `write_online_store_pages`, `write_online_store_navigation`.
3. Install the app and copy the Admin API token (`shpat_…`).

```bash
cd shopify-setup
export SHOPIFY_STORE=your-store.myshopify.com
export SHOPIFY_ADMIN_TOKEN=shpat_xxx
node setup-store.mjs --dry-run          # shows what it would do
node setup-store.mjs                    # definitions, collections, pages, menus
```

It creates:
- **Metafield definitions (`custom.*`):** medium, dimensions, width_cm, height_cm, size_band, year, story, materials, certificate, edition_size, image_focus, related_print, related_original, plus collection eyebrow, heading and story.
- **Smart collections:** `originals` (type = Original), `prints` (type = Fine Art Print) and `earth-song` (tag = earth-song). Each is set to its theme template and published.
- **Pages:** `the-artist`, `about`, `contact` and `wishlist`, each with its template.
- **Menus:** `main-menu` (its nested **Shop** item becomes the mega menu), `shop-categories`, `footer-shop`, `footer-studio`, `footer-help` and `search-suggestions`.

## 3. Products

1. **Deploy the current Phase 1 site first.** The CSV imports images from `https://shalini-mall.vercel.app/assets/images/*.webp`, and those new images aren't live yet.
2. **Products → Import → `products-originals.csv`.**
3. Optional, for previewing the theme only: import `products-prints-preview.csv`.
4. Fill in the facts the studio hasn't published yet, in each product's metafields: *medium*, *year*, *story* and *certificate*. Leave a field empty and it stays hidden in the theme.

## 4. Theme

```bash
shopify theme dev  --path shopify-theme --store your-store.myshopify.com   # live preview
shopify theme push --path shopify-theme --unpublished                       # upload as a draft theme
```

Then, in the **Theme Editor**:
- **Header:** choose the wishlist page and the featured artwork for the mega menu.
- **Homepage:** every section is editable. Sections show the bundled Phase 1 artwork until you pick your own images; set a focal point on each image to control its crop.
- **Collector testimonials:** add only genuine reviews. The section stays hidden while it's empty.

**Search & Discovery → Filters.** Add these, in this order:
1. Product type
2. Size band (`custom.size_band`)
3. Size (variant option)
4. Price

Only filters with data are shown on the storefront.

---

## 5. Printify (prints only)

Originals must never be created in, or linked to, Printify. Printify only fulfils products it created, so the originals imported above stay with the studio for manual fulfilment.

1. Install **Printify** from the Shopify App Store and connect it to this store.
2. For each artwork, create a **Stretched Canvas** product (matte, 0.75 in pinewood frame).
   - Use the sizes listed in `js/products.js`. That's currently 8 × 10, 16 × 20, 24 × 30 and 30 × 40 in, **plus landscape versions** (10 × 8 in and so on).
   - Decide whether a portrait painting should really be sold in landscape sizes, because Printify will crop it.
3. **Pricing per size.** The Phase 1 data has one price per print for *every* size (e.g. $44 for 8 × 10 and 40 × 30 alike). Set real per-size prices in Printify; its production cost rises steeply with size.
4. **Before publishing, set on each product:**
   - **Product type:** `Fine Art Print`
   - **Tags:** `print`, `earth-song`
   - **Option name:** `Size`
   - The theme reads sizes such as `8 × 10 in`, `8" x 10"` or `8x10in` and converts them to cm for the picker and the true-scale wall drawing.
   - If the option values differ from `8 × 10 in`, update the two filtered "canvases" links in the main menu to match.
5. **Mockups (media):** order them artwork close-up → front view → in a room → frame detail → scale. Attach each size's mockup as its **variant image**; the product page switches to it when that size is picked.
6. Publish to Shopify, then delete the `printify-placeholder` products.
7. If Printify gave the prints different handles, map them in `print-handles.json`:
   ```json
   { "quiet-orbit-print": "quiet-orbit-stretched-canvas" }
   ```
8. Link and check:
   ```bash
   node setup-store.mjs links
   PRINTIFY_TOKEN=xxx PRINTIFY_SHOP_ID=123 node setup-store.mjs audit
   ```
   The audit flags:
   - originals that look Printify-managed, have more than one variant, or aren't limited to a single sale;
   - placeholders left in the store;
   - Printify products published to an original's handle.
9. In Printify, set orders to **manual approval** until the test orders below have passed.

## 6. Test orders before launch

Use Shopify's test payment mode (Bogus Gateway):

| Order | Expected |
|---|---|
| One canvas print | Appears in Printify awaiting approval, with the right size variant |
| One original | Stays in Shopify as unfulfilled (manual); **not** in Printify; the original then shows as *Sold* |
| Original + print together | Only the print line reaches Printify |
| Buy the same original twice | The cart refuses the second one (inventory 1, overselling denied) |

Also check on desktop, tablet and phone:
- product pages, the original ↔ print links, and switching size (price, stock status and variant image update);
- the cart drawer and cart page, checkout, predictive search and the wishlist.

---

## How the theme maps to Phase 1

| Phase 1 | Shopify |
|---|---|
| `js/products.js` records | Products, variants, `custom.*` metafields |
| `relatedPrintId` / `relatedOriginalId` | `custom.related_print` / `custom.related_original` |
| localStorage cart | AJAX Cart API + Section Rendering; Shopify checkout |
| Local search | Predictive Search API (`sections/predictive-search.liquid`) |
| `filters.js` facets | Native storefront filtering (Search & Discovery) |
| Related works | Product Recommendations API |
| Wishlist, recently viewed | Still localStorage; cards rendered by Shopify (`sections/product-card-render.liquid`) |
| Newsletter / contact | Shopify customer and contact forms |
