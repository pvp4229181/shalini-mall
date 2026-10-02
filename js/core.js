/* Shalini Mall — core helpers shared by every page (namespace: window.SM).
   Classic scripts (not ES modules) so the site also works when opened from disk. */
(function () {
  const SM = (window.SM = window.SM || {});

  SM.$ = (sel, root = document) => root.querySelector(sel);
  SM.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  SM.esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  SM.reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  SM.param = name => new URLSearchParams(location.search).get(name);

  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  SM.money = value => usd.format(value);

  // localStorage that never throws (private browsing, blocked storage, quota).
  SM.storage = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: state lives for this page only */ }
    }
  };

  // Event bus. Modules announce changes ('cart:change', 'wishlist:change') and the UI listens.
  SM.emit = (name, detail) => document.dispatchEvent(new CustomEvent(`sm:${name}`, { detail }));
  SM.on = (name, fn) => document.addEventListener(`sm:${name}`, e => fn(e.detail));

  SM.url = {
    product: (id, variantId) => `product.html?id=${encodeURIComponent(id)}${variantId ? `&variant=${encodeURIComponent(variantId)}` : ''}`,
    collection: id => `collections.html?id=${encodeURIComponent(id)}`,
    search: q => `search.html?q=${encodeURIComponent(q)}`
  };

  const ICONS = {
    menu: '<path d="M4 8h16M4 16h16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    filter: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    ruler: '<path d="M3 15 15 3l6 6L9 21Z"/><path d="m7 11 2 2M10 8l2 2M13 5l2 2"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    play: '<path d="M8 5v14l11-7Z"/>'
  };
  SM.icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  /* Artwork image. Every artwork image on the site is a crop of a painting;
     `image.crop` is the CSS object-position that frames it. */
  // Render a viewport onto the uploaded reference without duplicating its raster data.
  SM.artImage = (image, alt, opts = {}) => {
    if (image.viewBox) {
      return `<svg class="art-reference ${opts.cls || ''}" viewBox="${image.viewBox}" role="img" aria-label="${SM.esc(alt)}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><image href="${SM.esc(image.src)}" width="1536" height="1024" /></svg>`;
    }
    const loading = opts.lazy !== false && !opts.priority ? ' loading="lazy"' : '';
    const fetch = opts.priority ? ' fetchpriority="high"' : '';
    return `<img class="${opts.cls || ''}" src="${SM.esc(image.src)}" alt="${SM.esc(alt)}"${loading}${fetch} decoding="async">`;
  };

  SM.art = (image, alt, opts = {}) => {
    const { lazy = true, cls = '', zoom, priority = false } = opts;
    const style = `--crop:${image.crop || 'center'};--art-fit:${image.fit || 'cover'}${zoom ? `;--zoom:${zoom}` : ''}`;
    return `<div class="art ${cls}" style="${style}">${SM.artImage(image, alt, { lazy, priority })}</div>`;
  };

  /* Focusable elements that are actually visible. */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  SM.focusables = root => SM.$$(FOCUSABLE, root).filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');

  /* Overlay manager for drawers (menu, cart, filters) and the search overlay:
     one open at a time, scrim, scroll lock, focus trap, Escape, focus restore. */
  let active = null;
  let returnFocus = null;
  SM.overlay = {
    open(id, trigger) {
      const el = document.getElementById(id);
      if (!el) return;
      if (active && active !== el) this.close({ restore: false });
      returnFocus = trigger || document.activeElement;
      active = el;
      el.inert = false;
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('locked', 'overlay-open');
      SM.$$(`[aria-controls="${id}"]`).forEach(t => t.setAttribute('aria-expanded', 'true'));
      const target = el.querySelector('[data-autofocus]') || SM.focusables(el)[0];
      setTimeout(() => target?.focus({ preventScroll: true }), 60);
      SM.emit('overlay:open', id);
    },
    close({ restore = true } = {}) {
      if (!active) return;
      const el = active;
      active = null;
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
      el.inert = true;
      document.body.classList.remove('locked', 'overlay-open');
      SM.$$(`[aria-controls="${el.id}"]`).forEach(t => t.setAttribute('aria-expanded', 'false'));
      if (restore && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
      SM.emit('overlay:close', el.id);
    },
    isOpen: id => !!active && (!id || active.id === id)
  };

  document.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') { SM.overlay.close(); return; }
    if (e.key !== 'Tab') return;
    const items = SM.focusables(active);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Native <dialog> helper: backdrop click closes, scroll lock, focus restore. */
  SM.dialog = {
    open(dialog, trigger) {
      if (!dialog || dialog.open) return;
      const back = trigger || document.activeElement;
      dialog.showModal();
      document.body.classList.add('locked');
      dialog.addEventListener('close', () => {
        if (!SM.$$('dialog[open]').length && !active) document.body.classList.remove('locked');
        if (back && document.contains(back)) back.focus({ preventScroll: true });
      }, { once: true });
    }
  };
  document.addEventListener('click', e => {
    const dialog = e.target;
    if (dialog instanceof HTMLDialogElement && dialog.open) {
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside || dialog.classList.contains('lightbox')) dialog.close();
    }
    if (e.target.closest('[data-dialog-close]')) e.target.closest('dialog')?.close();
  });

  let toastTimer;
  SM.toast = message => {
    const t = SM.$('.toast');
    if (!t) return;
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  };

  window.money = SM.money; // kept for older inline scripts
})();
