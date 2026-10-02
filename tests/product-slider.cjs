// Serve the project locally, then run: node tests/product-slider.cjs
// Optional: SITE_URL, PLAYWRIGHT_MODULE, and CHROMIUM_PATH environment variables.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', hasTouch: true });
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [320, 375, 768, 769, 1024, 1440]) {
      console.log(`Checking ${width}px`);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8765/index.html');
      await page.evaluate(() => document.fonts.ready);
      if (width > 768) {
        for (const slider of await page.locator('product-slider[data-per-view="1"]').all()) {
          assert.equal(await slider.locator('.product-slider__controls').isVisible(), false);
          assert.equal(await slider.locator('.product-slider__track').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
          assert.equal(await slider.locator('.product-slider__track').getAttribute('tabindex'), '-1');
        }
      }
      const perView = width > 768 ? 4 : 2;
      assert.equal(await page.locator('product-slider[data-per-view="4"]').count(), 2);
      for (const slider of await page.locator('product-slider[data-per-view="4"]').all()) {
        const track = slider.locator('.product-slider__track');
        const visibleCards = () => track.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return [...element.children].filter(card => {
            const rect = card.getBoundingClientRect();
            return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
          }).length;
        });
        assert.equal(await visibleCards(), perView, `${perView} cards at ${width}px`);
        assert.equal(await slider.getByRole('button', { name: 'Previous artworks' }).isDisabled(), true);
        await slider.getByRole('button', { name: 'Next artworks' }).click();
        await page.waitForFunction(id => document.getElementById(id).scrollLeft > 1, await track.getAttribute('id'));
        assert.equal(await visibleCards(), perView);
        await track.focus();
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction(id => document.getElementById(id).scrollLeft < 1, await track.getAttribute('id'));
        assert.equal(await visibleCards(), perView);
        // Native scrolling is the same path used by touch swipes.
        await track.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        await page.waitForFunction(id => document.getElementById(id).parentElement.querySelector('[aria-label="Next artworks"]').disabled, await track.getAttribute('id'));
        assert.equal(await visibleCards(), perView);
      }
      for (const slider of await page.locator('product-slider[data-per-view="1"]').all()) {
        if (width > 768) continue;
        const track = slider.locator('.product-slider__track');
        const count = await track.locator(':scope > :not(.compare-divider)').count();
        assert.equal(await track.evaluate(e => Math.abs(e.firstElementChild.getBoundingClientRect().width - e.clientWidth) < 1), true);
        for (let slide = 2; slide <= count; slide++) {
          await slider.getByRole('button', { name: 'Next slide', exact: true }).click();
          await page.waitForFunction(({ id, text }) => document.getElementById(id).parentElement.querySelector('.product-slider__status').textContent === text, { id: await track.getAttribute('id'), text: `${slide} / ${count}` });
        }
        assert.equal(await slider.getByRole('button', { name: 'Next slide', exact: true }).isDisabled(), true);
        await track.focus();
        await page.keyboard.press('ArrowLeft');
        await page.waitForFunction(({ id, text }) => document.getElementById(id).parentElement.querySelector('.product-slider__status').textContent === text, { id: await track.getAttribute('id'), text: `${count - 1} / ${count}` });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    // Resize an already-scrolled carousel into a desktop grid and back.
    await page.setViewportSize({ width: 375, height: 900 });
    const firstSlider = page.locator('product-slider').first();
    await firstSlider.getByRole('button', { name: 'Next slide', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelector('.product-slider__track').scrollLeft === 0);
    assert.equal(await firstSlider.locator('.product-slider__controls').isVisible(), false);
    await page.setViewportSize({ width: 375, height: 900 });
    assert.equal(await firstSlider.locator('.product-slider__controls').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: four desktop artworks, two mobile artworks, scrolling, keyboard, and resize transitions at 320–1440px.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
