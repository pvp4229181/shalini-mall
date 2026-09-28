/* Shalini Mall — wishlist (SM.wishlist), persisted in localStorage. */
(function () {
  const SM = window.SM;
  const KEY = 'shalini-mall-wishlist';

  const read = () => {
    const ids = SM.storage.get(KEY, []);
    return Array.isArray(ids) ? ids.filter(id => SM.catalog.get(id)) : [];
  };
  const write = ids => {
    SM.storage.set(KEY, ids);
    SM.emit('wishlist:change', { ids });
  };

  SM.wishlist = {
    ids: read,
    items: () => read().map(SM.catalog.get),
    has: id => read().includes(id),
    count: () => read().length,
    add(id) { const ids = read(); if (!ids.includes(id)) { ids.unshift(id); write(ids); } },
    remove(id) { write(read().filter(x => x !== id)); },
    toggle(id) {
      const saved = !this.has(id);
      saved ? this.add(id) : this.remove(id);
      return saved;
    }
  };

  addEventListener('storage', e => { if (e.key === KEY) SM.emit('wishlist:change', { ids: read() }); });
})();
