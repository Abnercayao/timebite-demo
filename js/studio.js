/* Contenido: afiches y textos “con IA” (los dibuja TB.content) y calendario de publicaciones. */
(function () {
  'use strict';
  const TB = (window.TB = window.TB || {});

  const NETS = [
    { key: 'whatsapp', name: 'Estado de WhatsApp', phrase: 'tu estado de WhatsApp' },
    { key: 'instagram', name: 'Instagram', phrase: 'Instagram' },
    { key: 'facebook', name: 'Facebook', phrase: 'Facebook' }
  ];
  const TPL_ICON = { producto: 'image', lanzamiento: 'star', delivery: 'truck', cajachina: 'calendar', promo: 'gift' };
  const TPL_PRODUCT = { cajachina: 'caja-china' }; // lanzamiento: el premium; el resto, lo primero que se vende hoy
  const STEPS = ['Revisando tu carta y tus fotos', 'Eligiendo el diseño', 'Escribiendo el texto', 'Aplicando tu marca'];
  const FMT = { story: ['Historia', '9:16'], post: ['Publicación', '1:1'] };
  const WD = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
  const DEMO_NOTE = 'Versión de demostración: queda en tu calendario, pero todavía no se publica en tus redes.';

  let root, tab = 'crear', sel, cur = null, gen = 0;

  const ic = (name, size) => TB.app.icon(name, size || 20);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => root.querySelector(s);
  const press = (act, v) => root.querySelectorAll(`[data-act="${act}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  const netOf = k => NETS.find(n => n.key === k) || NETS[1];
  const tplOf = k => TB.content.TEMPLATES.find(t => t.key === k) || { key: k, name: 'Publicación', desc: '' };
  const prodName = k => (TB.data.porKey[k] || {}).nombre || '';
  const tags = o => (o.hashtags || []).map(h => (h[0] === '#' ? h : '#' + h)).join(' ');
  const fullText = (text, o) => [text, tags(o)].filter(Boolean).join('\n\n');
  const hm = s => (s || '19:00').split(':').map(Number);
  const pad = n => String(n).padStart(2, '0');
  const variants = () => Math.max(1, TB.content.variants(sel.template) || 1);
  const dayAt = (i, h, m) => { const n = TB.app.now(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + i, h || 0, m || 0); };
  const andList = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a.join(''));
  // Las simuladas pueden venir sin estado: lo que ya pasó cuenta como publicado.
  const statusOf = p => (p.status === 'publicado' || new Date(p.when) <= TB.app.now() ? 'publicado' : 'programado');
  const availToday = p => ((TB.data.horarios[p.cat] || {}).dias || []).includes(TB.app.now().getDay());
  const badge = s => (s === 'publicado' ? '<span class="badge badge-verde">Publicado</span>' : '<span class="badge badge-mostaza">Programado</span>');
  // Todo scroll que haya entre la vista y la ventana vuelve arriba (no sabemos cuál desplaza el shell).
  const toTop = () => { for (let el = root; el; el = el.parentElement) el.scrollTop = 0; window.scrollTo(0, 0); };

  function dayName(d) {
    const i = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - dayAt(0)) / 864e5);
    if (i === 0) return 'Hoy';
    if (i === 1) return 'Mañana';
    const s = TB.app.fmtDate(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function dayHead(d) {
    const n = dayName(d);
    return n === 'Hoy' || n === 'Mañana' ? `${n}<span>${TB.app.fmtDate(d)}</span>` : n;
  }
  function whenText(d) {
    const n = dayName(d);
    return (n === 'Hoy' || n === 'Mañana' ? n.toLowerCase() : 'el ' + TB.app.fmtDate(d)) + (d.getHours() % 12 === 1 ? ' a la ' : ' a las ') + TB.app.fmtTime(d);
  }

  // Últimas elecciones, en TB.app.state.studio (se lee cada vez: “Reiniciar demo” reemplaza el estado).
  function mem() { const s = TB.app.state; return s.studio || (s.studio = {}); }
  function remember() {
    const m = mem();
    m.template = sel.template; m.format = sel.format; m.network = sel.network;
    (m.products = m.products || {})[sel.template] = sel.product;
    TB.app.save();
  }
  function initSel() {
    const m = mem(), T = TB.content.TEMPLATES;
    sel = {
      template: T.some(t => t.key === m.template) ? m.template : T[0].key,
      product: null,
      format: m.format === 'post' ? 'post' : 'story',
      offer: '',
      network: NETS.some(n => n.key === m.network) ? m.network : 'instagram',
      variant: 0
    };
  }

  /* ---------- Crear: formulario ---------- */
  const fmtSeg = short => `<div class="seg st-fmt">${['story', 'post'].map(f => `
    <button type="button" data-act="fmt" data-v="${f}" aria-pressed="${sel.format === f}"><i class="st-ar st-ar-${f}" aria-hidden="true"></i>${FMT[f][0]}${short ? '' : ' ' + FMT[f][1]}</button>`).join('')}
  </div>`;

  function renderForm() {
    $('[data-pane="crear"]').innerHTML = `
      <div class="st-form">
        <section class="st-step">
          <h2 class="st-h"><span class="st-n">1</span>¿Qué quieres publicar?</h2>
          <div class="st-tpls">${TB.content.TEMPLATES.map(t => `
            <button type="button" class="st-tpl" data-act="tpl" data-v="${esc(t.key)}" aria-pressed="${t.key === sel.template}">
              <span class="st-tpl-ic">${ic(TPL_ICON[t.key] || 'image', 22)}</span>
              <span class="st-tpl-tx"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span>
              <span class="st-ok">${ic('check', 14)}</span>
            </button>`).join('')}
          </div>
        </section>
        <section class="st-step">
          <h2 class="st-h"><span class="st-n">2</span>Elige el producto</h2>
          <div class="st-prods"></div>
        </section>
        <section class="st-step">
          <h2 class="st-h"><span class="st-n">3</span>Formato</h2>
          ${fmtSeg()}
        </section>
        <section class="st-step">
          <label class="st-h" for="st-offer"><span class="st-n">4</span>Oferta o mensaje (opcional)</label>
          <input id="st-offer" class="st-input" type="text" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="Ej.: Solo este fin de semana" value="${esc(sel.offer)}">
        </section>
        <button type="button" class="btn btn-primary btn-block st-gen" data-act="gen">${ic('sparkles', 20)}Generar con IA</button>
      </div>
      <div class="st-result" hidden></div>`;
    renderProds();
  }

  function renderProds() {
    const list = (TB.content.products(sel.template) || []).map(p => (typeof p === 'string' ? TB.data.porKey[p] : p)).filter(Boolean);
    if (!list.some(p => p.key === sel.product)) {
      const saved = (mem().products || {})[sel.template];
      const pick = list.find(p => p.key === saved) || list.find(p => (sel.template === 'lanzamiento' ? p.premium : p.key === TPL_PRODUCT[sel.template]))
        || list.find(availToday) || list[0];
      sel.product = pick && pick.key;
    }
    $('.st-prods').innerHTML = list.map(p => `
      <button type="button" class="st-prod" data-act="prod" data-v="${p.key}" aria-pressed="${p.key === sel.product}">
        <span class="st-prod-img">${TB.app.tile(p, 84)}<span class="st-ok">${ic('check', 14)}</span></span>
        <span class="st-prod-n">${esc(p.nombre)}</span>
        <span class="st-prod-p">${TB.app.money(p.precio)}</span>
      </button>`).join('');
    centerProd();
  }
  function centerProd() {
    const box = $('.st-prods'), on = box && box.querySelector('[aria-pressed="true"]');
    if (on) box.scrollLeft = on.offsetLeft - (box.clientWidth - on.offsetWidth) / 2;
  }

  /* ---------- Crear: generación y resultado ---------- */
  function resultHTML() {
    return `
      <div class="st-res-head">
        <button type="button" class="btn btn-ghost btn-sm st-back" data-act="edit">${ic('chevron-left', 18)}Editar</button>
        ${fmtSeg(true)}
      </div>
      <div class="st-stage">
        <div class="st-frame st-frame-${sel.format} is-loading">
          <div class="st-ai">
            <p class="st-ai-t">${ic('sparkles', 20)}Creando tu publicación</p>
            <p class="st-ai-s">${esc(prodName(sel.product))} · ${FMT[sel.format][0]}</p>
            <ol class="st-ai-steps">${STEPS.map(s => `<li><i>${ic('check', 12)}</i>${s}</li>`).join('')}</ol>
            <span class="st-sr" aria-live="polite"></span>
          </div>
        </div>
      </div>
      <div class="st-acts">
        <button type="button" data-act="variant"${variants() > 1 ? '' : ' hidden'}>${ic('refresh')}<span>Otra versión</span></button>
        <button type="button" data-act="save">${ic('download')}<span>Guardar imagen</span></button>
        <button type="button" class="is-primary" data-act="prog">${ic('calendar')}<span>Programar</span></button>
      </div>
      <section class="card st-cap">
        <h3 class="st-cap-h">${ic('sparkles', 18)}Texto para tus redes</h3>
        <div class="seg st-nets">${NETS.map(n => `
          <button type="button" data-act="net" data-v="${n.key}" aria-pressed="${n.key === sel.network}">${ic(n.key, 18)}<span>${n.name}</span></button>`).join('')}
        </div>
        <div class="st-cap-body"></div>
        <div class="st-cap-foot">
          <span class="st-best"></span>
          <button type="button" class="btn btn-ghost btn-sm" data-act="copy">${ic('copy', 16)}Copiar texto</button>
        </div>
      </section>`;
  }

  async function generate() {
    if (!sel.product) return;
    remember();
    sel.variant = 0;
    const res = $('.st-result');
    res.innerHTML = resultHTML();
    res.classList.add('is-loading');
    res.querySelectorAll('button:not(.st-back)').forEach(b => (b.disabled = true));
    $('.st-form').hidden = true;
    res.hidden = false;
    toTop();
    const token = ++gen, rendering = draw();
    rendering.catch(() => {}); // el error se atiende al final de los pasos
    try {
      await runSteps(res.querySelector('.st-ai'), rendering);
      const r = await rendering;
      if (token !== gen) return;
      place(r);
      res.classList.remove('is-loading');
      res.querySelectorAll('button').forEach(b => (b.disabled = false));
    } catch (e) {
      if (token !== gen) return;
      TB.app.toast('No pudimos crear tu publicación. Inténtalo de nuevo.');
      backToForm();
    }
  }

  async function runSteps(box, rendering) {
    const lis = box.querySelectorAll('li'), live = box.querySelector('.st-sr'), ms = calm() ? 250 : 550;
    for (let i = 0; i <= lis.length; i++) {
      lis.forEach((li, k) => (li.className = k < i ? 'is-done' : k === i ? 'is-on' : ''));
      if (i === lis.length) break;
      live.textContent = STEPS[i];
      await (i === lis.length - 1 ? Promise.all([wait(ms), rendering]) : wait(ms));
    }
    await wait(calm() ? 0 : 300);
  }

  // Espera las fuentes de los afiches (si fallan, dibuja igual con las de respaldo).
  const renderTo = (c, o) => new Promise(r => r(TB.content.ready && TB.content.ready())).catch(() => {}).then(() => TB.content.render(c, o));

  function draw() {
    const c = document.createElement('canvas');
    const o = { template: sel.template, format: sel.format, product: sel.product, variant: sel.variant, offer: sel.offer.trim(), scale: 1 };
    return renderTo(c, o).then(r => ({ canvas: c, title: (r && r.title) || prodName(o.product), opts: o }));
  }

  function place(r) {
    cur = r;
    // Se prepara al dibujar: Safari exige llamar a share() casi en el mismo toque.
    cur.blob = new Promise(res => { try { r.canvas.toBlob(res, 'image/jpeg', 0.92); } catch (e) { res(null); } });
    r.canvas.setAttribute('role', 'img');
    r.canvas.setAttribute('aria-label', r.title);
    const f = $('.st-frame');
    f.className = 'st-frame st-frame-' + r.opts.format;
    f.replaceChildren(r.canvas);
    renderCaption();
  }

  async function redraw() {
    const f = $('.st-frame'), token = ++gen;
    f.classList.add('is-busy');
    try {
      const [r] = await Promise.all([draw(), wait(calm() ? 0 : 450)]);
      if (token === gen) place(r);
    } catch (e) {
      if (token !== gen) return;
      f.classList.remove('is-busy');
      TB.app.toast('No se pudo crear esta versión. Inténtalo de nuevo.');
    }
  }

  function renderCaption() {
    const o = cur.opts;
    const c = (cur.caption = TB.content.caption({ template: o.template, product: o.product, variant: o.variant, offer: o.offer, network: sel.network }));
    const [h, m] = hm(c.bestTime);
    $('.st-cap-body').innerHTML = `<p class="st-cap-text">${esc(c.text)}</p><p class="st-tags">${esc(tags(c))}</p>`;
    $('.st-best').innerHTML = ic('clock', 16) + '<span>' + esc(c.bestTimeLabel || 'Mejor hora: ' + TB.app.fmtTime(dayAt(0, h, m))) + '</span>';
  }

  function backToForm() {
    gen++;
    cur = null;
    $('.st-result').hidden = true;
    $('.st-form').hidden = false;
    toTop();
  }

  async function saveImage() {
    try {
      const blob = await cur.blob;
      if (!blob) throw new Error('sin imagen');
      const name = `time-bite-${cur.opts.product}-${cur.opts.format === 'story' ? 'historia' : 'publicacion'}.jpg`;
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { return await navigator.share({ files: [file], title: cur.title }); } catch (e) { if (e.name === 'AbortError') return; }
      }
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      TB.app.toast('Imagen descargada');
    } catch (e) {
      TB.app.toast('No se pudo guardar la imagen. Inténtalo de nuevo.');
    }
  }

  function copyText(text, el) {
    const ok = () => TB.app.toast('Texto copiado');
    const fail = () => {
      // Deja el texto seleccionado para copiarlo a mano.
      try { const r = document.createRange(), s = getSelection(); r.selectNodeContents(el); s.removeAllRanges(); s.addRange(r); } catch (e) { /* sin selección */ }
      TB.app.toast('No se pudo copiar. Mantén presionado el texto para copiarlo.');
    };
    const legacy = () => {
      const t = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(t);
      t.select();
      t.setSelectionRange(0, text.length);
      let done = false;
      try { done = document.execCommand('copy'); } catch (e) { /* sin portapapeles */ }
      t.remove();
      if (done) ok(); else fail();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, legacy);
    else legacy();
  }

  /* ---------- Programar ---------- */
  function openSchedule() {
    const o = cur.opts, [h, m] = hm(cur.caption.bestTime), nets = new Set([sel.network]);
    let day = dayAt(0, h, m) > TB.app.now() ? 0 : 1;
    const body = document.createElement('div');
    body.className = 'st-sheet st-prog';
    body.innerHTML = `
      <div class="st-prog-top">
        <span class="st-thumb"></span>
        <span class="st-prog-tx"><b>${esc(prodName(o.product))}</b><span>${esc(tplOf(o.template).name)} · ${FMT[o.format].join(' ')}</span></span>
      </div>
      <p class="st-lbl">¿Dónde?</p>
      <div class="st-chips">${NETS.map(n => `<button type="button" class="chip" data-net="${n.key}">${ic(n.key, 18)}${n.name}</button>`).join('')}</div>
      <p class="st-lbl">¿Cuándo?</p>
      <div class="st-chips st-days">${[0, 1, 2, 3, 4, 5, 6].map(i => {
        const d = dayAt(i);
        return `<button type="button" class="chip" data-day="${i}">${i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : WD[d.getDay()] + ' ' + d.getDate()}</button>`;
      }).join('')}</div>
      <label class="st-time">${ic('clock', 20)}<span>Hora</span><input class="st-input" name="hora" type="time" step="300" value="${pad(h)}:${pad(m)}"></label>
      <p class="st-err" role="alert"></p>
      <button type="button" class="btn btn-primary btn-block" data-ok>${ic('calendar', 20)}Programar</button>
      <p class="st-fine">${DEMO_NOTE}</p>`;

    const thumb = document.createElement('canvas');
    thumb.width = 180;
    thumb.height = Math.round((180 * cur.canvas.height) / cur.canvas.width);
    thumb.getContext('2d').drawImage(cur.canvas, 0, 0, thumb.width, thumb.height);
    body.querySelector('.st-thumb').appendChild(thumb);

    const input = body.querySelector('input'), err = body.querySelector('.st-err');
    const sync = () => {
      body.querySelectorAll('[data-net]').forEach(b => { const on = nets.has(b.dataset.net); b.classList.toggle('chip-on', on); b.setAttribute('aria-pressed', on); });
      body.querySelectorAll('[data-day]').forEach(b => { const on = +b.dataset.day === day; b.classList.toggle('chip-on', on); b.setAttribute('aria-pressed', on); });
      body.querySelector('[data-ok]').disabled = !nets.size;
      err.textContent = '';
    };
    sync();
    const sh = TB.app.sheet({ title: 'Programar publicación', body });

    function confirm() {
      if (!input.value) return (err.textContent = 'Elige una hora.');
      const [hh, mi] = hm(input.value), when = dayAt(day, hh, mi);
      if (when <= TB.app.now()) return (err.textContent = 'Esa hora ya pasó. Elige una más tarde u otro día.');
      const chosen = NETS.filter(n => nets.has(n.key)), createdAt = TB.app.now().toISOString();
      chosen.forEach(n => {
        const c = TB.content.caption({ template: o.template, product: o.product, variant: o.variant, offer: o.offer, network: n.key });
        TB.app.addPost({
          id: 'st-' + Date.now().toString(36) + '-' + n.key, template: o.template, format: o.format, product: o.product,
          variant: o.variant, offer: o.offer || undefined, network: n.key, when: when.toISOString(),
          caption: c.text, hashtags: c.hashtags || [], status: 'programado', createdAt
        });
      });
      sh.close();
      TB.app.toast(`Programado para ${whenText(when)} en ${andList(chosen.map(n => n.phrase))}`, {
        action: { label: 'Ver calendario', fn: () => TB.app.go('contenido', { tab: 'calendario' }) }
      });
    }

    body.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-ok')) return confirm();
      if (b.dataset.net) nets[nets.has(b.dataset.net) ? 'delete' : 'add'](b.dataset.net);
      if (b.dataset.day) day = +b.dataset.day;
      sync();
    });
    input.addEventListener('input', () => (err.textContent = ''));
  }

  /* ---------- Calendario ---------- */
  function renderCal() {
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => ({ d: dayAt(i), posts: [] })), byDay = {};
    days.forEach(x => (byDay[x.d.toDateString()] = x));
    TB.app.allPosts().forEach(p => { const x = byDay[new Date(p.when).toDateString()]; if (x) x.posts.push(p); });
    const all = days.reduce((a, x) => a.concat(x.posts), []);
    const pub = all.filter(p => statusOf(p) === 'publicado').length, prog = all.length - pub;
    const count = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    $('[data-pane="calendario"]').innerHTML = all.length ? `
      <div class="st-cal-head">
        <h2 class="st-h">Próximos 7 días</h2>
        <span>${[prog && count(prog, 'programada'), pub && count(pub, 'publicada')].filter(Boolean).join(' · ')}</span>
      </div>
      ${days.filter(x => x.posts.length).map(x => `
        <section class="st-day">
          <h3 class="st-day-h">${dayHead(x.d)}</h3>
          <div class="card list st-list">${x.posts.map(postRow).join('')}</div>
        </section>`).join('')}
      <button type="button" class="btn btn-ghost btn-block" data-act="new">${ic('sparkles', 18)}Crear otra publicación</button>` : `
      <div class="empty st-empty">
        <span class="st-empty-ic">${ic('calendar', 30)}</span>
        <h3>Tu semana está libre</h3>
        <p>Crea una publicación con IA y prográmala en segundos.</p>
        <button type="button" class="btn btn-primary" data-act="new">${ic('sparkles', 18)}Crear publicación</button>
      </div>`;
  }

  function postRow(p) {
    const pr = TB.data.porKey[p.product], n = netOf(p.network);
    return `
      <button type="button" class="list-item st-post" data-act="post" data-v="${esc(p.id)}">
        <span class="st-post-img">${pr ? TB.app.tile(pr, 48) : ''}</span>
        <span class="st-post-main">
          <span class="st-post-l1"><b>${TB.app.fmtTime(new Date(p.when))}</b>${badge(statusOf(p))}</span>
          <span class="st-net st-net-${n.key}">${ic(n.key, 16)}<span>${n.name}</span></span>
          <span class="st-post-l2">${esc(tplOf(p.template).name)} · ${esc(prodName(p.product))}</span>
        </span>
      </button>`;
  }

  function openPost(id) {
    const p = TB.app.allPosts().find(x => x.id === id);
    if (!p) return;
    const n = netOf(p.network), s = statusOf(p), d = new Date(p.when), fmt = p.format === 'post' ? 'post' : 'story';
    const body = document.createElement('div');
    body.className = 'st-sheet st-ps';
    body.innerHTML = `
      <div class="st-ps-top">
        <div class="st-frame st-frame-${fmt} is-busy"></div>
        <div class="st-ps-meta">
          <span class="st-net st-net-${n.key}">${ic(n.key, 18)}<span>${n.name}</span></span>
          <b>${dayName(d)} · ${TB.app.fmtTime(d)}</b>
          <span class="st-ps-prod">${esc(prodName(p.product))} · ${FMT[fmt].join(' ')}</span>
          ${badge(s)}
          <div class="st-ps-acts">
            ${s === 'programado' ? `<button type="button" class="btn btn-primary btn-sm" data-ps="pub">${ic('send', 16)}Publicar ahora</button>` : ''}
            ${p.simulated ? '' : `<button type="button" class="btn btn-ghost btn-sm st-del" data-ps="del">${ic('x', 16)}Eliminar</button>`}
          </div>
        </div>
      </div>
      <div class="st-cap-body"><p class="st-cap-text">${esc(p.caption)}</p><p class="st-tags">${esc(tags(p))}</p></div>
      <button type="button" class="btn btn-ghost btn-sm st-copy" data-ps="copy">${ic('copy', 16)}Copiar texto</button>
      ${s === 'programado' ? `<p class="st-fine">${DEMO_NOTE}</p>` : ''}`;
    const sh = TB.app.sheet({ title: tplOf(p.template).name, body });

    const c = document.createElement('canvas'), f = body.querySelector('.st-frame');
    renderTo(c, { template: p.template, format: fmt, product: p.product, variant: p.variant || 0, offer: p.offer || '', scale: 0.4 })
      .then(r => {
        c.setAttribute('role', 'img');
        c.setAttribute('aria-label', (r && r.title) || prodName(p.product));
        f.replaceChildren(c);
      }, () => {})
      .then(() => f.classList.remove('is-busy'));

    body.addEventListener('click', e => {
      const b = e.target.closest('[data-ps]');
      if (!b) return;
      if (b.dataset.ps === 'copy') copyText(fullText(p.caption, p), body.querySelector('.st-cap-body'));
      if (b.dataset.ps === 'pub') {
        TB.app.updatePost(p.id, { status: 'publicado', when: TB.app.now().toISOString() });
        sh.close();
        renderCal();
        TB.app.toast('Publicado en ' + n.phrase);
      }
      if (b.dataset.ps === 'del') {
        TB.app.confirm({ title: '¿Eliminar esta publicación?', text: 'Se quitará de tu calendario.', ok: 'Eliminar', cancel: 'Cancelar', danger: true }).then(yes => {
          if (!yes) return;
          TB.app.removePost(p.id);
          sh.close();
          renderCal();
          TB.app.toast('Publicación eliminada');
        });
      }
    });
  }

  /* ---------- Vista ---------- */
  function setTab(t) {
    if (t !== tab) toTop();
    tab = t;
    press('tab', t);
    root.querySelectorAll('.st-pane').forEach(p => (p.hidden = p.dataset.pane !== t));
    if (t === 'calendario') renderCal(); else centerProd();
  }

  function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const v = b.dataset.v;
    switch (b.dataset.act) {
      case 'tab': return setTab(v);
      case 'tpl': sel.template = v; sel.product = null; press('tpl', v); renderProds(); return remember();
      case 'prod': sel.product = v; press('prod', v); return remember();
      case 'fmt':
        if (v === sel.format) return;
        sel.format = v; press('fmt', v); remember();
        return cur && redraw();
      case 'gen': return generate();
      case 'edit': return backToForm();
      case 'variant': sel.variant = (sel.variant + 1) % variants(); return redraw();
      case 'save': return saveImage();
      case 'prog': return openSchedule();
      case 'net': sel.network = v; press('net', v); remember(); return renderCaption();
      case 'copy': return copyText(fullText(cur.caption.text, cur.caption), $('.st-cap-body'));
      case 'new': backToForm(); return setTab('crear');
      case 'post': return openPost(v);
    }
  }

  function mount(el) {
    root = el;
    el.classList.add('st');
    el.innerHTML = `
      <div class="seg st-tabs">
        <button type="button" data-act="tab" data-v="crear" aria-pressed="true">${ic('sparkles', 18)}Crear</button>
        <button type="button" data-act="tab" data-v="calendario" aria-pressed="false">${ic('calendar', 18)}Calendario</button>
      </div>
      <div class="st-pane" data-pane="crear"></div>
      <div class="st-pane" data-pane="calendario" hidden></div>`;
    initSel();
    renderForm();
    el.addEventListener('click', onClick);
    el.addEventListener('input', e => { if (e.target.id === 'st-offer') sel.offer = e.target.value; });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'st-offer') e.target.blur(); });
    TB.app.on('post:new', () => { if (tab === 'calendario') renderCal(); });
    TB.app.on('state:reset', () => { gen++; cur = null; initSel(); renderForm(); setTab('crear'); });
  }

  function show(params) {
    const t = params && params.tab;
    if (t === 'crear' || t === 'calendario') setTab(t);
    else if (tab === 'calendario') renderCal();
    else centerProd();
  }

  (TB.views = TB.views || []).push({ key: 'contenido', title: 'Contenido', icon: 'image', mount, show });
})();
