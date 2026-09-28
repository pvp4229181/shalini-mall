/* Shalini Mall — search (SM.search). Phase 1 searches the local catalogue;
   Phase 2 swaps query() for Shopify predictive search and keeps this UI. */
(function () {
  const SM = window.SM;
  const { $, esc, icon } = SM;
  const MAX_OVERLAY_RESULTS = 8;

  const index = SM.catalog.all().map(p => {
    const collection = SM.catalog.collection(p.collection);
    const sizes = p.options.flatMap(o => o.values);
    const words = [
      p.title, p.typeLabel, p.type === 'print' ? 'print prints fine art edition paper' : 'original originals painting one of one',
      collection?.title, 'collection', p.description, p.status, p.medium, p.year, p.dimensionsLabel, sizes.join(' '), p.artist
    ];
    return { p, title: p.title.toLowerCase(), hay: words.filter(Boolean).join(' ').toLowerCase() };
  });

  function query(q) {
    const text = q.trim().toLowerCase();
    if (!text) return [];
    const tokens = text.split(/\s+/);
    return index
      .filter(entry => tokens.every(t => entry.hay.includes(t)))
      .map(entry => {
        const score = entry.title.startsWith(text) ? 4 : entry.title.includes(text) ? 3 : tokens.every(t => entry.title.includes(t)) ? 2 : 1;
        return { p: entry.p, score };
      })
      .sort((a, b) => b.score - a.score || a.p.position - b.p.position)
      .map(r => r.p);
  }
  SM.search = { query };

  /* Overlay ------------------------------------------------------------------------ */
  const input = $('#searchInput');
  const list = $('#searchResults');
  const status = $('#searchStatus');
  const extra = $('#searchExtra');
  const clear = $('[data-search-clear]');
  let active = -1;
  let timer;

  // `option` rows belong to the combobox listbox; plain rows are ordinary links.
  const resultRow = (p, i, option = true) => `<li class="search-result"${option ? ` role="option" id="sr-${i}" aria-selected="false"` : ''}>
    <a href="${SM.url.product(p.id)}"${option ? ' tabindex="-1"' : ''}>
      ${SM.art(p.images[0], '')}
      <span><strong>${esc(p.title)}</strong><small>${esc(p.typeLabel)} · ${SM.catalog.priceLabel(p)}</small></span>
    </a>
  </li>`;

  const suggestions = () => {
    const picks = [SM.catalog.get('earth-song'), SM.catalog.get('monsoon-memory-print'), SM.catalog.get('quiet-orbit'), SM.catalog.get('wild-grace')].filter(Boolean);
    return `<div class="search-suggest">
      <div><h2>Explore</h2><ul>
        <li><a href="originals.html">Original paintings</a></li>
        <li><a href="prints.html">Fine art prints</a></li>
        ${SM.catalog.collections().map(c => `<li><a href="${SM.url.collection(c.id)}">${esc(c.title)} collection</a></li>`).join('')}
        <li><a href="artist.html">The artist</a></li>
      </ul></div>
      <div><h2>From the studio</h2><ul class="search-results">${picks.map((p, i) => resultRow(p, i, false)).join('')}</ul></div>
    </div>`;
  };

  const setActive = i => {
    const rows = [...list.children];
    active = rows.length ? (i + rows.length) % rows.length : -1;
    rows.forEach((row, n) => row.setAttribute('aria-selected', String(n === active)));
    rows.forEach((row, n) => row.classList.toggle('is-active', n === active));
    if (active >= 0) { input.setAttribute('aria-activedescendant', rows[active].id); rows[active].scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  };

  function render() {
    const q = input.value.trim();
    clear.hidden = !q;
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!q) {
      list.innerHTML = '';
      status.textContent = '';
      input.setAttribute('aria-expanded', 'false');
      extra.innerHTML = suggestions();
      return;
    }
    const results = query(q);
    list.innerHTML = results.slice(0, MAX_OVERLAY_RESULTS).map(resultRow).join('');
    input.setAttribute('aria-expanded', String(results.length > 0));
    status.textContent = results.length ? `${results.length} ${results.length === 1 ? 'artwork' : 'artworks'} found` : '';
    extra.innerHTML = results.length
      ? `<div class="search-more"><a class="text-link" href="${SM.url.search(q)}">View all results ${icon('arrow')}</a></div>`
      : `<div class="search-empty"><h2>No artwork found</h2><p class="muted">Nothing matches “${esc(q)}”. Try a title, “original” or “print”.</p><a class="text-link" href="shop.html">Explore all works ${icon('arrow')}</a></div>`;
  }

  if (input) {
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 90); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); list.children[active].querySelector('a').click(); }
    });
    $('[data-search-form]').addEventListener('submit', e => { if (!input.value.trim()) e.preventDefault(); });
    clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
    SM.on('overlay:open', id => { if (id === 'searchPanel') render(); });
    render();
  }

  /* Search results page (search.html) -------------------------------------------- */
  const pageGrid = $('#searchPageResults');
  if (pageGrid) {
    const q = (SM.param('q') || '').trim();
    const field = $('#searchPageInput');
    field.value = q;
    const heading = $('#searchPageHeading');
    const count = $('#searchPageCount');
    if (!q) {
      heading.textContent = 'Search';
      count.textContent = 'Search by title, collection, size, or “original” and “print”.';
      pageGrid.innerHTML = '';
    } else {
      const results = query(q);
      heading.textContent = `Results for “${q}”`;
      document.title = `Search: ${q} — Shalini Mall`;
      count.textContent = results.length ? `${results.length} ${results.length === 1 ? 'artwork' : 'artworks'}` : '';
      pageGrid.innerHTML = results.length ? SM.cards.list(results) : '';
      $('#searchPageEmpty').hidden = results.length > 0;
    }
  }
})();
