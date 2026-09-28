/* Shalini Mall theme — quick view (SM.quickView). Content is rendered by
   sections/quick-view.liquid through the Section Rendering API. */
(function () {
  const SM = window.SM;
  const dialog = SM.$('#quickView');
  if (!dialog) return;

  async function open(handle, trigger, { onAdded } = {}) {
    let html;
    try {
      html = await SM.fetchSection(SM.productUrl(handle), 'quick-view');
    } catch {
      location.href = SM.productUrl(handle);
      return;
    }
    const content = SM.parse(html).querySelector('[data-quick-view-content]');
    if (!content) { location.href = SM.productUrl(handle); return; }
    dialog.replaceChildren(content);

    const product = SM.productData(content);
    const form = content.querySelector('form');
    const idInput = form.querySelector('[data-variant-input]');
    const addBtn = form.querySelector('[data-add]');
    const price = content.querySelector('[data-price]');
    const getQty = SM.qty.bind(form.querySelector('.qty'));
    SM.variants.bind(form.querySelector('[data-options]'), product, v => {
      idInput.value = v.id;
      price.textContent = v.price;
      addBtn.disabled = !v.available;
      addBtn.textContent = v.available ? 'Add to cart' : 'Sold';
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      e.stopPropagation(); // handled here instead of the global product-form handler
      const ok = await SM.addToCart(idInput.value, getQty(), addBtn);
      if (ok) onAdded?.();
    });
    SM.dialog.open(dialog, trigger);
    (content.querySelector('.pill input:checked') || addBtn)?.focus();
  }

  SM.quickView = { open };
})();
