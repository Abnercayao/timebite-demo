/* Marco de la app Time Bite (TB.app): estado guardado, eventos, navegación, hojas, avisos, formatos,
   iconos y datos combinados (simulación de js/sim.js + lo que crea el usuario). Contrato en SPEC.md. */
(function () {
  'use strict';
  const TB = window.TB = window.TB || {};
  TB.views = TB.views || [];
  const D = TB.data;
  const KEY = 'tb-demo-v1';
  const NB = ' ';

  // ---------- Hora: ?now=2026-11-11T16:30 arranca ahí y sigue avanzando con el reloj ----------
  let offset = 0;
  try {
    const m = /[?&]now=(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d?):(\d\d))?/.exec(decodeURIComponent(location.search));
    if (m) offset = new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0)) - Date.now();
  } catch (e) { /* parámetro ilegible: hora real */ }
  const now = () => new Date(Date.now() + offset);

  // ---------- Formatos (es-PE) ----------
  const pad = n => (n < 10 ? '0' : '') + n;
  const dayKey = d => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const toMin = s => { const p = String(s).split(':'); return p[0] * 60 + +p[1]; };
  const r2 = n => Math.round(n * 100) / 100;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const DIAS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
  const MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'set.', 'oct.', 'nov.', 'dic.'];

  function money(n) {
    const s = (Math.round((+n || 0) * 100) / 100).toFixed(2).split('.');
    return 'S/' + NB + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s[1];
  }
  function fmtTime(d) { d = new Date(d); const h = d.getHours(); return (h % 12 || 12) + ':' + pad(d.getMinutes()) + NB + (h < 12 ? 'a.' : 'p.') + NB + 'm.'; }
  function fmtDate(d) { d = new Date(d); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  // "a las 3:00 p. m." / "a la 1:00 p. m."
  const atTime = d => (new Date(d).getHours() % 12 === 1 ? 'la ' : 'las ') + fmtTime(d);
  function rel(d) {
    d = new Date(d);
    const n = now(), diff = n - d, m = Math.round(Math.abs(diff) / 6e4);
    const days = Math.round((startOfDay(n) - startOfDay(d)) / 864e5);
    if (diff >= 0) {
      if (m < 1) return 'ahora';
      if (m < 60) return 'hace ' + m + ' min';
      if (days === 0) return 'hace ' + Math.floor(m / 60) + ' h';
      if (days === 1) return 'ayer';
      return days < 7 ? 'hace ' + days + ' días' : fmtDate(d);
    }
    if (m < 60) return 'en ' + Math.max(1, m) + ' min';
    if (days === 0) return 'en ' + Math.round(m / 60) + ' h';
    if (days === -1) return 'mañana';
    return days > -7 ? 'en ' + -days + ' días' : fmtDate(d);
  }

  // ---------- Iconos (trazo 2 px, redondeado) ----------
  const IC = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    truck: '<path d="M1 4h14v12H1z"/><path d="M15 8h4l3 3.5V16h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8zM5 2.5l.6 1.4L7 4.5l-1.4.6L5 6.5l-.6-1.4L3 4.5l1.4-.6z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    whatsapp: '<path d="m3 21 1.65-4.6A9 9 0 1 1 8 19.6z"/><path d="M9 8.6c0 3.5 2.9 6.4 6.4 6.4l1.1-1.5-2.1-1-1 .9a5 5 0 0 1-2.8-2.8l.9-1-1-2.1z"/>',
    instagram: '<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    'trend-up': '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    'trend-down': '<path d="m23 18-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    store: '<path d="m3 9 1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 11.5V21h14v-9.5M10 21v-5h4v5"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6M2 13v3M22 13v3"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
  };
  function icon(name, size) {
    const s = size || 20;
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IC[name] || '') + '</svg>';
  }

  // ---------- Imágenes de producto ----------
  function productImg(p) {
    if (p && p.thumb) return { src: p.thumb, kind: 'thumb' };
    if (p && p.heroSm) return { src: p.heroSm, kind: 'hero' };
    return { src: null, kind: null };
  }
  function tile(p, size) {
    p = typeof p === 'string' ? D.porKey[p] : p;
    const s = size || 44, img = productImg(p);
    const box = 'width:' + s + 'px;height:' + s + 'px;border-radius:' + Math.round(s * 0.24) + 'px;';
    if (img.src) return '<span class="tile tile-' + img.kind + '" style="' + box + 'background:' + p.fondo + '"><img src="' + img.src + '" alt="" loading="lazy" decoding="async"></span>';
    return '<span class="tile" style="' + box + 'background:' + ((p && p.color) || 'var(--tb-verde)') + '"><img src="' + D.marca.isotipoBlanco + '" alt="" decoding="async"></span>';
  }

  // ---------- Estado (solo lo que crea el usuario) ----------
  const BOT0 = { activo: true, pasarAlberto: true, minimoMarcianos: true };
  function fresh() { return { v: 1, orders: [], orderPatches: {}, posts: [], postPatches: {}, broadcasts: [], settings: { bot: Object.assign({}, BOT0) } }; }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    const f = fresh();
    if (!s || typeof s !== 'object' || s.v !== 1) return f;
    for (const k in f) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k]) !== Array.isArray(f[k])) s[k] = f[k];
    s.settings.bot = Object.assign({}, BOT0, s.settings.bot);
    return s;
  }
  let state = load();
  let ver = 0; // sube con cada cambio del usuario (invalida cachés)
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento: sigue en memoria */ } }

  const handlers = {};
  function on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); }
  function emit(evt, payload) {
    (handlers[evt] || []).slice().forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
  }

  // ---------- Pedidos ----------
  const RANK = { nuevo: 0, preparando: 1, 'en camino': 2, 'listo para recojo': 2, entregado: 3 };
  const codeNum = c => parseInt(String(c || '').replace(/\D/g, ''), 10) || 0;
  // Cada día numera sus pedidos simulados desde una base; GAP deja números libres para los del usuario.
  // shortcut: más de 12 pedidos del usuario en un día pueden chocar con los códigos del día siguiente; subir GAP si pasa.
  const EPOCH = '2026-11-01', GAP = 12, bases = {};
  function baseCode(key) {
    const S = TB.sim;
    if (!S) return 1000;
    if (bases[key]) return bases[key];
    let n = 1000, k = EPOCH;
    if (key >= EPOCH) for (; k < key; k = S.addDays(k, 1)) n += S.count(k) + GAP;
    else while (k > key) { k = S.addDays(k, -1); n -= S.count(k) + GAP; }
    return (bases[key] = n);
  }
  function userCodes() { return new Set(state.orders.map(o => codeNum(o.code))); }
  function simOrders(key) {
    if (!TB.sim) return [];
    const taken = userCodes();
    let n = baseCode(key);
    return TB.sim.day(key).map(o => { while (taken.has(n)) n++; return Object.assign({}, o, { code: 'TB-' + n++ }); });
  }
  function slotLabel(o, n) {
    const s = o.slot;
    if (!s || !s.date || !s.time) return '';
    const p = s.date.split('-'), t = new Date(+p[0], p[1] - 1, +p[2], 0, toMin(s.time));
    const days = Math.round((startOfDay(t) - startOfDay(n)) / 864e5);
    const word = days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : days === -1 ? 'Ayer' : cap(fmtDate(t));
    return o.mode === 'delivery' ? word + ' en el delivery de ' + atTime(t) : word + ', para recoger desde ' + atTime(t);
  }
  function finish(o, n, today) {
    const p = state.orderPatches[o.code];
    let st = o.simulated && TB.sim ? TB.sim.status(o, n) : o.status || 'nuevo';
    if (p && p.status && RANK[p.status] > RANK[st]) st = p.status;
    // Los pedidos de prueba de días pasados ya se entregaron.
    if (!o.simulated && st !== 'entregado' && ((o.slot && o.slot.date) || dayKey(o.createdAt)) < today) st = 'entregado';
    const r = Object.assign({}, o, p, { status: st });
    // La etiqueta se rehace siempre: «Hoy…» del pedido de ayer debe decir «Ayer…».
    if (r.slot && r.slot.date && r.slot.time) r.slot = Object.assign({}, r.slot, { label: slotLabel(r, n) });
    // Recargar con el mismo ?now= retrocede el reloj: un pedido del usuario no puede quedar «en 1 min».
    if (!o.simulated && new Date(r.createdAt) > n) r.createdAt = n.toISOString();
    return r;
  }
  function ordersFor(date) {
    const n = now(), today = dayKey(n), key = dayKey(date || n);
    const sim = key > today ? [] : simOrders(key).filter(o => key < today || new Date(o.createdAt) <= n);
    const mine = state.orders.filter(o => dayKey(o.createdAt) === key);
    return sim.concat(mine).map(o => finish(o, n, today)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  function nextOrderCode() {
    const n = now(), taken = userCodes();
    let max = baseCode(dayKey(n)) - 1;
    ordersFor(n).forEach(o => { max = Math.max(max, codeNum(o.code)); });
    let c = max + 1;
    while (taken.has(c)) c++;
    return 'TB-' + c;
  }
  function addOrder(o) {
    if (!o.code) o.code = nextOrderCode();
    if (!o.createdAt) o.createdAt = now().toISOString();
    if (!o.status) o.status = 'nuevo';
    const copy = JSON.parse(JSON.stringify(o));
    delete copy.simulated;
    state.orders.push(copy);
    ver++; save();
    emit('order:new', o);
    updateBadge();
    toast('Nuevo pedido ' + o.code + ' · ' + money(o.total), { action: { label: 'Ver', fn: () => go('pedidos', { tab: 'pedidos', code: o.code }) } });
    return o;
  }
  function updateOrder(code, patch) {
    const mine = state.orders.find(o => o.code === code);
    if (mine) Object.assign(mine, patch);
    else state.orderPatches[code] = Object.assign(state.orderPatches[code] || {}, patch);
    ver++; save();
    const n = now(), found = ordersFor(n).concat(ordersFor(addDays(n, -1))).find(o => o.code === code);
    emit('order:update', found || Object.assign({ code }, patch));
    updateBadge();
  }

  function summary(list) {
    const porCategoria = {};
    let ventas = 0, bot = 0;
    // Ventas = lo cobrado (incluye el delivery, igual que el total de cada pedido).
    list.forEach(o => {
      ventas += o.total || 0;
      if (o.channel === 'Bot de WhatsApp') bot++;
      (o.items || []).forEach(it => { const c = (D.porKey[it.key] || {}).cat || 'otros'; porCategoria[c] = r2((porCategoria[c] || 0) + it.qty * it.price); });
      if (o.deliveryCost) porCategoria.delivery = r2((porCategoria.delivery || 0) + o.deliveryCost);
    });
    return { ventas: r2(ventas), pedidos: list.length, porCategoria, bot, botPct: list.length ? bot / list.length : 0 };
  }
  function history(days) {
    const n = now(), out = [];
    for (let i = days; i >= 1; i--) { const d = addDays(n, -i); out.push(Object.assign({ date: dayKey(d) }, summary(ordersFor(d)))); }
    return out;
  }

  let custCache = null;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  function customers() {
    const n = now(), ck = ver + '|' + Math.floor(n / 6e4);
    if (!custCache || custCache.k !== ck) custCache = { k: ck, v: buildCustomers(n) };
    return custCache.v.map(c => Object.assign({}, c));
  }
  function buildCustomers(n) {
    const S = TB.sim, byId = {}, byName = {}, out = [], rs = {};
    (S ? S.clientes : []).forEach(c => {
      const r = rs[c.id] = S.rng('historia' + c.id);
      const x = { id: c.id, name: c.name, phone: c.phone, zone: c.zone, fav: c.fav, optIn: c.optIn, orders: c.older, spent: r2(c.older * (14 + Math.round(r() * 10))), last: null, recent: [] };
      byId[c.id] = x; byName[norm(c.name)] = x; out.push(x);
    });
    // Últimos 30 días, del más antiguo al más reciente.
    for (let i = 29; i >= 0; i--) {
      ordersFor(addDays(n, -i)).reverse().forEach(o => {
        const name = o.customer && o.customer.name;
        let x = o._cid ? byId[o._cid] : byName[norm(name)];
        if (!x && !o.simulated && name) {
          x = { id: 'u-' + norm(name).replace(/[^a-z0-9]+/g, '-'), name, phone: o.customer.phone || '', zone: o.zone || null, fav: o.items && o.items[0] && o.items[0].key, optIn: true, orders: 0, spent: 0, last: null, recent: [], nuevo: true };
          byName[norm(name)] = x; out.push(x);
        }
        if (!x) return;
        x.orders++; x.spent = r2(x.spent + (o.total || 0)); x.last = o.createdAt;
        if (!o.simulated && o.zone) x.zone = o.zone;
        x.recent.unshift({ code: o.code, createdAt: o.createdAt, total: o.total, items: o.items, status: o.status });
        if (x.recent.length > 3) x.recent.pop();
      });
    }
    out.forEach(x => {
      if (!x.last) { const r = rs[x.id], d = addDays(n, -(31 + Math.floor(r() * 20))); d.setHours(15, Math.floor(r() * 60), 0, 0); x.last = d.toISOString(); }
      x.stamps = x.orders % 10;
    });
    return out.sort((a, b) => b.orders - a.orders || new Date(b.last) - new Date(a.last));
  }

  function stock() {
    const n = now(), out = {}, sold = {};
    if (!TB.sim) return out;
    const start = TB.sim.stockStart(dayKey(n));
    ordersFor(n).forEach(o => (o.items || []).forEach(it => { sold[it.key] = (sold[it.key] || 0) + it.qty; }));
    for (const k in start) out[k] = Math.max(0, start[k] - (sold[k] || 0));
    return out;
  }

  // ---------- Publicaciones ----------
  function allPosts() {
    const n = now(), patches = state.postPatches;
    const sim = TB.sim ? TB.sim.posts(n).map(p => Object.assign(p, patches[p.id])) : [];
    return sim.concat(state.posts.map(p => Object.assign({}, p)))
      .map(p => { if (p.status !== 'publicado') p.status = new Date(p.when) <= n ? 'publicado' : 'programado'; return p; })
      .sort((a, b) => new Date(a.when) - new Date(b.when));
  }
  function addPost(post) {
    const p = Object.assign({ id: 'u-' + Date.now().toString(36), status: 'programado', createdAt: now().toISOString(), hashtags: [] }, post);
    state.posts.push(p); ver++; save();
    emit('post:new', p);
    return p;
  }
  function updatePost(id, patch) {
    const mine = state.posts.find(p => p.id === id);
    if (mine) Object.assign(mine, patch);
    else state.postPatches[id] = Object.assign(state.postPatches[id] || {}, patch);
    ver++; save();
    emit('post:new', allPosts().find(p => p.id === id));
  }
  function removePost(id) {
    state.posts = state.posts.filter(p => p.id !== id);
    ver++; save();
    emit('post:new', null);
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* nada que borrar */ }
    state = fresh(); ver++;
    emit('state:reset');
    updateBadge();
  }

  // ---------- Capas: hojas inferiores y diálogos (Esc cierra, el foco queda dentro) ----------
  const layers = [];
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function pushLayer(layer) {
    layers.push(layer);
    document.documentElement.classList.add('tb-lock');
  }
  function popLayer(layer) {
    const i = layers.indexOf(layer);
    if (i >= 0) layers.splice(i, 1);
    if (!layers.length) document.documentElement.classList.remove('tb-lock');
    if (layer.prev && layer.prev.focus && document.contains(layer.prev)) layer.prev.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', e => {
    const top = layers[layers.length - 1];
    if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); top.dismiss(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.prototype.filter.call(top.el.querySelectorAll(FOCUSABLE), x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) { e.preventDefault(); top.el.focus(); return; }
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!top.el.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && (a === first || a === top.el)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });
  function afterAnim(el, fn) {
    let done = false;
    const go = () => { if (!done) { done = true; fn(); } };
    el.addEventListener('transitionend', go, { once: true });
    setTimeout(go, 320);
  }

  let uid = 0;
  function sheet(o) {
    const id = 'tb-sheet-' + (++uid);
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet-backdrop"></div>' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + '" tabindex="-1">' +
        '<div class="sheet-grip" aria-hidden="true"><span></span></div>' +
        '<div class="sheet-head"><h2 class="sheet-title" id="' + id + '"></h2>' +
        '<button type="button" class="sheet-x" aria-label="Cerrar">' + icon('x', 22) + '</button></div>' +
        '<div class="sheet-body"></div>' +
      '</div>';
    const el = wrap.querySelector('.sheet'), body = wrap.querySelector('.sheet-body');
    wrap.querySelector('.sheet-title').textContent = o.title || '';
    if (o.body instanceof Node) body.appendChild(o.body); else body.innerHTML = o.body || '';
    let closed = false;
    const handle = { el, close };
    const layer = { el, prev: document.activeElement, dismiss: close };
    if (o.actions && o.actions.length) {
      const bar = document.createElement('div');
      bar.className = 'sheet-actions';
      o.actions.forEach(a => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-block ' + (a.danger ? 'btn-danger' : a.primary ? 'btn-primary' : 'btn-ghost');
        b.textContent = a.label;
        b.addEventListener('click', () => { if (a.fn) a.fn(handle); });
        bar.appendChild(b);
      });
      el.appendChild(bar);
    }
    function close() {
      if (closed) return;
      closed = true;
      el.style.transform = '';
      wrap.classList.remove('open');
      afterAnim(el, () => wrap.remove());
      popLayer(layer);
      if (o.onClose) try { o.onClose(); } catch (e) { console.error(e); }
    }
    wrap.querySelector('.sheet-backdrop').addEventListener('click', close);
    wrap.querySelector('.sheet-x').addEventListener('click', close);
    // Arrastrar hacia abajo desde el asa o el título para cerrar.
    let y0 = null, dy = 0;
    [wrap.querySelector('.sheet-grip'), wrap.querySelector('.sheet-head')].forEach(h => {
      h.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        y0 = e.clientY; dy = 0; el.style.transition = 'none';
        try { h.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      });
      h.addEventListener('pointermove', e => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); el.style.transform = 'translateY(' + dy + 'px)'; });
      const up = () => { if (y0 === null) return; y0 = null; el.style.transition = ''; if (dy > 90) close(); else el.style.transform = ''; };
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
    });
    document.body.appendChild(wrap);
    pushLayer(layer);
    void el.offsetHeight; // fuerza el estilo inicial para que se vea la entrada
    wrap.classList.add('open');
    el.focus({ preventScroll: true });
    return handle;
  }

  function confirm(o) {
    return new Promise(resolve => {
      const id = 'tb-dlg-' + (++uid);
      const wrap = document.createElement('div');
      wrap.className = 'dlg-wrap';
      wrap.innerHTML = '<div class="dlg-backdrop"></div><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="' + id + '" aria-describedby="' + id + 'd" tabindex="-1">' +
        '<h2 id="' + id + '"></h2><p id="' + id + 'd"></p><div class="dlg-actions">' +
        '<button type="button" class="btn btn-ghost" data-v="0"></button><button type="button" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-v="1"></button></div></div>';
      const dlg = wrap.querySelector('.dlg');
      dlg.querySelector('h2').textContent = o.title || '¿Confirmas?';
      dlg.querySelector('p').textContent = o.text || '';
      dlg.querySelector('[data-v="0"]').textContent = o.cancel || 'Cancelar';
      dlg.querySelector('[data-v="1"]').textContent = o.ok || 'Aceptar';
      let done = false;
      const layer = { el: dlg, prev: document.activeElement, dismiss: () => finish(false) };
      function finish(v) {
        if (done) return;
        done = true;
        wrap.classList.remove('open');
        afterAnim(dlg, () => wrap.remove());
        popLayer(layer);
        resolve(v);
      }
      wrap.addEventListener('click', e => {
        const b = e.target.closest('[data-v]');
        if (b) finish(b.dataset.v === '1');
        else if (e.target.classList.contains('dlg-backdrop')) finish(false);
      });
      document.body.appendChild(wrap);
      pushLayer(layer);
      void dlg.offsetHeight;
      wrap.classList.add('open');
      dlg.querySelector(o.danger ? '[data-v="0"]' : '[data-v="1"]').focus({ preventScroll: true });
    });
  }

  let toastHost = null;
  function toast(text, opt) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    const span = document.createElement('span');
    span.className = 'toast-t';
    span.textContent = text;
    t.appendChild(span);
    let timer;
    const hide = () => { clearTimeout(timer); t.classList.remove('in'); afterAnim(t, () => t.remove()); };
    if (opt && opt.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt.action.label;
      b.addEventListener('click', () => { hide(); opt.action.fn(); });
      t.appendChild(b);
    }
    toastHost.appendChild(t);
    while (toastHost.children.length > 2) toastHost.firstChild.remove();
    void t.offsetHeight;
    t.classList.add('in');
    timer = setTimeout(hide, opt && opt.action ? 5000 : 3200);
  }

  // ---------- Navegación y marco ----------
  const TABS = [['inicio', 'Inicio', 'home'], ['pedidos', 'Pedidos', 'chat'], ['contenido', 'Contenido', 'image'], ['clientes', 'Clientes', 'users'], ['ajustes', 'Ajustes', 'settings']];
  const meta = {}, scrolls = {};
  let current = null;
  const fromHash = () => { const m = /^#\/([\w-]+)/.exec(location.hash); return m && meta[m[1]] ? m[1] : 'inicio'; };

  function go(key, params) {
    if (!meta[key]) key = 'inicio';
    if (location.hash !== '#/' + key) window.history.pushState(null, '', '#/' + key);
    activate(key, params);
  }
  function activate(key, params) {
    const same = key === current;
    if (current && !same) scrolls[current] = window.scrollY;
    TABS.forEach(([k]) => {
      const m = meta[k];
      m.sec.hidden = k !== key;
      if (k === key) m.tab.setAttribute('aria-current', 'page'); else m.tab.removeAttribute('aria-current');
    });
    document.getElementById('app-title').textContent = meta[key].title;
    if (!same) { meta[key].sec.classList.remove('view-in'); void meta[key].sec.offsetWidth; meta[key].sec.classList.add('view-in'); }
    current = key;
    const v = meta[key].view;
    if (v && v.show) try { v.show(params); } catch (e) { console.error(e); }
    window.scrollTo(0, params || same ? 0 : scrolls[key] || 0);
    emit('view:show', { key, params });
  }

  function missing(title) {
    return '<div class="empty">' + icon('refresh', 32) + '<p><b>' + title + ' se está actualizando</b></p><p class="muted">Vuelve a intentarlo en unos minutos.</p></div>';
  }

  function isOpen(n) {
    const m = n.getHours() * 60 + n.getMinutes();
    return Object.keys(D.horarios).some(k => {
      const h = D.horarios[k];
      return h.desde && h.dias.indexOf(n.getDay()) >= 0 && m >= toMin(h.desde) && m < toMin(h.hasta);
    });
  }
  function updateStatus() {
    const el = document.getElementById('app-status');
    if (!el) return;
    const open = isOpen(now());
    el.textContent = open ? 'Abierto' : 'Cerrado';
    el.classList.toggle('is-closed', !open);
  }
  function updateBadge() {
    const m = meta.pedidos;
    if (!m) return;
    const n = ordersFor(now()).filter(o => o.status === 'nuevo').length, b = m.tab.querySelector('.tab-badge');
    b.textContent = n > 9 ? '9+' : n;
    b.hidden = !n;
    m.tab.setAttribute('aria-label', 'Pedidos' + (n ? ', ' + n + (n === 1 ? ' nuevo' : ' nuevos') : ''));
  }
  // Los pedidos simulados aparecen solos a medida que avanza la hora.
  let seen = '';
  function tick() {
    updateStatus();
    updateBadge();
    const n = now(), sim = ordersFor(n).filter(o => o.simulated), k = dayKey(n) + ':' + sim.length;
    if (seen && seen !== k && seen.split(':')[0] === dayKey(n) && sim.length) emit('order:new', sim[0]);
    seen = k;
  }

  function boot() {
    const nav = document.getElementById('tabbar');
    TABS.forEach(([key, title, ic]) => {
      const sec = document.getElementById('view-' + key), tab = nav.querySelector('[data-view="' + key + '"]');
      const v = TB.views.find(x => x && x.key === key) || null;
      meta[key] = { sec, tab, view: v, title: (v && v.title) || title };
      tab.querySelector('.tab-ic').insertAdjacentHTML('afterbegin', icon(ic, 24));
      tab.addEventListener('click', () => {
        if (current === key) window.scrollTo({ top: 0, behavior: 'smooth' });
        else go(key);
      });
      if (!v || typeof v.mount !== 'function') { sec.innerHTML = missing(title); return; }
      try { v.mount(sec); } catch (e) { console.error(e); sec.innerHTML = missing(title); meta[key].view = null; }
    });
    window.addEventListener('popstate', () => activate(fromHash()));
    const first = fromHash();
    if (location.hash !== '#/' + first) window.history.replaceState(null, '', '#/' + first);
    activate(first);
    tick();
    setInterval(tick, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }

  TB.app = {
    get state() { return state; },
    set state(v) { state = v; },
    save, on, emit, go, toast, sheet, confirm,
    money, fmtTime, fmtDate, rel, now, icon, productImg, tile,
    ordersFor, addOrder, updateOrder, nextOrderCode, customers, stock, history, summary,
    allPosts, addPost, updatePost, removePost, reset, isOpen, dayKey
  };

  // Los scripts con defer corren antes de DOMContentLoaded: así todos los módulos ya se registraron.
  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
