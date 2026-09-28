/* Shalini Mall — general UI: header, mega menu, mobile menu, drawers, cart
   drawer, header counts, delegated card actions, newsletter. */
(function () {
  const SM = window.SM;
  const { $, $$, esc, icon, money } = SM;

  /* Sticky header shadow ------------------------------------------------------ */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mega menu: opens on hover (with intent delay), click, or keyboard. */
  const shopToggle = $('#shopToggle');
  const mega = $('#megaShop');
  let megaTimer;
  const setMega = open => {
    clearTimeout(megaTimer);
    mega.classList.toggle('open', open);
    shopToggle.setAttribute('aria-expanded', String(open));
  };
  const megaLater = (open, ms) => { clearTimeout(megaTimer); megaTimer = setTimeout(() => setMega(open), ms); };
  if (shopToggle && mega) {
    mega.inert = true;
    new MutationObserver(() => { mega.inert = !mega.classList.contains('open'); }).observe(mega, { attributes: true, attributeFilter: ['class'] });
    shopToggle.addEventListener('click', () => setMega(!mega.classList.contains('open')));
    shopToggle.addEventListener('mouseenter', () => megaLater(true, 120));
    mega.addEventListener('mouseenter', () => clearTimeout(megaTimer));
    header.addEventListener('mouseleave', () => megaLater(false, 200));
    $$('.desktop-nav .nav-link:not(#shopToggle)').forEach(a => a.addEventListener('mouseenter', () => megaLater(false, 120)));
    shopToggle.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMega(true); SM.focusables(mega)[0]?.focus(); }
    });
    header.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mega.classList.contains('open')) { setMega(false); shopToggle.focus(); }
    });
    header.addEventListener('focusout', e => { if (!header.contains(e.relatedTarget)) setMega(false); });
    document.addEventListener('click', e => { if (!header.contains(e.target)) setMega(false); });
  }

  /* Mobile menu: inline Shop accordion ------------------------------------------ */
  const menuToggle = $('[data-menu-toggle]');
  const menuSub = $('#menuShop');
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuSub.hidden = !open;
  });
  // Close the mobile menu if the viewport grows into the desktop layout.
  matchMedia('(min-width: 1101px)').addEventListener('change', e => { if (e.matches && SM.overlay.isOpen('menuPanel')) SM.overlay.close({ restore: false }); });

  /* Cart helpers ------------------------------------------------------------------- */
  SM.lineLabel = line => {
    const p = SM.catalog.get(line.productId);
    if (!p) return '';
    if (p.type === 'original') return `Original · ${p.dimensionsLabel}`;
    const v = SM.catalog.variant(p, line.variantId);
    return `Fine art print · ${SM.catalog.sizeLabel(v)}`;
  };

  SM.lineItem = line => {
    const url = SM.url.product(line.productId, line.type === 'print' ? line.variantId : null);
    const qty = line.type === 'original'
      ? '<span class="line-item__unique">One of one</span>'
      : `<div class="qty qty--sm" role="group" aria-label="Quantity for ${esc(line.title)}">
          <button type="button" data-line-qty="${line.lineId}" data-delta="-1" aria-label="Decrease quantity"${line.quantity <= 1 ? ' disabled' : ''}>${icon('minus')}</button>
          <output aria-live="polite">${line.quantity}</output>
          <button type="button" data-line-qty="${line.lineId}" data-delta="1" aria-label="Increase quantity"${line.quantity >= SM.cart.MAX_QTY ? ' disabled' : ''}>${icon('plus')}</button>
        </div>`;
    return `<article class="line-item">
      <a href="${url}" tabindex="-1" aria-hidden="true">${SM.art(line.image, '', { cls: 'line-item__thumb' })}</a>
      <div class="line-item__body">
        <div class="line-item__top">
          <h3 class="line-item__title"><a href="${url}">${esc(line.title)}</a></h3>
          <button type="button" class="line-item__remove" data-line-remove="${line.lineId}" aria-label="Remove ${esc(line.title)} from cart">${icon('close')}</button>
        </div>
        <span class="line-item__variant">${esc(SM.lineLabel(line))}${line.quantity > 1 ? ` · ${money(line.price)} each` : ''}</span>
        <div class="line-item__bottom">
          ${qty}
          <span class="line-item__price">${money(line.price * line.quantity)}</span>
        </div>
      </div>
    </article>`;
  };

  /* Re-render while keeping keyboard focus on the equivalent control. */
  SM.renderKeepingFocus = (host, html) => {
    const a = document.activeElement;
    const key = a && host.contains(a) ? ['data-line-qty', 'data-line-remove'].map(k => a.getAttribute(k) && `[${k}="${a.getAttribute(k)}"]${a.dataset.delta ? `[data-delta="${a.dataset.delta}"]` : ''}`).find(Boolean) : null;
    host.innerHTML = html;
    if (!key) return;
    const next = host.querySelector(key);
    (next && !next.disabled ? next : SM.focusables(host)[0] || host.closest('[role=dialog]')?.querySelector('[data-close]'))?.focus();
  };

  function renderCartDrawer() {
    const { lines, count, subtotal } = SM.cart.summary();
    $$('[data-cart-count]').forEach(el => { el.textContent = count || ''; el.dataset.count = count; });
    $$('[data-cart-count-text]').forEach(el => { el.textContent = count ? `(${count})` : ''; });
    $$('[data-cart-link]').forEach(el => el.setAttribute('aria-label', count ? `Cart, ${count} item${count > 1 ? 's' : ''}` : 'Cart, empty'));
    const host = $('#cartItems');
    $('#cartFoot').hidden = !lines.length;
    $('#cartSubtotal').textContent = money(subtotal);
    SM.renderKeepingFocus(host, lines.length ? lines.map(SM.lineItem).join('') : `<div class="cart-empty">
      <h3>Your collection is empty</h3>
      <p>Originals and prints you add will gather here.</p>
      <a class="text-link" href="shop.html">Continue exploring ${icon('arrow')}</a>
    </div>`);
  }

  function renderWishlistCount() {
    const n = SM.wishlist.count();
    $$('[data-wishlist-count]').forEach(el => { el.textContent = n || ''; el.dataset.count = n; });
    $$('[data-wishlist-count-text]').forEach(el => { el.textContent = n ? `(${n})` : ''; });
    $$('[data-wishlist-link]').forEach(el => el.setAttribute('aria-label', n ? `Wishlist, ${n} saved` : 'Wishlist'));
    const ids = new Set(SM.wishlist.ids());
    $$('[data-wishlist-toggle]').forEach(btn => btn.setAttribute('aria-pressed', String(ids.has(btn.dataset.wishlistToggle))));
  }

  /* Add to cart with feedback. Returns the cart result. */
  SM.addToCart = (productId, variantId, quantity = 1) => {
    const result = SM.cart.add(productId, variantId, quantity);
    $$('dialog[open]').forEach(d => d.close());
    if (result.ok) {
      SM.overlay.open('cartPanel');
      SM.toast('Added to your collection');
    } else if (result.reason === 'unique') {
      SM.overlay.open('cartPanel');
      SM.toast('This original is one of one and already in your cart');
    } else {
      SM.toast('Sorry, this artwork is not available');
    }
    return result;
  };

  SM.on('cart:change', renderCartDrawer);
  SM.on('wishlist:change', renderWishlistCount);
  renderCartDrawer();
  renderWishlistCount();

  /* Delegated actions ------------------------------------------------------------- */
  document.addEventListener('click', e => {
    const t = e.target;
    const open = t.closest('[data-open]');
    if (open) { e.preventDefault(); SM.overlay.open(open.dataset.open, open); return; }
    if (t.closest('[data-close]')) { SM.overlay.close(); return; }

    const wish = t.closest('[data-wishlist-toggle]');
    if (wish) {
      const saved = SM.wishlist.toggle(wish.dataset.wishlistToggle);
      SM.toast(saved ? 'Saved to your wishlist' : 'Removed from your wishlist');
      return;
    }
    const wishRemove = t.closest('[data-wishlist-remove]');
    if (wishRemove) { SM.wishlist.remove(wishRemove.dataset.wishlistRemove); SM.toast('Removed from your wishlist'); return; }

    const quickView = t.closest('[data-quick-view]');
    if (quickView) { SM.quickView?.open(quickView.dataset.quickView, quickView); return; }

    const quickAdd = t.closest('[data-quick-add]');
    if (quickAdd) {
      const p = SM.catalog.get(quickAdd.dataset.quickAdd);
      if (p && p.variants.length === 1) SM.addToCart(p.id, p.variants[0].id);
      else SM.quickView?.open(p.id, quickAdd);
      return;
    }

    const move = t.closest('[data-move-to-cart]');
    if (move) {
      const p = SM.catalog.get(move.dataset.moveToCart);
      if (p.variants.length === 1) {
        const r = SM.addToCart(p.id, p.variants[0].id);
        if (r.ok || r.reason === 'unique') SM.wishlist.remove(p.id);
      } else {
        SM.quickView?.open(p.id, move, { fromWishlist: true });
      }
      return;
    }

    const qtyBtn = t.closest('[data-line-qty]');
    if (qtyBtn) {
      const line = SM.cart.lines().find(l => l.lineId === qtyBtn.dataset.lineQty);
      if (line) SM.cart.update(line.lineId, line.quantity + Number(qtyBtn.dataset.delta));
      return;
    }
    const remove = t.closest('[data-line-remove]');
    if (remove) { SM.cart.remove(remove.dataset.lineRemove); SM.toast('Removed from your cart'); return; }

    const checkout = t.closest('[data-checkout]');
    if (checkout) { SM.overlay.close({ restore: false }); SM.dialog.open($('#checkoutDialog'), checkout); }
  });

  /* Newsletter (UI only in Phase 1 — Shopify customer marketing in Phase 2) ----- */
  $('#newsletterForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = form.elements.email;
    const msg = form.querySelector('.form-message');
    if (!email.value.trim() || !email.validity.valid) {
      msg.textContent = 'Please enter a valid email address.';
      msg.classList.add('is-error');
      email.setAttribute('aria-invalid', 'true');
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');
    msg.classList.remove('is-error');
    msg.textContent = 'Welcome to the studio. Thank you.';
    form.reset();
  });
})();
