/* Shalini Mall theme — product page behaviour (sections/main-product.liquid). */
(function () {
  const SM = window.SM;
  const { $, $$ } = SM;

  function init(scope) {
    const page = scope.matches?.('[data-product-page]') ? scope : $('[data-product-page]', scope);
    if (!page || page.dataset.ready) return;
    page.dataset.ready = 'true';

    const product = SM.productData(page);
    const form = $('[data-product-form]', page);
    if (!product || !form) return;
    const idInput = $('[data-variant-input]', form);
    const addBtn = $('[data-add]', form);
    const price = $('[data-price]', page);
    const availability = $('[data-availability]', page);
    const sticky = $('[data-sticky-buy]', page);
    let variant = product.variants.find(v => String(v.id) === idInput.value) || product.variants[0];
    const art = () => ({ title: product.title, src: product.image, crop: product.focus, label: product.isOriginal ? product.title : `${product.title} · ${variant.title}` });

    /* Gallery tabs: arrow keys move between views. */
    const tabs = $$('.gallery__thumb', page);
    const showView = (tab, focus) => {
      if (!tab) return;
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      $$('.gallery__slide', page).forEach(s => { const on = s.id === tab.getAttribute('aria-controls'); s.hidden = !on; s.classList.toggle('is-active', on); });
      if (focus) tab.focus();
    };
    tabs.forEach(t => {
      t.addEventListener('click', () => showView(t));
      t.addEventListener('keydown', e => {
        const visible = tabs.filter(x => !x.hidden);
        const d = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
        if (d) { e.preventDefault(); showView(visible[(visible.indexOf(t) + d + visible.length) % visible.length], true); }
      });
    });

    /* Lightbox */
    const lightbox = $('[data-lightbox-dialog]', page);
    const zoom = $('[data-lightbox]', page);
    zoom?.addEventListener('click', () => SM.dialog.open(lightbox, zoom));
    $('.gallery__slide--art', page)?.addEventListener('click', () => SM.dialog.open(lightbox, zoom));

    /* Scale view + size guide, when real dimensions are known. */
    const wallView = $('[data-wall-view]', page);
    const drawWall = () => {
      const d = SM.dimsFor(product, variant);
      const has = !!d;
      $('[data-wall-tab]', page).hidden = !has;
      $$('[data-size-guide]', page).forEach(b => { b.hidden = !has; });
      if (!has) return;
      const fig = $('[data-wall-figure]', wallView);
      fig ? SM.wall.update(fig, art(), d) : (wallView.innerHTML = SM.wall.render(art(), d, { caption: false }));
      const scenes = $('[data-interior-scenes]');
      if (scenes) {
        const figs = $$('[data-wall-figure]', scenes);
        if (figs.length) figs.forEach(f => SM.wall.update(f, art(), d));
        else scenes.innerHTML = Object.keys(SM.wall.scenes).map(s => SM.wall.render(art(), d, { scene: s })).join('');
        scenes.closest('[data-product-interiors]').hidden = false;
      }
    };
    drawWall();

    /* Variant changes: hidden id, price, availability, URL, media, scale, sticky bar. */
    const getQty = SM.qty.bind($('.qty', form));
    SM.variants.bind($('[data-options]', form), product, v => {
      variant = v;
      idInput.value = v.id;
      price.textContent = v.price;
      availability.textContent = v.available ? 'In stock' : 'Sold out';
      availability.classList.toggle('status--sold', !v.available);
      addBtn.disabled = !v.available;
      addBtn.textContent = v.available ? 'Add to cart' : 'Sold out';
      const url = new URL(location.href);
      url.searchParams.set('variant', v.id);
      history.replaceState(null, '', url);
      if (v.media) showView(tabs.find(t => t.dataset.mediaId === String(v.media)));
      drawWall();
      $$('[data-sticky-variant]', page).forEach(el => { el.textContent = `${v.title} · ${v.price}`; });
    });

    /* Size guide keeps the page's size choice in step. */
    $$('[data-size-guide]', page).forEach(b => b.addEventListener('click', () => SM.sizeGuide.open(product, variant, b, label => {
      const radio = $$('[data-option-index]', form).find(r => r.value === label);
      if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    })));

    /* Wishlist label */
    const syncWish = () => $$('[data-wish-label]', page).forEach(el => { el.textContent = SM.wishlist?.has(product.handle) ? 'Saved to wishlist' : 'Add to wishlist'; });
    SM.on('wishlist:change', syncWish);
    syncWish();

    /* Share */
    $('[data-share]', page)?.addEventListener('click', async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: location.href });
        else { await navigator.clipboard.writeText(location.href); SM.toast('Link copied'); }
      } catch (err) { if (err?.name !== 'AbortError') SM.toast('Could not share this link'); }
    });

    /* Sticky add-to-cart on small screens (prints), once the main button scrolls away. */
    if (sticky && 'IntersectionObserver' in window) {
      $('[data-sticky-add]', sticky).addEventListener('click', () => form.requestSubmit(addBtn));
      new IntersectionObserver(([entry]) => {
        const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        sticky.classList.toggle('show', show);
        sticky.inert = !show;
      }).observe($('.product-buy', page));
    }

    /* Related works (product recommendations), without this artwork's own counterpart. */
    const related = $('[data-related-products]');
    if (related?.dataset.url) {
      fetch(related.dataset.url).then(r => r.text()).then(html => {
        const fresh = SM.parse(html).querySelector('[data-related-products]');
        if (!fresh) return;
        related.innerHTML = fresh.innerHTML;
        const counterpart = page.dataset.counterpart;
        if (counterpart) $$(`[data-product="${CSS.escape(counterpart)}"]`, related).forEach(c => c.remove());
        const grid = $('[data-related-grid]', related);
        if (grid) { [...grid.children].slice(4).forEach(c => c.remove()); related.hidden = !grid.children.length; }
        SM.syncWishlistButtons?.();
      }).catch(() => { related.hidden = true; });
    }

    SM.recent?.track(product.handle);
  }

  init(document);
  document.addEventListener('shopify:section:load', e => init(e.target));
})();
