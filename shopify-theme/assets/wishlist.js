/* Shalini Mall theme — wishlist (SM.wishlist): product handles in localStorage.
   Cards are rendered by Shopify (sections/product-card-render.liquid). */
(function () {
  const SM = window.SM;
  const KEY = 'shalini-mall-wishlist';

  const read = () => { const ids = SM.storage.get(KEY, []); return Array.isArray(ids) ? ids.filter(x => typeof x === 'string') : []; };
  const write = ids => { SM.storage.set(KEY, ids); SM.emit('wishlist:change', { ids }); };

  SM.wishlist = {
    handles: read,
    has: h => read().includes(h),
    add(h) { const ids = read(); if (!ids.includes(h)) { ids.unshift(h); write(ids); } },
    remove(h) { write(read().filter(x => x !== h)); },
    toggle(h) { const saved = !this.has(h); saved ? this.add(h) : this.remove(h); return saved; }
  };

  /* Fetch a rendered product card; resolves null if the product no longer exists. */
  const cache = new Map();
  SM.fetchCard = handle => {
    if (!cache.has(handle)) {
      cache.set(handle, SM.fetchSection(SM.productUrl(handle), 'product-card-render')
        .then(html => SM.parse(html).querySelector('.card'))
        .catch(() => null));
    }
    return cache.get(handle).then(card => (card ? card.cloneNode(true) : null));
  };

  function sync() {
    const ids = read();
    const n = ids.length;
    SM.$$('[data-wishlist-count]').forEach(el => { el.textContent = n || ''; el.dataset.count = n; });
    SM.$$('[data-wishlist-count-text]').forEach(el => { el.textContent = n ? `(${n})` : ''; });
    SM.$$('[data-wishlist-link]').forEach(el => el.setAttribute('aria-label', n ? `Wishlist, ${n} saved` : 'Wishlist'));
    const set = new Set(ids);
    SM.$$('[data-wishlist-toggle]').forEach(btn => btn.setAttribute('aria-pressed', String(set.has(btn.dataset.wishlistToggle))));
  }
  SM.syncWishlistButtons = sync;

  /* Wishlist page. */
  async function renderPage() {
    const grid = SM.$('[data-wishlist-grid]');
    if (!grid) return;
    const ids = read();
    const hadFocus = grid.contains(document.activeElement);
    const cards = await Promise.all(ids.map(h => SM.fetchCard(h).then(card => card && card.dataset.product === h ? card : null)));
    const found = cards.filter(Boolean);
    grid.replaceChildren(...found.map(card => {
      const actions = document.createElement('div');
      actions.className = 'card__actions';
      actions.innerHTML = `<button type="button" class="button small dark" data-move-to-cart="${SM.esc(card.dataset.product)}">Move to cart</button>
        <button type="button" class="text-link" data-wishlist-remove="${SM.esc(card.dataset.product)}">Remove</button>`;
      card.querySelector('.card__touch-add')?.remove();
      card.querySelector('.card__body').append(actions);
      return card;
    }));
    SM.$('[data-wishlist-empty]').hidden = found.length > 0;
    SM.$('[data-wishlist-summary]').textContent = found.length ? `${found.length} saved ${found.length === 1 ? 'work' : 'works'}` : '';
    sync();
    if (hadFocus) (grid.querySelector('.card__title a') || SM.$('[data-wishlist-empty] a'))?.focus();
  }

  document.addEventListener('click', e => {
    const toggle = e.target.closest('[data-wishlist-toggle]');
    if (toggle) {
      const saved = SM.wishlist.toggle(toggle.dataset.wishlistToggle);
      SM.toast(saved ? 'Saved to your wishlist' : 'Removed from your wishlist');
      return;
    }
    const remove = e.target.closest('[data-wishlist-remove]');
    if (remove) { SM.wishlist.remove(remove.dataset.wishlistRemove); SM.toast('Removed from your wishlist'); return; }

    const move = e.target.closest('[data-move-to-cart]');
    if (move) {
      const card = move.closest('[data-product]');
      const handle = move.dataset.moveToCart;
      if (card?.dataset.variantCount === '1') {
        SM.addToCart(card.dataset.variantId, 1, move).then(ok => { if (ok) SM.wishlist.remove(handle); });
      } else {
        SM.quickView?.open(handle, move, { onAdded: () => SM.wishlist.remove(handle) });
      }
    }
  });

  SM.on('wishlist:change', () => { sync(); renderPage(); });
  addEventListener('storage', e => { if (e.key === KEY) { sync(); renderPage(); } });
  document.addEventListener('shopify:section:load', sync);
  sync();
  renderPage();
})();
