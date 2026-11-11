/* Bot de pedidos de Time Bite (WhatsApp simulado). Entiende pedidos en texto libre y responde con las reglas
   reales de TB.data: horarios por categoría, delivery de las 3:00 p. m., zonas y costos, mínimo de marcianos y pagos.
   Puro (sin DOM): window.TB.bot en el navegador y module.exports en Node. conv es JSON (se guarda en localStorage). */
(function (root) {
  'use strict';
  var TB = root.TB = root.TB || {};
  if (!TB.data && typeof require === 'function') TB.data = require('./data.js');
  var D = TB.data, P = D.porKey, DL = D.delivery, BIG = D.bot.pedidoGrandeUnidades, MIN = DL.minimoMarcianos;
  var SALIDA = hm(DL.salida), CORTE = hm(DL.corte), H = D.horarios;
  var WD = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var WDS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
  var MO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  var MOS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'set.', 'oct.', 'nov.', 'dic.'];
  var PAGOS = { yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta' };
  var EMOJI = null;
  try { EMOJI = new RegExp('\\p{Extended_Pictographic}\\uFE0F?', 'gu'); } catch (e) { /* navegador antiguo: no se recortan emojis */ }

  /* ---------- Formatos ---------- */
  function hm(s) { var a = String(s).split(':'); return +a[0] * 60 + +a[1]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function t12(m) { var h = Math.floor(m / 60); return (h % 12 || 12) + ':' + pad(m % 60) + (h < 12 ? ' a. m.' : ' p. m.'); }
  function mins(d) { return d.getHours() * 60 + d.getMinutes(); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function dkey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function money(n) { return 'S/ ' + (Math.round(n * 100) / 100).toFixed(2); }
  function r2(n) { return Math.round(n * 100) / 100; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function low(s) { return /^(Magnum|Sublime|Oreo)\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; }
  function dayText(now, i) { if (!i) return 'hoy'; if (i === 1) return 'mañana'; var d = addDays(now, i); return 'el ' + WD[d.getDay()] + ' ' + d.getDate() + ' de ' + MO[d.getMonth()]; }
  function dayShort(now, i) { if (!i) return 'Hoy'; if (i === 1) return 'Mañana'; var d = addDays(now, i); return cap(WDS[d.getDay()]) + ' ' + d.getDate() + ' de ' + MOS[d.getMonth()]; }
  function firstName(n) { return String(n || '').split(' ')[0]; }

  /* ---------- Analizador de mensajes ---------- */
  function fold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function norm(s) { return ' ' + s.replace(/[^a-z0-9]+/g, ' ').trim() + ' '; }
  // Horas y montos no son cantidades: «a las 3», «3:00 p. m.», «S/ 5», «10 soles».
  function clean(s) {
    return s.replace(/s\/\.?\s*\d+(?:[.,]\d+)?/g, ' ').replace(/\d+(?:[.,]\d+)?\s*(?:soles?|lucas?)\b/g, ' ')
      .replace(/\b\d{1,2}(?:[:.]\d{2})?\s*(?:a\.?\s?m\b\.?|p\.?\s?m\b\.?|hrs?\b|horas?\b)/g, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' ')
      .replace(/\b(?:a|para|desde|hasta|tipo) las? \d{1,2}\b/g, ' ');
  }
  var KEEP = { de: 1, del: 1, con: 1, la: 1, el: 1, y: 1, a: 1 };
  function matcher(alias, key) {
    var pat = alias.split(' ').map(function (w) { return KEEP[w] || /\d/.test(w) ? w : w + '(?:s|es)?'; }).join(' ');
    return { key: key, len: alias.length, re: new RegExp(' (' + pat + ')(?= )', 'g') };
  }
  var byLen = function (a, b) { return b.len - a.len; };
  var PRODS = [], ZONES = [];
  D.productos.forEach(function (p) {
    var seen = {};
    p.alias.concat([fold(p.nombre), fold(p.largo)]).forEach(function (a) {
      a = norm(a).trim();
      if (a && !seen[a]) { seen[a] = 1; PRODS.push(matcher(a, p.key)); }
    });
  });
  DL.zonas.forEach(function (z) { z.alias.concat([fold(z.nombre)]).forEach(function (a) { ZONES.push(matcher(norm(a).trim(), z.key)); }); });
  PRODS.sort(byLen); ZONES.sort(byLen); // gana el alias más largo: «cheesecake de fresa» antes que «fresa»
  var AMBIG = [
    { re: / (maracuyas?)(?= )/g, label: 'maracuyá', options: ['mar-cheesecake-maracuya', 'mar-crocante-maracuya'] },
    { re: / (cheesecakes?|cheescakes?|chescakes?|chesecakes?)(?= )/g, label: 'cheesecake', options: ['mar-cheesecake-maracuya', 'mar-cheesecake-fresa'] }
  ];
  var CATS = [
    ['empanadas', /^empanad(?:a|as|ita|itas)$/], ['marcianos', /^(?:marcian(?:o|os|ito|itos)|helad(?:o|os|ito|itos)|chupetes?|hielitos?)$/],
    ['postres', /^(?:postres?|postrecitos?|dulces?)$/], ['bebidas', /^bebidas?$/]
  ];
  var NUMW = { un: 1, una: 1, uno: 1, otro: 1, otra: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100 };
  var FILL = { de: 1, del: 1, con: 1, la: 1, las: 1, el: 1, los: 1, sabor: 1, sabores: 1, unidad: 1, unidades: 1, mas: 1, x: 1, gourmet: 1, porfa: 1, por: 1, favor: 1, c: 1, u: 1, cu: 1 };
  var OPS = [['remove', / (?:quita\w*|saca\w*|elimina\w*|borra\w*|retira\w*|sin|menos|cancela\w*)(?= )/g],
    ['set', / (?:que sean?|mejor|cambia\w*|solo|solamente|ponle|corrige|en total)(?= )/g],
    ['add', / (?:quiero|agrega\w*|anade\w*|suma\w*|tambien|ademas|mas|dame|y|pon|ponme)(?= )/g]];
  var STOP_PLACE = {};
  'mis casa domicilio los las todo toda todos que cuanto cuanta hoy manana ahora este esta esa ese partir tiempo hora domingo lunes martes miercoles jueves viernes sabado donde cualquier otra otro otros ver mismo domicilios'.split(' ').forEach(function (w) { STOP_PLACE[w] = 1; });
  function has(re, t) { return re.test(t); }
  var R = {
    greet: / (?:hola\w*|holi\w*|buenas|buenos dias|buen dia|hey|alo|saludos)(?= )/,
    thanks: / (?:gracias|grax|graciass|gracia|thank\w*)(?= )/,
    order: / (?:quiero|quisiera|queria|quisieramos|dame|deme|deseo|me das|me da|mandame|manda|me mandas|me envias|separa\w*|reserva\w*|aparta\w*|pedir|pido|ordenar|anota\w*|ponme|agrega\w*|anade\w*|suma\w*|tambien|ademas|llevo|antoja|provoca|compro|comprar|encargo|encargar)(?= )/,
    question: / (?:cuanto|cuanta|cuantos|cuantas|cuesta|cuestan|precio|precios|vale|valen|a como|tienen|tiene|hay|venden|que es|como es|que trae|que lleva|incluye|traen|como son|cuales|que)(?= )/,
    price: / (?:cuanto|cuesta|cuestan|precio|precios|vale|valen|a como|sale|salen)(?= )/,
    menu: / (?:carta|menu|catalogo|que tienen|que venden|que hay|que ofrecen|lista|productos|opciones|que mas tienen)(?= )/,
    flavors: / (?:sabor|sabores|variedad\w*)(?= )/,
    hours: / (?:horario\w*|que hora|a que hora|abren|abierto\w*|abre|cierran|cierra|cerrado\w*|atienden|atencion|hasta que hora|desde que hora|que dias)(?= )/,
    deliv: / (?:delivery|deliveri|delibery|delivary|envio\w*|domicilio|reparto|llegan|llevan|mandan|envian|zona\w*|cobertura|llega|demora\w*)(?= )/,
    payq: / (?:pago\w*|pagar|pagan|yape\w*|plin|tarjeta\w*|visa|mastercard|efectivo|transferencia|aceptan|metodo\w*|medios? de pago|formas? de pago)(?= )/,
    where: / (?:donde|ubicacion|ubicados|ubican|direccion|local|tienda|punto de recojo|como llego)(?= )/,
    social: / (?:instagram|facebook|redes|tiktok|insta|fb)(?= )/,
    phone: / (?:telefono|numero|celular|llamar|llamo)(?= )/,
    cancel: / (?:cancela\w*|anula\w*|olvidalo|olvida|ya no quiero nada|no quiero nada|ya no quiero|mejor no|dejalo|ya no)(?= )/,
    remove: / (?:quita\w*|saca\w*|elimina\w*|borra\w*|retira\w*)(?= )/,
    set: / (?:que sean?|mejor|cambia\w*|solo|solamente|ponle|corrige)(?= )/,
    yes: /^ (?:si+|sip|claro|dale|ok\w*|confirm\w*|correcto|de acuerdo|perfecto|listo|ya|va|vale|asi es|esta bien|exacto|por supuesto|obvio|bueno|afirmativo)(?= )/,
    no: /^ (?:no|nop|nope|nel|negativo|todavia no|aun no|cambiar\w*|cambia\w*|modificar|corregir|espera\w*)(?= )/,
    complete: / (?:complet\w*|sumale|agregale|llegar a 7|a 7)(?= )/,
    recojo: / (?:recojo|recoger\w*|recojer\w*|recogo|paso a recoger|paso por|lo recojo|voy al local|en el local|en tienda|retiro|retirar|para llevar|paso yo|yo paso|pasar a recoger)(?= )/,
    delivery: / (?:delivery|deliveri|delibery|delivary|a domicilio|domicilio|a mi casa|envio|envien|enviar|traigan|traer|lleven|llevenlo|reparto)(?= )/,
    yape: / (?:yape\w*)(?= )/, plin: / (?:plin\w*)(?= )/, tarjeta: / (?:tarjeta\w*|visa|mastercard|master|credito|debito|pos)(?= )/,
    efectivo: / (?:efectivo|cash|contra entrega|contraentrega|sencillo|billete\w*)(?= )/,
    human: / (?:humano|asesor\w*|operador\w*|una persona|persona real|atencion personal\w*|con alberto|pasame con|comunicame con|hablar con alguien|hablar con el dueno|encargad\w*|el dueno)(?= )|^ alberto $/,
    complaint: / (?:queja\w*|reclamo\w*|reclamar|mal estado|malogrado\w*|pesimo\w*|horrible|asqueros\w*|llego fri\w*|llegaron fri\w*|llego tarde|no llego|no ha llegado|todavia no llega|aun no llega|me cobraron mal|cobraron de mas|incompleto|equivocad\w*|derretid\w*|se demoraron|faltaba|falto)(?= )/,
    event: / (?:evento\w*|fiesta\w*|cumpleanos|cumple|matrimonio|boda|baby shower|bautizo|quinceanero|quince anos|aniversario|empresa|corporativo|catering|bocaditos|por mayor|al por mayor|mayorista|mayoreo|reventa|revender|graduacion|kermes\w*|torta\w*|pastel\w*|personalizad\w*)(?= )/,
    resume: / (?:otro pedido|nuevo pedido|hacer un pedido|hacer otro|volver al bot|asistente|la carta|menu)(?= )/,
    first: / (?:primer\w*|1ro|1ero)(?= )/, second: / (?:segund\w*|2do)(?= )/,
    same: / (?:mismo|misma|igual)(?= )/,
    address: /\b(?:jr|jiron|av|avda|avenida|calle|psje|pasaje|prolongacion|prol|mz|manzana|urb|urbanizacion|asoc|asociacion|barrio|sector|carretera)\b\.?\s*\S.*/
  };

  function parse(text) {
    var raw = String(text == null ? '' : text), t = norm(clean(fold(raw)));
    var spans = [], toks = [];
    function free(s, e) { return spans.every(function (x) { return e <= x[0] || s >= x[1]; }); }
    function scan(re, fn) {
      re.lastIndex = 0;
      for (var m; (m = re.exec(t));) { var s = m.index + 1, e = s + m[1].length; if (free(s, e)) { spans.push([s, e]); fn(s, e); } }
    }
    PRODS.forEach(function (m) { scan(m.re, function (s, e) { toks.push({ k: 'p', key: m.key, s: s, e: e }); }); });
    AMBIG.forEach(function (a) { scan(a.re, function (s, e) { toks.push({ k: 'a', options: a.options, label: a.label, s: s, e: e }); }); });
    for (var w, WRE = /\S+/g; (w = WRE.exec(t));) {
      var s = w.index, e = s + w[0].length, x = w[0], tk = { s: s, e: e, k: 'o' };
      if (!free(s, e)) continue;
      if (/^\d{1,3}$/.test(x)) { tk.k = 'n'; tk.n = +x; }
      else if (/^x\d{1,2}$/.test(x)) { tk.k = 'n'; tk.n = +x.slice(1); tk.trail = true; }
      else if (NUMW[x]) { tk.k = 'n'; tk.n = NUMW[x]; }
      else if (x === 'media') { tk.k = 'half'; }
      else if (/^docenas?$/.test(x)) { tk.k = 'mul'; tk.f = 12; }
      else if (/^par(?:es)?$/.test(x)) { tk.k = 'mul'; tk.f = 2; }
      else if (FILL[x]) tk.k = 'f';
      else CATS.forEach(function (c) { if (c[1].test(x)) { tk.k = 'c'; tk.cat = c[0]; } });
      toks.push(tk);
    }
    toks.sort(function (a, b) { return a.s - b.s; });
    // «media docena», «dos docenas», «un par»
    var seq = [];
    toks.forEach(function (tk) {
      var prev = seq[seq.length - 1];
      if (tk.k === 'mul') {
        if (prev && prev.k === 'half') { prev.k = 'n'; prev.n = tk.f / 2; prev.e = tk.e; return; }
        if (prev && prev.k === 'n' && !prev.trail) { prev.n *= tk.f; prev.e = tk.e; return; }
        tk.k = 'n'; tk.n = tk.f;
      }
      seq.push(tk);
    });
    seq.forEach(function (tk) { if (tk.k === 'half') tk.k = 'o'; });
    // Mismo producto dos veces seguidas («crocante premium») o «maracuyá» junto a una de sus opciones: una sola mención.
    seq = seq.filter(function (tk, i) {
      if (tk.k !== 'p' && tk.k !== 'a') return true;
      for (var j = i - 1; j >= 0 && seq[j].k === 'f'; j--);
      var pr = seq[j];
      if (!pr || (pr.k !== 'p' && pr.k !== 'a')) return true;
      var same = (pr.k === 'p' && tk.k === 'p' && pr.key === tk.key) || (pr.k === 'a' && tk.k === 'p' && pr.options.indexOf(tk.key) >= 0) || (pr.k === 'p' && tk.k === 'a' && tk.options.indexOf(pr.key) >= 0);
      if (!same) return true;
      if (pr.k === 'a') { pr.k = 'p'; pr.key = tk.key; }
      pr.e = tk.e;
      return false;
    });
    var firstPN = seq.filter(function (tk) { return tk.k === 'p' || tk.k === 'n'; })[0];
    var trailing = !!firstPN && firstPN.k === 'p';
    var items = [], cats = [], ambig = null, pend = null, pendCat = null, last = null, nums = [], prevEnd = 0;
    function op(s) {
      var seg = t.slice(prevEnd, s + 1).replace(/ (?:ya )?no quiero /g, ' sin '), best = 'add', at = -1;
      OPS.forEach(function (o) { o[1].lastIndex = 0; for (var m; (m = o[1].exec(seg));) if (m.index > at) { at = m.index; best = o[0]; } });
      return best;
    }
    function flushCat() { if (pendCat) { cats.push(pendCat); pendCat = null; } }
    seq.forEach(function (tk) {
      if (tk.k === 'n') {
        nums.push(tk.n);
        if (tk.trail || (trailing && last && !last.lead && !pendCat && pend == null)) { if (last && !last.lead) { last.qty = tk.n; last.lead = true; } return; }
        flushCat(); pend = tk.n; return;
      }
      if (tk.k === 'f') return;
      if (tk.k === 'c') { flushCat(); pendCat = { cat: tk.cat, qty: pend, op: op(tk.s) }; prevEnd = tk.e; return; }
      if (tk.k === 'p') {
        last = { key: tk.key, qty: pend != null ? pend : 1, lead: pend != null, op: op(tk.s) };
        items.push(last); pend = null; pendCat = null; prevEnd = tk.e; return;
      }
      if (tk.k === 'a') { ambig = { options: tk.options, label: tk.label, qty: pend, op: op(tk.s) }; pend = null; pendCat = null; prevEnd = tk.e; last = null; return; }
      flushCat(); pend = null; last = trailing ? last : null; // otra palabra corta la relación número → producto
    });
    flushCat();
    // Un mismo producto mencionado dos veces con la misma acción se suma.
    var merged = [];
    items.forEach(function (it) {
      if (it.qty < 1) return;
      var m = merged.filter(function (y) { return y.key === it.key && y.op === it.op; })[0];
      if (m) { m.qty += it.qty; m.lead = m.lead || it.lead; } else merged.push(it);
    });
    var zone = null;
    for (var i = 0; i < ZONES.length && !zone; i++) { ZONES[i].re.lastIndex = 0; if (ZONES[i].re.test(t)) zone = ZONES[i].key; }
    var nameM = /(?:me llamo|mi nombre es|a nombre de|soy)\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+)?)/i.exec(raw);
    var addr = R.address.exec(fold(raw));
    var words = t.trim() ? t.trim().split(' ').length : 0;
    // «delivery a Cacatachi»: un lugar que no es una de nuestras zonas
    var place = / (?:delivery|deliveri|delibery|envio\w*|llegan|llevan|mandan|envian|reparto|domicilio)(?: hasta| a| en| para| por)+ ([a-z]{3,})(?= )/.exec(t);
    var outside = !zone && !!place && !STOP_PLACE[place[1]] && !zoneOrProduct(place[1]);
    return {
      outside: outside,
      raw: raw, t: t, items: merged, cats: cats, ambig: ambig, nums: nums, words: words,
      lone: !merged.length && !cats.length && !ambig && nums.length === 1 && words <= 5 ? nums[0] : null,
      zone: zone, mode: has(R.recojo, t) ? 'recojo' : has(R.delivery, t) || zone ? 'delivery' : null,
      pay: has(R.yape, t) ? 'yape' : has(R.plin, t) ? 'plin' : has(R.tarjeta, t) ? 'tarjeta' : has(R.efectivo, t) ? 'efectivo' : null,
      name: nameM && !/^(?:de|del|la|el|un|una|yo|cliente)$/i.test(nameM[1].split(/\s+/)[0]) && !zoneOrProduct(nameM[1]) ? nameM[1] : null,
      address: addr ? raw.trim().slice(0, 90) : null,
      question: /[?¿]/.test(raw) || has(R.question, t)
    };
  }
  function zoneOrProduct(s) {
    var t = norm(fold(s));
    return ZONES.concat(PRODS).some(function (m) { m.re.lastIndex = 0; return m.re.test(t); });
  }
  function flag(p, k) { R[k].lastIndex = 0; return R[k].test(p.t); }

  /* ---------- Reglas de horario ---------- */
  function catsOf(cart) { var o = []; cart.forEach(function (i) { var k = P[i.key].cat; if (o.indexOf(k) < 0) o.push(k); }); return o; }
  // Primer día (desde hoy) y minuto en que la categoría está disponible.
  function opens(cat, now) {
    var h = H[cat];
    for (var i = 0; i < 9; i++) {
      var day = addDays(now, i);
      if (h.dias.indexOf(day.getDay()) < 0) continue;
      if (i > 0) return { i: i, min: hm(h.desde) };
      if (mins(now) < hm(h.hasta)) return { i: 0, min: Math.max(mins(now), hm(h.desde)) };
    }
  }
  function pickupSlot(cart, now) {
    var cs = catsOf(cart), o = { i: 0, min: 0 };
    cs.forEach(function (k) { var x = opens(k, now); if (x.i > o.i || (x.i === o.i && x.min > o.min)) o = x; });
    o.now = o.i === 0 && o.min <= mins(now);
    if (o.now) o.min = Math.min(Math.ceil((mins(now) + 20) / 5) * 5, hm(H.marcianos.hasta)); // ~20 min para alistarlo
    return o;
  }
  function deliverySlot(cart, now) {
    var cs = catsOf(cart);
    for (var i = 0; i < 9; i++) {
      var dow = addDays(now, i).getDay();
      if (i === 0 && mins(now) >= CORTE) continue; // después del corte sale al día siguiente
      if (cs.every(function (k) { return H[k].dias.indexOf(dow) >= 0; })) return { i: i, min: SALIDA };
    }
  }
  function slotOf(c, now) {
    var d = c.mode === 'delivery' ? deliverySlot(c.cart, now) : pickupSlot(c.cart, now);
    var label = c.mode === 'delivery' ? dayShort(now, d.i) + ' en el delivery de las ' + t12(d.min) : dayShort(now, d.i) + ' para recoger desde las ' + t12(d.min);
    return { date: dkey(addDays(now, d.i)), time: hhmm(d.min), label: label };
  }
  // Aviso cuando algo del carrito no se atiende ahora (se separa para más tarde o como preventa).
  function whenNote(cart, now) {
    var pk = pickupSlot(cart, now), cs = catsOf(cart), t = mins(now), emp = cs.indexOf('empanadas') >= 0;
    if (pk.i === 0) {
      if (emp && t < hm(H.empanadas.desde)) return 'Las empanadas salen desde las ' + t12(hm(H.empanadas.desde)) + ': te las dejo separadas para hoy.';
      if (t < hm(H.marcianos.desde)) return 'Abrimos a las ' + t12(hm(H.marcianos.desde)) + ': te lo dejo separado para hoy.';
      return '';
    }
    if (emp && (pk.i > 1 || H.empanadas.dias.indexOf(now.getDay()) < 0)) return 'Las empanadas las preparamos de lunes a viernes: te las separo para ' + dayText(now, pk.i) + '.';
    return 'Por hoy ya cerramos: te lo dejo separado para ' + dayText(now, pk.i) + '.';
  }
  function openNow(now) { var t = mins(now); return t >= hm(H.marcianos.desde) && t < hm(H.marcianos.hasta); }

  /* ---------- Textos del negocio ---------- */
  function byCat(cat) { return D.productos.filter(function (p) { return p.cat === cat; }); }
  function priceTxt(p) { return money(p.precio) + (p.antes ? ' (antes ' + money(p.antes) + ')' : ''); }
  function flavorsText() {
    var mar = byCat('marcianos'), g = {};
    mar.forEach(function (p) { (g[p.precio] = g[p.precio] || []).push(low(p.nombre) + (p.premium ? ' premium' : '')); });
    return 'Tenemos ' + mar.length + ' sabores de marcianos gourmet 😋\n' + Object.keys(g).map(Number).sort(function (a, b) { return a - b; })
      .map(function (pr) { return '*' + money(pr) + ':* ' + list(g[pr]) + '.'; }).join('\n');
  }
  function flavorBubbles() {
    return [flavorsText(), { text: '¿Ya probaste nuestro lanzamiento, el *crocante de maracuyá premium*? ✨ ¿Cuáles te separo?', product: 'mar-crocante-maracuya' }];
  }
  function empText() {
    var e = byCat('empanadas');
    return 'Nuestras *empanadas caseras* salen a ' + money(e[0].precio) + ' c/u: ' + list(e.map(function (p) { return low(p.nombre); })) + '. Las preparamos de ' + low(H.empanadas.texto) + '.';
  }
  function catText(cat) {
    if (cat === 'empanadas') return empText();
    if (cat === 'marcianos') return flavorsText();
    var c = D.categorias.filter(function (x) { return x.key === cat; })[0];
    return '*' + c.nombre + '*\n' + byCat(cat).map(function (p) { return '• ' + p.nombre + ': ' + priceTxt(p); }).join('\n');
  }
  function menuText() {
    var mar = byCat('marcianos'), base = mar.filter(function (p) { return p.precio === 3; }).length, extra = mar.filter(function (p) { return p.precio !== 3; });
    var row = function (cat) { return byCat(cat).map(function (p) { return p.nombre + ' ' + priceTxt(p); }).join(' · '); };
    var cc = P['caja-china'];
    return 'Esta es nuestra carta 📋\n' +
      '*Empanadas caseras* · ' + money(5) + ' c/u\n' + cap(list(byCat('empanadas').map(function (p) { return low(p.nombre); }))) + ' (' + low(H.empanadas.texto) + ')\n' +
      '*Marcianos gourmet* · ' + money(3) + '\n' + mar.length + ' sabores (' + base + ' a ' + money(3) + '); ' + list(extra.map(function (p) { return low(p.nombre) + (p.premium ? ' premium' : '') + ' ' + money(p.precio); })) + '\n' +
      '*Postres*\n' + row('postres') + '\n*Bebidas*\n' + row('bebidas') + '\n' +
      '*' + cc.nombre + '* · ' + money(cc.precio) + ' (' + low(H['caja-china'].texto) + ')';
  }
  function hoursText(now) {
    var t = mins(now), open = hm(H.marcianos.desde), close = hm(H.marcianos.hasta), st;
    if (t < open) st = 'Hoy abrimos a las ' + t12(open) + '.';
    else if (t >= close) st = 'Por hoy ya cerramos; mañana te atendemos desde las ' + t12(open) + '.';
    else st = 'Ahora estamos atendiendo.';
    return 'Nuestro horario:\n• Marcianos, postres y bebidas: ' + low(H.marcianos.texto) + '.\n• Empanadas: ' + low(H.empanadas.texto) + '.\n• Chanchito a la caja china: ' + low(H['caja-china'].texto) + '.\n' +
      'El delivery sale todos los días a las ' + t12(SALIDA) + '. ' + st;
  }
  function zonesText() { return DL.zonas.map(function (z) { return '• ' + z.nombre + ': ' + money(z.costo); }).join('\n'); }
  function zonesNames() { return list(DL.zonas.map(function (z) { return z.nombre; })); }
  function delivText(p, now, s) {
    var z = p.zone && zoneBy(p.zone), txt;
    if (z) txt = 'Sí, llegamos a ' + z.nombre + ': el delivery cuesta ' + money(z.costo) + ' y sale todos los días a las ' + t12(SALIDA) + ' 🛵';
    else if (p.outside) txt = 'Por ahora el delivery no llega hasta allá. Llegamos a:\n' + zonesText() + '\nSi quieres, puedes pasar a recoger o te paso con Alberto para ver si se puede 🙌';
    else txt = 'Hacemos delivery a:\n' + zonesText() + '\nSale todos los días a las ' + t12(SALIDA) + ' 🛵 Si estás en otra zona, puedes pasar a recoger o te paso con Alberto para ver si llegamos.';
    if (mins(now) >= CORTE) txt += '\nEl de hoy ya salió: lo que pidas ahora va en el de mañana, o puedes pasar a recoger.';
    if (s.recordarMinimo) txt += '\nSi tu pedido es solo de marcianos, el delivery sale desde ' + MIN + ' unidades.';
    return txt;
  }
  function payText() { return 'Puedes pagar con *Yape*, *Plin* o *tarjeta* (' + D.negocio.pagos.slice(2).join(' o ') + ') 💳'; }
  function recojoText() { return D.negocio.recojo.replace(/\.$/, '') + ' 📍'; }
  function zoneBy(k) { return DL.zonas.filter(function (z) { return z.key === k; })[0]; }
  function greetText(now) {
    var h = now.getHours(), dow = now.getDay(), t = mins(now), weekday = H.empanadas.dias.indexOf(dow) >= 0;
    var hi = h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!', av;
    if (t < hm(H.marcianos.desde)) av = 'Abrimos hoy a las ' + t12(hm(H.marcianos.desde)) + ', pero ya puedes dejar tu pedido para el delivery de las ' + t12(SALIDA) + '.';
    else if (t >= hm(H.marcianos.hasta)) av = 'Por hoy ya cerramos (atendemos hasta las ' + t12(hm(H.marcianos.hasta)) + '), pero puedes dejar tu pedido y te lo separo para mañana.';
    else if (!weekday) av = 'Hoy tenemos marcianos gourmet, postres y bebidas; las empanadas las preparamos de lunes a viernes.' + (dow === 0 ? ' ¡Y hoy hay chanchito a la caja china!' : ' Mañana domingo hay chanchito a la caja china.');
    else if (t < hm(H.empanadas.desde)) av = 'Ahora tenemos marcianos gourmet, postres y bebidas. Las empanadas salen desde las ' + t12(hm(H.empanadas.desde)) + ' y ya puedes separarlas para el delivery de las ' + t12(SALIDA) + '.';
    else if (t < CORTE) av = 'Ya tenemos empanadas calientitas, marcianos gourmet, postres y bebidas. El delivery sale a las ' + t12(SALIDA) + '.';
    else av = 'Tenemos empanadas, marcianos gourmet, postres y bebidas. El delivery de hoy ya salió, pero puedes pasar a recoger hasta las ' + t12(hm(H.marcianos.hasta)) + ' o separar para mañana.';
    return [hi + ' 👋 Gracias por escribir a *' + D.negocio.nombre + '* 💚', av + ' ¿Qué se te antoja?'];
  }
  function sundayText(now) {
    var dow = now.getDay();
    if (dow === 0 && mins(now) < hm(H.marcianos.hasta)) return 'hoy domingo';
    var d = addDays(now, 7 - dow);
    return 'el domingo ' + d.getDate() + ' de ' + MO[d.getMonth()];
  }

  /* ---------- Carrito ---------- */
  function find(cart, key) { return cart.filter(function (i) { return i.key === key; })[0]; }
  function units(cart, cat) { return cart.reduce(function (s, i) { return s + (!cat || P[i.key].cat === cat ? i.qty : 0); }, 0); }
  function subtotal(cart) { return r2(cart.reduce(function (s, i) { return s + i.qty * P[i.key].precio; }, 0)); }
  function addItem(c, key, qty) { var it = find(c.cart, key); if (it) it.qty += qty; else c.cart.push({ key: key, qty: qty }); c.last = key; }
  function setQty(c, key, qty) { var it = find(c.cart, key); if (!it) return addItem(c, key, qty); it.qty = qty; c.last = key; }
  function removeItem(c, it) {
    var cur = find(c.cart, it.key);
    if (!cur) return false;
    if (it.lead && it.qty < cur.qty) cur.qty -= it.qty; else c.cart.splice(c.cart.indexOf(cur), 1);
    return true;
  }
  function cartText(c) {
    return c.cart.map(function (i) { return '• ' + i.qty + ' × ' + P[i.key].largo + ' · ' + money(i.qty * P[i.key].precio); }).join('\n') + '\nSubtotal: *' + money(subtotal(c.cart)) + '*';
  }
  function onlyMarcianos(c) {
    var pd = c.pending, cs = catsOf(c.cart);
    if (pd && pd.cat && pd.cat !== 'marcianos') return false;
    if (cs.some(function (k) { return k !== 'marcianos'; })) return false;
    return cs.length > 0 || !!(pd && pd.cat === 'marcianos');
  }
  function marUnits(c) { var pd = c.pending; return units(c.cart, 'marcianos') + (pd && pd.cat === 'marcianos' && pd.qty ? pd.qty : 0); }
  function needsMin(c) { return c.mode === 'delivery' && c.cfg.recordarMinimo && onlyMarcianos(c) && marUnits(c) < MIN; }
  function lastMar(c) { var m = c.cart.filter(function (i) { return P[i.key].cat === 'marcianos'; }); return m.length ? (find(m, c.last) || m[m.length - 1]).key : null; }

  function buildOrder(c, now) {
    var z = c.mode === 'delivery' ? zoneBy(c.zone) : null, sub = subtotal(c.cart), cost = z ? z.costo : 0;
    var o = {
      customer: { name: c.name }, items: c.cart.map(function (i) { var p = P[i.key]; return { key: i.key, name: p.largo, qty: i.qty, price: p.precio }; }),
      subtotal: sub, mode: c.mode, zone: z ? z.nombre : null, deliveryCost: cost, total: r2(sub + cost), slot: slotOf(c, now),
      pay: PAGOS[c.pay], channel: 'Bot de WhatsApp', status: 'nuevo', createdAt: now.toISOString()
    };
    if (c.address && z) o.note = 'Dirección: ' + c.address;
    return o;
  }

  /* ---------- Conversación ---------- */
  function createConversation(opts) {
    var b = opts && opts.settings && opts.settings.bot;
    return {
      v: 1, step: 'inicio', cart: [], mode: null, zone: null, name: null, pay: null, address: null, pending: null, last: null, lastQty: null,
      handoff: null, hcount: 0, greeted: false, misses: 0, turns: 0, lastOrder: null, offSent: false, lastText: '',
      opts: b ? Object.assign({}, b) : null
    };
  }
  // Ajustes vivos del panel si existen (el chat no los pasa al crear la conversación); si no, los de opts.
  function settings(c) {
    var app = TB.app, live = app && app.state && app.state.settings && app.state.settings.bot;
    var b = live || (c && c.opts) || {};
    // Ajustes del panel: minimoMarcianos y pasarAlberto (recordarMinimo es el nombre antiguo, lo usan las pruebas).
    return { activo: b.activo !== false, recordarMinimo: b.recordarMinimo !== false && b.minimoMarcianos !== false, pasarAlberto: b.pasarAlberto !== false };
  }
  function resetOrder(c) { c.cart = []; c.mode = null; c.zone = null; c.pay = null; c.address = null; c.pending = null; c.step = 'inicio'; }

  function askMode(c, now) {
    var d = deliverySlot(c.cart, now), r = pickupSlot(c.cart, now);
    var far = d.i === r.i && d.i > 1; // el aviso del carrito ya dice el día
    var dt = 'sale ' + (far ? '' : dayText(now, d.i) + ' ') + 'a las ' + t12(d.min);
    var rt = r.now ? 'hoy, hasta las ' + t12(hm(H.marcianos.hasta)) : (far ? '' : dayText(now, r.i) + ' ') + 'desde las ' + t12(r.min);
    return '¿Lo quieres con *delivery* (' + dt + ') o pasas a *recoger* (' + rt + ')?';
  }
  function askZone() { return '¿A qué zona te lo llevamos?\n' + zonesText(); }
  function askName() { return '¿A nombre de quién dejo el pedido?'; }
  function askPay() { return '¿Cómo prefieres pagar: *Yape*, *Plin* o *tarjeta* (Visa o Mastercard)?'; }
  function askConfirm() { return '¿Lo confirmo? Responde *sí* o dime qué cambiar.'; }
  function optName(k) { return low(P[k].nombre) + (P[k].premium ? ' premium' : ''); }
  function pendingQuestion(c) {
    var pd = c.pending;
    if (pd.type === 'ambig') return 'De ' + pd.label + ' tenemos ' + list(pd.options.map(function (k) { return '*' + optName(k) + '* (' + money(P[k].precio) + ')'; })) + '. ¿Cuál te separo?';
    if (pd.type === 'sabor') {
      var n = pd.qty ? ' tus ' + pd.qty + ' ' + (pd.cat === 'empanadas' ? 'empanadas' : pd.cat === 'marcianos' ? 'marcianos' : '') : '';
      if (pd.cat === 'empanadas') return '¿De qué sabor quieres' + (n || ' tus empanadas') + '? Tenemos ' + list(byCat('empanadas').map(function (p) { return '*' + low(p.nombre) + '*'; })) + ' (' + money(5) + ' c/u).';
      var q = pd.qty > 1 ? pd.qty : 7; // el ejemplo suma lo que pidió
      if (pd.cat === 'marcianos') return '¿De qué sabores quieres' + (n || ' tus marcianos') + '? Puedes combinarlos, por ejemplo: _' + Math.ceil(q / 2) + ' de aguaje y ' + Math.floor(q / 2) + ' de coco_. Si quieres, te paso la lista de sabores.';
      return '¿Cuál te provoca?\n' + catText(pd.cat).split('\n').slice(1).join('\n');
    }
    if (pd.type === 'min7') {
      var have = marUnits(c), lm = lastMar(c);
      return 'El delivery de solo marcianos sale desde *' + MIN + ' unidades* y llevas ' + have + '. ' +
        (lm ? '¿Te completo con ' + (MIN - have) + ' más de ' + optName(lm) + ' o prefieres pasar a recoger? También puedes elegir otros sabores.' : '¿Completamos a ' + MIN + ' o prefieres pasar a recoger tus ' + have + '?');
    }
    if (pd.type === 'caja') return '¿Te separo uno para ' + pd.when + '? Si me dices que sí, te paso con Alberto para coordinarlo.';
    if (pd.type === 'fuera') return 'Por ahora el delivery llega a ' + zonesNames() + '. Si estás en otra zona, puedes pasar a recoger o te paso con Alberto para ver si llegamos. ¿Qué prefieres?';
    return '';
  }

  function reply(conv, text, now) {
    var c = conv || createConversation(), d = createConversation();
    for (var k in d) if (!(k in c)) c[k] = d[k];
    if (!Array.isArray(c.cart)) c.cart = [];
    now = now ? new Date(now) : new Date();
    var p = parse(text), s = settings(c);
    c.cfg = s; // solo durante este turno (se borra al final)
    c.turns++;
    c.lastText = p.t;
    var x = { c: c, p: p, now: now, s: s, info: [], ack: [], added: [], out: [], order: null, handoff: null, changed: false, ok: false };
    try {
      if (!s.activo) {
        say(x, c.offSent ? 'Ya le avisamos a Alberto: en un momento te responde 🙌' : '¡Hola! Gracias por escribir a *' + D.negocio.nombre + '* 💚 En este momento te atiende Alberto personalmente: en un ratito te responde.');
        c.offSent = true;
      } else if (c.handoff) afterHandoff(x);
      else turn(x);
    } finally { delete c.cfg; }
    return finish(x);
  }

  function say(x, text, extra, from) {
    var m = { from: from || 'bot', text: text };
    for (var k in extra) if (extra[k] != null) m[k] = extra[k];
    x.out.push(m);
  }
  function finish(x) {
    var seen = 0;
    var msgs = x.out.slice(0, 3);
    if (x.out.length > 3) msgs[2] = { from: msgs[2].from, text: x.out.slice(2).map(function (m) { return m.text; }).join('\n\n') };
    msgs.forEach(function (m) {
      if (EMOJI) m.text = m.text.replace(EMOJI, function (e) { return ++seen > 2 ? '' : e; }); // como máximo 2 emojis por turno
      m.text = m.text.replace(/m\.\./g, 'm.').replace(/ +([.,!?\n])/g, '$1').replace(/ {2,}/g, ' ').trim();
      m.delay = Math.round(Math.min(1800, Math.max(m.from === 'alberto' ? 1200 : 500, 350 + m.text.length * 9)));
    });
    return { messages: msgs, order: x.order, handoff: x.handoff };
  }

  function handoff(x, reason, notice, alberto) {
    var c = x.c;
    c.handoff = { reason: reason }; c.hcount = 0; c.pending = null;
    x.handoff = { reason: reason };
    if (notice) say(x, notice);
    say(x, alberto, null, 'alberto');
    x.ok = true;
  }
  function cajaHandoff(x, extraNotice) {
    var when = sundayText(x.now);
    if (!x.cajaShown) say(x, cajaInfo(), { product: 'caja-china' });
    handoff(x, 'Caja china', (extraNotice ? extraNotice + ' ' : '') + 'Para separarlo te paso con Alberto, que coordina los pedidos de caja china 🙌',
      '¡Hola, soy Alberto! 👋 Con gusto te separo tu chanchito para ' + when + '. ¿Para cuántas personas sería y a qué zona te lo llevamos?');
  }
  function cajaInfo() {
    var cc = P['caja-china'];
    return 'Sale a *' + money(cc.precio) + '* y lo llevamos con delivery solo los domingos.'; // la tarjeta ya muestra qué incluye
  }

  function afterHandoff(x) {
    var c = x.c, p = x.p;
    if (flag(p, 'resume')) {
      c.handoff = null; resetOrder(c);
      say(x, '¡Claro! Te dejo con nuestro asistente para que lo armes al toque 🙌', null, 'alberto');
      say(x, '¿Qué se te antoja? Escríbeme, por ejemplo: _3 empanadas de pollo y 2 de lomo_.');
      return;
    }
    c.hcount++;
    var r = c.handoff.reason;
    var txt = flag(p, 'thanks') ? '¡De nada! 💚 Cualquier cosa, me escribes por aquí.'
      : r === 'Reclamo' ? 'Gracias por contarme. Ya lo estoy revisando y te escribo en unos minutos 🙏'
      : ['Anotado 🙌 Dame unos minutos y te confirmo por aquí.', 'Perfecto, ya lo estoy viendo. En un ratito te escribo.', 'Listo 👌 Te confirmo en breve.'][(c.hcount - 1) % 3];
    say(x, txt, null, 'alberto');
  }

  function turn(x) {
    var c = x.c, p = x.p, now = x.now;
    var first = !c.greeted, greet = flag(p, 'greet');
    c.greeted = true;
    x.hello = first;
    if (!p.t.trim()) return fallback(x);

    // Lo que siempre atiende Alberto.
    if (flag(p, 'complaint')) return handoff(x, 'Reclamo', 'Lamento mucho lo que pasó 🙏 Le paso tu mensaje a Alberto para que lo solucione personalmente.', 'Hola, soy Alberto. Lamento el inconveniente. Cuéntame qué pasó y lo solucionamos.');
    if (flag(p, 'event')) return handoff(x, 'Evento o pedido especial', '¡Qué bien! Para eventos y pedidos especiales, Alberto te prepara una propuesta a tu medida. Ya le aviso 🙌', '¡Hola, soy Alberto! 👋 Cuéntame: ¿para qué fecha y para cuántas personas sería?');
    var fuera = c.pending && c.pending.type === 'fuera';
    if (flag(p, 'human') && !fuera && !(c.step === 'nombre' && /^ alberto /.test(p.t))) return handoff(x, 'Pidió hablar con una persona', '¡Claro! Le aviso a Alberto para que te atienda personalmente 🙌', '¡Hola, soy Alberto! 👋 ¿En qué te puedo ayudar?');

    if (c.pending) pending(x);
    if (x.handoff) return;
    if (!x.done && flag(p, 'cancel') && !p.items.length && !p.cats.length && !p.ambig) return cancel(x);
    products(x);
    if (x.handoff) return;
    slots(x);
    if (c.step === 'confirmar' && !x.changed && c.cart.length && !c.pending) {
      if (flag(p, 'yes') && c.mode && c.name && c.pay) return place(x);
      if (flag(p, 'no')) { x.ok = true; x.noFlow = true; say(x, 'Claro, ¿qué quieres cambiar? Puedes agregar o quitar productos, o cambiar la entrega, la zona o el pago.'); }
    }
    infos(x, first && greet ? true : greet ? false : null);
    flow(x);
    if (!x.ok) return fallback(x);
    c.misses = 0;
    if (x.hello && x.out.length && x.out[0].from === 'bot' && !/^¡/.test(x.out[0].text)) x.out[0].text = '¡Hola! ' + x.out[0].text;
  }

  function pending(x) {
    var c = x.c, p = x.p, pd = c.pending;
    if (pd.type === 'ambig') {
      var hit = p.items.filter(function (i) { return pd.options.indexOf(i.key) >= 0; })[0], key = hit && hit.key;
      if (!key) pd.options.forEach(function (k) {
        var other = pd.options.filter(function (o) { return o !== k; })[0];
        var own = P[k].alias.join(' ').split(' ').filter(function (w) { return w.length > 3 && P[other].alias.join(' ').split(' ').indexOf(w) < 0; });
        if (own.some(function (w) { return p.t.indexOf(' ' + w) >= 0; })) key = key || k;
      });
      if (!key && flag(p, 'first')) key = pd.options[0];
      if (!key && flag(p, 'second')) key = pd.options[1];
      if (key) {
        if (hit) p.items.splice(p.items.indexOf(hit), 1);
        addItem(c, key, hit && hit.lead ? hit.qty : pd.qty || p.lone || 1);
        x.added.push(key); c.pending = pd.next || null; x.changed = x.ok = true; x.wants = true;
      }
      return;
    }
    if (pd.type === 'sabor') {
      var mine = p.items.filter(function (i) { return P[i.key].cat === pd.cat && i.op === 'add'; });
      if (mine.length) {
        var loose = mine.filter(function (i) { return !i.lead; });
        if (pd.qty && loose.length) {
          var given = mine.reduce(function (s, i) { return s + (i.lead ? i.qty : 0); }, 0), left = Math.max(pd.qty - given, loose.length);
          loose.forEach(function (i, j) { i.qty = Math.floor(left / loose.length) + (j < left % loose.length ? 1 : 0); i.lead = true; });
        }
        c.pending = pd.next || null; x.wants = true;
      } else if (pd.cat === 'marcianos' && flag(p, 'flavors')) { x.ok = true; x.info.push(flavorsText()); }
      else if (p.lone != null) { pd.qty = p.lone; x.ok = true; }
      return;
    }
    if (pd.type === 'min7') {
      if (p.mode === 'recojo' || flag(p, 'no')) {
        c.mode = 'recojo'; c.zone = null; c.pending = pd.cat ? { type: 'sabor', cat: pd.cat, qty: pd.qty } : null;
        x.ack.push('Perfecto: para recoger no hay mínimo 😊'); x.changed = x.ok = true; x.done = true;
      } else if (p.items.length) {
        // «3 de aguaje» elige el sabor de los marcianos sin sabor: lo resuelve el paso de sabor, no se suma aparte.
        c.pending = pd.cat ? { type: 'sabor', cat: pd.cat, qty: pd.qty } : null; x.wants = true;
        if (c.pending) return pending(x);
      }
      else if (flag(p, 'yes') || flag(p, 'complete') || p.lone) {
        var n = marUnits(c), goal = Math.max(MIN, p.lone || MIN), lm = lastMar(c);
        if (pd.cat) { c.pending = { type: 'sabor', cat: pd.cat, qty: goal - units(c.cart, 'marcianos') }; x.ack.push('¡Genial!'); }
        else if (lm) {
          addItem(c, lm, goal - n); c.pending = null; x.changed = true;
          x.ack.push('¡Listo! Te sumo ' + (goal - n) + ' de ' + optName(lm) + ' y llegas a ' + goal + ' 🙌');
        }
        x.ok = true; x.done = true;
      }
      return;
    }
    if (pd.type === 'caja') {
      if (flag(p, 'yes') || flag(p, 'order')) { c.pending = null; x.cajaShown = true; return cajaHandoff(x); }
      if (flag(p, 'no')) { c.pending = null; x.ok = true; x.done = true; say(x, 'Sin problema 😊 ¿Te ayudo con algo más?'); }
      else c.pending = null;
      return;
    }
    if (pd.type === 'fuera') {
      c.pending = null;
      if (p.mode === 'recojo' || p.zone) return;
      if (flag(p, 'yes') || / alberto /.test(p.t)) return handoff(x, 'Delivery fuera de zona', 'Le paso tu pedido a Alberto para ver si podemos llegar a tu zona 🙌', '¡Hola, soy Alberto! 👋 ¿Me dices tu dirección o tu ubicación para ver si llegamos?');
    }
  }

  function cancel(x) {
    var c = x.c;
    x.ok = true;
    if (c.cart.length || c.pending) { resetOrder(c); return say(x, 'Listo, cancelé tu pedido 👌 Si se te antoja algo más tarde, aquí estoy.'); }
    if (c.lastOrder) return handoff(x, 'Cancelar un pedido confirmado', 'Tu pedido ya está registrado, así que le aviso a Alberto para anularlo 🙏', 'Hola, soy Alberto. 👋 Ya vi tu mensaje: reviso tu pedido y te confirmo por aquí.');
    say(x, 'No tienes ningún pedido en curso 😊 ¿Te ayudo con algo?');
  }

  function products(x) {
    var c = x.c, p = x.p, now = x.now;
    var caja = p.items.filter(function (i) { return i.key === 'caja-china'; })[0];
    var its = p.items.filter(function (i) { return i.key !== 'caja-china'; });
    var edits = its.some(function (i) { return i.op !== 'add'; }) || p.cats.some(function (k) { return k.op === 'remove'; });
    var wants = x.wants || flag(p, 'order') || edits || its.some(function (i) { return i.lead; }) || p.cats.some(function (k) { return k.qty; }) ||
      !!(p.ambig && p.ambig.qty) || (c.cart.length > 0 && !p.question && (its.length > 0 || !!p.ambig));
    if (wants && flag(p, 'price') && !flag(p, 'order') && !edits) wants = false;
    // Respuesta a «¿Cuántos te separo?»: «3», «dame 3» o «sí» (uno).
    var lastQ = c.last && !c.pending && !find(c.cart, c.last) && P[c.last].cat !== 'caja-china' && !its.length && !p.cats.length && !p.ambig;
    if (lastQ && (p.lone != null || (flag(p, 'yes') && !c.cart.length && c.step !== 'confirmar'))) {
      if (p.lone == null) p.lone = c.lastQty || 1;
      wants = true;
    }
    x.wants = wants;

    // Preguntas: precio, descripción o disponibilidad, con la tarjeta del producto.
    if (!wants) {
      its.slice(0, 2).forEach(function (i) {
        // La tarjeta muestra nombre, precio y descripción: el texto solo la complementa.
        var pr = P[i.key], o = opens(pr.cat, now), unit = pr.cat === 'empanadas' || pr.cat === 'marcianos' ? ' c/u' : '';
        var txt = (its.length > 1 ? pr.nombre + ': ' : 'Sale a ') + '*' + money(pr.precio) + '*' + unit + (pr.antes ? ' (antes ' + money(pr.antes) + ')' : '') +
          (i.lead && i.qty > 1 ? '; ' + i.qty + ' te salen ' + money(i.qty * pr.precio) : '') + '.';
        if (pr.cat === 'empanadas' && (o.i > 0 || o.min > mins(now))) txt += ' Las preparamos de ' + low(H.empanadas.texto) + '.';
        x.info.push({ text: txt, product: i.key }); c.last = i.key; c.lastQty = i.lead ? i.qty : null;
      });
      var fem = its.length > 0 && P[its[0].key].cat === 'empanadas';
      if (its.length) x.info[x.info.length - 1].text += c.lastQty ? (fem ? ' ¿Te las separo?' : ' ¿Te los separo?') : (fem ? ' ¿Cuántas te separo?' : ' ¿Cuántos te separo?');
      if (p.ambig) { c.pending = { type: 'ambig', options: p.ambig.options, label: p.ambig.label, qty: null }; x.ok = true; }
      if (!its.length && !p.ambig) p.cats.forEach(function (k) {
        if (x.catDone) return;
        var t = catText(k.cat), o = k.cat === 'empanadas' && opens('empanadas', now);
        if (o && o.i > 0) t += ' Hoy no hay, pero te las separo para ' + dayText(now, o.i) + '. ¿Cuántas quieres?';
        x.info = x.info.concat(k.cat === 'marcianos' ? flavorBubbles() : [t]); x.catDone = true;
      });
      if (caja) { x.info.push({ text: cajaInfo(), product: 'caja-china' }); c.pending = { type: 'caja', when: sundayText(now) }; }
      if (its.length || caja || x.catDone) x.ok = true;
      return;
    }

    var before = JSON.stringify(c.cart);
    its.forEach(function (i) {
      if (i.op === 'remove') { if (!removeItem(c, i)) x.info.push('No tenías ' + P[i.key].largo.toLowerCase() + ' en tu pedido.'); }
      else if (i.op === 'set' && i.lead) setQty(c, i.key, i.qty);
      else if (i.op === 'set' && !find(c.cart, i.key)) {
        // «mejor de lomo»: cambia el sabor si había uno solo de esa categoría
        var same = c.cart.filter(function (y) { return P[y.key].cat === P[i.key].cat; });
        if (same.length === 1) { c.cart.splice(c.cart.indexOf(same[0]), 1, { key: i.key, qty: same[0].qty }); c.last = i.key; } else addItem(c, i.key, 1);
        x.added.push(i.key);
      } else if (i.op !== 'set') { addItem(c, i.key, i.qty); x.added.push(i.key); }
    });
    p.cats.forEach(function (k) {
      if (k.op === 'remove') { c.cart = c.cart.filter(function (y) { return P[y.key].cat !== k.cat; }); if (c.pending && c.pending.cat === k.cat) c.pending = null; return; }
      if (its.some(function (i) { return P[i.key].cat === k.cat; })) return;
      var sab = { type: 'sabor', cat: k.cat, qty: k.qty };
      if (c.pending && c.pending.type === 'sabor') { c.pending.next = c.pending.next || sab; } else c.pending = sab;
    });
    if (p.ambig) {
      var amb = { type: 'ambig', options: p.ambig.options, label: p.ambig.label, qty: p.ambig.qty };
      if (c.pending) amb.next = c.pending;
      c.pending = amb;
    }
    // Sin producto: «quita eso», «que sean 4», «dame 3» (del último que preguntó).
    if (!its.length && !p.cats.length && !p.ambig) {
      if (flag(p, 'remove') && c.last && find(c.cart, c.last)) removeItem(c, { key: c.last });
      else if (p.lone != null && c.last && P[c.last].cat !== 'caja-china' && (flag(p, 'set') || !find(c.cart, c.last)) && !c.pending) {
        if (flag(p, 'set')) setQty(c, c.last, p.lone); else { addItem(c, c.last, p.lone); x.added.push(c.last); }
      }
    }
    if (JSON.stringify(c.cart) !== before) x.changed = true;
    if (x.changed || c.pending || edits) x.ok = true;
    if (!c.cart.length && !c.pending && edits) { x.info.push('Listo, tu pedido quedó vacío. ¿Qué te gustaría pedir?'); c.step = 'inicio'; x.noFlow = true; }

    var big = units(c.cart) + (c.pending && c.pending.qty || 0);
    if (big >= BIG && c.cfg.pasarAlberto) return handoff(x, 'Pedido grande', '¡Qué buen pedido! 🙌 Los pedidos desde ' + BIG + ' unidades los coordina Alberto personalmente para que todo salga perfecto.', '¡Hola, soy Alberto! 👋 Ya vi tu pedido de ' + big + ' unidades. ¿Para qué día y hora lo necesitas?');
    if (caja) return cajaHandoff(x, c.cart.length ? 'Lo demás de tu pedido queda anotado.' : null);
  }

  function slots(x) {
    var c = x.c, p = x.p, inFlow = c.cart.length > 0 || !!(c.pending && c.pending.type !== 'caja');
    if (!inFlow) return;
    var asking = c.step === 'modo' || c.step === 'zona' || c.step === 'confirmar';
    var can = asking || !p.question || flag(p, 'set');
    if (can && p.zone) {
      if (c.mode !== 'delivery' || c.zone !== p.zone) { c.mode = 'delivery'; c.zone = p.zone; x.zoneSet = x.changed2 = true; }
      x.ok = true;
    } else if (can && p.outside && p.mode !== 'recojo') {
      c.mode = 'delivery'; c.zone = null; c.pending = { type: 'fuera' }; x.ok = x.changed2 = true;
    } else if (can && p.mode) {
      if (p.mode !== c.mode) { c.mode = p.mode; if (p.mode === 'recojo') c.zone = null; x.modeSet = x.changed2 = true; }
      x.ok = true;
    } else if (c.step === 'zona' && !p.items.length && !p.cats.length && !p.question && !p.pay && !c.pending) {
      c.pending = { type: 'fuera' }; x.ok = true;
    }
    if (p.address && c.mode === 'delivery') c.address = p.address;
    if (p.pay && (c.step === 'pago' || c.step === 'confirmar' || !p.question || flag(p, 'set'))) {
      if (p.pay === 'efectivo') x.cash = true;
      else if (c.pay !== p.pay) { c.pay = p.pay; x.paySet = x.changed2 = true; }
      x.ok = true;
    }
    if (p.name) { c.name = cleanName(p.name) || c.name; x.ok = true; x.nameSet = x.changed2 = true; }
    else if (c.step === 'nombre' && !c.name && !x.changed && !p.question && !p.pay && !p.mode && !p.items.length && !flag(p, 'thanks')) {
      var n = cleanName(p.raw);
      if (n) { c.name = n; x.nameSet = x.changed2 = x.ok = true; }
    }
    if (x.modeSet && c.mode === 'recojo') x.ack.push('Perfecto, pasas a recoger. ' + recojoText());
    if (x.modeSet && c.mode === 'delivery' && !c.zone) x.ack.push('Perfecto, con delivery 🛵');
    if (x.zoneSet) x.ack.push('Listo, delivery a ' + zoneBy(c.zone).nombre + ' (' + money(zoneBy(c.zone).costo) + ') 🛵');
    if (x.paySet && c.step === 'confirmar') x.ack.push('Listo, cambio el pago a ' + PAGOS[c.pay] + '.');
    if (x.nameSet && c.step === 'nombre') x.ack.push('Gracias, ' + firstName(c.name) + ' 😊');
    if (x.cash) x.ack.push('Por aquí trabajamos con Yape, Plin y tarjeta (Visa o Mastercard).');
  }
  function cleanName(s) {
    s = String(s).trim().replace(/^[¡!¿?.,\s]+|[¡!¿?.,\s]+$/g, '')
      .replace(/^(?:hola|buenas|ok|ya|listo|bueno|claro|s[ií])[,!.\s]+/i, '')
      .replace(/^(?:a nombre de|al nombre de|a nombre|nombre:?|mi nombre es|me llamo|soy|es|para)\s+/i, '');
    if (!/^[a-záéíóúüñ' ]{2,40}$/i.test(s)) return null;
    var w = s.split(/\s+/);
    if (w.length > 4 || /^(?:si|sí|no|ok|ya|hola|gracias|dale|listo|bueno|nada|claro)$/i.test(s)) return null;
    return w.map(function (x, i) { return i && /^(?:de|del|la|las|los|y)$/i.test(x) ? x.toLowerCase() : x.charAt(0).toUpperCase() + x.slice(1).toLowerCase(); }).join(' ');
  }

  function infos(x, greet) {
    var c = x.c, p = x.p, now = x.now, info = [], push = function (t) { info.push(t); x.ok = true; };
    if (flag(p, 'menu') && !x.wants && !x.catDone) { push(menuText()); push('¿Qué se te antoja? Escríbeme, por ejemplo: _3 empanadas de pollo y 2 de lomo_.'); }
    else if (flag(p, 'flavors') && !x.catDone && !x.wants && !(c.pending && c.pending.type === 'sabor')) {
      var emp = p.cats.some(function (k) { return k.cat === 'empanadas'; }) || / empanad/.test(p.t);
      (emp ? [empText()] : flavorBubbles()).forEach(push);
      x.catDone = true;
    }
    var deliv = flag(p, 'deliv') && !x.zoneSet && !x.modeSet && !(c.pending && c.pending.type === 'fuera');
    if (deliv && c.lastOrder && !c.cart.length) push((c.lastOrder.mode === 'delivery' ? 'Tu pedido sale ' : 'Tu pedido estará listo ') + low(c.lastOrder.label) + ' 😊');
    else if (deliv) push(delivText(p, now, x.s));
    else if (flag(p, 'hours')) push(hoursText(now));
    if (flag(p, 'payq') && !x.paySet && !x.cash && !(p.pay && c.step === 'pago')) push(payText());
    if (flag(p, 'where') && !x.modeSet) push(recojoText());
    if (flag(p, 'social')) push('Encuéntranos como *' + D.negocio.redes + '* en Instagram y Facebook 💚');
    if (flag(p, 'phone')) push('Puedes escribirnos o llamarnos al ' + D.negocio.telefono + '.');
    if (flag(p, 'thanks') && !info.length && !x.changed && !x.changed2) push(c.lastOrder && !c.cart.length ? '¡A ti' + (c.name ? ', ' + firstName(c.name) : '') + '! 💚 Que lo disfrutes.' : '¡A ti! 😊');
    var quiet = !info.length && !x.info.length && !x.changed && !x.changed2 && !x.out.length && !c.pending;
    // Saludo completo solo si el primer mensaje no trae nada más; si trae algo, basta con «¡Hola!».
    if (greet === true && quiet) { greetText(now).forEach(push); x.hello = false; }
    if (greet === false && quiet) push('¡Hola de nuevo! 😊 ¿En qué te ayudo?');
    x.info = x.info.concat(info);
  }

  function flow(x) {
    var c = x.c, now = x.now, q = null, extra = null;
    if (x.order || x.noFlow || x.handoff) return emit(x, null);
    if (!c.cart.length && !c.pending) return emit(x, null);
    if (c.pending && c.pending.type === 'caja') return emit(x, pendingQuestion(c));
    var pt = c.pending && c.pending.type;
    if (pt === 'ambig' || pt === 'fuera') q = pendingQuestion(c);
    else if (pt === 'sabor' && !needsMin(c)) q = pendingQuestion(c);
    else if (!c.mode) { c.step = 'modo'; q = askMode(c, now); }
    else if (needsMin(c)) {
      var pd = c.pending && c.pending.type === 'min7' ? c.pending : { type: 'min7' };
      if (!pd.cat && c.pending && c.pending.type === 'sabor') { pd.cat = c.pending.cat; pd.qty = c.pending.qty; }
      c.pending = pd; q = pendingQuestion(c);
    } else if (c.mode === 'delivery' && !c.zone) { c.step = 'zona'; q = askZone(); }
    else if (!c.name) { c.step = 'nombre'; q = askName(); }
    else if (!c.pay) { c.step = 'pago'; q = x.cash ? '¿Con cuál te queda mejor?' : askPay(); }
    else {
      c.step = 'confirmar';
      var o = buildOrder(c, now);
      q = 'Este es tu pedido, ' + firstName(c.name) + ': *' + money(o.total) + '* en total.\n' + askConfirm();
      extra = { order: o };
    }
    if (c.pending && c.pending.type === 'min7' && !needsMin(c)) c.pending = null;
    x.ok = true;
    emit(x, q, extra);
  }

  // Ordena las burbujas: respuestas → producto elegido → carrito y pregunta siguiente.
  function emit(x, q, extra) {
    var c = x.c;
    x.info.forEach(function (m) { if (typeof m === 'string') say(x, m); else say(x, m.text, { product: m.product }); });
    var body = [];
    if (x.changed && c.cart.length) {
      if (x.added.length && !(extra && extra.order)) say(x, x.hello ? 'Buena elección 😋' : ['¡Buena elección! 😋', '¡Anotado! 😋', '¡Rico! 😋'][c.turns % 3], { product: x.added[x.added.length - 1] });
      var note = whenNote(c.cart, x.now);
      body.push((x.ack.length ? x.ack.join(' ') + '\n' : '') + 'Tu pedido:\n' + cartText(c) + (note ? '\n' + note : ''));
    } else if (x.ack.length) body.push(x.ack.join(' '));
    if (q) body.push(q);
    if (body.length) say(x, body.join('\n\n'), extra);
  }

  function place(x) {
    var c = x.c, now = x.now, o = buildOrder(c, now), first = firstName(c.name);
    var pay = o.pay === 'Tarjeta' ? 'Te enviamos por aquí los datos para pagar con tarjeta (Visa o Mastercard).' : 'Te enviamos por aquí los datos para pagar con ' + o.pay + '; cuando pagues, mándanos la captura.';
    var d = c.mode === 'delivery' ? deliverySlot(c.cart, now) : pickupSlot(c.cart, now);
    var when = c.mode === 'delivery'
      ? 'Sale ' + dayText(now, d.i) + ' en el delivery de las ' + t12(d.min) + (c.address ? '.' : '; antes de que salga, mándanos tu ubicación por aquí.')
      : 'Puedes recogerlo ' + dayText(now, d.i) + ' desde las ' + t12(d.min) + '; te enviamos la ubicación del punto de recojo por aquí.';
    say(x, '¡Listo, ' + first + '! Tu pedido quedó confirmado ✅', { order: o });
    say(x, pay + '\n' + when + '\n¡Gracias por elegir *' + D.negocio.nombre + '*! 💚');
    c.lastOrder = { label: o.slot.label, total: o.total, mode: o.mode };
    resetOrder(c); c.step = 'hecho';
    x.order = o; x.ok = true;
  }

  function fallback(x) {
    var c = x.c;
    c.misses++;
    var q = null;
    if (c.pending) q = pendingQuestion(c);
    else if (c.cart.length) q = { modo: askMode(c, x.now), zona: askZone(), nombre: '¿Me dices tu nombre para el pedido?', pago: askPay(), confirmar: askConfirm() }[c.step] || null;
    var txt = 'Disculpa, no te entendí bien 😅 ' + (q || 'Puedo mostrarte la *carta*, los *sabores de marcianos*, tomar tu *pedido* o contarte del *delivery* y los *horarios*. ¿Qué necesitas?');
    if (c.misses >= 2) txt += '\nSi prefieres, escribe *Alberto* y le aviso para que te atienda.';
    x.out = [];
    say(x, txt);
  }

  /* ---------- Sugerencias (chips) ---------- */
  function suggestions(conv, now) {
    var c = conv || {}, s = settings(c), pd = c.pending;
    now = now ? new Date(now) : new Date();
    if (!s.activo) return ['Hola', '¿Qué sabores de marcianos tienen?', '¿A qué hora abren?'];
    if (c.handoff) return ['Gracias, Alberto', 'Ok, quedo atento', 'Quiero hacer otro pedido'];
    if (pd) {
      if (pd.type === 'ambig') return pd.options.map(function (k) { return cap(optName(k)); }).concat(['¿Qué sabores tienen?']);
      if (pd.type === 'sabor') {
        if (pd.cat === 'empanadas') return pd.qty > 1 ? [pd.qty + ' de pollo', Math.ceil(pd.qty / 2) + ' de lomo y ' + Math.floor(pd.qty / 2) + ' hawaianas', 'De mixto regional'] : ['De pollo', 'De lomo', 'Hawaiana'];
        if (pd.cat === 'marcianos') return pd.qty > 1 ? [pd.qty + ' de aguaje', Math.ceil(pd.qty / 2) + ' de fresa y ' + Math.floor(pd.qty / 2) + ' de coco', '¿Qué sabores tienen?'] : ['De aguaje', 'De fresa con leche', '¿Qué sabores tienen?'];
        return byCat(pd.cat).slice(0, 3).map(function (p) { return p.nombre; });
      }
      if (pd.type === 'min7') return ['Sí, complétalo a ' + MIN, 'Mejor paso a recoger'];
      if (pd.type === 'caja') return ['Sí, sepárame uno', 'No, gracias'];
      if (pd.type === 'fuera') return ['Paso a recoger', 'Hablar con Alberto'];
    }
    var late = mins(now) >= CORTE;
    if (c.cart && c.cart.length) {
      if (c.step === 'modo') return late ? ['Paso a recoger', 'Con delivery a Morales', 'También 2 marcianos de coco'] : ['Con delivery a Morales', 'Paso a recoger', 'También 2 marcianos de coco'];
      if (c.step === 'zona') return ['Tarapoto', 'La Banda de Shilcayo', 'Morales', 'Mejor paso a recoger'];
      if (c.step === 'nombre') return ['Rosa Panduro', 'A nombre de Carlos Pinedo'];
      if (c.step === 'pago') return ['Yape', 'Plin', 'Tarjeta'];
      if (c.step === 'confirmar') return ['Sí, confirmo', 'Cambiar algo', c.pay === 'plin' ? 'Mejor con Yape' : 'Mejor con Plin'];
    }
    if (c.lastOrder) return ['¿A qué hora llega mi pedido?', 'Gracias', 'Quiero una caja china para el domingo'];
    var base = ['¿Qué sabores de marcianos tienen?', 'Quiero 3 empanadas de pollo y 2 de lomo', '¿Hacen delivery a Morales?', 'Quiero una caja china para el domingo'];
    base.push(openNow(now) ? 'Ver la carta' : '¿A qué hora abren?');
    return base.filter(function (x) { return norm(fold(x)) !== c.lastText; });
  }

  TB.bot = { createConversation: createConversation, reply: reply, suggestions: suggestions, parse: parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = TB.bot;
})(typeof window !== 'undefined' ? window : globalThis);
