/* Vista Pedidos: el chat del bot tal como lo ve el cliente en WhatsApp y los pedidos del día.
   Usa TB.bot (respuestas) y TB.app (estado, pedidos, hojas y formatos). Estado propio en TB.app.state.chat. */
(function () {
  'use strict';
  var TB = window.TB = window.TB || {};
  var MAX_MSGS = 60;
  var REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  var STATUS = {
    'nuevo': ['Nuevo', 'badge-mostaza'],
    'preparando': ['Preparando', 'ch-badge-azul'],
    'en camino': ['En camino', 'badge-verde'],
    'listo para recojo': ['Listo para recojo', 'badge-verde'],
    'entregado': ['Entregado', 'badge-gris']
  };
  var FILTERS = [['todos', 'Todos'], ['nuevo', 'Nuevos'], ['preparando', 'Preparando'], ['en camino', 'En camino'], ['listo para recojo', 'Listos'], ['entregado', 'Entregados']];
  var CHANNEL = { 'Bot de WhatsApp': ['badge-verde', 'bot'], 'WhatsApp (Alberto)': ['badge-mostaza', 'whatsapp'], 'Instagram': ['badge-gris', 'instagram'] };
  var TICKS = '<svg class="ch-tick" viewBox="0 0 18 11" width="17" height="11" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 5.8l3.1 3.1 6.3-7.3M8.7 8.7l.3.2 6.3-7.3"/></svg>';
  var VERIFIED = '<svg viewBox="0 0 16 16" width="15" height="15" role="img" aria-label="Cuenta verificada"><circle cx="8" cy="8" r="8" fill="#1FA855"/><path d="M4.7 8.3l2.1 2.1 4.5-4.7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PAY = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>';

  var A, root, $ = {}, st, busy = false, gen = 0, kbOpen = false, lastDay = '', lastFrom = '';
  var ui = { tab: 'chat', day: 'hoy', filter: 'todos', fresh: {} };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  // Formato de WhatsApp: *negrita*, _cursiva_ y saltos de línea. «3:00 p. m.» y «S/ 3.00» no se parten entre líneas.
  function fmt(s) {
    return esc(s).replace(/(\d) ([ap])\. m\./g, '$1 $2. m.').replace(/S\/ (?=\d)/g, 'S/ ')
      .replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|[\s(¡¿])_([^_\n]+)_(?=$|[\s.,;:!?)])/g, '$1<i>$2</i>').replace(/\n/g, '<br>');
  }
  function icon(n, s) { return A.icon(n, s) || ''; }
  function money(n) { return A.money(n || 0); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function visible() { return !!root && root.offsetParent !== null; }
  // Los pedidos simulados traen slot {date, time} sin label: se arma con el día relativo.
  function slotLabel(o) {
    var s = o.slot || {};
    if (s.label || !s.date || !s.time) return s.label || '';
    var p = s.date.split('-'), h = s.time.split(':'), d = new Date(+p[0], p[1] - 1, +p[2], +h[0], +h[1]), now = A.now();
    var day = [[0, 'Hoy'], [1, 'Mañana'], [-1, 'Ayer']].filter(function (x) { return addDays(now, x[0]).toDateString() === d.toDateString(); })[0];
    day = day ? day[1] : A.fmtDate(d).replace(/^./, function (c) { return c.toUpperCase(); });
    var art = d.getHours() % 12 === 1 ? 'la ' : 'las '; // "a la 1:20 p. m."
    return day + (o.mode === 'recojo' ? ', para recoger a ' : ' en el delivery de ') + art + A.fmtTime(d);
  }
  function botOff() { var s = A.state.settings; return !TB.bot || !!(s && s.bot && s.bot.activo === false); }

  /* ---------- Montaje ---------- */

  function mount(section) {
    A = TB.app;
    section.innerHTML =
      '<div class="ch">' +
        '<div class="seg ch-tabs" role="group" aria-label="Sección de pedidos">' +
          '<button type="button" data-tab="chat" aria-pressed="true">Chat del bot</button>' +
          '<button type="button" data-tab="pedidos" aria-pressed="false">Pedidos <span class="ch-count"></span></button>' +
        '</div>' +
        '<div class="ch-pane" data-pane="chat">' +
          '<div class="ch-phone">' +
            '<div class="ch-head">' +
              '<img class="ch-avatar" src="assets/img/logo-verde.webp" alt="" width="40" height="40">' +
              '<div class="ch-who"><div class="ch-nm"><b>' + esc(TB.data.negocio.nombreWhatsApp) + '</b>' + VERIFIED + '</div>' +
                '<div class="ch-status" aria-live="polite">en línea</div></div>' +
              '<button type="button" class="ch-more" aria-label="Más opciones" aria-haspopup="true" aria-expanded="false">' + icon('more', 22) + '</button>' +
              '<div class="ch-menu" role="menu" hidden><button type="button" role="menuitem" data-act="reset">' + icon('refresh', 18) + 'Reiniciar conversación</button></div>' +
            '</div>' +
            '<div class="ch-off" hidden>' + icon('alert', 18) + '<span>El bot está apagado: Alberto responde en persona.</span>' +
              '<button type="button" data-act="ajustes">Ir a Ajustes</button></div>' +
            '<div class="ch-list" role="log" aria-label="Conversación con el bot">' +
              '<div class="ch-intro"><img src="assets/img/logo-verde.webp" alt="" width="56" height="56">' +
                '<b>' + esc(TB.data.negocio.nombreWhatsApp) + '</b><span>Cuenta de empresa · ' + esc(TB.data.negocio.ciudad) + '</span></div>' +
              '<p class="ch-tip">Así ven tus clientes este chat. Escríbele al bot como si fueras uno de ellos.</p>' +
              '<div class="ch-msgs"></div>' +
              '<div class="ch-row ch-in ch-first ch-typing" hidden><span class="ch-av" aria-hidden="true">A</span><div class="ch-b"><span class="ch-dots"><i></i><i></i><i></i></span></div></div>' +
            '</div>' +
            '<div class="ch-sugs" role="group" aria-label="Sugerencias de mensaje"></div>' +
            '<form class="ch-compose" autocomplete="off">' +
              '<input class="ch-input" name="mensaje" type="text" placeholder="Mensaje" aria-label="Escribe un mensaje" enterkeyhint="send" maxlength="300">' +
              '<button class="ch-send" type="submit" aria-label="Enviar" disabled>' + icon('send', 20) + '</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
        '<div class="ch-pane" data-pane="pedidos" hidden>' +
          '<div class="ch-otools">' +
            '<div class="seg ch-day" role="group" aria-label="Día">' +
              '<button type="button" data-day="hoy" aria-pressed="true">Hoy</button><button type="button" data-day="ayer" aria-pressed="false">Ayer</button>' +
            '</div><span class="ch-sum"></span>' +
          '</div>' +
          '<div class="ch-filters" role="group" aria-label="Filtrar por estado"></div>' +
          '<div class="ch-olist"></div>' +
        '</div>' +
      '</div>';
    root = section.firstElementChild;
    var q = function (s) { return root.querySelector(s); };
    $ = {
      tabs: root.querySelectorAll('.ch-tabs button'), count: q('.ch-count'), chat: q('[data-pane="chat"]'), orders: q('[data-pane="pedidos"]'),
      phone: q('.ch-phone'), status: q('.ch-status'), more: q('.ch-more'), menu: q('.ch-menu'), off: q('.ch-off'), list: q('.ch-list'),
      msgs: q('.ch-msgs'), typing: q('.ch-typing'), sugs: q('.ch-sugs'), form: q('.ch-compose'), input: q('.ch-input'), send: q('.ch-send'),
      days: root.querySelectorAll('.ch-day button'), sum: q('.ch-sum'), filters: q('.ch-filters'), olist: q('.ch-olist')
    };
    st = load();
    bind();
    renderChat();
    updateCount();
    A.on('order:new', function (o) { if (o && o.code) ui.fresh[o.code] = 1; refreshOrders(); });
    A.on('order:update', refreshOrders);
    A.on('view:show', function (v) { if (v && v.key !== 'pedidos') $.input.blur(); });
    A.on('state:reset', function () { gen++; busy = false; st = fresh(); renderChat(); refreshOrders(); });
    setInterval(function () { if (visible()) refreshOrders(); }, 60000); // tiempos relativos y pedidos simulados que van llegando
  }

  function show(params) {
    var p = params || {};
    $.off.hidden = !botOff();
    if (p.code) { ui.day = 'hoy'; ui.filter = 'todos'; ui.fresh[p.code] = 1; }
    setTab(p.tab || (p.code ? 'pedidos' : ui.tab));
    updateCount();
    if (p.code) openOrder(p.code);
  }

  function bind() {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var d = b.dataset;
      if (d.tab) setTab(d.tab);
      else if (d.day) { ui.day = d.day; ui.filter = 'todos'; renderOrders(); }
      else if (d.f) { ui.filter = d.f; renderOrders(); }
      else if (d.code) openOrder(d.code);
      else if (b.classList.contains('ch-sug')) send(b.textContent);
      else if (b === $.more) { e.stopPropagation(); toggleMenu(); }
      else if (d.act === 'reset') { toggleMenu(false); resetChat(); }
      else if (d.act === 'ajustes') A.go('ajustes');
    });
    document.addEventListener('click', function (e) { if (!$.menu.hidden && !$.menu.contains(e.target)) toggleMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$.menu.hidden) toggleMenu(false); });
    // Que tocar "enviar" o una sugerencia no le quite el foco al campo (el teclado sigue abierto).
    [$.send, $.sugs].forEach(function (x) { x.addEventListener('mousedown', function (e) { e.preventDefault(); }); });
    $.input.addEventListener('input', function () { $.send.disabled = !$.input.value.trim(); });
    // Mientras se escribe en un celular la barra de pestañas se oculta: así el campo queda sobre el teclado
    // también en los navegadores que achican la página al abrirlo (ahí la barra quedaría encima del campo).
    $.input.addEventListener('focus', function () { if (TOUCH) document.documentElement.classList.add('tb-typing'); setTimeout(fit, 350); });
    $.input.addEventListener('blur', function () { document.documentElement.classList.remove('tb-typing'); setTimeout(fit, 120); });
    $.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = $.input.value;
      $.input.value = '';
      $.send.disabled = true;
      send(t);
    });
    (window.visualViewport || window).addEventListener('resize', function () { fit(); });
  }

  function setTab(tab) {
    ui.tab = tab === 'pedidos' ? 'pedidos' : 'chat';
    $.tabs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tab === ui.tab)); });
    $.chat.hidden = ui.tab !== 'chat';
    $.orders.hidden = ui.tab === 'chat';
    if (ui.tab !== 'chat') $.input.blur(); // devuelve la barra de pestañas
    if (ui.tab === 'chat') requestAnimationFrame(function () { fit(true); });
    else renderOrders();
  }

  function toggleMenu(open) {
    if (open === undefined) open = $.menu.hidden;
    $.menu.hidden = !open;
    $.more.setAttribute('aria-expanded', String(open));
  }

  // El chat ocupa el alto libre hasta la barra inferior; con el teclado abierto, el alto visible.
  function fit(reset) {
    if (!visible() || $.chat.hidden) return;
    var vv = window.visualViewport, vh = vv ? vv.height : innerHeight;
    var kb = innerHeight - vh > 140 || (TOUCH && document.activeElement === $.input);
    var lim = kb ? vh : bottomLimit();
    if (lim == null) return;
    if (reset === true || (kbOpen && !kb)) {
      for (var p = root.parentElement; p; p = p.parentElement) if (p.scrollTop) p.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    kbOpen = kb;
    var h = kb ? vh - topLimit() - 18 : lim - $.phone.getBoundingClientRect().top - 12; // 18 = 12 arriba + 6 de scroll-margin abajo
    $.phone.style.height = Math.round(Math.max(kb ? 200 : 240, h)) + 'px';
    if (kb) $.phone.scrollIntoView({ block: 'end' });
    toBottom(true);
  }

  // Borde superior de lo que cubre el pie de la pantalla (la barra de pestañas del panel, fija o no).
  // null si una hoja o capa tapa media pantalla: se mide cuando se cierre.
  function bottomLimit() {
    var r = root.getBoundingClientRect();
    var el = document.elementFromPoint(r.left + r.width / 2, innerHeight - 2);
    if (!el || root.contains(el) || el.contains(root)) return innerHeight;
    while (el.parentElement && !el.parentElement.contains(root)) el = el.parentElement;
    var top = el.getBoundingClientRect().top;
    return top < innerHeight / 2 ? null : Math.min(innerHeight, top);
  }
  // Alto de lo que queda fijo arriba (el encabezado del panel): el chat no se mete debajo al subir con el teclado.
  function topLimit() {
    var r = root.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, 1);
    if (!el || root.contains(el) || el.contains(root)) return 0;
    while (el.parentElement && !el.parentElement.contains(root)) el = el.parentElement;
    var pos = getComputedStyle(el).position, b = el.getBoundingClientRect().bottom;
    return (pos === 'sticky' || pos === 'fixed') && b > 0 && b < innerHeight / 3 ? b : 0;
  }

  /* ---------- Chat ---------- */

  function fresh() {
    var conv = {};
    try { if (TB.bot) conv = TB.bot.createConversation(); } catch (e) { console.error(e); }
    var s = { conv: conv, msgs: [], queue: [], phone: '9' + rnd(10, 99) + ' ••• ' + rnd(100, 999), joined: false, pending: null };
    A.state.chat = s;
    return s;
  }

  function load() {
    var s = A.state.chat;
    if (!s || !s.conv || !Array.isArray(s.msgs)) return fresh();
    s.queue = s.queue || [];
    return s;
  }

  function save() {
    st.msgs = st.msgs.slice(-MAX_MSGS);
    A.state.chat = st;
    A.save();
  }

  function resetChat() {
    A.confirm({ title: '¿Reiniciar la conversación?', text: 'Se borran los mensajes de este chat. Los pedidos ya registrados se mantienen.', ok: 'Reiniciar', cancel: 'Cancelar' })
      .then(function (ok) {
        if (!ok) return;
        gen++; busy = false; st = fresh(); save(); renderChat();
      });
  }

  function renderChat() {
    $.msgs.innerHTML = '';
    lastDay = lastFrom = '';
    st.msgs.forEach(function (m) { append(m); });
    // Mensajes que quedaron por mostrar al recargar: aparecen de una vez.
    if (st.queue.length) {
      st.queue.forEach(function (m) { m.t = A.now().toISOString(); st.msgs.push(m); append(m); });
      st.queue = [];
      save();
    }
    typing(false);
    $.off.hidden = !botOff();
    idle();
    toBottom(true);
  }

  function send(text) {
    text = String(text || '').trim();
    if (!text) return;
    var now = A.now(), res;
    var um = { from: 'user', text: text, t: now.toISOString() };
    st.msgs.push(um);
    append(um, true);
    try {
      res = botOff() ? albertoReply() : TB.bot.reply(st.conv, text, now);
    } catch (e) {
      console.error(e);
      res = { messages: [{ from: 'bot', text: 'Disculpa, no te entendí bien. ¿Me lo escribes de otra forma? 🙏', delay: 900 }] };
    }
    enqueue(res || {});
    save();
    $.sugs.classList.add('ch-wait');
    toBottom();
    pump();
  }

  function enqueue(res) {
    var order = res.order;
    if (order) {
      order.code = A.nextOrderCode();
      order.customer = Object.assign({ name: 'Cliente de WhatsApp' }, order.customer, { phone: st.phone });
      st.pending = order;
    }
    (res.messages || []).forEach(function (m) {
      if (m.from === 'alberto' && !st.joined) joinNote();
      st.queue.push({
        from: m.from === 'alberto' ? 'alberto' : 'bot', text: m.text || '',
        delay: Math.min(4000, Math.max(300, +m.delay || 900)),
        product: m.product || undefined, order: m.order ? (order || m.order) : undefined
      });
    });
    if (res.handoff && !st.joined) joinNote();
  }

  function joinNote() {
    st.joined = true;
    st.queue.push({ from: 'sys', text: 'Alberto se unió a la conversación' });
  }

  // Con el bot apagado, Alberto contesta algo genérico (no toma pedidos).
  function albertoReply() {
    var prev = st.msgs.concat(st.queue).filter(function (m) { return m.from === 'bot' || m.from === 'alberto'; }).pop();
    var text = prev && prev.from === 'alberto'
      ? 'Anotado 🙌 Dame unos minutos y te confirmo por aquí.'
      : '¡Hola! Te saluda Alberto, de Time Bite 👋 En un momento te atiendo personalmente.';
    return { messages: [{ from: 'alberto', text: text, delay: 1600 }] };
  }

  // Muestra la cola de respuestas una por una: "escribiendo…" durante el delay de cada mensaje.
  function pump() {
    if (busy) return;
    var m = st.queue[0];
    if (!m) return idle();
    busy = true;
    var g = gen;
    var later = function (ms, fn) { setTimeout(function () { if (g === gen) fn(); }, ms); };
    var reveal = function () {
      typing(false);
      st.queue.shift();
      m.t = A.now().toISOString();
      st.msgs.push(m);
      append(m, true);
      if (m.order && st.pending && m.order.code === st.pending.code) flushOrder();
      save();
      toBottom();
      busy = false;
      pump();
    };
    if (m.from === 'sys') return later(400, reveal);
    later(450, function () { markRead(); typing(true, m.from === 'alberto'); later(m.delay, reveal); });
  }

  function idle() {
    renderSugs();
    if (st.pending) setTimeout(flushOrder, 0);
  }

  function flushOrder() {
    var o = st.pending;
    if (!o) return;
    st.pending = null;
    save();
    A.addOrder(o);
  }

  function markRead() {
    st.msgs.forEach(function (m) { if (m.from === 'user') m.read = true; });
    $.msgs.querySelectorAll('.ch-out').forEach(function (r) { r.classList.add('ch-read'); });
  }

  function typing(on, alberto) {
    $.typing.hidden = !on;
    $.typing.classList.toggle('ch-al', !!alberto);
    $.status.textContent = on ? 'escribiendo…' : 'en línea';
    $.status.classList.toggle('ch-busy', on);
    if (on) toBottom();
  }

  function toBottom(instant) {
    var l = $.list;
    if (instant || REDUCED) l.scrollTop = l.scrollHeight;
    else l.scrollTo({ top: l.scrollHeight, behavior: 'smooth' });
  }

  function renderSugs() {
    var list = [];
    try { if (TB.bot) list = TB.bot.suggestions(st.conv, A.now()) || []; } catch (e) { console.error(e); }
    $.sugs.innerHTML = list.map(function (s) { return '<button type="button" class="ch-sug">' + esc(s) + '</button>'; }).join('');
    $.sugs.hidden = !list.length;
    $.sugs.classList.remove('ch-wait');
    $.sugs.scrollLeft = 0;
    toBottom(true);
  }

  function dayLabel(t) {
    var d = new Date(t), now = A.now();
    if (d.toDateString() === now.toDateString()) return 'Hoy';
    if (d.toDateString() === addDays(now, -1).toDateString()) return 'Ayer';
    return A.fmtDate(d);
  }

  function append(m, animate) {
    var pop = animate && !REDUCED ? ' ch-pop' : '';
    var day = new Date(m.t).toDateString();
    if (day !== lastDay) {
      lastDay = day; lastFrom = '';
      $.msgs.insertAdjacentHTML('beforeend', '<div class="ch-pill">' + esc(dayLabel(m.t)) + '</div>');
    }
    if (m.from === 'sys') {
      lastFrom = '';
      $.msgs.insertAdjacentHTML('beforeend', '<div class="ch-pill ch-sys' + pop + '">' + esc(m.text) + '</div>');
      return;
    }
    var first = m.from !== lastFrom, al = m.from === 'alberto' && first;
    lastFrom = m.from;
    var row = document.createElement('div');
    row.className = 'ch-row ' + (m.from === 'user' ? 'ch-out' : 'ch-in') + (first ? ' ch-first' : '') +
      (m.from === 'alberto' ? ' ch-al' : '') + (m.read ? ' ch-read' : '') + pop;
    row.innerHTML = (al ? '<span class="ch-av" aria-hidden="true">A</span>' : '') +
      '<div class="ch-b' + (m.product || m.order ? ' ch-rich' : '') + '">' +
        (al ? '<div class="ch-al-name">Alberto</div>' : '') +
        (m.product ? productCard(m.product) : '') + (m.order ? orderCard(m.order) : '') +
        '<div class="ch-t">' + fmt(m.text) + '<span class="ch-sp"></span></div>' +
        '<span class="ch-meta">' + esc(A.fmtTime(new Date(m.t))) + (m.from === 'user' ? TICKS : '') + '</span>' +
      '</div>';
    $.msgs.appendChild(row);
  }

  function productCard(key) {
    var p = TB.data.porKey[key];
    if (!p) return '';
    var img = A.productImg(p) || {};
    var media = img.src ? '<img src="' + esc(img.src) + '" alt="" class="ch-img-' + esc(img.kind) + '">' : A.tile(p, 96);
    return '<div class="ch-card ch-prod"><div class="ch-media" style="background:' + esc(p.fondo) + '">' + media + '</div>' +
      '<div class="ch-pbody"><b>' + esc(p.largo) + '</b>' +
        '<span class="ch-price">' + money(p.precio) + (p.antes ? ' <s>' + money(p.antes) + '</s>' : '') + '</span>' +
        (p.desc ? '<span class="ch-desc">' + esc(p.desc) + '</span>' : '') + '</div></div>';
  }

  function orderCard(o) {
    var items = (o.items || []).map(function (i) {
      return '<li><span>' + i.qty + ' × ' + esc(i.name) + '</span><span>' + money(i.qty * i.price) + '</span></li>';
    }).join('');
    var deliv = o.mode === 'delivery' ? '<li><span>Delivery' + (o.zone ? ' · ' + esc(o.zone) : '') + '</span><span>' + money(o.deliveryCost) + '</span></li>' : '';
    return '<div class="ch-card ch-ord">' +
      '<div class="ch-ord-h">' + icon('bag', 18) + '<b>' + (o.code ? 'Pedido ' + esc(o.code) : 'Resumen de tu pedido') + '</b>' +
        (o.code ? '<span class="ch-ok">Confirmado</span>' : '') + '</div>' +
      '<ul class="ch-ord-i">' + items + '</ul>' +
      '<ul class="ch-ord-s"><li><span>Subtotal</span><span>' + money(o.subtotal) + '</span></li>' + deliv +
        '<li class="ch-ord-t"><span>Total</span><span>' + money(o.total) + '</span></li></ul>' +
      '<div class="ch-ord-f">' + (o.mode === 'recojo' ? icon('store', 15) + '<span>Para recoger</span>' : icon('truck', 15) + '<span>Delivery' + (o.zone ? ' a ' + esc(o.zone) : '') + '</span>') + '</div>' +
      (slotLabel(o) ? '<div class="ch-ord-f">' + icon('clock', 15) + '<span>' + esc(slotLabel(o)) + '</span></div>' : '') +
      (o.pay ? '<div class="ch-ord-f">' + PAY + '<span>Pago con ' + esc(o.pay) + '</span></div>' : '') +
    '</div>';
  }

  /* ---------- Pedidos ---------- */

  function refreshOrders() {
    updateCount();
    if (ui.tab === 'pedidos' && visible()) renderOrders();
  }

  function updateCount() {
    $.count.textContent = '(' + (A.ordersFor(A.now()) || []).length + ')';
  }

  function renderOrders() {
    var all = A.ordersFor(ui.day === 'ayer' ? addDays(A.now(), -1) : A.now()) || [];
    var list = ui.filter === 'todos' ? all : all.filter(function (o) { return o.status === ui.filter; });
    var total = all.reduce(function (s, o) { return s + (o.total || 0); }, 0);
    $.days.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.day === ui.day)); });
    $.sum.textContent = all.length ? all.length + (all.length === 1 ? ' pedido · ' : ' pedidos · ') + money(total) : '';
    $.filters.hidden = !all.length;
    $.filters.innerHTML = FILTERS.map(function (f) {
      var n = f[0] === 'todos' ? all.length : all.filter(function (o) { return o.status === f[0]; }).length;
      var on = ui.filter === f[0];
      return '<button type="button" class="chip' + (on ? ' chip-on' : '') + '" data-f="' + f[0] + '" aria-pressed="' + on + '">' + f[1] + ' <span class="ch-n">' + n + '</span></button>';
    }).join('');
    $.olist.innerHTML = list.length ? list.map(orderItem).join('') : emptyOrders(all.length);
    ui.fresh = {};
  }

  function emptyOrders(any) {
    if (any) {
      var f = FILTERS.filter(function (x) { return x[0] === ui.filter; })[0];
      return '<div class="empty ch-empty"><p>No hay pedidos en «' + f[1] + '».</p></div>';
    }
    if (ui.day === 'ayer') return '<div class="empty ch-empty">' + icon('bag', 28) + '<p><b>No hubo pedidos ayer</b></p></div>';
    return '<div class="empty ch-empty">' + icon('bag', 28) + '<p><b>Aún no hay pedidos hoy</b></p>' +
      '<p class="muted">Cuando un cliente pida por el bot, su pedido aparecerá aquí al instante.</p>' +
      '<button type="button" class="btn btn-primary btn-sm" data-tab="chat">Probar el bot</button></div>';
  }

  function channel(c) {
    var m = CHANNEL[c] || ['badge-gris', 'chat'];
    return '<span class="badge ' + m[0] + ' ch-chan">' + icon(m[1], 13) + esc(c || 'WhatsApp') + '</span>';
  }

  function orderItem(o) {
    var s = STATUS[o.status] || STATUS.nuevo;
    var items = (o.items || []).map(function (i) { return i.qty + ' × ' + i.name; }).join(', '), created = new Date(o.createdAt);
    return '<button type="button" class="card ch-oc' + (o.status === 'nuevo' ? ' ch-oc-new' : '') + (ui.fresh[o.code] ? ' ch-flash' : '') + '" data-code="' + esc(o.code) + '">' +
      '<span class="ch-oc-r1"><b class="ch-code">' + esc(o.code) + '</b><span class="badge ' + s[1] + '">' + s[0] + '</span>' +
        '<span class="ch-rel">' + esc(ui.day === 'ayer' ? A.fmtTime(created) : A.rel(created)) + '</span></span>' +
      '<span class="ch-oc-r2"><span class="ch-cust">' + esc((o.customer && o.customer.name) || 'Cliente') + '</span><b>' + money(o.total) + '</b></span>' +
      '<span class="ch-items">' + esc(items) + '</span>' +
      '<span class="ch-oc-r3"><span>' + (o.mode === 'recojo' ? icon('store', 15) + 'Recojo' : icon('truck', 15) + esc(o.zone || 'Delivery')) + '</span>' +
        (slotLabel(o) ? '<span>' + icon('clock', 15) + esc(slotLabel(o)) + '</span>' : '') + '</span>' +
      '<span class="ch-oc-r4"><span class="ch-pay">' + PAY + esc(o.pay || '—') + '</span>' + channel(o.channel) + '</span>' +
    '</button>';
  }

  function findOrder(code) {
    var now = A.now();
    return (A.ordersFor(now) || []).concat(A.ordersFor(addDays(now, -1)) || []).filter(function (o) { return o.code === code; })[0];
  }

  function nextStep(o) {
    if (o.status === 'nuevo') return ['preparando', 'Empezar a preparar'];
    if (o.status === 'preparando') return o.mode === 'recojo' ? ['listo para recojo', 'Listo para recojo'] : ['en camino', 'Enviar con el delivery'];
    if (o.status === 'en camino' || o.status === 'listo para recojo') return ['entregado', 'Marcar como entregado'];
    return null;
  }

  function openOrder(code) {
    var o = findOrder(code);
    if (!o) return;
    var nx = nextStep(o), sheet;
    sheet = A.sheet({
      title: 'Pedido ' + o.code,
      body: detail(o),
      actions: nx ? [{ label: nx[1], primary: true, fn: function () {
        A.updateOrder(o.code, { status: nx[0] });
        sheet.close();
        A.toast('Pedido ' + o.code + ': ' + STATUS[nx[0]][0].toLowerCase());
      } }] : []
    });
  }

  function detail(o) {
    var steps = ['nuevo', 'preparando', o.mode === 'recojo' ? 'listo para recojo' : 'en camino', 'entregado'];
    var at = steps.indexOf(o.status), c = o.customer || {}, created = new Date(o.createdAt);
    var items = (o.items || []).map(function (i) {
      var p = TB.data.porKey[i.key];
      return '<li>' + (p ? '<span class="ch-thumb">' + A.tile(p, 40) + '</span>' : '') + '<span>' + i.qty + ' × ' + esc(i.name) + '</span><b>' + money(i.qty * i.price) + '</b></li>';
    }).join('');
    var row = function (dt, dd) { return '<div><dt>' + dt + '</dt><dd>' + dd + '</dd></div>'; };
    return '<div class="ch-det">' +
      '<ol class="ch-steps" aria-label="Estado: ' + esc((STATUS[o.status] || STATUS.nuevo)[0]) + '">' + steps.map(function (k, i) {
        return '<li class="' + (i <= at ? 'ch-done' : '') + (i === at ? ' ch-now' : '') + '"><span class="ch-dot">' + (i < at || at === 3 ? icon('check', 12) : '') + '</span>' +
          (k === 'listo para recojo' ? 'Listo' : STATUS[k][0]) + '</li>';
      }).join('') + '</ol>' +
      '<dl class="ch-dl">' +
        row('Cliente', '<b>' + esc(c.name || 'Cliente') + '</b>' + (c.phone ? '<span>' + esc(c.phone) + '</span>' : '')) +
        row('Canal', channel(o.channel)) +
        row('Recibido', '<b>' + esc(A.fmtTime(created)) + '</b><span>' + esc(A.rel(created)) + '</span>') +
        row('Entrega', '<b>' + (o.mode === 'recojo' ? 'Recojo' : 'Delivery' + (o.zone ? ' · ' + esc(o.zone) : '')) + '</b>' + (slotLabel(o) ? '<span>' + esc(slotLabel(o)) + '</span>' : '')) +
        row('Pago', '<b>' + esc(o.pay || '—') + '</b>') +
        (o.note ? row('Nota', esc(o.note)) : '') +
      '</dl>' +
      '<ul class="ch-ditems">' + items + '</ul>' +
      '<ul class="ch-dtot"><li><span>Subtotal</span><span>' + money(o.subtotal) + '</span></li>' +
        (o.mode === 'delivery' ? '<li><span>Delivery' + (o.zone ? ' · ' + esc(o.zone) : '') + '</span><span>' + money(o.deliveryCost) + '</span></li>' : '') +
        '<li class="ch-tt"><span>Total</span><span>' + money(o.total) + '</span></li></ul>' +
    '</div>';
  }

  (TB.views = TB.views || []).push({ key: 'pedidos', title: 'Pedidos', icon: 'chat', mount: mount, show: show });
})();
