/* Shalini Mall — cart (SM.cart).
   Data lives behind a small storage adapter so Phase 2 can replace
   localStorage with Shopify's cart API (/cart/add.js, /cart/change.js)
   without touching the UI, which only listens for 'sm:cart:change'. */
(function () {
  const SM = window.SM;
  const KEY = 'shalini-mall-cart';
  const MAX_QTY = 10;

  const adapter = {
    load: () => SM.storage.get(KEY, []),
    save: lines => SM.storage.set(KEY, lines)
  };

  const makeLine = (product, variant, quantity) => ({
    lineId: variant.id,
    productId: product.id,
    variantId: variant.id,
    title: product.title,
    type: product.type,
    image: product.images[0],
    quantity,
    price: variant.price,
    options: { ...variant.options }
  });

  const clampQty = (product, qty) => (product.type === 'original' ? 1 : Math.max(1, Math.min(MAX_QTY, Math.floor(qty) || 1)));

  /* Every read re-validates against the catalogue: unknown products drop out,
     prices and titles refresh, and carts saved by the previous site version
     ({ id, qty }) are migrated to line items. */
  function read() {
    const stored = adapter.load();
    if (!Array.isArray(stored)) return [];
    return stored.map(line => {
      const product = SM.catalog.get(line.productId || line.id);
      if (!product) return null;
      const variant = SM.catalog.variant(product, line.variantId) || (!line.variantId ? SM.catalog.defaultVariant(product) : null);
      if (!variant) return null;
      return makeLine(product, variant, clampQty(product, line.quantity ?? line.qty ?? 1));
    }).filter(Boolean);
  }

  const summarise = lines => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((s, l) => s + l.price * l.quantity, 0)
  });

  function write(lines) {
    adapter.save(lines);
    SM.emit('cart:change', summarise(lines));
  }

  SM.cart = {
    MAX_QTY,
    lines: read,
    summary: () => summarise(read()),

    /* Returns { ok, reason } — reason is 'unique' when a one-of-one original is already in the cart. */
    add(productId, variantId, quantity = 1) {
      const product = SM.catalog.get(productId);
      const variant = product && (SM.catalog.variant(product, variantId) || (!variantId && SM.catalog.defaultVariant(product)));
      if (!variant || !variant.available) return { ok: false, reason: 'unavailable' };
      const lines = read();
      const existing = lines.find(l => l.variantId === variant.id);
      if (existing) {
        if (product.type === 'original') return { ok: false, reason: 'unique', line: existing };
        existing.quantity = clampQty(product, existing.quantity + quantity);
      } else {
        lines.push(makeLine(product, variant, clampQty(product, quantity)));
      }
      write(lines);
      return { ok: true, product, variant };
    },

    update(lineId, quantity) {
      const lines = read();
      const line = lines.find(l => l.lineId === lineId);
      if (!line) return;
      if (quantity <= 0) return this.remove(lineId);
      line.quantity = clampQty(SM.catalog.get(line.productId), quantity);
      write(lines);
    },

    remove(lineId) {
      write(read().filter(l => l.lineId !== lineId));
    },

    has: productId => read().some(l => l.productId === productId)
  };

  // Keep several open tabs in step.
  addEventListener('storage', e => { if (e.key === KEY) SM.emit('cart:change', SM.cart.summary()); });
})();
