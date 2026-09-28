/* Shalini Mall — quick view (SM.quickView): image, title, price, basic
   variants, quantity, add to cart, link to the full page. Uses the native
   <dialog> for Escape, focus containment and the backdrop. */
(function () {
  const SM = window.SM;
  const { $, esc, icon, money } = SM;
  const dialog = $('#quickView');
  if (!dialog) return;

  function open(productId, trigger, { fromWishlist = false } = {}) {
    const p = SM.catalog.get(productId);
    if (!p) return;
    let variant = SM.catalog.defaultVariant(p);
    const isOriginal = p.type === 'original';
    const url = SM.url.product(p.id);

    dialog.innerHTML = `<button type="button" class="icon-btn dialog-close" data-dialog-close aria-label="Close quick view">${icon('close')}</button>
      <div class="quick-view">
        <a href="${url}" tabindex="-1" aria-hidden="true">${SM.art(p.images[0], SM.altText(p), { lazy: false })}</a>
        <div class="quick-view__info">
          <p class="eyebrow">${esc(p.typeLabel)} · ${esc(p.status)}</p>
          <h2 id="qvTitle">${esc(p.title)}</h2>
          <p class="muted">${esc(p.artist)}${isOriginal ? ` · ${esc(p.dimensionsLabel)}` : ''}</p>
          <p class="quick-view__price" data-qv-price>${money(variant.price)}</p>
          ${isOriginal ? '' : `<div data-qv-options>${SM.variantUI.render(p, variant, 'qv')}</div>`}
          <div class="quick-view__buy${isOriginal ? ' quick-view__buy--single' : ''}">
            ${isOriginal ? '' : SM.qty.render('qvQty')}
            <button type="button" class="button dark" data-qv-add>${isOriginal ? 'Buy original' : 'Add to cart'}</button>
          </div>
          <a class="text-link quick-view__more" href="${url}">View full details ${icon('arrow')}</a>
        </div>
      </div>`;

    const getQty = isOriginal ? () => 1 : SM.qty.bind(dialog.querySelector('.qty'));
    if (!isOriginal) {
      SM.variantUI.bind(dialog.querySelector('[data-qv-options]'), p, v => {
        variant = v;
        dialog.querySelector('[data-qv-price]').textContent = money(v.price);
      });
    }
    dialog.querySelector('[data-qv-add]').addEventListener('click', () => {
      const result = SM.addToCart(p.id, variant.id, getQty());
      if (fromWishlist && (result.ok || result.reason === 'unique')) SM.wishlist.remove(p.id);
    });
    SM.dialog.open(dialog, trigger);
    dialog.querySelector('.pill input:checked, [data-qv-add]')?.focus();
  }

  SM.quickView = { open };
})();
