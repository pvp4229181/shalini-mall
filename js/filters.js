/* Shalini Mall — product listing engine (SM.listing): filters, sorting,
   product count, load more, URL state and the mobile filter drawer.

   A facet is only shown when the products on the page actually differ on it,
   so filters such as medium, orientation or frame appear automatically once
   that data exists in js/products.js. */
(function () {
  const SM = window.SM;
  const { $, $$, esc, icon, money } = SM;

  const SIZE_BUCKETS = [
    { id: 'small', label: 'Intimate · up to 80 cm', test: d => Math.max(d.w, d.h) <= 80 },
    { id: 'medium', label: 'Medium · 80–120 cm', test: d => Math.max(d.w, d.h) > 80 && Math.max(d.w, d.h) <= 120 },
    { id: 'large', label: 'Large · over 120 cm', test: d => Math.max(d.w, d.h) > 120 }
  ];
  const VALUE_ORDER = ['original', 'print', 'available', 'sold', 'small', 'medium', 'large', '8 × 10 in', '10 × 8 in', '16 × 20 in', '20 × 16 in', '24 × 30 in', '30 × 24 in', '30 × 40 in', '40 × 30 in', 'Portrait', 'Landscape', 'Square'];

  /* Facet definitions: each returns [valueId, label] pairs for a product. */
  const FACETS = {
    type: { label: 'Type', values: p => [[p.type, p.typeLabel]] },
    collection: { label: 'Collection', values: p => [[p.collection, SM.catalog.collection(p.collection)?.title || p.collection]] },
    availability: { label: 'Availability', values: p => [[p.available ? 'available' : 'sold', p.available ? 'Available' : 'Sold']] },
    price: { label: 'Price', values: (p, cfg) => cfg.priceBuckets.filter(b => p.price >= b.min && p.price < b.max).map(b => [b.id, b.label]) },
    // Originals: dimension bands. Prints: available stretched-canvas sizes.
    dimensions: {
      label: 'Dimensions',
      values: p => (p.type === 'original' && p.dimensions ? SIZE_BUCKETS.filter(b => b.test(p.dimensions)).map(b => [b.id, b.label]) : [])
    },
    size: {
      label: 'Canvas size',
      values: p => p.variants.filter(v => v.options.Size).map(v => [v.options.Size, v.dimensions ? `${v.options.Size} · ${v.dimensions.w} × ${v.dimensions.h} cm` : v.options.Size])
    },
    orientation: { label: 'Orientation', values: p => (p.orientation ? [[p.orientation, p.orientation]] : []) },
    medium: { label: 'Medium', values: p => (p.medium ? [[p.medium, p.medium]] : []) },
    frame: { label: 'Frame', values: p => p.variants.filter(v => v.options.Frame).map(v => [v.options.Frame, v.options.Frame]) }
  };

  const SORTS = {
    featured: { label: 'Featured', fn: (a, b) => a.position - b.position },
    newest: { label: 'Newest', fn: (a, b) => (b.year || 0) - (a.year || 0) || a.position - b.position, needs: list => list.some(p => p.year) },
    'price-asc': { label: 'Price, low to high', fn: (a, b) => a.price - b.price },
    'price-desc': { label: 'Price, high to low', fn: (a, b) => b.price - a.price },
    alpha: { label: 'Alphabetical, A–Z', fn: (a, b) => a.title.localeCompare(b.title) || a.position - b.position }
  };

  /* Price buckets from a list of boundaries, e.g. [50, 500]. */
  SM.priceBuckets = bounds => [0, ...bounds].map((min, i, all) => {
    const max = bounds[i] ?? Infinity;
    const label = i === 0 ? `Under ${money(max)}` : max === Infinity ? `${money(min)} and above` : `${money(min)} – ${money(max)}`;
    return { id: i === 0 ? `under-${max}` : max === Infinity ? `${min}-plus` : `${min}-${max}`, label, min, max };
  });

  SM.listing = function (mount, userConfig) {
    const cfg = Object.assign({ facets: Object.keys(FACETS), priceBuckets: SM.priceBuckets([50, 500]), pageSize: 9, numbered: false, noun: ['work', 'works'] }, userConfig);
    const base = cfg.products;
    const valuesOf = (key, p) => FACETS[key].values(p, cfg);

    // Only facets whose values differ across this page's products.
    const facets = cfg.facets.filter(key => {
      const seen = new Set();
      base.forEach(p => valuesOf(key, p).forEach(([v]) => seen.add(v)));
      return seen.size > 1;
    });
    const sorts = Object.entries(SORTS).filter(([, s]) => !s.needs || s.needs(base));
    const tabKey = cfg.tabs && facets.includes(cfg.tabs) ? cfg.tabs : null;
    const side = facets.filter(k => k !== tabKey);

    /* State, restored from the URL. */
    const params = new URLSearchParams(location.search);
    const state = { filters: {}, sort: 'featured', shown: cfg.pageSize };
    facets.forEach(key => {
      const valid = new Set(base.flatMap(p => valuesOf(key, p).map(([v]) => v)));
      const picked = (params.get(key) || '').split(',').filter(v => valid.has(v));
      state.filters[key] = new Set(picked);
    });
    if (SORTS[params.get('sort')] && sorts.some(([k]) => k === params.get('sort'))) state.sort = params.get('sort');

    const matches = (p, skipKey) => facets.every(key => {
      if (key === skipKey) return true;
      const chosen = state.filters[key];
      return !chosen.size || valuesOf(key, p).some(([v]) => chosen.has(v));
    });
    const activeCount = () => side.reduce((n, k) => n + state.filters[k].size, 0);
    const plural = n => `${n} ${n === 1 ? cfg.noun[0] : cfg.noun[1]}`;

    /* Markup. */
    const facetMarkup = key => {
      const values = new Map();
      base.forEach(p => valuesOf(key, p).forEach(([v, label]) => values.set(v, label)));
      const ordered = [...values].sort((a, b) => {
        const ia = VALUE_ORDER.indexOf(a[0]), ib = VALUE_ORDER.indexOf(b[0]);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a[1]).localeCompare(b[1]);
      });
      const bucketOrder = key === 'price' ? cfg.priceBuckets.map(b => b.id) : null;
      if (bucketOrder) ordered.sort((a, b) => bucketOrder.indexOf(a[0]) - bucketOrder.indexOf(b[0]));
      return `<details class="facet" open>
        <summary>${FACETS[key].label}${icon('chevron')}</summary>
        <fieldset class="facet__values"><legend class="sr-only">${FACETS[key].label}</legend>
          ${ordered.map(([v, label]) => `<label class="check">
            <input type="checkbox" name="${key}" value="${esc(v)}"${state.filters[key].has(v) ? ' checked' : ''}>
            <span>${esc(label)}</span><small data-facet-count="${key}:${esc(v)}"></small>
          </label>`).join('')}
        </fieldset>
      </details>`;
    };

    const tabs = tabKey ? (() => {
      const values = new Map();
      base.forEach(p => valuesOf(tabKey, p).forEach(([v, label]) => values.set(v, label)));
      const ordered = [...values].sort((a, b) => VALUE_ORDER.indexOf(a[0]) - VALUE_ORDER.indexOf(b[0]));
      return `<div class="listing-tabs" role="group" aria-label="Show">
        <button type="button" data-tab="" aria-pressed="true">All</button>
        ${ordered.map(([v, label]) => `<button type="button" data-tab="${esc(v)}" aria-pressed="false">${esc(label)}s</button>`).join('')}
      </div>`;
    })() : '';

    const uid = `listing${Math.random().toString(36).slice(2, 7)}`;
    mount.innerHTML = `<div class="listing${side.length ? '' : ' listing--no-filters'}">
      ${tabs}
      <div class="listing-body">
        ${side.length ? `<aside class="filter-panel" id="${uid}-filters" aria-labelledby="${uid}-filters-title">
          <div class="filter-panel__head">
            <h2 id="${uid}-filters-title">Filter</h2>
            <button type="button" class="icon-btn" data-close aria-label="Close filters">${icon('close')}</button>
          </div>
          <form class="filter-form" data-filter-form>${side.map(facetMarkup).join('')}</form>
          <div class="filter-panel__foot">
            <button type="button" class="button outline" data-clear-filters>Clear all</button>
            <button type="button" class="button dark" data-close data-show-results></button>
          </div>
        </aside>` : ''}
        <div class="listing-results">
          <h2 class="sr-only">${esc(cfg.resultsHeading || 'Artworks')}</h2>
          <div class="listing-bar">
            ${side.length ? `<button type="button" class="button outline small listing-filter-btn" data-open="${uid}-filters" aria-controls="${uid}-filters" aria-expanded="false">${icon('filter')} Filter <span data-filter-count></span></button>` : ''}
            <p class="listing-count" aria-live="polite" data-result-count></p>
            <div class="listing-sort">
              <label class="label" for="${uid}-sort">Sort by</label>
              <select class="select" id="${uid}-sort" data-sort>${sorts.map(([k, s]) => `<option value="${k}"${k === state.sort ? ' selected' : ''}>${s.label}</option>`).join('')}</select>
            </div>
          </div>
          <div class="active-filters" data-chips></div>
          <div class="product-grid${cfg.gridClass ? ` ${cfg.gridClass}` : ''}" data-grid></div>
          <div class="empty-state" data-empty hidden>
            <h3>No artwork matches these filters</h3>
            <p>Try removing a filter to see more of the collection.</p>
            <button type="button" class="button outline" data-clear-filters>Clear filters</button>
          </div>
          <div class="load-more" data-more>
            <p data-progress-text></p>
            <div class="load-more__bar"><span data-progress></span></div>
            <button type="button" class="button outline" data-load-more>Load more</button>
          </div>
        </div>
      </div>
    </div>`;

    const grid = $('[data-grid]', mount);
    const panel = $('.filter-panel', mount);

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
          panel.removeAttribute('role');
          panel.removeAttribute('aria-modal');
          panel.removeAttribute('aria-hidden');
          panel.inert = false;
        }
      };
      mq.addEventListener('change', applyMode);
      SM.on('overlay:close', id => { if (id === panel.id) applyMode(); });
      applyMode();
    }

    function syncUrl() {
      const next = new URLSearchParams(location.search);
      facets.forEach(key => { const v = [...state.filters[key]].join(','); v ? next.set(key, v) : next.delete(key); });
      state.sort !== 'featured' ? next.set('sort', state.sort) : next.delete('sort');
      const qs = next.toString();
      history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
    }

    function render({ focusFrom } = {}) {
      const list = base.filter(p => matches(p)).sort(SORTS[state.sort].fn);
      const visible = list.slice(0, state.shown);
      grid.innerHTML = SM.cards.list(visible, { numbered: cfg.numbered, headingLevel: cfg.headingLevel });
      $('[data-result-count]', mount).textContent = plural(list.length);
      $('[data-empty]', mount).hidden = list.length > 0;

      const more = $('[data-more]', mount);
      more.hidden = list.length <= cfg.pageSize && visible.length === list.length;
      $('[data-progress-text]', mount).textContent = `Showing ${visible.length} of ${list.length}`;
      $('[data-progress]', mount).style.width = `${list.length ? (visible.length / list.length) * 100 : 0}%`;
      $('[data-load-more]', mount).hidden = visible.length >= list.length;

      if (panel) {
        // Faceted counts: how many works each value would show with the other filters kept.
        side.forEach(key => {
          const pool = base.filter(p => matches(p, key));
          $$(`[data-facet-count^="${key}:"]`, panel).forEach(el => {
            const v = el.dataset.facetCount.slice(key.length + 1);
            const n = pool.filter(p => valuesOf(key, p).some(([x]) => x === v)).length;
            el.textContent = `(${n})`;
            el.closest('.check').classList.toggle('is-empty', n === 0 && !state.filters[key].has(v));
          });
        });
        const n = activeCount();
        $('[data-filter-count]', mount).textContent = n ? `(${n})` : '';
        $('[data-show-results]', mount).textContent = `Show ${plural(list.length)}`;
        $$('[data-clear-filters]', mount).forEach(b => { b.disabled = !n; });
        $('[data-chips]', mount).innerHTML = n ? side.flatMap(key => [...state.filters[key]].map(v => {
          const label = $(`input[name="${key}"][value="${CSS.escape(v)}"]`, panel)?.nextElementSibling.textContent || v;
          return `<button type="button" class="chip" data-chip="${key}" data-value="${esc(v)}" aria-label="Remove filter ${esc(label)}">${esc(label)} ${icon('close')}</button>`;
        })).join('') + `<button type="button" class="text-link" data-clear-filters>Clear all</button>` : '';
      }
      if (tabKey) $$('[data-tab]', mount).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab ? state.filters[tabKey].has(b.dataset.tab) : !state.filters[tabKey].size)));
      if (focusFrom != null) grid.children[focusFrom]?.querySelector('.card__title a')?.focus();
      syncUrl();
    }

    mount.addEventListener('change', e => {
      if (e.target.matches('[data-sort]')) { state.sort = e.target.value; render(); return; }
      if (e.target.matches('[data-filter-form] input')) {
        const set = state.filters[e.target.name];
        e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
        state.shown = cfg.pageSize;
        render();
      }
    });
    mount.addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]');
      if (tab && tabKey) {
        state.filters[tabKey] = new Set(tab.dataset.tab ? [tab.dataset.tab] : []);
        state.shown = cfg.pageSize;
        render();
        return;
      }
      if (e.target.closest('[data-load-more]')) {
        const from = state.shown;
        state.shown += cfg.pageSize;
        render({ focusFrom: from });
        return;
      }
      const chip = e.target.closest('[data-chip]');
      if (chip) {
        state.filters[chip.dataset.chip].delete(chip.dataset.value);
        const box = $(`input[name="${chip.dataset.chip}"][value="${CSS.escape(chip.dataset.value)}"]`, panel);
        if (box) box.checked = false;
        render();
        ($('[data-chip]', mount) || $('[data-sort]', mount)).focus();
        return;
      }
      if (e.target.closest('[data-clear-filters]')) {
        side.forEach(k => state.filters[k].clear());
        $$('[data-filter-form] input', mount).forEach(i => { i.checked = false; });
        state.shown = cfg.pageSize;
        render();
        // The clicked button is now disabled or gone: keep focus somewhere sensible.
        const a = document.activeElement;
        if (!a || a === document.body || a.disabled) {
          (panel && SM.overlay.isOpen(panel.id) ? $('[data-filter-form] input', panel) : $('[data-sort]', mount)).focus();
        }
      }
    });

    render();
    return { render };
  };
})();
