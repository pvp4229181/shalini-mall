/* Shalini Mall — wishlist page (wishlist.html). */
(function () {
  const SM = window.SM;
  const { $ } = SM;
  const grid = $('#wishlistGrid');
  if (!grid) return;

  function render() {
    const items = SM.wishlist.items();
    $('#wishlistEmpty').hidden = items.length > 0;
    $('#wishlistCount').textContent = items.length ? `${items.length} saved ${items.length === 1 ? 'work' : 'works'}` : '';
    const hadFocus = grid.contains(document.activeElement);
    grid.innerHTML = SM.cards.list(items, { wishlist: true });
    if (hadFocus) (grid.querySelector('.card__title a') || $('#wishlistEmpty a'))?.focus();
  }
  SM.on('wishlist:change', render);
  render();
})();
