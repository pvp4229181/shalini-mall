/* Shalini Mall theme — true-scale wall drawings (SM.wall), size guide (SM.sizeGuide)
   and the print size explorer section. Sizes come from product metafields
   (custom.width_cm / custom.height_cm) or are read from option values such as
   "24 × 30 in" or "A2" (SM.parseSize). */
(function () {
  const SM = window.SM;
  const { esc } = SM;

  const ROOM = { w: 464, h: 290, floor: 6 }; // visible wall in cm (16:10) and floor strip in %
  const S = 'vector-effect="non-scaling-stroke"';
  const SCENES = {
    sofa: { label: 'a 210 cm sofa', w: 210, h: 82, svg: `<svg viewBox="0 0 210 82" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><rect class="fill" ${S} x="8" y="18" width="194" height="40" rx="6"/><rect class="fill" ${S} x="0" y="34" width="22" height="38" rx="6"/><rect class="fill" ${S} x="188" y="34" width="22" height="38" rx="6"/><rect class="fill" ${S} x="18" y="46" width="174" height="18" rx="3"/><path ${S} d="M105 46v18"/><rect class="fill" ${S} x="4" y="62" width="202" height="10" rx="2"/><path ${S} d="M14 72v10M196 72v10"/></svg>` },
    console: { label: 'a 160 cm sideboard', w: 160, h: 78, svg: `<svg viewBox="0 0 160 78" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><rect class="fill" ${S} x="0" y="0" width="160" height="6"/><rect class="fill" ${S} x="4" y="6" width="152" height="56"/><path ${S} d="M54 6v56M106 6v56M48 34h2M110 34h2M10 62v16M150 62v16"/></svg>` },
    chair: { label: 'an armchair', w: 78, h: 92, svg: `<svg viewBox="0 0 78 92" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><rect class="fill" ${S} x="10" y="0" width="58" height="56" rx="8"/><rect class="fill" ${S} x="0" y="34" width="12" height="34" rx="5"/><rect class="fill" ${S} x="66" y="34" width="12" height="34" rx="5"/><rect class="fill" ${S} x="8" y="48" width="62" height="20" rx="4"/><path ${S} d="M12 68v24M66 68v24"/></svg>` }
  };

  const round = n => +(+n).toFixed(1);
  const cm = d => `${round(d.w)} × ${round(d.h)} cm`;
  SM.inches = d => `${round(d.w / 2.54)} × ${round(d.h / 2.54)} in`;
  const pickScene = d => (d.w >= 70 ? 'sofa' : d.w >= 40 ? 'console' : 'chair');

  /* Dimensions of a product/variant: metafields for originals, option values for prints. */
  SM.dimsFor = (product, variant) => {
    if (product?.dimensions && (product.isOriginal || !variant)) return product.dimensions;
    if (variant) for (const value of variant.options) { const d = SM.parseSize(value); if (d) return d; }
    return product?.dimensions || null;
  };

  /* Standard hanging: centre at 145 cm, at least 20 cm clear of the furniture. */
  function layout(d, scene) {
    const f = SCENES[scene];
    const wallH = ROOM.h * (1 - ROOM.floor / 100);
    const bottom = Math.min(Math.max(f.h + 20, 145 - d.h / 2), wallH - d.h - 6);
    const pct = (v, of) => `${(v / of) * 100}%`;
    return {
      art: { width: pct(d.w, ROOM.w), height: pct(d.h, ROOM.h), bottom: `calc(${ROOM.floor}% + ${pct(bottom, ROOM.h)})` },
      dim: { bottom: `calc(${ROOM.floor}% + ${pct(bottom + d.h + 4, ROOM.h)})` },
      furniture: { width: pct(f.w, ROOM.w), height: pct(f.h, ROOM.h), bottom: `${ROOM.floor}%` }
    };
  }
  const style = obj => Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';');

  /* art: { title, src, crop, label } — label is the caption title, e.g. "Earth Song · 24 × 30 in". */
  function render(art, d, { scene, caption = true } = {}) {
    if (!d) return '';
    const s = scene || pickScene(d);
    const L = layout(d, s);
    return `<figure class="wall-figure" data-wall-figure data-scene="${s}">
      <div class="wall" style="--floor:${ROOM.floor}%" role="img" aria-label="${esc(art.title)} at ${cm(d)}, drawn to scale above ${SCENES[s].label}">
        <div class="wall__art" style="left:50%;${style(L.art)}">${SM.art(art.src, art.crop)}</div>
        <span class="wall__dim" style="left:50%;${style(L.dim)}" data-wall-dim>${cm(d)}</span>
        <div class="wall__furniture" style="left:50%;${style(L.furniture)}">${SCENES[s].svg}</div>
      </div>
      ${caption ? `<figcaption class="wall-caption"><strong>${esc(art.label || art.title)}</strong><span>Drawn to scale above ${SCENES[s].label}</span></figcaption>` : ''}
    </figure>`;
  }

  function update(figure, art, d) {
    if (!figure || !d) return;
    const L = layout(d, figure.dataset.scene);
    Object.assign(figure.querySelector('.wall__art').style, L.art);
    Object.assign(figure.querySelector('[data-wall-dim]').style, L.dim);
    figure.querySelector('[data-wall-dim]').textContent = cm(d);
    figure.querySelector('.wall').setAttribute('aria-label', `${art.title} at ${cm(d)}, drawn to scale above ${SCENES[figure.dataset.scene].label}`);
    const strong = figure.querySelector('.wall-caption strong');
    if (strong) strong.textContent = art.label || art.title;
  }

  SM.wall = { render, update, scenes: SCENES, pickScene };

  /* Radio pills for a list of size labels. */
  const pills = (name, sizes, current) => `<fieldset class="option"><legend class="label"><span>Size</span><span data-size-label>${esc(current)}</span></legend><div class="pills">
    ${sizes.map((s, i) => `<label class="pill" for="${name}-${i}"><input type="radio" id="${name}-${i}" name="${name}" value="${esc(s.label)}"${s.label === current ? ' checked' : ''}><span>${esc(s.label)}<small>${cm(s.dims)}</small></span></label>`).join('')}
  </div></fieldset>`;
  const table = sizes => `<table class="size-table"><thead><tr><th scope="col">Size</th><th scope="col">Centimetres</th><th scope="col">Inches</th></tr></thead>
    <tbody>${sizes.map(s => `<tr><th scope="row">${esc(s.label)}</th><td>${cm(s.dims)}</td><td>${SM.inches(s.dims)}</td></tr>`).join('')}</tbody></table>`;

  /* Size guide dialog for a product (product = parsed product JSON). */
  let dialog;
  SM.sizeGuide = {
    open(product, variant, trigger, onSelect) {
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.className = 'dialog';
        dialog.setAttribute('aria-labelledby', 'sizeGuideTitle');
        document.body.append(dialog);
      }
      const isPrint = !product.isOriginal;
      const sizes = isPrint
        ? product.variants.map(v => ({ label: v.options.find(o => SM.parseSize(o)) || v.title, dims: SM.dimsFor(product, v), variant: v }))
          .filter((s, i, all) => s.dims && all.findIndex(x => x.label === s.label) === i)
        : [{ label: 'Original', dims: product.dimensions }];
      if (!sizes.length || !sizes[0].dims) return;
      const current = sizes.find(s => s.variant && variant && s.variant.options.includes(s.label) && variant.options.includes(s.label)) || sizes[0];
      const largest = sizes.reduce((a, b) => (b.dims.w * b.dims.h > a.dims.w * a.dims.h ? b : a));
      const art = { title: product.title, src: product.image, crop: product.focus };
      dialog.innerHTML = `<button type="button" class="icon-btn dialog-close" data-dialog-close aria-label="Close size guide">${SM.icon('close')}</button>
        <div class="size-guide">
          <p class="eyebrow">Size guide</p>
          <h2 id="sizeGuideTitle">${esc(product.title)}</h2>
          <p>${isPrint ? 'Choose a size to see it drawn to scale on a wall. Dimensions are for the finished piece.' : 'The painting drawn to scale on a wall, hung at the usual 145 cm centre height.'}</p>
          ${isPrint && sizes.length > 1 ? pills('sg-size', sizes, current.label) : ''}
          ${render({ ...art, label: isPrint ? `${product.title} · ${current.label}` : product.title }, current.dims, { scene: pickScene(largest.dims) })}
          ${table(sizes)}
        </div>`;
      dialog.addEventListener('change', e => {
        if (e.target.name !== 'sg-size') return;
        const s = sizes.find(x => x.label === e.target.value);
        dialog.querySelector('[data-size-label]').textContent = s.label;
        update(dialog.querySelector('[data-wall-figure]'), { ...art, label: `${product.title} · ${s.label}` }, s.dims);
        onSelect?.(s.label);
      });
      SM.dialog.open(dialog, trigger);
    }
  };

  /* Homepage "Art in interiors" scale blocks. */
  function initWalls(root = document) {
    SM.$$('[data-wall]', root).forEach(el => {
      const d = el.dataset.w && el.dataset.h ? { w: +el.dataset.w, h: +el.dataset.h } : SM.parseSize(el.dataset.size);
      const link = el.closest('a') || el;
      if (!d) { link.hidden = true; return; }
      const label = el.dataset.size ? `${el.dataset.title} · ${el.dataset.size}` : el.dataset.title;
      el.outerHTML = render({ title: el.dataset.title, src: el.dataset.src, crop: el.dataset.crop, label }, d, { scene: el.dataset.scene });
    });
  }

  /* Print size explorer section. */
  function initExplorers(root = document) {
    SM.$$('[data-size-explorer]', root).forEach(host => {
      const sizes = (host.dataset.sizes || '').split(',').map(s => s.trim()).filter(Boolean)
        .map(label => ({ label, dims: SM.parseSize(label) })).filter(s => s.dims);
      if (!sizes.length) return;
      const art = { title: 'Canvas print', src: host.dataset.src, crop: 'center' };
      const current = sizes[Math.min(2, sizes.length - 1)];
      host.innerHTML = `<div class="size-explorer__controls">${pills(`sx-${Math.random().toString(36).slice(2, 7)}`, sizes, current.label)}</div>
        <div class="size-explorer__wall">${render({ ...art, label: current.label }, current.dims, { scene: 'console' })}</div>
        ${table(sizes)}`;
      host.addEventListener('change', e => {
        const s = sizes.find(x => x.label === e.target.value);
        if (!s) return;
        host.querySelector('[data-size-label]').textContent = s.label;
        update(host.querySelector('[data-wall-figure]'), { ...art, label: s.label }, s.dims);
      });
    });
  }

  const init = root => { initWalls(root); initExplorers(root); };
  init();
  document.addEventListener('shopify:section:load', e => init(e.target));
})();
