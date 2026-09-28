/* Shalini Mall — true-scale wall preview (SM.wall) and size guide (SM.sizeGuide).

   The studio has no interior photography yet, so instead of mock-up images this
   draws an elevation: the artwork at its real dimensions against a wall and a
   line-drawn piece of furniture. When real interior photos exist, show them
   alongside (product gallery, "Art in interiors" section). */
(function () {
  const SM = window.SM;
  const { $, esc, icon } = SM;

  const ROOM = { w: 464, h: 290, floor: 6 }; // visible wall in cm (16:10) and floor strip in %
  const S = 'vector-effect="non-scaling-stroke"';
  const SCENES = {
    sofa: {
      label: 'a 210 cm sofa', w: 210, h: 82,
      svg: `<svg viewBox="0 0 210 82" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <rect class="fill" ${S} x="8" y="18" width="194" height="40" rx="6"/>
        <rect class="fill" ${S} x="0" y="34" width="22" height="38" rx="6"/><rect class="fill" ${S} x="188" y="34" width="22" height="38" rx="6"/>
        <rect class="fill" ${S} x="18" y="46" width="174" height="18" rx="3"/><path ${S} d="M105 46v18"/>
        <rect class="fill" ${S} x="4" y="62" width="202" height="10" rx="2"/><path ${S} d="M14 72v10M196 72v10"/></svg>`
    },
    console: {
      label: 'a 160 cm sideboard', w: 160, h: 78,
      svg: `<svg viewBox="0 0 160 78" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <rect class="fill" ${S} x="0" y="0" width="160" height="6"/><rect class="fill" ${S} x="4" y="6" width="152" height="56"/>
        <path ${S} d="M54 6v56M106 6v56M48 34h2M110 34h2M10 62v16M150 62v16"/></svg>`
    },
    chair: {
      label: 'an armchair', w: 78, h: 92,
      svg: `<svg viewBox="0 0 78 92" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <rect class="fill" ${S} x="10" y="0" width="58" height="56" rx="8"/>
        <rect class="fill" ${S} x="0" y="34" width="12" height="34" rx="5"/><rect class="fill" ${S} x="66" y="34" width="12" height="34" rx="5"/>
        <rect class="fill" ${S} x="8" y="48" width="62" height="20" rx="4"/><path ${S} d="M12 68v24M66 68v24"/></svg>`
    }
  };

  const dimsOf = (product, variant) => (product.type === 'original' ? product.dimensions : variant?.dimensions) || null;
  const cmToIn = cm => (cm / 2.54).toFixed(1).replace(/\.0$/, '');
  SM.inches = d => `${cmToIn(d.w)} × ${cmToIn(d.h)} in`;

  const pickScene = d => (d.w >= 70 ? 'sofa' : d.w >= 40 ? 'console' : 'chair');

  /* Standard hanging: centre at 145 cm, at least 20 cm clear of the furniture. */
  function layout(d, scene) {
    const f = SCENES[scene];
    const wallH = ROOM.h * (1 - ROOM.floor / 100);
    let bottom = Math.max(f.h + 20, 145 - d.h / 2);
    bottom = Math.min(bottom, wallH - d.h - 6);
    const pct = (cm, of) => `${(cm / of) * 100}%`;
    return {
      art: { width: pct(d.w, ROOM.w), height: pct(d.h, ROOM.h), bottom: `calc(${ROOM.floor}% + ${pct(bottom, ROOM.h)})` },
      dim: { bottom: `calc(${ROOM.floor}% + ${pct(bottom + d.h + 4, ROOM.h)})` },
      furniture: { width: pct(f.w, ROOM.w), height: pct(f.h, ROOM.h), bottom: `${ROOM.floor}%` }
    };
  }

  const styleOf = obj => Object.entries(obj).map(([k, v]) => `${k}:${v}`).join(';');

  /* Returns markup for a wall figure. `caption` false hides the caption. */
  function render(product, variant, { scene, caption = true } = {}) {
    const d = dimsOf(product, variant);
    if (!d) return '';
    const s = scene || pickScene(d);
    const L = layout(d, s);
    const size = `${d.w} × ${d.h} cm`;
    return `<figure class="wall-figure" data-wall-figure data-scene="${s}">
      <div class="wall" style="--floor:${ROOM.floor}%" role="img" aria-label="${esc(product.title)} at ${size}, drawn to scale above ${SCENES[s].label}">
        <div class="wall__art" style="left:50%;${styleOf(L.art)}">${SM.art(product.images[0], '')}</div>
        <span class="wall__dim" style="left:50%;${styleOf(L.dim)}" data-wall-dim>${size}</span>
        <div class="wall__furniture" style="left:50%;${styleOf(L.furniture)}">${SCENES[s].svg}</div>
      </div>
      ${caption ? `<figcaption class="wall-caption"><strong>${esc(product.title)}${variant && product.type === 'print' ? ` · ${esc(variant.title)}` : ''}</strong><span>Drawn to scale above ${SCENES[s].label}</span></figcaption>` : ''}
    </figure>`;
  }

  /* Resize an existing figure in place so the change animates. */
  function update(figure, product, variant) {
    const d = dimsOf(product, variant);
    if (!figure || !d) return;
    const L = layout(d, figure.dataset.scene);
    Object.assign(figure.querySelector('.wall__art').style, L.art);
    Object.assign(figure.querySelector('[data-wall-dim]').style, L.dim);
    figure.querySelector('[data-wall-dim]').textContent = `${d.w} × ${d.h} cm`;
    figure.querySelector('.wall').setAttribute('aria-label', `${product.title} at ${d.w} × ${d.h} cm, drawn to scale above ${SCENES[figure.dataset.scene].label}`);
    const strong = figure.querySelector('.wall-caption strong');
    if (strong) strong.textContent = product.type === 'print' ? `${product.title} · ${variant.title}` : product.title;
  }

  SM.wall = { render, update, scenes: SCENES };

  /* Size guide dialog -------------------------------------------------------------- */
  let dialog;
  function openSizeGuide(product, variant, trigger, onSelect) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'dialog';
      dialog.id = 'sizeGuide';
      dialog.setAttribute('aria-labelledby', 'sizeGuideTitle');
      document.body.append(dialog);
    }
    let current = variant || SM.catalog.defaultVariant(product);
    const isPrint = product.type === 'print';
    const rows = isPrint
      ? product.variants.map(v => `<tr><td>${esc(v.title)}</td><td>${v.dimensions.w} × ${v.dimensions.h} cm</td><td>${SM.inches(v.dimensions)}</td></tr>`).join('')
      : `<tr><td>Original</td><td>${product.dimensions.w} × ${product.dimensions.h} cm</td><td>${SM.inches(product.dimensions)}</td></tr>`;
    // Scene stays fixed while switching sizes so the change in scale is visible.
    const largest = isPrint ? product.variants[product.variants.length - 1].dimensions : product.dimensions;
    dialog.innerHTML = `<button type="button" class="icon-btn dialog-close" data-dialog-close aria-label="Close size guide">${icon('close')}</button>
      <div class="size-guide">
        <p class="eyebrow">Size guide</p>
        <h2 id="sizeGuideTitle">${esc(product.title)}</h2>
        <p>${isPrint ? 'Choose a Printify canvas size to see it drawn to scale on a wall. Dimensions are for the finished stretched canvas.' : 'The painting drawn to scale on a wall, hung at the usual 145 cm centre height.'}</p>
        ${isPrint ? `<div data-sg-options>${SM.variantUI.render(product, current, 'sg')}</div>` : ''}
        ${render(product, current, { scene: pickScene(largest) })}
        <table class="size-table"><thead><tr><th scope="col">${isPrint ? 'Size' : 'Format'}</th><th scope="col">Centimetres</th><th scope="col">Inches</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
    if (isPrint) {
      SM.variantUI.bind(dialog.querySelector('[data-sg-options]'), product, v => {
        current = v;
        update(dialog.querySelector('[data-wall-figure]'), product, v);
        onSelect?.(v);
      });
    }
    SM.dialog.open(dialog, trigger);
  }
  SM.sizeGuide = { open: openSizeGuide };
})();
