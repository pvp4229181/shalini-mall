/* Shalini Mall — recently viewed artworks (SM.recent), newest first, no duplicates. */
(function () {
  const SM = window.SM;
  const KEY = 'shalini-mall-recent';
  const LIMIT = 8;

  const read = () => {
    const ids = SM.storage.get(KEY, []);
    return Array.isArray(ids) ? ids.filter(id => SM.catalog.get(id)) : [];
  };

  SM.recent = {
    track(id) {
      if (!SM.catalog.get(id)) return;
      SM.storage.set(KEY, [id, ...read().filter(x => x !== id)].slice(0, LIMIT));
    },
    /* Products viewed before, excluding the given ids (e.g. the current page's artwork). */
    items(exclude = [], limit = 4) {
      const skip = new Set(exclude.filter(Boolean));
      return read().filter(id => !skip.has(id)).slice(0, limit).map(SM.catalog.get);
    }
  };
})();
