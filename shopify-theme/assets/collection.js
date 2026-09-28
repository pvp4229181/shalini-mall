/* Shalini Mall theme — collection filtering, sorting and load more with the
   Section Rendering API. Every control is also a plain link or form field, so the
   page still works without JavaScript. */
(function () {
  const SM = window.SM;
  const { $, $$ } = SM;

  function init(scope) {
    const listing = scope.matches?.('[data-listing]') ? scope : $('[data-listing]', scope);
    if (!listing || listing.dataset.ready) return;
    listing.dataset.ready = 'true';
    const sectionId = listing.dataset.sectionId;
    const panel = $('.filter-panel', listing);

    /* The filter panel is a sidebar on desktop and a drawer below 1024px. */
    if (panel) {
      const mq = matchMedia('(max-width: 1024px)');
      const applyMode = () => {
        if (mq.matches) {
          panel.setAttribute('role', 'dialog');
          panel.setAttribute('aria-modal', 'true');
          if (!panel.classList.contains('open')) { panel.inert = true; panel.setAttribute('aria-hidden', 'true'); }
        } else {
          if (SM.overlay.isOpen(panel.id)) SM.overlay.close({ restore: false });
          ['role', 'aria-modal', 'aria-hidden'].forEach(a => panel.removeAttribute(a));
          panel.inert = false;
        }
      };
      mq.addEventListener('change', applyMode);
      SM.on('overlay:close', id => { if (id === panel.id) applyMode(); });
      applyMode();
    }

    let controller;
    async function load(url, { push = true } = {}) {
      controller?.abort();
      controller = new AbortController();
      listing.setAttribute('aria-busy', 'true');
      try {
        const u = new URL(url, location.origin);
        u.searchParams.set('section_id', sectionId);
        const html = await fetch(u, { signal: controller.signal }).then(r => r.text());
        const fresh = SM.parse(html).querySelector('[data-listing]');
        if (!fresh) return;
        const focusName = document.activeElement?.name;
        const focusValue = document.activeElement?.value;
        // Swap results and the filter form (fresh counts); keep the panel element so an open drawer stays open.
        $('[data-results]', listing).innerHTML = $('[data-results]', fresh).innerHTML;
        const form = $('[data-filter-form]', listing);
        if (form) form.innerHTML = $('[data-filter-form]', fresh).innerHTML;
        const foot = $('.filter-panel__foot', listing);
        if (foot) foot.innerHTML = $('.filter-panel__foot', fresh).innerHTML;
        const tabs = $('.listing-tabs', listing);
        if (tabs) tabs.innerHTML = $('.listing-tabs', fresh).innerHTML;
        if (push) { u.searchParams.delete('section_id'); history.replaceState(null, '', u); }
        if (focusName) $$(`[name="${CSS.escape(focusName)}"]`, listing).find(el => el.value === focusValue)?.focus();
        SM.syncWishlistButtons?.();
      } catch (err) {
        if (err.name !== 'AbortError') location.href = url;
      } finally {
        listing.removeAttribute('aria-busy');
      }
    }

    const currentUrl = () => {
      const u = new URL(location.href);
      const params = new URLSearchParams();
      const form = $('[data-filter-form]', listing);
      if (form) {
        for (const [k, v] of new FormData(form)) { if (v !== '') params.append(k, v); }
      } else {
        // Tabs layout: keep the active tab's filter while sorting.
        [...u.searchParams].filter(([k]) => k.startsWith('filter.')).forEach(([k, v]) => params.append(k, v));
      }
      const sort = $('[data-sort]', listing);
      if (sort) params.set('sort_by', sort.value);
      return `${u.pathname}?${params}`;
    };

    let debounce;
    listing.addEventListener('change', e => {
      if (e.target.matches('[data-sort], [data-filter-form] input')) {
        clearTimeout(debounce);
        debounce = setTimeout(() => load(currentUrl()), e.target.type === 'number' ? 500 : 0);
      }
    });
    listing.addEventListener('input', e => {
      if (e.target.matches('[data-filter-form] input[type="number"]')) { clearTimeout(debounce); debounce = setTimeout(() => load(currentUrl()), 700); }
    });

    listing.addEventListener('click', async e => {
      const link = e.target.closest('[data-filter-link]');
      if (link) { e.preventDefault(); load(link.href); return; }

      const more = e.target.closest('[data-load-more]');
      if (!more) return;
      e.preventDefault();
      more.setAttribute('aria-busy', 'true');
      try {
        const u = new URL(more.href, location.origin);
        u.searchParams.set('section_id', sectionId);
        const fresh = SM.parse(await fetch(u).then(r => r.text())).querySelector('[data-listing]');
        const grid = $('[data-grid]', listing);
        const firstNew = grid.children.length;
        grid.append(...$('[data-grid]', fresh).children);
        $('[data-more]', listing).replaceWith($('[data-more]', fresh) || document.createElement('span'));
        grid.children[firstNew]?.querySelector('.card__title a')?.focus();
        SM.syncWishlistButtons?.();
      } catch {
        location.href = more.href;
      }
    });
  }

  init(document);
  document.addEventListener('shopify:section:load', e => init(e.target));
})();
