// Live storefront smoke check; uses an isolated browser and makes no purchases.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const site = process.env.SITE_URL || 'https://wuw0vt-0q.myshopify.com';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(site, { waitUntil: 'networkidle' });
      if (page.url().includes('/password') && process.env.SHOPIFY_STOREFRONT_PASSWORD) {
        await page.locator('input[name="password"]').fill(process.env.SHOPIFY_STOREFRONT_PASSWORD);
        await page.locator('form[action*="password"] button[type="submit"]').click();
        await page.waitForURL(url => !url.pathname.includes('/password'));
      }
      assert(!page.url().includes('/password'), 'Storefront is password protected');
      await page.locator('.art-types').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.art-type').count(), 3);
      assert.equal(await page.locator('.art-type__footer').count(), 3);
      assert.equal(await page.locator('product-slider[data-per-view="4"] .featured-work').count(), 18);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert(await page.locator('.art-type p').first().isVisible());
      await page.screenshot({ path: `.theme-header-update/deployment-${width}.png` });
      if (width === 375) {
        const slider = page.locator('product-slider').filter({ has: page.locator('.art-types') });
        await slider.getByRole('button', { name: 'Next slide', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.art-types').scrollLeft > 0);
        assert.equal(await slider.locator('.product-slider__status').textContent(), '2 / 3');
      }
    }
    await page.goto(`${site}/collections`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.collection-tile').count(), 8);
    assert.equal(await page.locator('.collection-tile__art .art img').count(), 16);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '.theme-header-update/deployment-collections-mobile.png' });
    for (const path of ['/collections/abstract', '/products/mineral-rhythm-original', '/products/mineral-rhythm-print']) {
      const response = await page.goto(site + path, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, path);
      assert(await page.locator('h1').count(), path);
      assert(!await page.locator('body').textContent().then(s => s.includes('Liquid error')), path);
    }
    const original = await page.request.get(`${site}/products/mineral-rhythm-original.js`).then(r => r.json());
    const print = await page.request.get(`${site}/products/mineral-rhythm-print.js`).then(r => r.json());
    const added = await page.request.post(`${site}/cart/add.js`, { data: { items: [
      { id: original.variants[0].id, quantity: 1 }, { id: print.variants[0].id, quantity: 1 }
    ] } });
    assert.equal(added.status(), 200, await added.text());
    const cart = await page.request.get(`${site}/cart.js`).then(r => r.json());
    assert.equal(cart.item_count, 2);
    await page.request.post(`${site}/cart/clear.js`);
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile homepage, 8 collections, product pages, carousel and mixed original/print cart. No purchases made.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
