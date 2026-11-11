/* Vistas del shell: Inicio (cómo va el día), Clientes (frecuentes, sellos, Empanada del día) y Ajustes.
   Todo lo que muestran sale de TB.app (simulación + lo creado por el usuario) y de TB.data. */
(function () {
  'use strict';
  const TB = window.TB = window.TB || {};
  const A = TB.app, D = TB.data, P = D.porKey, H = D.horarios;
  const NB = ' ';
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIAS_C = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const STATUS = { nuevo: ['Nuevo', 'badge-mostaza'], preparando: ['Preparando', 'badge-azul'], 'en camino': ['En camino', 'badge-verde'], 'listo para recojo': ['Listo para recojo', 'badge-verde'], entregado: ['Entregado', 'badge-gris'] };
  const UNIT = { empanadas: ['empanada', 'empanadas'], marcianos: ['marciano', 'marcianos'], 'caja-china': ['caja china', 'cajas chinas'], postres: ['postre', 'postres'], bebidas: ['bebida', 'bebidas'] };
  const CAT_ONE = { empanadas: 'Empanada', marcianos: 'Marciano', 'caja-china': 'Caja china', postres: 'Postre', bebidas: 'Bebida' };
  const CAT_COLOR = { empanadas: '#3D7534', marcianos: '#E8A122', 'caja-china': '#C2412D', postres: '#8A5A2B', bebidas: '#2E5C8A', delivery: '#8C9488' };
  const CHANNELS = [['Bot de WhatsApp', '#3D7534'], ['WhatsApp (Alberto)', '#E8A122'], ['Instagram', '#2E5C8A']];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, s) => A.icon(n, s);
  const pad = n => (n < 10 ? '0' : '') + n;
  const toMin = s => { const p = String(s).split(':'); return p[0] * 60 + +p[1]; };
  const minOf = d => d.getHours() * 60 + d.getMinutes();
  const at = (d, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, m);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const pct = x => Math.round(x * 100) + NB + '%';
  const hora = s => A.fmtTime(at(A.now(), toMin(s)));
  const atTime = d => (d.getHours() % 12 === 1 ? 'a la ' : 'a las ') + A.fmtTime(d);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function itemsText(items) {
    const c = {};
    (items || []).forEach(it => { const k = (P[it.key] || {}).cat; c[k] = (c[k] || 0) + it.qty; });
    return Object.keys(c).map(k => { const u = UNIT[k] || ['producto', 'productos']; return plural(c[k], u[0], u[1]); }).join(', ');
  }
  function dayWord(d) {
    const diff = Math.round((at(d, 0) - at(A.now(), 0)) / 864e5);
    return diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : cap(DIAS[d.getDay()]) + ' ' + d.getDate();
  }
  const title = (t, extra) => '<div class="section-title"><h2>' + t + '</h2>' + (extra || '') + '</div>';

  /* =================== INICIO =================== */
  let inEl = null, inTimer = null, inMin = -1;

  function mountInicio(el) {
    inEl = el;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-go]');
      if (!b) return;
      const p = {};
      if (b.dataset.tab) p.tab = b.dataset.tab;
      if (b.dataset.code) p.code = b.dataset.code;
      A.go(b.dataset.go, Object.keys(p).length ? p : undefined);
    });
    ['order:new', 'order:update', 'post:new', 'state:reset', 'settings:update'].forEach(ev => A.on(ev, () => { if (!inEl.hidden) renderInicio(); }));
  }

  function showInicio() {
    renderInicio();
    clearInterval(inTimer);
    inTimer = setInterval(() => {
      if (inEl.hidden) { clearInterval(inTimer); inTimer = null; return; }
      const n = A.now();
      if (minOf(n) !== inMin) renderInicio();
      else { const c = inEl.querySelector('[data-countdown]'); if (c) c.textContent = countdown(at(n, toMin(D.delivery.salida)) - n); }
    }, 1000);
  }

  function renderInicio() {
    const n = A.now();
    inMin = minOf(n);
    const early = inMin < toMin(H.marcianos.desde); // antes de abrir se muestra el día anterior
    const ref = early ? addDays(n, -1) : n, prevDay = addDays(ref, -7);
    const list = A.ordersFor(ref);
    let prevList = A.ordersFor(prevDay);
    if (!early) prevList = prevList.filter(o => minOf(new Date(o.createdAt)) <= inMin);
    const ctx = { n, early, ref, prevDay, list, sum: A.summary(list), prev: A.summary(prevList) };
    let html = '';
    [hello, delivery, kpis, recent, chart, topProducts, categories, channels, stockAlerts, nextPost].forEach(f => {
      try { html += f(ctx); } catch (e) { console.error(e); }
    });
    inEl.innerHTML = '<div class="in">' + html + '</div>';
  }

  function hello({ n }) {
    const h = n.getHours(), g = h < 5 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    const fecha = cap(DIAS[n.getDay()]) + ' ' + n.getDate() + ' de ' + MESES[n.getMonth()];
    return '<div class="in-hello"><h2>' + g + ', ' + esc(D.negocio.dueno) + '</h2><p>' + fecha + '</p></div>' +
      '<ul class="in-chips" aria-label="Estado de hoy">' + chips(n).map(c =>
        '<li class="in-chip is-' + c[0] + '">' + (c[2] ? ic(c[2], 16) : '<i aria-hidden="true"></i>') + '<span>' + c[1] + '</span></li>').join('') + '</ul>';
  }

  function chips(n) {
    const m = minOf(n), wd = n.getDay(), mar = H.marcianos, emp = H.empanadas, out = [];
    if (m < toMin(mar.desde)) out.push(['wait', '<b>Marcianos:</b> abren a las ' + hora(mar.desde)]);
    else if (m < toMin(mar.hasta)) out.push(['on', '<b>Marcianos:</b> abierto hasta las ' + hora(mar.hasta)]);
    else out.push(['off', '<b>Marcianos:</b> mañana desde las ' + hora(mar.desde)]);
    if (emp.dias.indexOf(wd) < 0) out.push(['off', '<b>Empanadas:</b> hoy no hay (fin de semana)']);
    else if (m < toMin(emp.desde)) out.push(['wait', '<b>Empanadas:</b> abren a las ' + hora(emp.desde)]);
    else if (m < toMin(emp.hasta)) out.push(['on', '<b>Empanadas:</b> abiertas hasta las ' + hora(emp.hasta)]);
    else out.push(['off', '<b>Empanadas:</b> ' + (emp.dias.indexOf((wd + 1) % 7) >= 0 ? 'mañana desde las ' + hora(emp.desde) : 'vuelven el lunes')]);
    if (H['caja-china'].dias.indexOf(wd) >= 0) out.push(['on', '<b>Caja china:</b> hoy hay delivery']);
    const bot = A.state.settings.bot.activo !== false;
    out.push([bot ? 'bot' : 'off', bot ? '<b>Bot activo</b> en WhatsApp' : '<b>Bot apagado</b>', 'bot']);
    return out;
  }

  function countdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }

  function delivery({ n }) {
    const today = A.dayKey(n), sal = toMin(D.delivery.salida), salida = at(n, sal);
    const slot = (d, key) => A.ordersFor(d).filter(o => o.mode === 'delivery' && o.slot && o.slot.date === key);
    const hoy = slot(n, today).concat(slot(addDays(n, -1), today));
    const head = '<div class="in-del-h">' + ic('truck', 20) + '<span>Delivery de hoy</span><span class="in-del-t">' + A.fmtTime(salida) + '</span></div>';
    if (minOf(n) < sal) {
      const total = hoy.reduce((s, o) => s + o.total, 0);
      const zones = D.delivery.zonas.map(z => [z.nombre, hoy.filter(o => o.zone === z.nombre).length]).filter(z => z[1]);
      return '<section class="in-del" aria-label="Delivery de hoy">' + head +
        '<p class="in-del-k">El delivery sale en</p>' +
        '<p class="in-del-cd" role="timer" data-countdown>' + countdown(salida - n) + '</p>' +
        (hoy.length
          ? '<p class="in-del-s"><b>' + plural(hoy.length, 'pedido separado', 'pedidos separados') + '</b> · ' + A.money(total) + '</p>' +
            '<ul class="in-zones">' + zones.map(z => '<li>' + ic('pin', 14) + esc(z[0]) + ' <b>' + z[1] + '</b></li>').join('') + '</ul>'
          : '<p class="in-del-s">Aún no hay pedidos separados para hoy.</p>') +
        '</section>';
    }
    const camino = hoy.filter(o => o.status === 'en camino').length, entregados = hoy.filter(o => o.status === 'entregado').length;
    const next = slot(n, A.dayKey(addDays(n, 1)));
    return '<section class="in-del is-done" aria-label="Delivery de hoy">' + head +
      '<p class="in-del-big">' + (hoy.length ? 'El delivery de hoy ya salió' : 'Hoy no hubo pedidos para el delivery') + '</p>' +
      (hoy.length ? '<div class="in-del-stats"><span><b>' + camino + '</b> en camino</span><span><b>' + entregados + '</b> ' + (entregados === 1 ? 'entregado' : 'entregados') + '</span></div>' : '') +
      '<p class="in-del-s">' + ic('clock', 16) + '<span>Próximo: mañana ' + atTime(salida) + (next.length ? ' · <b>' + plural(next.length, 'pedido separado', 'pedidos separados') + '</b>' : '') + '</span></p>' +
      '</section>';
  }

  function delta(cur, prev, kind) {
    if (!prev) return '<span class="in-delta">' + (cur ? 'Sin comparación' : 'Sin datos') + '</span>';
    let d, txt;
    if (kind === 'pct') { d = Math.round((cur - prev) / prev * 100); txt = Math.abs(d) + NB + '%'; }
    else if (kind === 'pts') { d = Math.round(cur - prev); txt = plural(Math.abs(d), 'punto', 'puntos'); }
    else { d = Math.round(cur - prev); txt = String(Math.abs(d)); }
    if (!d) return '<span class="in-delta">Igual</span>';
    return '<span class="in-delta ' + (d > 0 ? 'is-up' : 'is-down') + '">' + ic(d > 0 ? 'trend-up' : 'trend-down', 14) + (d > 0 ? '+' : '−') + txt + '</span>';
  }

  function kpis({ n, early, ref, prevDay, sum, prev }) {
    const avg = sum.pedidos ? sum.ventas / sum.pedidos : 0, pavg = prev.pedidos ? prev.ventas / prev.pedidos : 0;
    // Con menos de 5 pedidos los porcentajes saltan demasiado: se comparan recién después.
    const few = Math.min(sum.pedidos, prev.pedidos) < 5, cmp = (a, b, k) => (few ? '' : delta(a, b, k));
    const tiles = [
      [early ? 'Ventas de ayer' : 'Ventas de hoy', A.money(sum.ventas), cmp(sum.ventas, prev.ventas, 'pct')],
      ['Pedidos', sum.pedidos, cmp(sum.pedidos, prev.pedidos, 'abs')],
      ['Ticket promedio', A.money(avg), cmp(avg, pavg, 'pct')],
      ['Atendidos por el bot', pct(sum.botPct), cmp(sum.botPct * 100, prev.botPct * 100, 'pts')]
    ];
    const vs = 'el ' + DIAS[prevDay.getDay()] + (early ? ' anterior' : ' pasado');
    const note = (early ? 'Abres a las ' + hora(H.marcianos.desde) + '. Mientras tanto, así cerró ayer ' + A.fmtDate(ref) + '. ' : '') +
      (few ? 'Cuando haya al menos 5 pedidos verás la comparación con ' + vs + '.' : 'Comparado con ' + vs + (early ? '.' : ' hasta la misma hora.'));
    return title(early ? 'Resumen de ayer' : 'Cómo va el día', early ? '<span class="badge badge-mostaza">' + esc(cap(A.fmtDate(ref))) + '</span>' : '') +
      '<div class="in-kpis">' + tiles.map(t => '<div class="in-kpi"><span class="in-kpi-l">' + t[0] + '</span><b class="in-kpi-v">' + t[1] + '</b>' + t[2] + '</div>').join('') + '</div>' +
      '<p class="in-note">' + note + '</p>';
  }

  function recent({ early, list }) {
    const rows = list.slice(0, 5).map(o => {
      const p = P[o.items && o.items[0] && o.items[0].key], st = STATUS[o.status] || STATUS.nuevo;
      return '<li><button type="button" class="list-item in-ord" data-go="pedidos" data-tab="pedidos"' + (early ? '' : ' data-code="' + esc(o.code) + '"') + '>' +
        (p ? A.tile(p, 44) : '') +
        '<span class="in-ord-m"><b>' + esc((o.customer && o.customer.name) || 'Cliente') + '</b><span>' + esc(A.rel(o.createdAt)) + ' · ' + esc(itemsText(o.items)) + '</span></span>' +
        '<span class="in-ord-r"><b>' + A.money(o.total) + '</b><span class="badge ' + st[1] + '">' + st[0] + '</span></span></button></li>';
    }).join('');
    return title(early ? 'Últimos pedidos de ayer' : 'Últimos pedidos', '<button type="button" class="in-link" data-go="pedidos" data-tab="pedidos">Ver todos' + ic('chevron-right', 16) + '</button>') +
      '<div class="card">' + (rows ? '<ul class="list">' + rows + '</ul>'
        : '<div class="empty">' + ic('bag', 28) + '<p><b>Aún no hay pedidos hoy</b></p><p>Los pedidos que lleguen por WhatsApp aparecerán aquí.</p></div>') + '</div>';
  }

  function chart({ n }) {
    const days = A.history(6).map(h => ({ d: new Date(h.date + 'T12:00'), v: h.ventas }))
      .concat([{ d: n, v: A.summary(A.ordersFor(n)).ventas, today: true }]);
    const max = Math.max.apply(null, days.map(x => x.v)) || 1, week = days.reduce((s, x) => s + x.v, 0);
    const W = 336, HH = 172, top = 24, base = HH - 28, slot = W / 7, bw = 30;
    let g = '';
    days.forEach((x, i) => {
      const h = Math.max(4, Math.round(x.v / max * (base - top))), cx = slot * i + slot / 2, x0 = cx - bw / 2, y = base - h, r = Math.min(7, h / 2);
      const cls = x.today ? ' class="is-today"' : '';
      g += '<path' + cls + ' d="M' + x0 + ' ' + base + 'V' + (y + r) + 'q0 ' + -r + ' ' + r + ' ' + -r + 'h' + (bw - 2 * r) + 'q' + r + ' 0 ' + r + ' ' + r + 'V' + base + 'z"/>' +
        '<text' + cls + ' x="' + cx + '" y="' + (y - 7) + '">' + Math.round(x.v) + '</text>' +
        '<text x="' + cx + '" y="' + (HH - 8) + '" class="d' + (x.today ? ' is-today' : '') + '">' + (x.today ? 'Hoy' : DIAS_C[x.d.getDay()]) + '</text>';
    });
    const label = days.map(x => (x.today ? 'hoy' : A.fmtDate(x.d)) + ' ' + A.money(x.v)).join(', ');
    return title('Ventas de la semana') +
      '<div class="card in-chart"><div class="in-chart-h"><div><span>Últimos 7 días</span><b>' + A.money(week) + '</b></div><div><span>Promedio diario</span><b>' + A.money(week / 7) + '</b></div></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + HH + '" role="img" aria-label="Ventas por día: ' + esc(label) + '"><line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '"/>' + g + '</svg>' +
      '<p class="in-note">En soles, con delivery incluido. La barra de hoy suma hasta las ' + esc(A.fmtTime(n)) + '</p></div>';
  }

  function topProducts({ early, list }) {
    const q = {};
    list.forEach(o => (o.items || []).forEach(it => { q[it.key] = (q[it.key] || 0) + it.qty; }));
    const keys = Object.keys(q).filter(k => P[k]).sort((a, b) => q[b] - q[a]).slice(0, 5), max = keys.length ? q[keys[0]] : 1;
    const rows = keys.map(k => {
      const p = P[k];
      return '<li class="list-item">' + A.tile(p, 44) + '<span class="in-top-m"><span class="in-top-n"><b>' + esc(p.nombre) + '</b></span>' +
        '<span class="in-bar"><i style="width:' + Math.max(6, Math.round(q[k] / max * 100)) + '%;background:' + p.color + '"></i></span></span>' +
        '<span class="in-top-q"><b>' + q[k] + '</b>unid.</span></li>';
    }).join('');
    return title(early ? 'Lo más pedido ayer' : 'Lo más pedido hoy') + '<div class="card">' +
      (rows ? '<ul class="list">' + rows + '</ul>' : '<div class="empty">' + ic('star', 28) + '<p><b>Todavía no hay ventas hoy</b></p></div>') + '</div>';
  }

  function stacked(rows) {
    const total = rows.reduce((s, r) => s + r[1], 0) || 1;
    return '<div class="in-stack" aria-hidden="true">' + rows.map(r => '<i style="flex:' + r[1] + ' 1 0;background:' + r[2] + '"></i>').join('') + '</div>' +
      '<ul class="in-legend">' + rows.map(r => '<li><span class="in-dot" style="background:' + r[2] + '"></span><span>' + esc(r[0]) + '</span><b>' + r[3] + '</b><span class="in-pc">' + Math.round(r[1] / total * 100) + NB + '%</span></li>').join('') + '</ul>';
  }

  function categories({ early, sum }) {
    const rows = D.categorias.concat([{ key: 'delivery', corto: 'Delivery' }]).filter(c => sum.porCategoria[c.key])
      .map(c => [c.corto, sum.porCategoria[c.key], CAT_COLOR[c.key], A.money(sum.porCategoria[c.key])]).sort((a, b) => b[1] - a[1]);
    return title(early ? 'Ventas de ayer por categoría' : 'Ventas por categoría') + '<div class="card">' +
      (rows.length ? stacked(rows) : '<div class="empty"><p>Sin ventas todavía.</p></div>') + '</div>';
  }

  function channels({ early, list }) {
    const rows = CHANNELS.map(c => { const k = list.filter(o => o.channel === c[0]).length; return [c[0], k, c[1], plural(k, 'pedido', 'pedidos')]; }).filter(r => r[1]);
    return title(early ? 'Canales de ayer' : 'Por dónde llegan los pedidos') + '<div class="card">' +
      (rows.length ? stacked(rows) : '<div class="empty"><p>Sin pedidos todavía.</p></div>') + '</div>';
  }

  function stockAlerts({ n }) {
    const st = A.stock(), start = TB.sim ? TB.sim.stockStart(A.dayKey(n)) : {};
    // Los productos que se preparan en poca cantidad (pies grandes, keke, caja china) solo avisan al agotarse.
    const low = Object.keys(st).filter(k => P[k] && start[k] > 0 && (st[k] === 0 || (start[k] >= 8 && st[k] <= Math.max(3, Math.round(start[k] * 0.2)))))
      .sort((a, b) => st[a] - st[b]).slice(0, 5);
    const rows = low.map(k => '<li class="list-item">' + A.tile(P[k], 40) + '<span class="in-al-m"><b>' + esc(P[k].nombre) + '</b><span>' + CAT_ONE[P[k].cat] + ' · ' + start[k] + ' preparados hoy</span></span>' +
      (st[k] ? '<span class="badge ' + (st[k] <= 2 ? 'badge-rojo' : 'badge-mostaza') + '">' + (st[k] === 1 ? 'Queda 1' : 'Quedan ' + st[k]) + '</span>' : '<span class="badge badge-rojo">Agotado</span>') + '</li>').join('');
    return title('Alertas de stock', low.length ? '<span class="badge badge-rojo">' + low.length + '</span>' : '') + '<div class="card">' +
      (rows ? '<ul class="list">' + rows + '</ul>' : '<div class="in-ok">' + ic('check', 20) + '<span>Todo en orden: ningún producto está por agotarse.</span></div>') + '</div>';
  }

  function nextPost({ n }) {
    const p = A.allPosts().find(x => x.status === 'programado' && new Date(x.when) > n);
    if (!p) {
      return title('Próxima publicación') + '<button type="button" class="card in-post" data-go="contenido" data-tab="crear">' +
        '<span class="in-post-ic">' + ic('sparkles', 24) + '</span><span class="in-post-m"><b>No hay publicaciones programadas</b><span class="in-post-c">Crea un afiche con IA en segundos.</span></span>' + ic('chevron-right', 20) + '</button>';
    }
    const prod = P[p.product], when = new Date(p.when);
    const net = { whatsapp: ['whatsapp', 'Estado de WhatsApp'], instagram: ['instagram', 'Instagram'], facebook: ['facebook', 'Facebook'] }[p.network] || ['share', 'Redes'];
    const label = p.network === 'whatsapp' ? net[1] : (p.format === 'story' ? 'Historia' : 'Publicación') + ' en ' + net[1];
    return title('Próxima publicación') + '<button type="button" class="card in-post" data-go="contenido" data-tab="calendario">' +
      (prod ? A.tile(prod, 64) : '') +
      '<span class="in-post-m"><span class="in-post-n">' + ic(net[0], 15) + esc(label) + '</span><b>' + esc(dayWord(when)) + ' ' + atTime(when) + '</b>' +
      '<span class="in-post-c">' + esc(p.caption) + '</span></span>' + ic('chevron-right', 20) + '</button>';
  }

  /* =================== CLIENTES =================== */
  let clEl = null, clQ = '', clAll = false, clEmp = null, clText = '', clBusy = false;
  const EMPS = () => D.productos.filter(p => p.cat === 'empanadas');

  function mountClientes(el) {
    clEl = el;
    el.innerHTML = '<div class="cl">' +
      '<label class="cl-search">' + ic('search', 20) + '<input type="search" name="buscar" placeholder="Buscar por nombre o zona" aria-label="Buscar cliente por nombre o zona" autocomplete="off" enterkeyhint="search"></label>' +
      title('Clientes frecuentes', '<span class="badge badge-gris cl-count"></span>') +
      '<div class="card cl-card"><ul class="list cl-list"></ul><button type="button" class="btn btn-ghost btn-block cl-more"></button></div>' +
      title('Tarjeta de sellos', '<span class="badge badge-mostaza">Propuesta</span>') +
      '<div class="card cl-stamps"></div>' +
      title('Empanada del día') +
      '<div class="card cl-bc"></div></div>';
    el.querySelector('.cl-search input').addEventListener('input', e => { clQ = e.target.value; renderList(); });
    el.addEventListener('click', e => {
      const t = e.target;
      const c = t.closest('[data-cid]'), emp = t.closest('[data-emp]');
      if (c) openCustomer(c.dataset.cid);
      else if (t.closest('.cl-more')) { clAll = !clAll; renderList(); }
      else if (emp && !clBusy) { clEmp = emp.dataset.emp; clText = ''; renderBroadcast(); }
      else if (t.closest('.cl-send')) send();
    });
    el.addEventListener('input', e => { if (e.target.id === 'cl-msg') { clText = e.target.value; grow(e.target); } });
    ['order:new', 'order:update'].forEach(ev => A.on(ev, () => { if (!clEl.hidden) { renderList(); renderStamps(); } }));
    A.on('state:reset', () => { clText = ''; clEmp = null; clBusy = false; renderList(); renderStamps(); renderBroadcast(); });
  }

  function showClientes() { renderList(); renderStamps(); if (!clBusy) renderBroadcast(); }

  function renderList() {
    const all = A.customers(), q = norm(clQ).trim();
    const match = q ? all.filter(c => norm(c.name + ' ' + (c.zone || '')).indexOf(q) >= 0) : all;
    const shown = q || clAll ? match : match.slice(0, 8);
    clEl.querySelector('.cl-count').textContent = plural(all.length, 'cliente', 'clientes');
    clEl.querySelector('.cl-list').innerHTML = shown.length ? shown.map(customerRow).join('')
      : '<li class="empty">' + ic('search', 28) + '<p><b>No encontramos a nadie con “' + esc(clQ.trim()) + '”</b></p><p>Prueba con otro nombre o zona.</p></li>';
    const more = clEl.querySelector('.cl-more');
    more.hidden = !!q || match.length <= 8;
    more.textContent = clAll ? 'Ver menos' : 'Ver los ' + match.length + ' clientes';
  }

  function ring(s) {
    return '<span class="cl-ring" style="--p:' + s * 10 + '" role="img" aria-label="' + s + ' de 10 sellos"><span>' + s + '<small>/10</small></span></span>';
  }
  function customerRow(c) {
    const fav = P[c.fav];
    return '<li><button type="button" class="list-item cl-item" data-cid="' + esc(c.id) + '">' + (fav ? A.tile(fav, 46) : '') +
      '<span class="cl-m"><b>' + esc(c.name) + (c.nuevo ? ' <span class="badge badge-verde">Nuevo</span>' : '') + '</b>' +
      '<span>' + plural(c.orders, 'pedido', 'pedidos') + ' · último: ' + esc(A.rel(c.last)) + '</span>' +
      '<span class="cl-z">' + ic('pin', 13) + esc(c.zone || 'Recojo') + '</span></span>' + ring(c.stamps) + '</button></li>';
  }

  function stampCard(s) {
    let h = '<div class="cl-card10" role="img" aria-label="' + s + ' de 10 sellos">';
    for (let i = 1; i <= 10; i++) {
      h += '<span class="' + (i <= s ? 'on' : '') + (i === 10 ? ' gift' : '') + '">' +
        (i === 10 ? ic('gift', 18) : i <= s ? '<img src="' + D.marca.isotipoBlanco + '" alt="">' : i) + '</span>';
    }
    return h + '</div>';
  }

  function openCustomer(id) {
    const c = A.customers().find(x => x.id === id);
    if (!c) return;
    const fav = P[c.fav], left = 10 - c.stamps, first = c.name.split(' ')[0];
    const ini = c.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('');
    const body = '<div class="cl-sh">' +
      '<div class="cl-sh-top"><span class="cl-av" aria-hidden="true">' + esc(ini) + '</span><div><b>' + esc(c.phone || 'Sin número') + '</b><span>' + ic('pin', 14) + esc(c.zone || 'Recoge en el punto de recojo') + '</span></div></div>' +
      '<div class="cl-sh-stats"><div><b>' + c.orders + '</b><span>pedidos</span></div><div><b>' + A.money(c.spent) + '</b><span>en total</span></div><div><b>' + esc(cap(A.rel(c.last))) + '</b><span>último pedido</span></div></div>' +
      (fav ? '<div class="cl-sh-fav">' + A.tile(fav, 44) + '<div><span>Su favorito</span><b>' + esc(fav.largo) + '</b></div></div>' : '') +
      '<h3 class="cl-h3">Tarjeta de sellos</h3>' + stampCard(c.stamps) +
      '<p class="cl-sh-left">' + (left === 1 ? '¡Le falta <b>1 sello</b> para su marciano gratis!' : 'Le faltan <b>' + left + ' sellos</b> para su marciano gratis.') + '</p>' +
      (c.recent.length ? '<h3 class="cl-h3">Últimos pedidos</h3><ul class="list">' + c.recent.map(o =>
        '<li class="list-item cl-rec"><span><b>' + esc(o.code) + '</b><span>' + esc(cap(A.fmtDate(o.createdAt))) + ' · ' + esc(itemsText(o.items)) + '</span></span><b>' + A.money(o.total) + '</b></li>').join('') + '</ul>' : '') +
      '<p class="cl-sh-opt">' + ic(c.optIn ? 'check' : 'x', 16) + (c.optIn ? 'Acepta recibir novedades por WhatsApp' : 'Prefiere no recibir mensajes de difusión') + '</p></div>';
    A.sheet({
      title: c.name, body,
      actions: [{ label: 'Enviar mensaje por WhatsApp', primary: true, fn: h => { h.close(); A.toast('Mensaje enviado a ' + first + ' por WhatsApp (simulado)'); } }]
    });
  }

  function renderStamps() {
    const near = A.customers().filter(c => c.stamps === 9);
    const names = near.slice(0, 3).map(c => c.name.split(' ')[0] + ' ' + (c.name.split(' ')[1] || '').charAt(0) + '.');
    const who = near.length ? names.join(', ') + (near.length > 3 ? ' y ' + (near.length - 3) + ' más' : '') : 'Cuando alguien esté por completar su tarjeta, aparecerá aquí.';
    clEl.querySelector('.cl-stamps').innerHTML =
      '<div class="cl-promo"><div class="cl-promo-h"><img src="' + D.marca.logo + '" alt="" width="48" height="38"><div><b>Tarjeta de sellos</b><span>10 sellos = 1 marciano gratis</span></div></div>' + stampCard(7) + '</div>' +
      '<p class="cl-p">Cada pedido suma un sello. Al juntar 10, el cliente gana <b>1 marciano gratis</b> y el bot se lo avisa por WhatsApp.</p>' +
      '<div class="cl-near">' + ic('gift', 22) + '<div><b>' + (near.length ? plural(near.length, 'cliente está', 'clientes están') + ' a 1 sello del premio' : 'Nadie está a 1 sello todavía') + '</b><span>' + esc(who) + '</span></div></div>';
  }

  // Día que anuncia el mensaje: hoy si aún hay empanadas; si no, el próximo día con empanadas.
  function bcTarget(n) {
    const e = H.empanadas, wd = n.getDay();
    if (e.dias.indexOf(wd) >= 0 && minOf(n) < toMin(e.hasta)) return { word: 'Hoy', note: '' };
    let i = 1;
    while (e.dias.indexOf((wd + i) % 7) < 0 && i < 7) i++;
    const dia = DIAS[(wd + i) % 7], word = i === 1 ? 'Mañana' : 'El ' + dia;
    return {
      word,
      note: e.dias.indexOf(wd) < 0 ? 'Hoy es fin de semana y no hay empanadas: el mensaje anuncia la del ' + dia + '.'
        : 'Las empanadas de hoy ya cerraron: el mensaje anuncia la de ' + (i === 1 ? 'mañana' : 'el ' + dia) + '.'
    };
  }
  function bcMessage(p, t) {
    const m = minOf(A.now()), e = H.empanadas, sal = D.delivery.salida;
    // "p. m." ya cierra la oración: no se agrega otro punto.
    const cuando = t.word !== 'Hoy' || m < toMin(e.desde) ? 'Te esperamos desde las ' + hora(e.desde) + ' y el delivery sale a las ' + hora(sal)
      : m < toMin(sal) ? 'Ya están listas y el delivery sale a las ' + hora(sal) : 'Puedes recogerlas hasta las ' + hora(e.hasta);
    return '¡Hola! 👋 ' + t.word + ' nuestra empanada del día es la ' + p.largo.replace(/^empanada\s+/i, '') + ' 🥟: 100% casera, a ' + A.money(p.precio) + '.\n\n' +
      cuando + ' ¿Te separo las tuyas? Responde a este mensaje.';
  }

  function renderBroadcast() {
    const n = A.now(), emps = EMPS(), box = clEl.querySelector('.cl-bc');
    if (!clEmp) clEmp = emps[n.getDate() % emps.length].key;
    const t = bcTarget(n);
    if (!clText) clText = bcMessage(P[clEmp], t);
    const rec = A.customers().filter(c => c.optIn).length;
    box.innerHTML =
      '<p class="cl-p">Elige la empanada y envía un mensaje a los clientes que aceptaron recibir novedades.</p>' +
      '<div class="cl-emps" role="group" aria-label="Empanada del día">' + emps.map(e =>
        '<button type="button" class="cl-emp" data-emp="' + e.key + '" aria-pressed="' + (e.key === clEmp) + '">' + A.tile(e, 52) + '<span>' + esc(e.nombre) + '</span></button>').join('') + '</div>' +
      (t.note ? '<p class="cl-warn">' + ic('calendar', 16) + '<span>' + esc(t.note) + '</span></p>' : '') +
      '<div class="cl-wa"><div class="cl-wa-b"><label class="sr-only" for="cl-msg">Mensaje para tus clientes</label>' +
        '<textarea id="cl-msg" class="cl-wa-t" rows="5" spellcheck="true">' + esc(clText) + '</textarea>' +
        '<span class="cl-wa-meta">' + esc(A.fmtTime(n)) + '</span></div>' +
        '<p class="cl-wa-hint">' + ic('sparkles', 14) + 'Así lo verán en WhatsApp. Puedes editarlo antes de enviarlo.</p></div>' +
      '<button type="button" class="btn btn-primary btn-block cl-send"' + (rec ? '' : ' disabled') + '>' + ic('send', 18) + 'Enviar a ' + rec + ' clientes</button>' +
      '<div class="cl-res" aria-live="polite" hidden></div>' + bcHistory();
    grow(box.querySelector('textarea'));
  }

  function grow(ta) { if (!ta) return; ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

  function bcHistory() {
    const list = (A.state.broadcasts || []).slice(-3).reverse();
    if (!list.length) return '';
    return '<h3 class="cl-h3">Envíos anteriores</h3><ul class="list cl-hist">' + list.map(b =>
      '<li class="list-item">' + A.tile(P[b.product], 36) + '<span class="cl-m"><b>' + esc((P[b.product] || {}).largo || 'Empanada del día') + '</b>' +
      '<span>' + esc(cap(A.fmtDate(b.when))) + ' · ' + esc(A.fmtTime(b.when)) + ' · ' + b.sent + ' enviados</span></span>' +
      '<span class="cl-hist-r"><b>' + plural(b.orders, 'pedido', 'pedidos') + '</b><span>' + A.money(b.amount) + '</span></span></li>').join('') + '</ul>';
  }

  function send() {
    if (clBusy) return;
    const n = A.now(), N = A.customers().filter(c => c.optIn).length, p = P[clEmp];
    if (!N || !clText.trim()) { A.toast('Escribe un mensaje antes de enviarlo'); return; }
    const r = TB.sim ? TB.sim.rng('difusion' + n.toISOString().slice(0, 16) + clEmp) : Math.random;
    const read = Math.round(N * (0.78 + r() * 0.12)), replied = Math.round(read * (0.24 + r() * 0.1)), orders = Math.max(1, Math.round(replied * (0.5 + r() * 0.2)));
    let amount = 0;
    for (let i = 0; i < orders; i++) amount += (2 + Math.floor(r() * 4)) * p.precio;
    const b = { id: 'b-' + Date.now().toString(36), product: clEmp, text: clText, when: n.toISOString(), sent: N, read, replied, orders, amount };
    A.state.broadcasts.push(b);
    A.save();
    clBusy = true;
    const box = clEl.querySelector('.cl-bc'), btn = box.querySelector('.cl-send'), res = box.querySelector('.cl-res');
    btn.disabled = true;
    btn.innerHTML = ic('send', 18) + 'Enviando…';
    res.hidden = false;
    res.innerHTML = '<div class="cl-res-h">' + ic('check', 18) + '<b>Mensaje enviado a ' + plural(N, 'cliente', 'clientes') + '</b></div>' +
      '<div class="cl-res-g">' + [['sent', 'Enviados'], ['read', 'Leídos'], ['replied', 'Respondieron'], ['orders', 'Pedidos']].map(x =>
        '<div><b data-n="' + b[x[0]] + '">0</b><span>' + x[1] + '</span></div>').join('') + '</div>' +
      '<div class="cl-res-t"><b data-n="' + amount + '" data-money="1">' + A.money(0) + '</b><span>en ventas estimadas</span></div>' +
      '<p class="cl-res-f">Resultado simulado. En la versión real verás estas cifras con los datos de tu WhatsApp Business.</p>';
    res.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
    countUp(res, () => {
      clBusy = false;
      btn.disabled = false;
      btn.innerHTML = ic('send', 18) + 'Enviar a ' + N + ' clientes';
      const old = box.querySelector('.cl-hist-wrap');
      if (old) old.remove();
      box.insertAdjacentHTML('beforeend', '<div class="cl-hist-wrap">' + bcHistory() + '</div>');
      A.toast('Empanada del día enviada a ' + N + ' clientes (simulado)');
    });
  }

  function countUp(root, done) {
    const els = Array.prototype.slice.call(root.querySelectorAll('[data-n]'));
    const show = (el, v) => { el.textContent = el.dataset.money ? A.money(v) : Math.round(v); };
    if (reduced()) { els.forEach(el => show(el, +el.dataset.n)); done(); return; }
    let i = 0;
    (function next() {
      if (i >= els.length) { done(); return; }
      const el = els[i++], to = +el.dataset.n, t0 = performance.now();
      (function step() {
        const k = Math.min(1, (performance.now() - t0) / 420);
        show(el, to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step); else next();
      })();
    })();
  }

  /* =================== AJUSTES =================== */
  let ajEl = null;
  const BOT_OPTS = [
    ['activo', 'Bot activo', 'Responde y toma pedidos por WhatsApp, de día y de noche.', 'El bot responde tus mensajes de WhatsApp', 'Bot apagado: los mensajes te llegan a ti'],
    ['pasarAlberto', 'Pasar a Alberto los pedidos grandes y eventos', 'Desde ' + D.bot.pedidoGrandeUnidades + ' unidades, cajas chinas y eventos: el bot te pasa la conversación.', 'Los pedidos grandes y eventos te llegarán a ti', 'El bot atenderá también los pedidos grandes'],
    ['minimoMarcianos', 'Recordar el mínimo de ' + D.delivery.minimoMarcianos + ' marcianos', 'En delivery de solo marcianos, el bot pide completar ' + D.delivery.minimoMarcianos + ' unidades o recoger.', 'El bot recordará el mínimo de marcianos', 'El bot ya no recordará el mínimo']
  ];

  function mountAjustes(el) {
    ajEl = el;
    el.addEventListener('click', e => {
      const s = e.target.closest('[data-bot]');
      if (s) {
        const o = BOT_OPTS.find(x => x[0] === s.dataset.bot), b = A.state.settings.bot;
        b[o[0]] = !b[o[0]];
        A.save();
        s.setAttribute('aria-checked', String(b[o[0]]));
        A.emit('settings:update', A.state.settings);
        A.toast(b[o[0]] ? o[3] : o[4]);
      } else if (e.target.closest('.aj-reset')) {
        A.confirm({ title: '¿Reiniciar la demo?', text: 'Se borran los pedidos, publicaciones, envíos y conversaciones que hiciste en este celular. Los datos de ejemplo vuelven a empezar.', ok: 'Reiniciar', cancel: 'Cancelar', danger: true })
          .then(ok => { if (ok) { A.reset(); A.toast('Listo: la demo volvió a empezar'); } });
      }
    });
    A.on('state:reset', () => renderAjustes());
  }

  function rows(list) {
    return '<ul class="list">' + list.map(r => '<li class="list-item aj-row"><span class="aj-ic">' + ic(r[0], 20) + '</span><span class="aj-t"><b>' + r[1] + '</b><span>' + r[2] + '</span></span>' + (r[3] || '') + '</li>').join('') + '</ul>';
  }

  function renderAjustes() {
    const N = D.negocio, b = A.state.settings.bot;
    ajEl.innerHTML = '<div class="aj">' +
      '<div class="card aj-biz"><img src="' + D.marca.logoVerde + '" alt="" width="64" height="64"><div><h2>' + esc(N.nombre) + '</h2><p>' + esc(N.ciudad + ', ' + N.region) + ' · ' + esc(N.redes) + '</p></div></div>' +
      title('Negocio') + '<div class="card">' + rows([
        ['whatsapp', 'WhatsApp de pedidos', esc(N.telefono) + ' · ' + esc(N.nombreWhatsApp)],
        ['phone', 'Otro número', esc(N.telefono2)],
        ['instagram', 'Redes sociales', esc(N.redes)],
        ['store', 'Punto de recojo', 'Se envía la ubicación por WhatsApp'],
        ['bag', 'Medios de pago', '<span class="aj-pays">' + N.pagos.map(x => '<span class="badge badge-verde">' + esc(x) + '</span>').join('') + '</span>']
      ]) + '</div>' +
      title('Horarios') + '<div class="card">' + rows([
        ['clock', 'Marcianos gourmet', esc(H.marcianos.texto)],
        ['clock', 'Empanadas caseras', esc(H.empanadas.texto)],
        ['clock', 'Postres y bebidas', esc(H.postres.texto)],
        ['calendar', 'Chanchito a la caja china', esc(H['caja-china'].texto)],
        ['truck', 'Salida del delivery', 'Todos los días a las ' + esc(hora(D.delivery.salida)) + ' Lo que llega después sale al día siguiente.']
      ]) + '</div>' +
      title('Zonas de delivery') + '<div class="card">' + rows(D.delivery.zonas.map(z => ['pin', esc(z.nombre), 'Costo de envío', '<b class="aj-cost">' + A.money(z.costo) + '</b>'])) +
        '<p class="aj-note">' + ic('alert', 16) + '<span>Delivery de solo marcianos: desde ' + D.delivery.minimoMarcianos + ' unidades.</span></p></div>' +
      title('Bot de WhatsApp') + '<div class="card"><ul class="list">' + BOT_OPTS.map(o =>
        '<li class="list-item aj-row"><span class="aj-t"><b id="aj-' + o[0] + '">' + esc(o[1]) + '</b><span>' + esc(o[2]) + '</span></span>' +
        '<button type="button" class="switch" role="switch" aria-labelledby="aj-' + o[0] + '" aria-checked="' + (b[o[0]] !== false) + '" data-bot="' + o[0] + '"></button></li>').join('') + '</ul></div>' +
      title('Integraciones') + '<div class="card">' + rows([
        ['whatsapp', 'WhatsApp Business', esc(N.telefono)],
        ['instagram', 'Instagram', esc(N.redes)],
        ['facebook', 'Facebook', esc(N.redes)]
      ].map(r => r.concat('<span class="aj-conn"><span class="badge badge-verde">' + ic('check', 12) + 'Conectado</span><small>simulado en esta demo</small></span>'))) + '</div>' +
      title('Demo') + '<div class="card aj-demo"><p>Precios, horarios, zonas, medios de pago y fotos son los reales de Time Bite. Clientes, ventas, stock y métricas son de ejemplo.</p>' +
        '<button type="button" class="btn btn-block aj-reset">' + ic('refresh', 18) + 'Reiniciar demo</button>' +
        '<p class="aj-fine">Borra los pedidos, publicaciones, envíos y conversaciones que hiciste en este celular.</p></div>' +
      '</div>';
  }

  TB.views.push(
    { key: 'inicio', title: 'Inicio', icon: 'home', mount: mountInicio, show: showInicio },
    { key: 'clientes', title: 'Clientes', icon: 'users', mount: mountClientes, show: showClientes },
    { key: 'ajustes', title: 'Ajustes', icon: 'settings', mount: mountAjustes, show: renderAjustes }
  );
})();
