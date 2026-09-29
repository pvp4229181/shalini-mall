// Serve the project locally; supports the same environment variables as product-slider.cjs.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', hasTouch: true });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = new URL(process.env.SITE_URL || 'http://127.0.0.1:8765/index.html');
    for (const width of [320, 375, 480, 768, 1440]) {
      await page.setViewportSize({ width, height: 812 });
      for (const id of ['small-hours', 'earth-song']) {
        await page.goto(new URL(`product.html?id=${id}`, base).href);
        await page.locator('.gallery__slide--art img').evaluate(image => image.decode());
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const overflow = await page.locator('.product-info').evaluate(root => {
          const bounds = root.getBoundingClientRect();
          return [...root.querySelectorAll('*')].some(element => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.right > bounds.right + 1 || rect.left < bounds.left - 1);
          });
        });
        assert.equal(overflow, false, `${id} purchase controls fit at ${width}px`);
        assert.equal(await page.locator('.product').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), width <= 768 ? 1 : 2);
        await page.getByRole('tab', { name: 'Detail', exact: true }).click();
        assert.equal(await page.locator('#view-detail').isVisible(), true);
        await page.getByRole('tab', { name: 'Artwork', exact: true }).click();
        await page.getByRole('button', { name: 'View artwork full screen' }).click();
        assert.equal(await page.locator('#lightbox').evaluate(element => element.open), true);
        await page.keyboard.press('Escape');
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(new URL('product.html?id=small-hours', base).href);
    await page.locator('[data-option="Size"]').last().check();
    const chosen = await page.locator('[data-option="Size"]:checked').inputValue();
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    assert.equal(await page.locator('#pdpQty').inputValue(), '2');
    await page.locator('[data-add]').click();
    await page.waitForFunction(() => document.querySelector('#cartPanel').classList.contains('open'));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('shalini-mall-cart')));
    assert.equal(stored[0].quantity, 2);
    assert.equal(stored[0].options.Size, chosen);
    await page.keyboard.press('Escape');
    await page.locator('#relatedSection').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#stickyBuy').classList.contains('show'));
    assert.equal(await page.locator('#stickyBuy').evaluate(element => element.inert), false);
    assert.deepEqual(errors, []);
    console.log('PASS: print/original layouts, galleries, zoom, size selection, quantity, cart, and mobile sticky purchase.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
