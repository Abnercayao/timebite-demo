/* Simulación determinista de Time Bite: pedidos, clientes, stock y publicaciones.
   Cada día sale de un PRNG con semilla = fecha, así que se ve igual en cualquier celular y se
   recalcula al vuelo según la hora. Todo lo de aquí es inventado (clientes, ventas, stock);
   precios, horarios, zonas y medios de pago salen de TB.data.
   En Node: require('./data.js'); const sim = require('./sim.js'); */
(function (root) {
  'use strict';
  const TB = root.TB = root.TB || {};
  const D = TB.data;
  const P = D.porKey;

  // ---------- Fechas (siempre hora local del celular) ----------
  const pad = n => (n < 10 ? '0' : '') + n;
  function dayKey(d) { d = d instanceof Date ? d : new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k, min) { const p = k.split('-'); return new Date(+p[0], p[1] - 1, +p[2], 0, min || 0); }
  function addDays(k, n) { const d = fromKey(k); d.setDate(d.getDate() + n); return dayKey(d); }
  // ISO local sin zona: new Date(iso) lo lee como hora local y slice(0, 10) da el día correcto.
  function iso(d) { return dayKey(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const toMin = s => { const p = s.split(':'); return p[0] * 60 + +p[1]; };
  const money = n => 'S/ ' + n.toFixed(2);
  const round2 = n => Math.round(n * 100) / 100;

  // ---------- PRNG (FNV-1a + mulberry32) ----------
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    let a = hash(String(seed));
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function widx(r, w) { let t = 0, i; for (i = 0; i < w.length; i++) t += w[i]; let x = r() * t; for (i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; } return w.length - 1; }
  const wpick = (r, pairs) => pairs[widx(r, pairs.map(p => p[1]))][0];

  // ---------- Reglas reales (de TB.data) ----------
  const ABRE = toMin(D.horarios.marcianos.desde), CIERRA = toMin(D.horarios.marcianos.hasta);
  const EMP_ABRE = toMin(D.horarios.empanadas.desde);
  const SALIDA = toMin(D.delivery.salida), CORTE = toMin(D.delivery.corte);
  const MIN_MAR = D.delivery.minimoMarcianos;
  const ZONAS = {}; D.delivery.zonas.forEach(z => { ZONAS[z.key] = z; });
  const abierto = (cat, wd) => D.horarios[cat].dias.indexOf(wd) >= 0;

  // ---------- Catálogo ponderado ----------
  const MAR_W = [['mar-crocante-maracuya', 9], ['mar-cheesecake-maracuya', 8], ['mar-fresa', 7], ['mar-maracumango', 6], ['mar-aguaje', 6],
    ['mar-coco', 5], ['mar-mani', 5], ['mar-arandanos', 5], ['mar-pie-limon', 4], ['mar-oreo', 4], ['mar-ron-pasas', 3], ['mar-chicle', 3],
    ['mar-choco-menta', 3], ['mar-tres-leches', 3], ['mar-magnum', 3], ['mar-mango', 3], ['mar-lucuma', 3], ['mar-cheesecake-fresa', 3],
    ['mar-mocaccino', 2], ['mar-capuchino', 2], ['mar-sublime', 2], ['mar-crema-volteada', 2], ['mar-chocolucuma', 2]];
  const EMP_W = [['emp-mixto', 9], ['emp-pollo', 8], ['emp-hawaiana', 7], ['emp-lomo', 6]];
  const POS_W = [['kekesitos', 30], ['rolls-canela', 30], ['pie-manzana-porcion', 14], ['pie-fresa', 14], ['keke-grande', 9], ['pie-manzana-grande', 2]];
  // Pedidos por hora de 10 a. m. a 7 p. m.; entre semana el pico es de 2 a 3 p. m. (empanadas + corte del delivery).
  const H_SEMANA = [5, 7, 9, 9, 16, 12, 11, 11, 11, 9];
  const H_FINDE = [10, 12, 13, 12, 11, 10, 10, 9, 7, 6];
  const ZONA_MIN = { tarapoto: [10, 45], banda: [25, 60], morales: [30, 75] }; // minutos desde la salida hasta la entrega

  // ---------- Clientes frecuentes: [nombre, zona, favorito, frecuencia, acepta mensajes] ----------
  const CLIENTES = [
    ['Rosa Panduro', 'morales', 'mar-cheesecake-maracuya', 6, 1], ['Kelly Tuanama', 'tarapoto', 'emp-pollo', 5, 1],
    ['Jorge Pinedo', 'tarapoto', 'emp-mixto', 5, 1], ['Milagros Shapiama', 'banda', 'mar-fresa', 5, 1],
    ['Luis Tapullima', 'tarapoto', 'emp-lomo', 4, 1], ['Carmen Del Águila', 'tarapoto', 'mar-crocante-maracuya', 4, 1],
    ['Wilder Sangama', 'banda', 'emp-hawaiana', 4, 1], ['Diana Amasifuen', 'tarapoto', 'mar-maracumango', 4, 1],
    ['César Cachique', 'morales', 'mar-aguaje', 3, 1], ['Lucía Ríos', 'tarapoto', 'mar-coco', 3, 1],
    ['Erika Vásquez', 'tarapoto', 'emp-pollo', 3, 0], ['Segundo Rengifo', 'banda', 'caja-china', 3, 1],
    ['Patricia Arévalo', 'tarapoto', 'mar-pie-limon', 3, 1], ['Jhon Fasabi', 'morales', 'mar-mani', 3, 1],
    ['Yesenia Satalaya', 'tarapoto', 'mar-arandanos', 3, 1], ['Fiorella Tananta', 'banda', 'mar-cheesecake-maracuya', 3, 1],
    ['Marco Ishuiza', 'tarapoto', 'emp-mixto', 3, 0], ['Gianella Reátegui', 'tarapoto', 'rolls-canela', 2, 1],
    ['Ronald Sinarahua', 'morales', 'mar-ron-pasas', 2, 1], ['Karina Saavedra', 'tarapoto', 'mar-fresa', 2, 1],
    ['Edwin Grández', 'banda', 'emp-hawaiana', 2, 1], ['Sheyla Pezo', 'tarapoto', 'mar-oreo', 2, 1],
    ['Walter Bardales', 'tarapoto', 'emp-lomo', 2, 0], ['Roxana Torres', 'morales', 'kekesitos', 2, 1],
    ['Elmer Flores', 'tarapoto', 'mar-choco-menta', 2, 1], ['Gloria Paredes', 'banda', 'mar-tres-leches', 2, 1],
    ['Pedro García', 'tarapoto', 'emp-pollo', 2, 1], ['Nancy Ruiz', 'tarapoto', 'mar-crocante-maracuya', 2, 1],
    ['Jhonatan Navarro', 'morales', 'mar-maracumango', 1, 1], ['Lizbeth Lozano', 'tarapoto', 'mar-chicle', 1, 0],
    ['Rider Mori', 'banda', 'emp-mixto', 1, 1], ['Mayra Huamán', 'tarapoto', 'pie-fresa', 1, 1],
    ['Carlos Guerra', 'tarapoto', 'mar-magnum', 1, 1], ['Ana Chuquizuta', 'banda', 'mar-lucuma', 1, 1],
    ['Miguel Salas', 'tarapoto', 'caja-china', 1, 1], ['Karen Panduro', 'tarapoto', 'mar-sublime', 1, 0],
    ['Julio Pinedo', 'morales', 'emp-hawaiana', 1, 1], ['Rocío Tuanama', 'tarapoto', 'mar-mocaccino', 1, 1],
    ['Víctor Rengifo', 'banda', 'mar-coco', 1, 1], ['Sandra Ríos', 'tarapoto', 'mar-capuchino', 1, 1]
  ];
  // Teléfonos siempre enmascarados: nunca un número completo.
  function phone(r) { return '9' + int(r, 1, 9) + int(r, 0, 9) + ' ••• ' + String(int(r, 0, 999)).padStart(3, '0'); }
  const CL = CLIENTES.map((c, i) => {
    const r = rng('cliente' + c[0]);
    return { id: 'c' + (i + 1), name: c[0], zona: c[1], zone: ZONAS[c[1]].nombre, fav: c[2], w: c[3], optIn: !!c[4], phone: phone(r), older: int(r, 2, 9) };
  });
  const W = CL.map(c => c.w), W_CAJA = CL.map(c => (c.fav === 'caja-china' ? c.w * 8 : c.w));
  const NOMBRES = ['María', 'José', 'Juan', 'Luz', 'Teresa', 'Raúl', 'Silvia', 'Óscar', 'Jessica', 'Hugo', 'Liliana', 'Frank', 'Mónica', 'Alex', 'Vanessa', 'Iván', 'Claudia', 'Renzo', 'Paola', 'Héctor'];
  const APELLIDOS = ['Panduro', 'Pinedo', 'Tuanama', 'Shapiama', 'Tapullima', 'Del Águila', 'Sangama', 'Amasifuen', 'Cachique', 'Ríos', 'Vásquez',
    'Rengifo', 'Arévalo', 'Fasabi', 'Satalaya', 'Tananta', 'Ishuiza', 'Sinarahua', 'Reátegui', 'Grández', 'Pezo', 'Bardales', 'Saavedra'];
  const NOTAS_DEL = ['Casa de dos pisos, puerta verde.', 'Llamar al llegar, por favor.', 'Dejar en portería.', 'Referencia: frente al parque.', 'Tocar el timbre del segundo piso.'];
  const NOTAS_REC = ['Paso a recoger en 20 minutos.', 'Recoge su hermana.', 'Es para un cumpleaños.', 'Bien heladitos, por favor.'];

  // ---------- Pedidos del día ----------
  const SEED = 's231'; // cambia todos los datos simulados a la vez
  function info(key) {
    const r = rng(SEED + 'n' + key), wd = fromKey(key).getDay();
    let n;
    if (abierto('empanadas', wd)) n = int(r, 24, 33) + (wd === 5 ? int(r, 0, 3) : 0);
    else n = abierto('caja-china', wd) ? int(r, 9, 12) : int(r, 14, 19);
    return { wd, n, cajas: abierto('caja-china', wd) ? int(r, 3, 4) : 0, bot: 0.76 + r() * 0.07 };
  }
  function count(key) { const i = info(key); return i.n + i.cajas; }

  function split(r, total, parts, choose, add) {
    parts = Math.max(1, Math.min(parts, total));
    const used = {};
    for (let i = 0; i < parts; i++) {
      let k = choose(), tries = 0;
      while (used[k] && tries++ < 6) k = choose();
      used[k] = 1;
      const q = i === parts - 1 ? total : int(r, 1, total - (parts - 1 - i));
      add(k, q); total -= q;
    }
  }

  function makeOrder(r, key, inf, t, caja, conEmp) {
    const c = r() < (caja ? 0.5 : 0.3) ? CL[widx(r, caja ? W_CAJA : W)] : null;
    const favCat = c ? P[c.fav].cat : null;
    const fav = (cat, pairs) => (favCat === cat && r() < 0.65 ? c.fav : wpick(r, pairs));
    const empOk = conEmp && t >= EMP_ABRE;
    let kind = caja ? 'caja' : empOk ? wpick(r, [['emp', 46], ['mar', 36], ['mix', 12], ['pos', 6]]) : wpick(r, [['mar', 80], ['pos', 20]]);
    if (c && !caja) {
      if (favCat === 'empanadas' && empOk && r() < 0.6) kind = 'emp';
      else if (favCat === 'postres' && r() < 0.5) kind = 'pos';
      else if (favCat === 'marcianos' && r() < 0.4) kind = 'mar';
    }
    // Antes del corte hay delivery para hoy; después, las empanadas solo se recogen y los marcianos pueden ir mañana.
    const delivery = caja ? r() < 0.8 : t < CORTE ? r() < 0.55 : (kind === 'mar' || kind === 'pos') && r() < 0.25;

    const items = [];
    const add = (k, q) => {
      const it = items.find(x => x.key === k);
      if (it) it.qty += q; else items.push({ key: k, name: P[k].largo, qty: q, price: P[k].precio });
    };
    if (kind === 'caja') { add('caja-china', r() < 0.8 ? 1 : 2); if (r() < 0.4) add('gaseosa', int(r, 1, 2)); }
    if (kind === 'emp' || kind === 'mix') {
      const q = kind === 'mix' ? int(r, 2, 4) : delivery ? wpick(r, [[3, 3], [4, 4], [5, 2], [6, 3], [8, 1], [10, 1]]) : wpick(r, [[1, 3], [2, 5], [3, 4], [4, 3], [6, 1]]);
      split(r, q, q >= 4 ? int(r, 1, 3) : int(r, 1, 2), () => fav('empanadas', EMP_W), add);
      if (r() < 0.3) add('gaseosa', q >= 4 ? int(r, 1, 3) : 1); else if (r() < 0.12) add('refresco', int(r, 1, 2));
    }
    if (kind === 'mar' || kind === 'mix') {
      const q = kind === 'mix' ? int(r, 2, 5) : delivery
        ? wpick(r, [[MIN_MAR, 40], [MIN_MAR + 1, 18], [MIN_MAR + 2, 8], [MIN_MAR + 3, 16], [MIN_MAR + 5, 12], [MIN_MAR + 7, 6]])
        : wpick(r, [[1, 16], [2, 32], [3, 24], [4, 14], [5, 7], [6, 7]]);
      split(r, q, q <= 2 ? 1 : q < MIN_MAR ? int(r, 1, 2) : int(r, 2, 3), () => fav('marcianos', MAR_W), add);
      if (kind === 'mar' && r() < 0.08) add('refresco', 1);
    }
    if (kind === 'pos') {
      add(fav('postres', POS_W), r() < 0.78 ? 1 : 2);
      if (r() < 0.4) add(wpick(r, MAR_W), int(r, 1, 4));
      if (r() < 0.15) add('refresco', 1);
    }

    const zk = c ? c.zona : wpick(r, [['tarapoto', 60], ['banda', 25], ['morales', 15]]);
    const subtotal = round2(items.reduce((s, it) => s + it.qty * it.price, 0));
    const deliveryCost = delivery ? ZONAS[zk].costo : 0;
    const created = fromKey(key, t); created.setSeconds(int(r, 0, 59));
    let slotKey, slotMin, listo, fin;
    if (delivery) {
      slotKey = t < CORTE ? key : addDays(key, 1); slotMin = SALIDA;
      listo = +fromKey(slotKey, SALIDA);
      fin = listo + int(r, ZONA_MIN[zk][0], ZONA_MIN[zk][1]) * 60000;
    } else {
      slotKey = key; slotMin = t + int(r, 12, 25);
      listo = +fromKey(key, slotMin);
      fin = listo + int(r, 5, 55) * 60000;
    }
    const o = {
      customer: c ? { name: c.name, phone: c.phone } : { name: pick(r, NOMBRES) + ' ' + pick(r, APELLIDOS), phone: phone(r) },
      items, subtotal, mode: delivery ? 'delivery' : 'recojo', zone: delivery ? ZONAS[zk].nombre : null, deliveryCost,
      total: round2(subtotal + deliveryCost), slot: { date: slotKey, time: hhmm(slotMin) },
      pay: wpick(r, [['Yape', 56], ['Plin', 22], ['Tarjeta', 22]]),
      createdAt: iso(created), simulated: true,
      _cid: c ? c.id : null, _s: { nuevo: Math.min(+created + int(r, 4, 14) * 60000, listo), listo, fin }
    };
    if (r() < 0.14) o.note = pick(r, delivery ? NOTAS_DEL : NOTAS_REC);
    return o;
  }

  const memo = {};
  // Todos los pedidos simulados del día completo, del más antiguo al más reciente (sin código ni estado).
  function day(key) {
    if (memo[key]) return memo[key];
    const inf = info(key), r = rng(SEED + 'd' + key), conEmp = abierto('empanadas', inf.wd);
    const H = conEmp ? H_SEMANA : H_FINDE, slots = [];
    for (let i = 0; i < inf.n; i++) slots.push({ t: Math.min(ABRE + widx(r, H) * 60 + int(r, 0, 59), CIERRA - 12) });
    for (let i = 0; i < inf.cajas; i++) slots.push({ t: ABRE + int(r, 0, 180), caja: true });
    slots.sort((a, b) => a.t - b.t);
    const out = slots.map(s => makeOrder(r, key, inf, s.t, s.caja, conEmp));
    // El bot atiende una parte exacta del día (76–86 %), repartida al azar entre los pedidos.
    const idx = out.map((o, i) => i), nb = Math.round(out.length * inf.bot);
    for (let i = idx.length - 1; i > 0; i--) { const j = int(r, 0, i); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    idx.forEach((i, j) => { out[i].channel = j < nb ? 'Bot de WhatsApp' : r() < 0.62 ? 'WhatsApp (Alberto)' : 'Instagram'; });
    return (memo[key] = out);
  }

  // Estado según la hora: nuevo → preparando → en camino / listo para recojo → entregado.
  function status(o, now) {
    const n = +now, s = o._s;
    if (n < s.nuevo) return 'nuevo';
    if (n < s.listo) return 'preparando';
    if (n < s.fin) return o.mode === 'delivery' ? 'en camino' : 'listo para recojo';
    return 'entregado';
  }

  // Stock inicial del día: lo que se venderá con un margen (o la tanda mínima); dos productos populares quedan justos.
  const TANDA = { marcianos: [10, 22], empanadas: [12, 18], postres: [3, 8], bebidas: [12, 24], 'caja-china': [6, 10] };
  function stockStart(key) {
    const r = rng('s' + key), wd = fromKey(key).getDay(), sold = {}, out = {};
    day(key).forEach(o => o.items.forEach(it => { sold[it.key] = (sold[it.key] || 0) + it.qty; }));
    const ranked = Object.keys(sold).filter(k => P[k].cat !== 'caja-china').sort((a, b) => sold[b] - sold[a]);
    const tight = {}; tight[ranked[int(r, 0, 2)]] = 1; tight[ranked[int(r, 3, 6)]] = 1;
    D.productos.forEach(p => {
      if (!abierto(p.cat, wd)) return;
      const s = sold[p.key] || 0;
      const t = TANDA[p.cat], base = p.precio >= 25 ? int(r, 1, 3) : int(r, t[0], t[1]);
      out[p.key] = tight[p.key] ? s + int(r, 0, 1) : Math.max(base, Math.ceil(s * (1.15 + r() * 0.5)) + int(r, 2, 6));
    });
    return out;
  }

  // ---------- Publicaciones programadas (calendario semanal fijo; el producto cambia cada semana) ----------
  const PLAN = [
    { wd: 1, hora: '12:30', template: 'producto', network: 'instagram', format: 'post', de: 'emp' },
    { wd: 2, hora: '17:30', template: 'producto', network: 'whatsapp', format: 'story', de: 'mar' },
    { wd: 4, hora: '12:00', template: 'delivery', network: 'facebook', format: 'post', de: 'emp' },
    { wd: 5, hora: '18:00', template: 'lanzamiento', network: 'instagram', format: 'story', de: 'mar-crocante-maracuya' },
    { wd: 6, hora: '18:30', template: 'cajachina', network: 'facebook', format: 'post', de: 'caja-china' },
    { wd: 0, hora: '10:30', template: 'producto', network: 'instagram', format: 'story', de: 'mar' }
  ];
  const HERO = cat => D.productos.filter(p => p.cat === cat && p.hero && !p.premium).map(p => p.key);
  const zonasTxt = () => D.delivery.zonas.map(z => z.nombre + ' ' + money(z.costo)).join(' · ');
  const pagosTxt = () => { const p = D.negocio.pagos; return p.slice(0, -1).join(', ') + ' o ' + p[p.length - 1]; };
  function caption(tpl, p) {
    const tel = D.negocio.telefono, sale = 'El delivery sale a las 3:00 p. m.';
    if (tpl === 'lanzamiento') return '¡Gran lanzamiento! 🎉 Llegó el ' + p.largo.toLowerCase() + ', a ' + money(p.precio) + '. Pruébalo: ¡el sabor de la selva! 🧡\n\nPídelo por WhatsApp al ' + tel + '. ' + sale;
    if (tpl === 'cajachina') return 'Este domingo hay chanchito a la caja china 🐷🔥 ' + p.desc + ' A ' + money(p.precio) + '.\n\nSepara el tuyo por WhatsApp al ' + tel + '. ¡Delivery todos los domingos!';
    if (tpl === 'delivery') return '🛵 ¡' + sale + '! Separa tu pedido antes de esa hora.\n\n' + zonasTxt() + '. Pagas con ' + pagosTxt() + '.\n\nEscríbenos al ' + tel + '.';
    if (p.cat === 'empanadas') return 'Hoy toca ' + p.largo.toLowerCase() + ' 🥟 100% casera, a ' + money(p.precio) + '. Te esperamos de lunes a viernes desde las 2:00 p. m.\n\nSepara las tuyas por WhatsApp al ' + tel + '.';
    return p.largo + ' a ' + money(p.precio) + ' 😋 ' + p.desc + '\n\nPídelos por WhatsApp al ' + tel + '. ' + sale + ' (desde ' + MIN_MAR + ' marcianos).';
  }
  const TAGS = { marcianos: ['#TimeBite', '#MarcianosGourmet', '#Tarapoto'], empanadas: ['#TimeBite', '#EmpanadasCaseras', '#Tarapoto'],
    'caja-china': ['#TimeBite', '#CajaChina', '#Tarapoto'], delivery: ['#TimeBite', '#DeliveryTarapoto', '#Tarapoto'] };

  // Publicaciones simuladas de 7 días atrás a 7 días adelante (sin estado: el shell lo calcula con la hora).
  function posts(now) {
    const today = dayKey(now), out = [];
    for (let i = -7; i <= 7; i++) {
      const k = addDays(today, i), wd = fromKey(k).getDay();
      PLAN.forEach((pl, j) => {
        if (pl.wd !== wd) return;
        const r = rng('post' + k + j);
        const wk = Math.floor(+fromKey(k) / (7 * 864e5)), list = pl.de === 'emp' ? HERO('empanadas') : HERO('marcianos');
        const prod = pl.de === 'emp' || pl.de === 'mar' ? list[(wk * 2 + j) % list.length] : pl.de; // rota cada semana sin repetir
        const p = P[prod], when = fromKey(k, toMin(pl.hora));
        const nv = TB.content && TB.content.variants ? +TB.content.variants(pl.template) || 1 : 1;
        const created = new Date(+when - int(r, 2, 4) * 864e5); created.setHours(int(r, 9, 11), int(r, 0, 59), 0);
        out.push({
          id: 'sim-' + k + '-' + j, template: pl.template, format: pl.format, product: prod, variant: int(r, 0, nv - 1),
          network: pl.network, when: iso(when), caption: caption(pl.template, p),
          hashtags: TAGS[pl.template === 'delivery' ? 'delivery' : p.cat].slice(), createdAt: iso(created), simulated: true
        });
      });
    }
    return out;
  }

  TB.sim = { day, count, status, stockStart, posts, clientes: CL, dayKey, fromKey, addDays, iso, rng, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = TB.sim;
})(typeof window !== 'undefined' ? window : globalThis);
