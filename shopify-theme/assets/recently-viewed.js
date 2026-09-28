/* Shalini Mall theme — recently viewed artworks (handles in localStorage, newest first, no duplicates). */
(function () {
  const SM = window.SM;
  const KEY = 'shalini-mall-recent';
  const LIMIT = 8;

  const read = () => { const ids = SM.storage.get(KEY, []); return Array.isArray(ids) ? ids.filter(x => typeof x === 'string') : []; };

  SM.recent = {
    track(handle) { if (handle) SM.storage.set(KEY, [handle, ...read().filter(x => x !== handle)].slice(0, LIMIT)); },
    handles: read
  };

  async function render() {
    const section = SM.$('[data-recently-viewed]');
    if (!section) return;
    const page = SM.$('[data-product-page]');
    const skip = new Set([page?.dataset.handle, page?.dataset.counterpart].filter(Boolean));
    const limit = Number(section.dataset.limit) || 4;
    const handles = read().filter(h => !skip.has(h)).slice(0, limit);
    if (!handles.length) return;
    const cards = (await Promise.all(handles.map(h => SM.fetchCard?.(h)))).filter(Boolean);
    if (!cards.length) return;
    section.querySelector('[data-recent-grid]').replaceChildren(...cards);
    section.hidden = false;
    SM.syncWishlistButtons?.();
  }

  // Render once the wishlist module (which provides fetchCard) has loaded.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else setTimeout(render);
})();
