/* Shalini Mall theme — search panel on Shopify Predictive Search.
   Results are rendered by sections/predictive-search.liquid; this file handles
   typing, keyboard navigation (arrows + Enter), clear, empty and no-results states. */
(function () {
  const SM = window.SM;
  const input = SM.$('#searchInput');
  if (!input) return;
  const list = SM.$('#searchResults');
  const status = SM.$('#searchStatus');
  const extra = SM.$('#searchExtra');
  const clear = SM.$('[data-search-clear]');
  const suggestions = SM.$('#searchSuggestions');
  let active = -1, timer, controller;

  const setActive = i => {
    const rows = [...list.children];
    active = rows.length ? (i + rows.length) % rows.length : -1;
    rows.forEach((row, n) => { row.setAttribute('aria-selected', String(n === active)); row.classList.toggle('is-active', n === active); });
    if (active >= 0) { input.setAttribute('aria-activedescendant', rows[active].id); rows[active].scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  };

  const showSuggestions = () => {
    list.innerHTML = '';
    status.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    extra.replaceChildren(suggestions.content.cloneNode(true));
  };

  async function render() {
    const q = input.value.trim();
    clear.hidden = !q;
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!q) return showSuggestions();
    controller?.abort();
    controller = new AbortController();
    try {
      const url = `${SM.config.routes.predictiveSearch}?q=${encodeURIComponent(q)}&resources[type]=product,collection&resources[limit]=8&resources[options][unavailable_products]=last&section_id=predictive-search`;
      const html = await fetch(url, { signal: controller.signal }).then(r => r.text());
      const results = SM.parse(html).querySelector('[data-predictive-results]');
      const items = results ? [...results.querySelectorAll('.search-result')] : [];
      list.replaceChildren(...items);
      input.setAttribute('aria-expanded', String(items.length > 0));
      status.textContent = items.length ? `${items.length} ${items.length === 1 ? 'artwork' : 'artworks'} found` : '';
      const collections = results?.querySelector('.search-collections');
      const searchUrl = `${SM.config.routes.search}?q=${encodeURIComponent(q)}&options[prefix]=last`;
      extra.innerHTML = items.length
        ? `${collections ? collections.outerHTML : ''}<div class="search-more"><a class="text-link" href="${searchUrl}">View all results ${SM.icon('arrow')}</a></div>`
        : `<div class="search-empty"><h2>No artwork found</h2><p class="muted">Nothing matches “${SM.esc(q)}”. Try a title, “original” or “print”.</p><a class="text-link" href="${SM.config.routes.root}collections/all">Explore all works ${SM.icon('arrow')}</a></div>`;
    } catch (err) {
      if (err.name !== 'AbortError') status.textContent = 'Search is unavailable right now.';
    }
  }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 180); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); list.children[active].querySelector('a').click(); }
  });
  SM.$('[data-search-form]').addEventListener('submit', e => { if (!input.value.trim()) e.preventDefault(); });
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  SM.on('overlay:open', id => { if (id === 'searchPanel') render(); });
  showSuggestions();
})();
