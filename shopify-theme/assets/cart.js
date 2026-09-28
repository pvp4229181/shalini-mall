/* Shalini Mall theme — cart (SM.cart) on Shopify's AJAX Cart API.
   Every add/change asks Shopify to re-render the cart drawer (and the cart page,
   when open) through the Section Rendering API, so totals always come from Shopify. */
(function () {
  const SM = window.SM;
  const R = SM.config.routes;

  const sectionIds = () => {
    const ids = ['cart-drawer'];
    const main = SM.$('[data-main-cart]');
    if (main) ids.push(main.dataset.sectionId);
    return ids;
  };

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...body, sections: sectionIds().join(','), sections_url: location.pathname })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status) throw data;
    return data;
  }

  function updateCounts(count) {
    SM.$$('[data-cart-count]').forEach(el => { el.textContent = count > 0 ? count : ''; el.dataset.count = count; });
    SM.$$('[data-cart-count-text]').forEach(el => { el.textContent = count > 0 ? `(${count})` : ''; });
    SM.$$('[data-cart-link]').forEach(el => el.setAttribute('aria-label', count ? `Cart, ${count} item${count > 1 ? 's' : ''}` : 'Cart, empty'));
  }

  function applySections(sections) {
    if (!sections) return;
    const drawerHtml = sections['cart-drawer'];
    if (drawerHtml) {
      const fresh = SM.parse(drawerHtml).querySelector('[data-cart-inner]');
      SM.swapKeepingFocus(SM.$('[data-cart-inner]'), fresh);
      if (fresh) updateCounts(Number(fresh.dataset.count) || 0);
    }
    const main = SM.$('[data-main-cart]');
    if (main && sections[main.dataset.sectionId]) {
      const fresh = SM.parse(sections[main.dataset.sectionId]).querySelector('[data-main-cart]');
      const hadFocus = main.contains(document.activeElement);
      SM.swapKeepingFocus(main, fresh);
      if (hadFocus && !main.contains(document.activeElement)) SM.focusables(main)[0]?.focus();
    }
    SM.emit('cart:change');
  }

  SM.cart = {
    async add(variantId, quantity = 1) {
      const data = await post(`${R.cartAdd}.js`, { items: [{ id: Number(variantId), quantity: Number(quantity) || 1 }] });
      applySections(data.sections);
      return data;
    },
    async change(key, quantity) {
      const data = await post(`${R.cartChange}.js`, { id: key, quantity: Number(quantity) });
      applySections(data.sections);
      return data;
    }
  };

  /* Add with feedback: opens the drawer, or explains why Shopify refused (e.g. a one-of-one original already in the cart). */
  SM.addToCart = async (variantId, quantity = 1, button) => {
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    try {
      await SM.cart.add(variantId, quantity);
      SM.$$('dialog[open]').forEach(d => d.close());
      SM.overlay.open('cartPanel');
      SM.toast('Added to your collection');
      return true;
    } catch (err) {
      SM.toast(err.description || err.message || 'Sorry, this artwork could not be added.');
      if (err.status === 422) { SM.$$('dialog[open]').forEach(d => d.close()); SM.overlay.open('cartPanel'); }
      return false;
    } finally {
      if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
    }
  };

  /* Quantity and remove buttons in the drawer and on the cart page carry the target quantity. */
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-line-key][data-quantity]');
    if (!btn) return;
    e.preventDefault();
    btn.setAttribute('aria-busy', 'true');
    try {
      await SM.cart.change(btn.dataset.lineKey, btn.dataset.quantity);
      if (btn.dataset.quantity === '0') SM.toast('Removed from your cart');
    } catch (err) {
      SM.toast(err.description || err.message || 'Sorry, the cart could not be updated.');
    }
  });
})();
