/* Shalini Mall — about page: interactive Printify canvas size explorer. */
(function () {
  const SM = window.SM;
  const host = SM.$('#sizeExplorer');
  if (!host) return;

  const sizes = Object.entries(SM.catalog.canvasSizes).map(([name, [w, h]]) => ({ id: name, title: name, options: { Size: name }, available: true, dimensions: { w, h } }));
  const sample = { title: 'Canvas print', type: 'print', images: [{ src: SM.ART_SRC, crop: '12% 62%' }], options: [{ name: 'Size', values: sizes.map(s => s.title) }], variants: sizes };
  let current = sizes.find(s => s.title === '24 × 30 in') || sizes[0];

  host.innerHTML = `<div class="size-explorer__controls">${SM.variantUI.render(sample, current, 'about')}</div>
    <div class="size-explorer__wall">${SM.wall.render(sample, current, { scene: 'console' })}</div>
    <table class="size-table">
      <caption class="sr-only">Printify canvas sizes</caption>
      <thead><tr><th scope="col">Size</th><th scope="col">Centimetres</th><th scope="col">Inches</th></tr></thead>
      <tbody>${sizes.map(s => `<tr><th scope="row">${s.title}</th><td>${s.dimensions.w} × ${s.dimensions.h} cm</td><td>${SM.inches(s.dimensions)}</td></tr>`).join('')}</tbody>
    </table>`;

  SM.variantUI.bind(host.querySelector('.size-explorer__controls'), sample, v => {
    current = v;
    SM.wall.update(host.querySelector('[data-wall-figure]'), sample, v);
  });
})();
