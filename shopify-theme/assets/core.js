/* Shalini Mall theme — core helpers (namespace window.SM).
   Ported from the Phase 1 site; data now comes from Shopify (Liquid + Section Rendering API). */
(function () {
  const SM = (window.SM = window.SM || {});
  SM.config = window.SM_CONFIG || { routes: { root: '/' } };

  SM.$ = (sel, root = document) => root.querySelector(sel);
  SM.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  SM.esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  SM.reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  SM.storage = {
    get(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } }
  };

  SM.emit = (name, detail) => document.dispatchEvent(new CustomEvent(`sm:${name}`, { detail }));
  SM.on = (name, fn) => document.addEventListener(`sm:${name}`, e => fn(e.detail));

  SM.productUrl = handle => `${SM.config.routes.root.replace(/\/$/, '')}/products/${encodeURIComponent(handle)}`;
  SM.parse = html => new DOMParser().parseFromString(html, 'text/html');

  /* Fetch one section's HTML through the Section Rendering API. */
  SM.fetchSection = async (url, sectionId) => {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}section_id=${encodeURIComponent(sectionId)}`);
    if (!res.ok) throw new Error(`Section ${sectionId} failed: ${res.status}`);
    return res.text();
  };

  const ICONS = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    next: '<path d="m9 6 6 6-6 6"/>',
    prev: '<path d="m15 6-6 6 6 6"/>',
    pause: '<path d="M9 6v12M15 6v12"/>',
    play: '<path d="M8 5v14l11-7Z"/>'
  };
  SM.icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  /* Artwork image for JS-rendered markup (wall drawings). */
  SM.art = (src, crop, alt = '', cls = '') =>
    `<div class="art ${cls}" style="--crop:${SM.esc(crop || 'center')}"><img src="${SM.esc(src)}" alt="${SM.esc(alt)}" loading="lazy" decoding="async"></div>`;

  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  SM.focusables = root => SM.$$(FOCUSABLE, root).filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');

  /* Replace an element's content with a freshly rendered version, keeping keyboard
     focus on the equivalent control (matched by data-line-key + data-focus). */
  SM.swapKeepingFocus = (host, fresh) => {
    if (!host || !fresh) return;
    const a = document.activeElement;
    const inside = a && host.contains(a);
    const key = inside ? a.dataset.lineKey : null;
    const role = inside ? a.dataset.focus : null;
    host.innerHTML = fresh.innerHTML;
    [...fresh.attributes].forEach(attr => { if (attr.name.startsWith('data-')) host.setAttribute(attr.name, attr.value); });
    if (!inside) return;
    const same = key && host.querySelector(`[data-line-key="${CSS.escape(key)}"][data-focus="${role}"]`);
    const target = same && !same.disabled ? same : host.querySelector('[data-focus="close"]') || SM.focusables(host)[0];
    target?.focus({ preventScroll: true });
  };

  /* Overlay manager for drawers and the search panel. */
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

  /* Native <dialog>: backdrop click closes, scroll lock, focus restore. */
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
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  };

  /* Size parsing for wall drawings: ISO paper names (A4…A0) or "30 x 40 cm" / '12" x 16"'. */
  const PAPER = { A5: [14.8, 21], A4: [21, 29.7], A3: [29.7, 42], A2: [42, 59.4], A1: [59.4, 84.1], A0: [84.1, 118.9] };
  SM.parseSize = text => {
    if (!text) return null;
    const t = String(text);
    const a = /\bA([0-5])\b/i.exec(t);
    if (a) { const [w, h] = PAPER[`A${a[1]}`]; return { w, h }; }
    const m = /(\d+(?:\.\d+)?)\s*(?:cm|in|"|″)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(cm|in|inch|inches|"|″)?/i.exec(t);
    if (!m) return null;
    let w = +m[1], h = +m[2];
    if (/["″]|\bin\b|inch/i.test(t)) { w = +(w * 2.54).toFixed(1); h = +(h * 2.54).toFixed(1); }
    return { w, h };
  };
})();
