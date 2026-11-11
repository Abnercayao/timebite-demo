/* Contenido: motor de afiches (Canvas 2D) y de textos para redes de Time Bite.
   Usa solo fotos propias (assets/img, mismo origen: el canvas se puede exportar) y datos reales de TB.data. */
(function (root) {
  'use strict';
  const TB = (root.TB = root.TB || {});
  const IMG = 'assets/img/';
  const CREAM = '#FFF5EC', INK = '#42220B', GOLD = '#E8A122', GREEN = '#3D7534', GREEN9 = '#1C3A18';
  const LIL = '"Lilita One", "Arial Black", Impact, sans-serif';
  const MON = 'Montserrat, "Segoe UI", Roboto, Arial, sans-serif';
  const KAU = '"Kaushan Script", "Segoe Script", "Brush Script MT", cursive';
  const NV = 3;
  const SAFE_T = 210, FOOT_S = 1420, FOOT_P = 840; // historia: nada importante arriba de 200 px ni debajo de 1660 px
  const FORMATS = { story: { w: 1080, h: 1920, name: 'Historia' }, post: { w: 1080, h: 1080, name: 'Publicación' } };
  const TEMPLATES = [
    { key: 'producto', name: 'Producto del día', desc: 'Tu producto estrella, con su precio.' },
    { key: 'lanzamiento', name: 'Gran lanzamiento', desc: 'Presenta un sabor con look premium.' },
    { key: 'delivery', name: 'Delivery de hoy', desc: 'Hora de salida, zonas y costos.' },
    { key: 'cajachina', name: 'Caja china', desc: 'El chanchito del domingo y lo que incluye.' },
    { key: 'promo', name: 'Pack de 7', desc: 'Pide 7 marcianos y te lo llevamos.' }
  ];
  // Por plantilla y variante: [tema, composición en historia, composición en publicación].
  const LOOKS = {
    producto: [['crema', 'stack', 'split'], ['color', 'plate', 'center'], ['oscuro', 'herofirst', 'splitL']],
    lanzamiento: [['oscuro', 'stack', 'split'], ['crema', 'herofirst', 'splitL'], ['color', 'plate', 'center']],
    promo: [['color', 'stack', 'split'], ['crema', 'plate', 'center'], ['oscuro', 'herofirst', 'splitL']],
    delivery: [['crema', 'a', 'a'], ['color', 'b', 'b'], ['oscuro', 'strip', 'a']],
    cajachina: [['color', 'a', 'a'], ['crema', 'b', 'b'], ['oscuro', 'b', 'a']]
  };
  const PAY = { Yape: '#742284', Plin: '#0A8F9C', Visa: '#1A1F71', Mastercard: '#EB001B' };
  const ICON = {
    pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    truck: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
  };
  const paths = {};

  /* ---------- utilidades ---------- */
  const D = () => TB.data;
  const money = n => 'S/ ' + Number(n).toFixed(2);
  const pad2 = n => String(n).padStart(2, '0');
  const low = s => s.charAt(0).toLowerCase() + s.slice(1);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const now = () => (TB.app && TB.app.now ? TB.app.now() : new Date());
  const andList = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a.join(''));
  function hm12(hhmm) { const [h, m] = hhmm.split(':').map(Number); return [((h + 11) % 12 + 1) + ':' + pad2(m), h < 12 ? 'a. m.' : 'p. m.']; }
  const fmt12 = hhmm => hm12(hhmm).join(' ');
  function hx(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); }
  function mixc(a, b, t) { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  function rgba(c, a) { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${a})`; }
  const lum = c => { const [r, g, b] = hx(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  function rng(seed) {
    let h = 2166136261;
    for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- carga de imágenes y fuentes (con caché) ---------- */
  const imgs = {};
  function load(src) {
    if (!src) return Promise.resolve(null);
    const get = () => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    // un reintento: con mala señal un fallo suelto no debe dejar el afiche sin producto
    return imgs[src] || (imgs[src] = get().then(i => i || new Promise(r => setTimeout(r, 400)).then(get))
      .then(i => { if (!i) delete imgs[src]; return i; }));
  }
  let fontsP = null;
  function ready() {
    if (!fontsP) {
      const specs = ['400 100px "Lilita One"', '900 60px Montserrat', '800 60px Montserrat', '700 60px Montserrat', '600 60px Montserrat', '400 60px "Kaushan Script"'];
      const all = root.document && document.fonts ? Promise.all(specs.map(s => document.fonts.load(s, 'ÁÉÍÓÚÑáéíóúñ¡¿S/ 0.9×').catch(() => null))) : Promise.resolve();
      fontsP = Promise.race([all, new Promise(r => setTimeout(r, 6000))]).then(() => true); // sin red se dibuja con fuentes del sistema
    }
    return fontsP;
  }
  async function assets(p) {
    const props = (p.props || []).filter(n => !/^deco/.test(n)), decos = (p.props || []).filter(n => /^deco/.test(n));
    const list = await Promise.all([load(D().marca.logo), load(D().marca.isotipoBlanco), load(p.hero || p.foto)]
      .concat(props.map(n => load(IMG + n + '.webp')), decos.map(n => load(IMG + n + '.webp'))));
    return {
      logo: list[0], la: list[0] ? list[0].height / list[0].width : 613 / 774, iso: list[1], hero: list[2], photo: !p.hero,
      props: list.slice(3, 3 + props.length).filter(Boolean),
      decos: decos.map((n, i) => ({ n, im: list[3 + props.length + i] })).filter(d => d.im)
    };
  }

  /* ---------- primitivas de dibujo ---------- */
  let S = 1; // escala del canvas: las sombras no siguen la transformación
  function shadow(ctx, c, blur, ox, oy) { ctx.shadowColor = c; ctx.shadowBlur = blur * S; ctx.shadowOffsetX = (ox || 0) * S; ctx.shadowOffsetY = (oy || 0) * S; }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  const setFont = (ctx, wt, size, fam) => (ctx.font = `${wt} ${Math.max(1, size).toFixed(1)}px ${fam}`);
  const capOf = ctx => ctx.measureText('H').actualBoundingBoxAscent || 0;
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  const paint = (ctx, f, y0, y1) => (Array.isArray(f) ? vgrad(ctx, y0, y1, f) : f);
  function icon(ctx, name, x, y, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24);
    ctx.fillStyle = color; ctx.fill(paths[name] || (paths[name] = new Path2D(ICON[name]))); ctx.restore();
  }
  function waIcon(ctx, cx, cy, r) {
    ctx.fillStyle = '#25D366'; circle(ctx, cx, cy, r); ctx.fill();
    const R = r * 0.6, a1 = 0.82 * Math.PI, a0 = 0.68 * Math.PI, ta = 0.75 * Math.PI;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.11; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a1, a0 + Math.PI * 2);
    ctx.lineTo(cx + Math.cos(ta) * R * 1.42, cy + Math.sin(ta) * R * 1.42); ctx.closePath(); ctx.stroke();
    icon(ctx, 'phone', cx - r * 0.3, cy - r * 0.3, r * 0.6, '#FFFFFF');
  }
  function igIcon(ctx, x, y, s, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.1;
    rr(ctx, x + s * 0.05, y + s * 0.05, s * 0.9, s * 0.9, s * 0.26); ctx.stroke();
    circle(ctx, x + s / 2, y + s / 2, s * 0.21); ctx.stroke();
    circle(ctx, x + s * 0.74, y + s * 0.26, s * 0.06); ctx.fill();
  }

  /* ---------- texto: ajuste automático y dibujo ---------- */
  function wrap(words, t, m, J) {
    const out = []; let cur = '';
    for (const w of words) { const nx = cur ? cur + J + w : w; if (cur && m(nx) > t) { out.push(cur); cur = w; } else cur = nx; }
    if (cur) out.push(cur);
    return out;
  }
  // Reparte las palabras en n líneas lo más parejas posible (ancho máximo mínimo).
  function balance(words, n, m, J) {
    if (n === 1) return [words.join(J)];
    let lo = Math.max.apply(null, words.map(m)), hi = m(words.join(J));
    for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (wrap(words, mid, m, J).length <= n) hi = mid; else lo = mid; }
    return wrap(words, hi + 1e-6, m, J);
  }
  // Elige líneas y el tamaño mayor que cabe en la caja {w, h}; sw = contorno total en em.
  // wide: espacio ancho entre palabras (el contorno grueso se come el espacio normal).
  function fit(ctx, text, o) {
    let src = String(text == null ? '' : text).trim();
    if (o.upper) src = src.toUpperCase();
    const fam = o.fam || LIL, wt = o.wt || 400, lh = o.lh || 1.05, sw = o.sw || 0, J = o.wide ? ' ' + String.fromCharCode(0x2009) : ' ';
    setFont(ctx, wt, 100, fam);
    const m = s => ctx.measureText(s).width / 100;
    let best = null;
    const tryL = lines => {
      const wid = Math.max.apply(null, lines.map(m));
      const size = Math.min(o.max, o.w / (wid + sw || 1), o.h / (lines.length * lh));
      const score = size * (lines.length > 1 && lines.some(l => l.length <= 3) ? 0.8 : 1); // evita líneas sueltas como «DE»
      if (!best || score > best.score + 0.5) best = { lines, size, score };
    };
    const forced = src.split('\n');
    if (forced.length > 1) tryL(forced.map(l => l.trim().split(/\s+/).join(J)));
    else { const words = src.split(/\s+/); for (let n = 1; n <= Math.min(o.lines || 3, words.length); n++) tryL(balance(words, n, m, J)); }
    const size = Math.max(o.min || 12, Math.floor(best.size));
    return { lines: best.lines, size, lh, fam, wt, h: best.lines.length * lh * size };
  }
  // st: {fill (color o degradado), stroke, ow (contorno en em), extrude, depth (em), shadow, align}
  function drawText(ctx, L, x, y, w, st) {
    st = st || {};
    setFont(ctx, L.wt, L.size, L.fam);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const lineH = L.lh * L.size, capH = capOf(ctx) || L.size * 0.7;
    const ow = (st.ow || 0) * L.size, depth = Math.round((st.depth || 0) * L.size);
    L.lines.forEach((line, i) => {
      const tw = ctx.measureText(line).width + ow * 2, k = tw > w ? w / tw : 1, vw = tw * k; // nunca se corta: se angosta
      const cx = st.align === 'left' ? x + vw / 2 : st.align === 'right' ? x + w - vw / 2 : x + w / 2;
      const by = y + i * lineH + (lineH + capH) / 2;
      ctx.save(); ctx.translate(cx, by); if (k < 1) ctx.scale(k, 1);
      if (ow) {
        ctx.lineWidth = ow * 2; ctx.strokeStyle = st.extrude || st.stroke;
        if (st.shadow) shadow(ctx, st.shadow, L.size * 0.1, 0, L.size * 0.06);
        for (let d = depth; d > 0; d--) { ctx.strokeText(line, 0, d); noShadow(ctx); }
        ctx.strokeStyle = st.stroke; ctx.strokeText(line, 0, 0); noShadow(ctx);
      } else if (st.shadow) shadow(ctx, st.shadow, L.size * 0.08, 0, L.size * 0.04);
      ctx.fillStyle = paint(ctx, st.fill || INK, -capH, 0);
      ctx.fillText(line, 0, 0); noShadow(ctx);
      ctx.restore();
    });
    return L.h;
  }
  // Texto de una línea con espaciado entre letras (dibujado letra por letra).
  function spaced(ctx, text, cx, by, sp) {
    const ch = Array.from(text), ws = ch.map(c => ctx.measureText(c).width);
    const tw = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
    let x = cx - tw / 2; ctx.textAlign = 'left';
    ch.forEach((c, i) => { ctx.fillText(c, x, by); x += ws[i] + sp; });
    return tw;
  }

  /* ---------- piezas gráficas ---------- */
  // Hoja de palmera vectorial: nervio curvo con foliolos a ambos lados (relleno o en línea).
  function frond(ctx, x, y, len, ang, bend, st) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const cx = (x + ex) / 2 - Math.sin(ang) * bend * len, cy = (y + ey) / 2 + Math.cos(ang) * bend * len;
    const pt = t => [(1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey];
    const dir = t => Math.atan2(2 * (1 - t) * (cy - y) + 2 * t * (ey - cy), 2 * (1 - t) * (cx - x) + 2 * t * (ex - cx));
    ctx.save(); ctx.globalAlpha = st.a; ctx.fillStyle = ctx.strokeStyle = st.c;
    ctx.lineWidth = st.lw || 3; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    const n = st.n || 15;
    for (let i = 0; i < n; i++) {
      const t = 0.08 + 0.9 * i / (n - 1), [px, py] = pt(t), a = dir(t);
      const L = len * (0.05 + 0.4 * Math.sin(Math.PI * (0.2 + 0.8 * (1 - t))));
      for (const s of [-1, 1]) {
        const b = a + s * (1.05 - 0.45 * t), qx = px + Math.cos(b) * L, qy = py + Math.sin(b) * L;
        const mx = (px + qx) / 2 + Math.cos(a) * L * 0.14, my = (py + qy) / 2 + Math.sin(a) * L * 0.14;
        const wx = -Math.sin(b) * L * 0.075, wy = Math.cos(b) * L * 0.075;
        ctx.beginPath(); ctx.moveTo(px, py);
        ctx.quadraticCurveTo(mx + wx, my + wy, qx, qy); ctx.quadraticCurveTo(mx - wx, my - wy, px, py);
        if (st.line) ctx.stroke(); else ctx.fill();
      }
    }
    ctx.restore();
  }
  function glow(ctx, cx, cy, r, color, a) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.55, rgba(color, a * 0.45)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  function contact(ctx, cx, cy, rx, ry, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(35,20,8,${a})`); g.addColorStop(1, 'rgba(35,20,8,0)');
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
  }
  function sparkle(ctx, x, y, r, c) {
    const k = r * 0.14;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x + k, y - k, x + r, y); ctx.quadraticCurveTo(x + k, y + k, x, y + r);
    ctx.quadraticCurveTo(x - k, y + k, x - r, y); ctx.quadraticCurveTo(x - k, y - k, x, y - r); ctx.fill();
  }
  function arrow(ctx, x1, y1, x2, y2, bend, color, lw) {
    const mx = (x1 + x2) / 2 + (y2 - y1) * bend, my = (y1 + y2) / 2 - (x2 - x1) * bend;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - my, x2 - mx), k = lw * 4;
    ctx.beginPath(); ctx.moveTo(x2 - Math.cos(a - 0.55) * k, y2 - Math.sin(a - 0.55) * k);
    ctx.lineTo(x2, y2); ctx.lineTo(x2 - Math.cos(a + 0.55) * k, y2 - Math.sin(a + 0.55) * k); ctx.stroke();
    ctx.restore();
  }
  function logo(ctx, R, cx, y, w) {
    const h = w * R.la; // sin logo cargado se reserva su lugar igual
    if (R.logo) { shadow(ctx, 'rgba(0,0,0,.28)', 18, 0, 6); ctx.drawImage(R.logo, cx - w / 2, y, w, h); noShadow(ctx); }
    return h;
  }
  // Cinta con colas dobladas; devuelve la altura ocupada.
  function ribbon(ctx, cx, top, text, h, maxW, R) {
    const tail = h * 0.8, off = h * 0.24, wMax = maxW - tail * 2;
    const L = fit(ctx, text, { fam: MON, wt: 900, upper: true, max: h * 0.46, min: h * 0.28, w: wMax - h * 0.9, h: h * 0.6, lines: 1, lh: 1 });
    setFont(ctx, 900, L.size, MON);
    const w = Math.min(wMax, ctx.measureText(L.lines[0]).width + h * 1.1), x0 = cx - w / 2, x1 = cx + w / 2;
    for (const s of [-1, 1]) {
      const e = s < 0 ? x0 : x1, xin = e - s * h * 0.4, xo = e + s * tail;
      ctx.fillStyle = R.dark; ctx.beginPath();
      ctx.moveTo(xin, top + off); ctx.lineTo(xo, top + off); ctx.lineTo(xo - s * h * 0.3, top + off + h / 2);
      ctx.lineTo(xo, top + off + h); ctx.lineTo(xin, top + off + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = mixc(R.dark, '#000000', 0.35); ctx.beginPath();
      ctx.moveTo(e, top + h); ctx.lineTo(e, top + h + off); ctx.lineTo(e - s * h * 0.4, top + h); ctx.closePath(); ctx.fill();
    }
    shadow(ctx, 'rgba(0,0,0,.2)', 10, 0, 4); ctx.fillStyle = R.fill; ctx.fillRect(x0, top, w, h); noShadow(ctx);
    drawText(ctx, L, x0, top + h / 2 - L.size / 2, w, { fill: R.color });
    return h + off;
  }
  // Píldora con texto en una o más partes de color: parts = [[texto, color], ...].
  function pill(ctx, cx, top, parts, h, maxW, fill, ring) {
    let size = h * 0.46; setFont(ctx, 900, size, MON);
    const tw = () => parts.reduce((a, p) => a + ctx.measureText(p[0]).width, 0);
    let t = tw();
    if (t > maxW - h) { size *= (maxW - h) / t; setFont(ctx, 900, size, MON); t = tw(); }
    const w = t + h * 1.1, cy = top + h / 2;
    shadow(ctx, 'rgba(0,0,0,.22)', 14, 0, 5); ctx.fillStyle = fill; rr(ctx, cx - w / 2, top, w, h, h / 2); ctx.fill(); noShadow(ctx);
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = Math.max(2, h * 0.05); rr(ctx, cx - w / 2 + h * 0.1, top + h * 0.1, w - h * 0.2, h * 0.8, h * 0.4); ctx.stroke(); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    let x = cx - t / 2; const by = cy + capOf(ctx) / 2;
    parts.forEach(p => { ctx.fillStyle = p[1]; ctx.fillText(p[0], x, by); x += ctx.measureText(p[0]).width; });
    return h;
  }
  function priceTag(ctx, cx, cy, r, price, T) {
    const P = T.price;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.13);
    shadow(ctx, 'rgba(0,0,0,.3)', 20, 0, 8); ctx.fillStyle = paint(ctx, P.bg, -r, r); circle(ctx, 0, 0, r); ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = P.ring; ctx.lineWidth = r * 0.045; circle(ctx, 0, 0, r * 0.86); ctx.stroke();
    const [cur, num] = price.main.split(' ');
    let big = r * 0.66, wn = 0, wc = 0; // «S/» pequeño junto al número grande, ambos dentro del círculo
    const measure = () => { setFont(ctx, 400, big, LIL); wn = ctx.measureText(num).width; setFont(ctx, 900, big * 0.4, MON); wc = ctx.measureText(cur).width + big * 0.08; };
    measure();
    if (wn + wc > r * 1.5) { big *= r * 1.5 / (wn + wc); measure(); }
    const by = price.unit ? r * 0.12 : r * 0.22, x0 = -(wn + wc) / 2;
    ctx.fillStyle = P.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(cur, x0, by - big * 0.33);
    setFont(ctx, 400, big, LIL); ctx.fillText(num, x0 + wc, by);
    if (price.unit) { setFont(ctx, 800, r * 0.22, MON); ctx.textAlign = 'center'; ctx.fillText(price.unit, 0, by + r * 0.36); }
    ctx.restore();
  }
  function burst(ctx, cx, cy, r, b, T) {
    const P = T.price, n = 18;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.1);
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, q = i % 2 ? r * 0.86 : r; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); }
    shadow(ctx, 'rgba(0,0,0,.3)', 20, 0, 8); ctx.fillStyle = paint(ctx, P.bg, -r, r); ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = P.ring; ctx.lineWidth = r * 0.035; circle(ctx, 0, 0, r * 0.74); ctx.stroke();
    ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    setFont(ctx, 900, r * 0.17, MON); ctx.fillText(b.top, 0, -r * 0.27);
    let big = r * 0.44; setFont(ctx, 400, big, LIL);
    const w = ctx.measureText(b.main).width; if (w > r * 1.36) { big *= r * 1.36 / w; setFont(ctx, 400, big, LIL); }
    ctx.fillText(b.main, 0, r * 0.17);
    setFont(ctx, 800, r * 0.16, MON); ctx.fillText(b.foot, 0, r * 0.44);
    ctx.restore();
  }
  function seal(ctx, cx, cy, r, T) {
    const n = 20;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.16);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2;
      if (!i) ctx.moveTo(Math.cos(a0) * r * 0.93, Math.sin(a0) * r * 0.93);
      ctx.quadraticCurveTo(Math.cos(am) * r * 1.07, Math.sin(am) * r * 1.07, Math.cos(a1) * r * 0.93, Math.sin(a1) * r * 0.93);
    }
    shadow(ctx, 'rgba(0,0,0,.28)', 16, 0, 6); ctx.fillStyle = T.seal.bg; ctx.fill(); noShadow(ctx);
    ctx.setLineDash([r * 0.07, r * 0.05]); ctx.strokeStyle = T.seal.ink; ctx.lineWidth = r * 0.03;
    circle(ctx, 0, 0, r * 0.79); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = T.seal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    setFont(ctx, 400, r * 0.48, LIL); ctx.fillText('100%', 0, r * 0.02);
    setFont(ctx, 900, r * 0.19, MON); ctx.fillText('SABOR', 0, r * 0.28); ctx.fillText('PERUANO', 0, r * 0.5);
    ctx.restore();
  }
  // Fondo con hojas, textura y decoración según el tema.
  function backdrop(ctx, F, T, R, seed) {
    const { w, h } = F, story = h > w;
    if (T.kind === 'crema') {
      ctx.fillStyle = vgrad(ctx, 0, h, ['#FFFBF5', T.bg2]); ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.8);
      g.addColorStop(0, T.bg1); g.addColorStop(1, T.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (T.kind === 'color' && R.iso) {
      const rnd = rng(seed), step = 180;
      ctx.save(); ctx.globalAlpha = 0.07;
      for (let y = 30, row = 0; y < h; y += step, row++) {
        for (let x = (row % 2) * step / 2; x < w + step / 2; x += step) {
          const s = 60 + rnd() * 18;
          ctx.save(); ctx.translate(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 30); ctx.rotate((rnd() - 0.5) * 0.9);
          ctx.drawImage(R.iso, -s / 2, -s / 2, s, s); ctx.restore();
        }
      }
      ctx.restore();
    }
    if (R.decos.length) {
      const k = story ? 1.55 : 1.2;
      R.decos.forEach(d => {
        const dw = d.im.width * k, dh = d.im.height * k;
        if (d.n === 'deco-hoja-1') ctx.drawImage(d.im, w - dw, 0, dw, dh);
        else ctx.drawImage(d.im, 0, story ? 980 : 470, dw, dh);
      });
      return;
    }
    const set = story
      ? [[-70, 360, 600, -0.42, 0.1], [w + 60, 120, 620, Math.PI + 0.5, -0.12], [-50, 1240, 430, -0.12, 0.08], [w + 50, 1050, 470, Math.PI + 0.18, -0.1]]
      : [[-60, 200, 430, -0.38, 0.1], [w + 50, 70, 450, Math.PI + 0.5, -0.12]];
    set.forEach(f => frond(ctx, f[0], f[1], f[2], f[3], f[4], T.fr));
  }
  // Cómo va el recorte: algunos tienen un corte recto que debe quedar contra el borde.
  const anchorOf = p => (p.anclaHero === 'abajo-derecha' ? 'br' : p.key === 'emp-hawaiana' ? 'r' : 'c');
  // Producto protagonista; mode: 'glow' (halo) o 'plate' (plato crema).
  function heroAt(ctx, R, p, box, T, an, mode) {
    const im = R.hero;
    if (!im) return box;
    if (R.photo) return framed(ctx, im, box, T);
    const r = Math.min(box.w / im.width, box.h / im.height, 1.15), w = im.width * r, h = im.height * r;
    let x = box.x + (box.w - w) / 2, y = box.y + (box.h - h) / 2;
    if (an === 'r' || an === 'br') x = box.x + box.w - w;
    if (an === 'br') y = box.y + box.h - h;
    const cx = x + w / 2, cy = y + h / 2;
    if (mode === 'plate' && an !== 'br') { // la mano sale del borde: un plato detrás no tiene sentido
      const pr = Math.min(Math.max(w, h) * 0.5, box.h * 0.52, (box.w + 40) / 2);
      shadow(ctx, 'rgba(0,0,0,.28)', 40, 0, 18); ctx.fillStyle = T.plate; circle(ctx, cx, cy, pr); ctx.fill(); noShadow(ctx);
      ctx.strokeStyle = rgba(T.c, 0.35); ctx.lineWidth = 4; ctx.setLineDash([14, 12]); circle(ctx, cx, cy, pr * 0.9); ctx.stroke(); ctx.setLineDash([]);
    } else glow(ctx, cx, cy, Math.max(w, h) * 0.66, T.glow, T.glowA);
    if (an !== 'br') contact(ctx, cx, y + h * 0.95, w * 0.42, Math.max(16, h * 0.07), T.kind === 'oscuro' ? 0.6 : 0.34);
    shadow(ctx, T.kind === 'oscuro' ? 'rgba(0,0,0,.55)' : 'rgba(45,25,10,.3)', 34, 0, 16);
    ctx.drawImage(im, x, y, w, h); noShadow(ctx);
    return { x, y, w, h };
  }
  // Foto rectangular (postres) en un marco blanco con sombra, levemente girado.
  function framed(ctx, im, box, T) {
    const ar = Math.min(4 / 3, Math.max(4 / 5, im.width / im.height)), bw = Math.min(box.w * 0.86, box.h * ar * 0.9), bh = bw / ar;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.035);
    shadow(ctx, 'rgba(0,0,0,.35)', 40, 0, 18); ctx.fillStyle = '#FFFFFF'; rr(ctx, -bw / 2, -bh / 2, bw, bh, 26); ctx.fill(); noShadow(ctx);
    const pw = bw - 36, ph = bh - 36, s = Math.max(pw / im.width, ph / im.height), sw = pw / s, sh = ph / s;
    rr(ctx, -pw / 2, -ph / 2, pw, ph, 16); ctx.save(); ctx.clip();
    ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, -pw / 2, -ph / 2, pw, ph); ctx.restore();
    ctx.restore();
    return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
  }
  // Frutas reales alrededor del producto (tamaño nativo pequeño: casi sin ampliar).
  function propsAt(ctx, R, box, story) {
    const spots = [[box.x + box.w - 20, box.y + box.h - 10, 'br'], [box.x + 10, box.y + 20, 'tl']];
    R.props.slice(0, 2).forEach((im, i) => {
      const [x, y, c] = spots[i], k = Math.min(1.1, (story ? 250 : 190) / Math.max(im.width, im.height));
      const w = im.width * k, h = im.height * k, dx = c === 'br' ? x - w : x, dy = c === 'br' ? y - h : y;
      ctx.save(); ctx.translate(dx + w / 2, dy + h / 2); ctx.rotate(i ? -0.25 : 0.18);
      shadow(ctx, 'rgba(40,20,5,.3)', 18, 0, 8); ctx.drawImage(im, -w / 2, -h / 2, w, h); noShadow(ctx); ctx.restore();
    });
  }
  // Precio, sello y frutas en las esquinas de la zona del producto.
  function callouts(ctx, M, T, R, box, an, story, hr) {
    const r = M.burst ? (story ? 148 : 116) : story ? 112 : 92, left = an !== 'c';
    if (an === 'c') propsAt(ctx, R, box, story);
    const px = left ? box.x + r * 0.95 : box.x + box.w - r * 0.95, py = box.y + r * 1.02;
    if (M.burst) burst(ctx, px, py, r, M.burst, T);
    else if (M.price) priceTag(ctx, px, py, r, M.price, T);
    if (M.seal && story && an !== 'br') {
      const sr = 118, sx = box.x + sr * 1.05, sy = box.y + box.h - sr * 1.15;
      seal(ctx, sx, sy, sr, T);
      if (hr && an === 'c') arrow(ctx, sx + sr * 0.9, sy - sr * 0.85, Math.max(sx + sr * 1.4, hr.x + hr.w * 0.18), sy - sr * 1.55, -0.28, T.arrow, 7);
    }
    if (M.sparkles) {
      const c = T.kind === 'oscuro' ? '#FFE3A0' : GOLD;
      // con el producto contra el borde, el precio y la frase ocupan la izquierda: brillos solo arriba
      (an === 'c' ? [[0.06, 0.2, 30], [0.93, 0.62, 24], [0.16, 0.86, 20], [0.82, 0.12, 18]] : [[0.46, 0.05, 26], [0.86, 0.1, 18]]).forEach(s => sparkle(ctx, box.x + box.w * s[0], box.y + box.h * s[1], s[2] * (story ? 1.25 : 1), c));
    }
  }
  function kicker(ctx, M, T, cx, top, maxW, type) {
    const k = M.kick, story = maxW > 600;
    type = type || k.type;
    if (type === 'pill') return pill(ctx, cx, top, k.parts, story ? 76 : 60, maxW, T.pill, k.ring);
    if (type === 'ribbon') return ribbon(ctx, cx, top, k.text, story ? 72 : 60, maxW, T.rib);
    if (type === 'script') {
      const L = fit(ctx, k.text, { fam: KAU, max: story ? 66 : 48, min: 30, w: maxW, h: story ? 76 : 56, lines: 1, lh: 1.15 });
      return drawText(ctx, L, cx - maxW / 2, top, maxW, { fill: T.quote, shadow: 'rgba(0,0,0,.2)' });
    }
    // caps: versalitas con filetes a los lados
    const size = story ? 34 : 26;
    setFont(ctx, 800, size, MON); ctx.fillStyle = T.text; ctx.textBaseline = 'alphabetic';
    const tw = spaced(ctx, k.text.toUpperCase(), cx, top + size, size * 0.22);
    ctx.fillRect(cx - tw / 2 - 70, top + size * 0.62, 48, 3); ctx.fillRect(cx + tw / 2 + 22, top + size * 0.62, 48, 3);
    return size * 1.45;
  }
  const titleOpts = (script, w, h, story) => script
    ? { fam: KAU, max: story ? 150 : 104, min: 50, w, h, lines: 2, lh: 1.12, sw: 0.16 }
    : { fam: LIL, upper: true, max: story ? 168 : 118, min: story ? 64 : 46, w, h, lines: 3, lh: 1.02, sw: 0.19, wide: true };

  /* ---------- pie: delivery + pedidos ---------- */
  function phoneRow(ctx, cx, cy, h, maxW, T, label) {
    const tel = D().negocio.telefono;
    const m = k => {
      setFont(ctx, 900, h * 0.34 * k, MON); const lw = ctx.measureText(label).width + h * 0.7 * k;
      setFont(ctx, 400, h * 0.8 * k, LIL); const nw = ctx.measureText(tel).width;
      return { k, lw, nw, ic: h * 0.82 * k, tot: lw + h * 0.26 * k + h * 0.82 * k + h * 0.16 * k + nw };
    };
    let mm = m(1); if (mm.tot > maxW) mm = m(maxW / mm.tot);
    const k = mm.k; let x = cx - mm.tot / 2;
    if (label) {
      const ph = h * 0.62 * k; ctx.fillStyle = T.pill; rr(ctx, x, cy - ph / 2, mm.lw, ph, ph / 2); ctx.fill();
      setFont(ctx, 900, h * 0.34 * k, MON); ctx.fillStyle = CREAM; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(label, x + mm.lw / 2, cy + capOf(ctx) / 2);
      x += mm.lw + h * 0.26 * k;
    }
    waIcon(ctx, x + mm.ic / 2, cy, mm.ic / 2); x += mm.ic + h * 0.16 * k;
    setFont(ctx, 400, h * 0.8 * k, LIL); ctx.fillStyle = T.panelInk; ctx.textAlign = 'left';
    ctx.fillText(tel, x, cy + capOf(ctx) / 2);
  }
  function footer(ctx, F, top, T, band) {
    const story = F.h > F.w, X = 64, W = F.w - 2 * X;
    ctx.beginPath(); ctx.moveTo(0, top + 24); ctx.quadraticCurveTo(F.w / 2, top - 24, F.w, top + 24);
    ctx.lineTo(F.w, F.h); ctx.lineTo(0, F.h); ctx.closePath();
    shadow(ctx, 'rgba(0,0,0,.22)', 26, 0, -6); ctx.fillStyle = T.foot; ctx.fill(); noShadow(ctx);
    const fine = (x, by, align, size) => {
      setFont(ctx, 600, size, MON); ctx.fillStyle = rgba(T.bandRGB, 0.85); ctx.textAlign = align;
      ctx.fillText(D().negocio.disponibilidad, x, by);
    };
    const handle = (x, by, size, alignRight) => {
      setFont(ctx, 700, size, MON); const t = D().negocio.redes, tw = ctx.measureText(t).width, x0 = alignRight ? x - tw - size * 1.3 : x;
      igIcon(ctx, x0, by - size * 0.92, size, rgba(T.bandRGB, 0.85));
      ctx.fillStyle = rgba(T.bandRGB, 0.85); ctx.textAlign = 'left'; ctx.fillText(t, x0 + size * 1.3, by);
    };
    if (story) {
      const L = fit(ctx, band, { fam: LIL, upper: true, max: 60, min: 36, w: W - 80, h: 66, lines: 1, lh: 1 });
      setFont(ctx, 400, L.size, LIL);
      const tw = ctx.measureText(L.lines[0]).width, isz = L.size * 1.1, gx = F.w / 2 - (tw + isz + 14) / 2;
      icon(ctx, 'pin', gx, top + 44 + (66 - isz) / 2, isz, T.band);
      drawText(ctx, L, gx + isz + 14, top + 44 + (66 - L.h) / 2, tw + 2, { fill: T.band, align: 'left' });
      const py = top + 128, ph = 112;
      shadow(ctx, 'rgba(0,0,0,.2)', 18, 0, 6); ctx.fillStyle = T.panel; rr(ctx, X, py, W, ph, 32); ctx.fill(); noShadow(ctx);
      phoneRow(ctx, F.w / 2, py + ph / 2, ph * 0.62, W - 64, T, 'PEDIDOS AL:');
      fine(X + 8, py + ph + 50, 'left', 26);
      handle(X + W - 8, py + ph + 50, 26, true);
    } else {
      const cw = 420, L = fit(ctx, band, { fam: LIL, upper: true, max: 46, min: 28, w: cw - 70, h: 100, lines: 2, lh: 1.05 });
      icon(ctx, 'pin', X, top + 44 + (L.h - 54) / 2, 54, T.band);
      drawText(ctx, L, X + 66, top + 44, cw - 66, { fill: T.band, align: 'left' });
      handle(X, top + 44 + L.h + 40, 21, false);
      fine(X, top + 44 + L.h + 70, 'left', 20);
      const px = X + cw + 20, pw = F.w - X - px, py = top + 34, ph = F.h - 64 - py;
      shadow(ctx, 'rgba(0,0,0,.2)', 16, 0, 6); ctx.fillStyle = T.panel; rr(ctx, px, py, pw, ph, 28); ctx.fill(); noShadow(ctx);
      pill(ctx, px + pw / 2, py + 16, [['PEDIDOS AL:', CREAM]], 40, pw - 40, T.pill);
      phoneRow(ctx, px + pw / 2, py + ph - 48, 76, pw - 36, T, '');
    }
  }

  /* ---------- temas ---------- */
  function theme(kind, c, p) {
    const dk = mixc(c, '#000000', 0.45);
    if (kind === 'crema') return {
      kind, c, bg2: mixc(CREAM, p.fondo, 0.9), glow: p.fondo === CREAM ? '#F6DDAF' : p.fondo, glowA: 0.95,
      title: { fill: CREAM, stroke: c, ow: 0.085, extrude: mixc(c, '#000000', 0.5), depth: 0.05, shadow: 'rgba(40,20,0,.28)' },
      script: { fill: CREAM, stroke: c, ow: 0.07, shadow: 'rgba(40,20,0,.3)' },
      rib: { fill: GREEN, dark: GREEN9, color: CREAM }, rib2: { fill: GOLD, dark: '#A86F0E', color: INK },
      pill: GREEN, quote: dk, text: INK, arrow: dk,
      fr: { c: GREEN, a: 0.14, line: true, lw: 3 }, plate: '#FFFFFF',
      foot: c, band: CREAM, bandRGB: CREAM, panel: '#FFFFFF', panelInk: mixc(c, '#000000', 0.35),
      price: { bg: GOLD, ring: CREAM, ink: INK }, seal: { bg: GREEN, ink: CREAM },
      card: { bg: '#FFFFFF', ink: INK, acc: c, line: rgba(c, 0.22) }
    };
    if (kind === 'color') {
      const darkBase = lum(c) < 0.25;
      return {
        kind, c, bg1: mixc(c, '#FFFFFF', 0.12), bg2: mixc(c, '#000000', 0.18), glow: '#FFFFFF', glowA: 0.3,
        title: { fill: CREAM, stroke: mixc(c, '#000000', 0.55), ow: 0.08, extrude: mixc(c, '#000000', 0.72), depth: 0.045, shadow: 'rgba(0,0,0,.3)' },
        script: { fill: CREAM, stroke: mixc(c, '#000000', 0.55), ow: 0.075, shadow: 'rgba(0,0,0,.35)' },
        rib: { fill: GOLD, dark: '#A86F0E', color: INK }, rib2: { fill: CREAM, dark: '#CDBFA6', color: dk },
        pill: mixc(c, '#000000', 0.25), quote: CREAM, text: CREAM, arrow: CREAM,
        fr: darkBase ? { c: '#FFFFFF', a: 0.22, line: true, lw: 3 } : { c: mixc(c, '#000000', 0.28), a: 0.45, line: false },
        plate: CREAM, foot: mixc(c, '#000000', 0.5), band: CREAM, bandRGB: CREAM, panel: CREAM, panelInk: mixc(c, '#000000', 0.45),
        price: { bg: CREAM, ring: c, ink: mixc(c, '#000000', 0.35) }, seal: { bg: GOLD, ink: INK },
        card: { bg: CREAM, ink: INK, acc: mixc(c, '#000000', 0.2), line: rgba(c, 0.25) }
      };
    }
    return {
      kind, c, bg1: mixc(c, '#000000', 0.62), bg2: mixc(c, '#000000', 0.88), glow: GOLD, glowA: 0.38,
      title: { fill: ['#FFF3CF', '#F0B648'], stroke: '#1B0E05', ow: 0.065, shadow: 'rgba(0,0,0,.55)' },
      script: { fill: ['#FFF3CF', '#F0B648'], stroke: '#1B0E05', ow: 0.06, shadow: 'rgba(0,0,0,.55)' },
      rib: { fill: GOLD, dark: '#8C5A0A', color: '#22140A' }, rib2: { fill: GOLD, dark: '#8C5A0A', color: '#22140A' },
      pill: mixc(c, '#000000', 0.55), quote: '#F2C46B', text: 'rgba(255,245,236,.88)', arrow: '#F2C46B',
      fr: { c: GOLD, a: 0.2, line: true, lw: 2.5 }, plate: CREAM,
      foot: mixc(c, '#000000', 0.9), band: '#F2C46B', bandRGB: '#F2C46B', panel: CREAM, panelInk: '#2A1608',
      price: { bg: ['#FFE6A6', '#E8A122'], ring: '#7A4E0A', ink: '#2A1608' }, seal: { bg: GOLD, ink: '#2A1608' },
      card: { bg: 'rgba(255,245,236,.08)', ink: CREAM, acc: '#F2C46B', line: 'rgba(242,196,107,.3)' }
    };
  }

  /* ---------- composiciones de producto (producto, lanzamiento, pack) ---------- */
  function showStory(ctx, F, p, M, T, R, comp) {
    const X = 64, W = F.w - 2 * X, an = anchorOf(p), right = an === 'c' ? X : 0;
    if (an === 'br' && comp === 'herofirst') comp = 'stack'; // la muñeca debe quedar tapada por el pie
    const qw = an === 'br' ? W * 0.5 : W, script = comp === 'plate' && M.script;
    const Q = M.quote ? fit(ctx, M.quote, { fam: KAU, max: 58, min: 36, w: qw, h: an === 'br' ? 180 : 136, lines: an === 'br' ? 3 : 2, lh: 1.2 }) : null;
    const qy = FOOT_S - 40 - (Q ? Q.h : 0);
    const TL = fit(ctx, M.title, titleOpts(script, W, comp === 'herofirst' ? 210 : 250, true));
    let y = SAFE_T + logo(ctx, R, F.w / 2, SAFE_T, comp === 'herofirst' ? 220 : 240) + 22, box, hr;
    if (comp === 'herofirst') {
      const th = 80 + TL.h + (M.sub ? 92 : 0), ty = qy - 16 - th;
      box = { x: X, y: y - 4, w: F.w - X - right, h: ty - 6 - y };
      if (an === 'br') box.h = FOOT_S + 30 - box.y;
      hr = heroAt(ctx, R, p, box, T, an, 'glow');
      callouts(ctx, M, T, R, box, an, true, hr);
      kicker(ctx, M, T, F.w / 2, ty, W, 'script');
      drawText(ctx, TL, X, ty + 80, W, T.title);
      if (M.sub) ribbon(ctx, F.w / 2, ty + 80 + TL.h + 18, M.sub, 64, W, T.rib2);
    } else {
      y += kicker(ctx, M, T, F.w / 2, y, W, comp === 'plate' ? 'caps' : null) + 14;
      drawText(ctx, TL, X, y, W, script ? T.script : T.title); y += TL.h + 12;
      if (M.sub) { ribbon(ctx, F.w / 2, y, M.sub, 64, W, T.rib2); y += 64 + 30; }
      box = { x: X, y, w: F.w - X - right, h: qy - 14 - y };
      if (an === 'br') box.h = FOOT_S + 30 - box.y;
      hr = heroAt(ctx, R, p, box, T, an, comp === 'plate' ? 'plate' : 'glow');
      callouts(ctx, M, T, R, box, an, true, hr);
    }
    if (Q) drawText(ctx, Q, X, qy, qw, { fill: T.quote, align: an === 'br' ? 'left' : 'center', shadow: T.kind === 'crema' ? null : 'rgba(0,0,0,.25)' });
    footer(ctx, F, FOOT_S, T, M.band);
  }
  function showPost(ctx, F, p, M, T, R, comp) {
    const X = 64, W = F.w - 2 * X, an = anchorOf(p), FT = FOOT_P;
    const top = 64 + 170 * R.la + 14;
    if (comp === 'center') {
      let y = top + kicker(ctx, M, T, F.w / 2, top, W, 'caps') + 6;
      const TL = fit(ctx, M.title, Object.assign(titleOpts(!!M.script, W, 124, false), { lines: 2 }));
      drawText(ctx, TL, X, y, W, M.script ? T.script : T.title); y += TL.h + 10;
      // la frase (o la oferta que escribió el usuario) va en una línea sobre el pie
      const qw = an === 'br' ? W * 0.5 : W;
      const Q = M.quote ? fit(ctx, M.quote, { fam: KAU, max: 42, min: 24, w: qw, h: an === 'br' ? 104 : 52, lines: an === 'br' ? 2 : 1, lh: 1.2 }) : null;
      const qy = FT - 22 - (Q ? Q.h : 0);
      const box = { x: X, y, w: an === 'c' ? W : F.w - X, h: (Q && an !== 'br' ? qy - 6 : FT - 20) - y };
      if (an === 'br') box.h = FT + 30 - box.y;
      const hr = heroAt(ctx, R, p, box, T, an, an === 'c' ? 'plate' : 'glow');
      callouts(ctx, M, T, R, box, an, false, hr);
      if (Q) drawText(ctx, Q, X, qy, qw, { fill: T.quote, align: an === 'br' ? 'left' : 'center', shadow: T.kind === 'crema' ? null : 'rgba(0,0,0,.25)' });
    } else {
      const left = comp === 'split' || an !== 'c', cw = 452, tx = left ? X : F.w - X - cw;
      const box = left ? { x: tx + cw + 6, y: top - 30, w: F.w - (tx + cw + 6) - (an === 'c' ? 26 : 0), h: FT - top + 10 }
        : { x: 26, y: top - 30, w: F.w - X - cw - 26 - 10, h: FT - top + 10 };
      if (an === 'br') box.h = FT + 30 - box.y;
      const hr = heroAt(ctx, R, p, box, T, an, 'glow');
      callouts(ctx, M, T, R, box, an, false, hr);
      let ty = top + 6;
      ty += kicker(ctx, M, T, tx + cw / 2, ty, cw, null) + 16;
      const TL = fit(ctx, M.title, titleOpts(false, cw, 270, false));
      drawText(ctx, TL, tx, ty, cw, T.title); ty += TL.h + 14;
      if (M.sub) { ribbon(ctx, tx + cw / 2, ty, M.sub, 54, cw, T.rib2); ty += 54 + 28; }
      const Q = M.quote ? fit(ctx, M.quote, { fam: KAU, max: 46, min: 30, w: cw, h: Math.max(60, FT - 30 - ty), lines: 3, lh: 1.2 }) : null;
      if (Q) drawText(ctx, Q, tx, ty, cw, { fill: T.quote, shadow: T.kind === 'crema' ? null : 'rgba(0,0,0,.25)' });
    }
    logo(ctx, R, F.w / 2, 64, 170);
    footer(ctx, F, FT, T, M.band);
  }

  /* ---------- bloques de delivery y caja china ---------- */
  function card(ctx, x, y, w, h, T) {
    shadow(ctx, 'rgba(0,0,0,.18)', 22, 0, 8); ctx.fillStyle = T.card.bg; rr(ctx, x, y, w, h, 30); ctx.fill(); noShadow(ctx);
    if (T.kind === 'oscuro') { ctx.strokeStyle = T.card.line; ctx.lineWidth = 2; rr(ctx, x, y, w, h, 30); ctx.stroke(); }
  }
  // Tarjeta de zonas y costos (de TB.data). dry = solo mide.
  function zones(ctx, x, y, w, T, o, dry) {
    const Z = D().delivery.zonas, rh = o.rh, pad = rh * 0.34, head = rh * 0.86, note = o.note ? rh * 0.95 : 0;
    const h = pad * 2 + head + Z.length * rh + note;
    if (dry) return h;
    card(ctx, x, y, w, h, T);
    const C = T.card; let cy = y + pad;
    setFont(ctx, 800, rh * 0.36, MON); ctx.fillStyle = C.acc; ctx.textBaseline = 'alphabetic';
    const htxt = 'COSTO DE DELIVERY';
    spaced(ctx, htxt, x + w / 2, cy + head * 0.62, rh * 0.05);
    cy += head;
    Z.forEach((z, i) => {
      if (i) { ctx.fillStyle = C.line; ctx.fillRect(x + pad, cy, w - pad * 2, 2); }
      const mid = cy + rh / 2;
      icon(ctx, 'pin', x + pad - 4, mid - rh * 0.25, rh * 0.5, C.acc);
      setFont(ctx, 400, rh * 0.5, LIL); const pw = ctx.measureText(money(z.costo)).width;
      ctx.fillStyle = C.acc; ctx.textAlign = 'right'; ctx.fillText(money(z.costo), x + w - pad, mid + capOf(ctx) / 2);
      const nmax = w - pad * 2 - rh * 0.6 - pw - 20;
      let ns = rh * 0.38; setFont(ctx, 700, ns, MON);
      const nw = ctx.measureText(z.nombre).width; if (nw > nmax) { ns *= nmax / nw; setFont(ctx, 700, ns, MON); }
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText(z.nombre, x + pad + rh * 0.56, mid + capOf(ctx) / 2);
      cy += rh;
    });
    if (note) minNote(ctx, x, cy, w, note, T, rh * 0.34);
    return h;
  }
  // Zonas en tres columnas (variante de la historia).
  function zoneStrip(ctx, x, y, w, T, mar, dry) {
    const Z = D().delivery.zonas, ch = 214, note = mar ? 72 : 0, h = ch + note;
    if (dry) return h;
    card(ctx, x, y, w, h, T);
    const C = T.card, cw = w / Z.length;
    Z.forEach((z, i) => {
      const cx = x + cw * i + cw / 2;
      if (i) { ctx.fillStyle = C.line; ctx.fillRect(x + cw * i - 1, y + 34, 2, ch - 68); }
      icon(ctx, 'pin', cx - 22, y + 22, 44, C.acc);
      const L = fit(ctx, z.nombre, { fam: MON, wt: 700, max: 32, min: 22, w: cw - 40, h: 78, lines: 2, lh: 1.15 });
      drawText(ctx, L, cx - (cw - 40) / 2, y + 72 + (78 - L.h) / 2, cw - 40, { fill: C.ink });
      setFont(ctx, 400, 50, LIL); ctx.fillStyle = C.acc; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(money(z.costo), cx, y + ch - 26);
    });
    if (note) minNote(ctx, x, y + ch, w, note, T, 28);
    return h;
  }
  function minNote(ctx, x, y, w, h, T, fs) {
    const C = T.card, t = 'Marcianos: delivery desde ' + D().delivery.minimoMarcianos + ' unidades', max = w - 48 - fs * 1.6;
    ctx.fillStyle = C.line; ctx.fillRect(x + 24, y, w - 48, 2);
    setFont(ctx, 700, fs, MON); let tw = ctx.measureText(t).width;
    if (tw > max) { fs *= max / tw; setFont(ctx, 700, fs, MON); tw = ctx.measureText(t).width; }
    const gx = x + w / 2 - (tw + fs * 1.6) / 2, mid = y + h / 2 + 2;
    icon(ctx, 'truck', gx, mid - fs * 0.65, fs * 1.3, C.acc);
    ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(t, gx + fs * 1.6, mid + capOf(ctx) / 2);
  }
  function payRow(ctx, cx, y, h, maxW, T) {
    const list = D().negocio.pagos;
    let fs = h * 0.42; const m = () => {
      setFont(ctx, 700, fs, MON); const lw = ctx.measureText('Paga con').width;
      setFont(ctx, 900, fs, MON); const cws = list.map(t => ctx.measureText(t).width + fs * 1.3);
      return { lw, cws, tot: lw + fs * 0.6 + cws.reduce((a, b) => a + b, 0) + fs * 0.4 * (list.length - 1) };
    };
    let mm = m(); if (mm.tot > maxW) { fs *= maxW / mm.tot; mm = m(); }
    let x = cx - mm.tot / 2; const cy = y + h / 2;
    setFont(ctx, 700, fs, MON); ctx.fillStyle = T.text; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Paga con', x, cy + capOf(ctx) / 2); x += mm.lw + fs * 0.6;
    list.forEach((t, i) => {
      const cw = mm.cws[i], ch = fs * 1.9;
      ctx.fillStyle = '#FFFFFF'; shadow(ctx, 'rgba(0,0,0,.14)', 8, 0, 3); rr(ctx, x, cy - ch / 2, cw, ch, ch / 2); ctx.fill(); noShadow(ctx);
      setFont(ctx, 900, fs, MON); ctx.fillStyle = PAY[t] || INK; ctx.textAlign = 'center';
      ctx.fillText(t, x + cw / 2, cy + capOf(ctx) / 2); x += cw + fs * 0.4;
    });
  }
  function clockTime(ctx, cx, cy, h, T) {
    const [hm, ap] = hm12(D().delivery.salida);
    setFont(ctx, 400, h, LIL); const w1 = ctx.measureText(hm).width + h * 0.16;
    setFont(ctx, 400, h * 0.42, LIL); const w2 = ctx.measureText(ap).width;
    const ic = h * 0.62, gap = h * 0.1, tot = ic + gap + w1 + gap * 0.7 + w2;
    let x = cx - tot / 2;
    shadow(ctx, 'rgba(0,0,0,.2)', 10, 0, 4); ctx.fillStyle = T.kind === 'crema' ? '#FFFFFF' : CREAM; circle(ctx, x + ic / 2, cy, ic * 0.47); ctx.fill(); noShadow(ctx);
    icon(ctx, 'clock', x, cy - ic / 2, ic, T.kind === 'oscuro' ? '#2A1608' : T.c);
    x += ic + gap;
    const L = { lines: [hm], size: h, lh: 1, fam: LIL, wt: 400, h };
    drawText(ctx, L, x, cy - h / 2, w1, Object.assign({}, T.title, { align: 'left' }));
    setFont(ctx, 400, h * 0.42, LIL); const capB = h * 0.7;
    ctx.lineWidth = h * 0.04; ctx.strokeStyle = T.title.stroke; ctx.lineJoin = 'round'; ctx.textAlign = 'left';
    const ax = x + w1 + gap * 0.7;
    ctx.strokeText(ap, ax, cy + capB / 2); ctx.fillStyle = paint(ctx, T.title.fill, cy, cy + capB / 2); ctx.fillText(ap, ax, cy + capB / 2);
  }
  function includesOf(p) {
    const m = /^(.*?) con su (.*)\.$/.exec(p.desc || '');
    if (!m) return { head: '', items: [p.desc] };
    return { head: m[1] + ' con:', items: m[2].split(/, | y /).map(cap) };
  }
  function includes(ctx, x, y, w, T, cols, rh, dry) {
    const I = includesOf(D().porKey['caja-china']), rows = Math.ceil(I.items.length / cols), pad = rh * 0.42;
    const h = pad * 2 + rh * 0.9 + rows * rh;
    if (dry) return h;
    card(ctx, x, y, w, h, T);
    const C = T.card; ctx.textBaseline = 'alphabetic';
    setFont(ctx, 800, rh * 0.42, MON); ctx.fillStyle = C.acc; ctx.textAlign = 'center';
    ctx.fillText(I.head, x + w / 2, y + pad + rh * 0.55);
    const colW = (w - pad * 2) / cols;
    I.items.forEach((t, i) => {
      const c = i % cols, r = Math.floor(i / cols), ix = x + pad + c * colW, iy = y + pad + rh * 0.9 + r * rh + rh / 2;
      ctx.fillStyle = C.acc; circle(ctx, ix + rh * 0.24, iy, rh * 0.24); ctx.fill();
      icon(ctx, 'check', ix + rh * 0.07, iy - rh * 0.17, rh * 0.34, T.kind === 'oscuro' ? '#2A1608' : CREAM);
      let fs = rh * 0.4; setFont(ctx, 700, fs, MON);
      const max = colW - rh * 0.66; const tw = ctx.measureText(t).width; if (tw > max) { fs *= max / tw; setFont(ctx, 700, fs, MON); }
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText(t, ix + rh * 0.62, iy + capOf(ctx) / 2);
    });
    return h;
  }

  const thin = T => Object.assign({}, T.title, { ow: 0.065, depth: 0.035 }); // frase larga: contorno más fino
  function deliveryStory(ctx, F, p, M, T, R, comp) {
    const X = 64, W = F.w - 2 * X, mar = p.cat === 'marcianos', an = anchorOf(p), strip = comp === 'strip';
    let y = SAFE_T + logo(ctx, R, F.w / 2, SAFE_T, 200) + 18;
    if (strip) y += kicker(ctx, { kick: { text: '¡Separa tu pedido!' } }, T, F.w / 2, y - 6, W, 'script') + 4;
    else y += ribbon(ctx, F.w / 2, y, '¡Separa tu pedido!', 72, W, T.rib) + 16;
    const TL = fit(ctx, 'El delivery sale a las', { fam: LIL, upper: true, max: 92, min: 56, w: W, h: 100, lines: 1, lh: 1.05, sw: 0.14, wide: true });
    drawText(ctx, TL, X, y, W, thin(T)); y += TL.h + 4;
    clockTime(ctx, F.w / 2, y + 90, 178, T); y += 194;
    const payY = FOOT_S - 36 - 60;
    if (strip) { // sin fila de pagos: el producto gana espacio (los pagos van en el texto)
      const sh = zoneStrip(ctx, 0, 0, W, T, mar, true), sy = FOOT_S - 44 - sh;
      heroAt(ctx, R, p, { x: X, y: y - 4, w: an === 'c' ? W : F.w - X, h: sy - 8 - y }, T, an, 'glow');
      zoneStrip(ctx, X, sy, W, T, mar);
    } else {
      const cw = 548, left = comp === 'a' || an !== 'c', zx = left ? X : F.w - X - cw; // un corte va contra el borde derecho
      const zh = zones(ctx, 0, 0, cw, T, { rh: 80, note: mar }, true), zy = y + Math.max(0, (payY - 22 - y - zh) / 2);
      const box = left ? { x: zx + cw + 4, y: y - 10, w: F.w - zx - cw - 4 - (an === 'c' ? 24 : 0), h: payY - 6 - y }
        : { x: 24, y: y - 10, w: zx - 28, h: payY - 6 - y };
      heroAt(ctx, R, p, box, T, an, 'glow');
      zones(ctx, zx, zy, cw, T, { rh: 80, note: mar });
      payRow(ctx, F.w / 2, payY, 60, W, T);
    }
    footer(ctx, F, FOOT_S, T, M.band);
  }
  function deliveryPost(ctx, F, p, M, T, R, comp) {
    const X = 64, W = F.w - 2 * X, FT = FOOT_P, mar = p.cat === 'marcianos';
    const top = 64 + 150 * R.la + 10;
    logo(ctx, R, F.w / 2, 64, 150);
    const TL = fit(ctx, 'El delivery sale a las', { fam: LIL, upper: true, max: 70, min: 40, w: W, h: 74, lines: 1, lh: 1.05, sw: 0.14, wide: true });
    drawText(ctx, TL, X, top, W, thin(T));
    clockTime(ctx, F.w / 2, top + TL.h + 66, 128, T);
    const an = anchorOf(p), ry = top + TL.h + 146, cw = 530, left = comp === 'a' || an !== 'c'; // un corte va contra el borde derecho
    const zx = left ? X : F.w - X - cw, zh = zones(ctx, zx, ry, cw, T, { rh: 62, note: mar });
    payRow(ctx, zx + cw / 2, ry + zh + 12, 48, cw, T);
    const box = left ? { x: zx + cw + 10, y: ry + 60, w: F.w - zx - cw - 10 - (an === 'c' ? 20 : 0), h: FT - ry - 66 } : { x: 20, y: ry + 60, w: zx - 30, h: FT - ry - 66 };
    heroAt(ctx, R, p, box, T, an, 'glow');
    pill(ctx, box.x + box.w / 2, ry, [['¡SEPARA TU PEDIDO!', CREAM]], 52, box.w - 20, T.pill);
    footer(ctx, F, FT, T, M.band);
  }
  function cajaStory(ctx, F, p, M, T, R, comp) {
    const X = 64, W = F.w - 2 * X;
    const y = SAFE_T + logo(ctx, R, F.w / 2, SAFE_T, 230) + 20;
    const DL = fit(ctx, p.desc, { fam: MON, wt: 600, max: 40, min: 28, w: W - 60, h: 112, lines: 2, lh: 1.3 });
    const TL = fit(ctx, M.title, titleOpts(false, W, 230, true));
    let box;
    if (comp === 'b') {
      const dy = FOOT_S - 48 - DL.h, ty = dy - 16 - TL.h, ky = ty - 14 - 76;
      box = { x: X, y: y - 6, w: W, h: ky - 10 - y };
      heroAt(ctx, R, p, box, T, 'c', 'glow');
      kicker(ctx, M, T, F.w / 2, ky, W, 'pill');
      drawText(ctx, TL, X, ty, W, T.title);
      drawText(ctx, DL, X + 30, dy, W - 60, { fill: T.text });
    } else {
      let ty = y + kicker(ctx, M, T, F.w / 2, y, W, 'ribbon') + 14;
      drawText(ctx, TL, X, ty, W, T.title); ty += TL.h + 10;
      drawText(ctx, DL, X + 30, ty, W - 60, { fill: T.text }); ty += DL.h + 14;
      box = { x: X, y: ty, w: W, h: FOOT_S - 40 - ty };
      heroAt(ctx, R, p, box, T, 'c', 'glow');
    }
    priceTag(ctx, X + W - 112, box.y + 116, 112, M.price, T);
    footer(ctx, F, FOOT_S, T, M.band);
  }
  function cajaPost(ctx, F, p, M, T, R, comp) {
    const X = 64, FT = FOOT_P, cw = 440, left = comp === 'a', tx = left ? X : F.w - X - cw;
    const top = 64 + 170 * R.la + 14;
    const box = left ? { x: tx + cw, y: top - 20, w: F.w - tx - cw - 20, h: FT - top } : { x: 20, y: top - 20, w: F.w - X - cw - 30, h: FT - top };
    heroAt(ctx, R, p, box, T, 'c', 'glow');
    priceTag(ctx, left ? box.x + box.w - 84 : box.x + 90, box.y + 96, 86, M.price, T);
    let ty = top + 4;
    ty += kicker(ctx, M, T, tx + cw / 2, ty, cw, left ? 'ribbon' : 'pill') + 14;
    const TL = fit(ctx, M.title, titleOpts(false, cw, 210, false)); drawText(ctx, TL, tx, ty, cw, T.title); ty += TL.h + 16;
    includes(ctx, tx, ty, cw, T, 1, Math.min(50, (FT - 26 - ty) / 5.75));
    logo(ctx, R, F.w / 2, 64, 170);
    footer(ctx, F, FT, T, M.band);
  }

  /* ---------- contenido de cada plantilla (solo datos reales) ---------- */
  const descOf = p => (p.desc || '').replace(/^¡Gran lanzamiento!\s*/, '');
  function model(tpl, p, offer) {
    const mar = p.cat === 'marcianos', emp = p.cat === 'empanadas', caja = p.cat === 'caja-china';
    const unit = mar || emp ? 'c/u' : '', price = { main: money(p.precio), unit };
    const band = caja ? 'Delivery todos los domingos' : '¡Delivery a todo Tarapoto!';
    const N = D().negocio;
    if (tpl === 'lanzamiento') return {
      kick: { type: 'pill', text: '¡Gran lanzamiento!', parts: [['¡GRAN ', CREAM], ['LANZAMIENTO!', '#FFC94D']], ring: 'rgba(255,245,236,.35)' },
      title: p.nombre, sub: p.premium ? 'Marciano premium' : 'Marcianos gourmet', price, sparkles: true,
      quote: 'Pruébalo: ¡el sabor de la selva!', band
    };
    if (tpl === 'promo') {
      const n = D().delivery.minimoMarcianos;
      return {
        kick: { type: 'ribbon', text: p.nombre }, title: 'Pack de ' + n + ' marcianos',
        burst: { top: n + ' × ' + money(p.precio), main: money(p.precio * n), foot: '+ delivery' },
        quote: offer || '¡Pide ' + n + ' y te lo llevamos!', band
      };
    }
    if (tpl === 'cajachina') return { kick: { type: 'ribbon', text: 'Todos los domingos', parts: [['TODOS LOS DOMINGOS', CREAM]] }, title: p.nombre, price, band };
    if (tpl === 'delivery') return { band };
    return {
      kick: { type: 'ribbon', text: mar ? (p.premium ? 'Marciano premium' : 'Marcianos gourmet') : emp ? 'Empanadas caseras' : caja ? 'Todos los domingos' : 'Postres' },
      title: p.nombre, script: true, price, seal: mar || emp,
      quote: mar ? descOf(p) : emp ? N.eslogans[2] : caja ? p.desc : N.eslogans[5], band
    };
  }

  /* ---------- API ---------- */
  const tplKey = t => (TEMPLATES.some(x => x.key === t) ? t : 'producto');
  const vIdx = v => (((v | 0) % NV) + NV) % NV;
  function products(t) {
    const all = D().productos, hero = all.filter(p => p.hero), mar = hero.filter(p => p.cat === 'marcianos');
    switch (tplKey(t)) {
      case 'lanzamiento': return mar.slice().sort((a, b) => b.premium - a.premium);
      case 'promo': return mar;
      // la mano de ron con pasas necesita su esquina inferior derecha libre: no entra en esta composición
      case 'delivery': return hero.filter(p => (p.cat === 'empanadas' || p.cat === 'marcianos') && anchorOf(p) !== 'br');
      case 'cajachina': return all.filter(p => p.cat === 'caja-china');
      default: return hero.concat(all.filter(p => p.cat === 'postres' && p.foto));
    }
  }
  function pick(tpl, k) {
    const list = products(tpl), p = typeof k === 'object' && k ? k : D().porKey[k];
    return p && list.indexOf(p) >= 0 ? p : list[0];
  }
  async function render(canvas, o) {
    o = o || {};
    const tpl = tplKey(o.template), F = FORMATS[o.format] || FORMATS.post, p = pick(tpl, o.product), v = vIdx(o.variant);
    const s = o.scale > 0 ? o.scale : 1, offer = String(o.offer || '').trim().slice(0, 80);
    await ready();
    const R = await assets(p);
    canvas.width = Math.round(F.w * s); canvas.height = Math.round(F.h * s);
    const ctx = canvas.getContext('2d');
    S = s; ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const [kind, cs, cp] = LOOKS[tpl][v], story = F.h > F.w;
    const T = theme(kind, tpl === 'delivery' ? GREEN : p.color, p);
    const M = model(tpl, p, offer);
    backdrop(ctx, F, T, R, tpl + p.key + v);
    if (tpl === 'delivery') (story ? deliveryStory : deliveryPost)(ctx, F, p, M, T, R, story ? cs : cp);
    else if (tpl === 'cajachina') (story ? cajaStory : cajaPost)(ctx, F, p, M, T, R, story ? cs : cp);
    else (story ? showStory : showPost)(ctx, F, p, M, T, R, story ? cs : cp);
    const name = TEMPLATES.find(t => t.key === tpl).name;
    return { title: `${name}: ${p.nombre} (${F.name.toLowerCase()})` };
  }

  /* ---------- textos para redes ---------- */
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  // Próxima hora sugerida desde ahora: slots(día de la semana) -> ['HH:MM', ...].
  function nextSlot(slots) {
    const n = now();
    for (let d = 0; d < 8; d++) {
      const day = new Date(n.getFullYear(), n.getMonth(), n.getDate() + d);
      for (const s of slots(day.getDay())) {
        const [h, m] = s.split(':').map(Number), t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
        if (t - n > 10 * 60000) return { s, label: (d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : DIAS[t.getDay()]) + ' ' + fmt12(s) };
      }
    }
    return { s: '11:30', label: 'Hoy ' + fmt12('11:30') };
  }
  const BEST = { whatsapp: ['11:30', '18:30'], instagram: ['12:00', '19:00'], facebook: ['12:30', '19:30'] };
  function bestTime(tpl, p, net) {
    const [am, pm] = BEST[net];
    if (tpl === 'cajachina' || p.cat === 'caja-china') return nextSlot(wd => (wd === 6 ? [pm] : wd === 0 ? ['10:00'] : []));
    const days = (D().horarios[p.cat] || {}).dias || [0, 1, 2, 3, 4, 5, 6];
    // Lanzamientos en el pico de la noche; lo demás antes de que salga el delivery de las 3:00 p. m.
    return nextSlot(wd => (days.indexOf(wd) < 0 ? [] : tpl === 'lanzamiento' ? [pm] : [am, pm]));
  }
  const dot = s => (/[.!?…]$/.test(s) ? s : s + '.'); // «p. m.» ya termina en punto
  const tagOf = s => '#' + s.normalize('NFD').replace(/\p{M}/gu, '').split(/\s+/).map(cap).join('');
  function caption(o) {
    o = o || {};
    const tpl = tplKey(o.template), p = pick(tpl, o.product), v = vIdx(o.variant);
    const net = BEST[o.network] ? o.network : 'instagram';
    const N = D().negocio, tel = N.telefono, pr = money(p.precio), sale = fmt12(D().delivery.salida), min = D().delivery.minimoMarcianos;
    const mar = p.cat === 'marcianos', emp = p.cat === 'empanadas', caja = p.cat === 'caja-china';
    const offer = dot(String(o.offer || '').trim()).replace(/^\.$/, '');
    const byCost = {}; D().delivery.zonas.forEach(z => (byCost[z.costo] = (byCost[z.costo] || []).concat(z.nombre)));
    const zonas = Object.keys(byCost).sort((a, b) => a - b).map(c => andList(byCost[c]) + ' ' + money(c)).join('; ');
    const largo = low(p.largo), sabor = low(p.nombre), unit = mar || emp ? ' c/u' : '';
    let hooks, body, extra;
    if (tpl === 'delivery') {
      hooks = [`¡El delivery sale a las ${sale}! 🛵`, `Separa tu pedido antes de las ${sale} 🛵`, '¿Ya separaste tu pedido de hoy? 🛵'];
      body = `Llevamos tu pedido a ${zonas}.` + (mar ? ` Marcianos: delivery desde ${min} unidades.` : '');
      extra = `Hoy te recomendamos: ${largo} a ${pr}${unit}. Pagas con ${andList(N.pagos)}.`;
    } else if (tpl === 'promo') {
      hooks = [`¡Arma tu pack de ${min} y te lo llevamos! 🛵`, `${min} marcianos y llegan hasta tu puerta 🛵`, '¿Antojo para toda la familia? 😋'];
      body = `${min} marcianos sabor ${sabor}: ${min} × ${pr} = ${money(p.precio * min)}.`;
      extra = `El delivery sale a las ${sale} (${zonas}).`;
    } else if (tpl === 'lanzamiento') {
      hooks = ['¡Gran lanzamiento! ✨', '¡Llegó lo nuevo de Time Bite! ✨', 'Hay un nuevo integrante en la familia ✨'];
      body = `Te presentamos el ${largo}, a ${pr}${unit}. ${descOf(p)}`;
      extra = `Delivery a todo Tarapoto desde ${min} marcianos; sale a las ${sale}`;
    } else if (caja) {
      hooks = ['¡Este domingo toca chanchito a la caja china! 🐷', 'El antojo del domingo ya tiene nombre 🐷', 'Domingo de chanchito, domingo feliz 🔥'];
      body = `${p.desc} Todo a ${pr}.`;
      extra = 'Delivery todos los domingos.';
    } else if (mar) {
      hooks = ['¿Antojo de algo heladito? 😋', `¡Hoy el antojo tiene sabor a ${sabor}! 😋`, `Así de cremoso es nuestro ${largo} ✨`];
      body = `${cap(largo)} a ${pr} c/u. ${descOf(p)}`;
      extra = `Delivery a todo Tarapoto desde ${min} marcianos; sale a las ${sale}`;
    } else if (emp) {
      hooks = ['¡Empanadas caseras para tu tarde! 🥟', `¿Ya probaste nuestra ${largo}? 🥟`, 'Empanadas 100% caseras, de las que no fallan 🥟'];
      body = `${cap(largo)} a ${pr} c/u. ¡Las más ricas que vas a probar!`;
      extra = `${dot('Atendemos de ' + low(D().horarios.empanadas.texto))} El delivery sale a las ${sale}`;
    } else {
      hooks = ['¿Algo dulce para la tarde? 🍰', `Date un gusto: ${sabor} 🍰`, 'Lo dulce también se pide por WhatsApp 🍰'];
      body = `${cap(largo)} a ${pr}.`;
      extra = 'Atendemos de ' + low(D().horarios.postres.texto);
    }
    const hook = hooks[v], off = offer ? offer + '\n' : '';
    extra = dot(extra);
    let text, hashtags;
    if (net === 'whatsapp') {
      text = `${hook}\n${off}${body}\n${['Responde este estado y te lo separamos.', `Escríbenos al ${tel}.`, 'Pídelo respondiendo este estado.'][v]}`;
      hashtags = [];
    } else if (net === 'facebook') {
      text = `${hook}\n\n${off}${body} ${extra}\n\nHaz tu pedido por WhatsApp al ${tel} 📲`;
      hashtags = ['#TimeBite', '#Tarapoto', caja ? '#CajaChina' : emp ? '#EmpanadasCaseras' : mar ? '#MarcianosGourmet' : '#Postres'];
    } else {
      text = `${hook}\n\n${off}${body}\n${extra}\n\n📲 Pide por WhatsApp al ${tel}.`;
      const cat = caja ? ['#CajaChina', '#ChanchitoALaCajaChina', '#ComidaPeruana'] : emp ? ['#EmpanadasCaseras', '#Empanadas', tagOf('Empanada ' + p.nombre)]
        : mar ? ['#MarcianosGourmet', '#Marcianos', tagOf(p.nombre)] : ['#Postres', '#AlgoDulce', tagOf(p.nombre)];
      hashtags = Array.from(new Set(['#Tarapoto', '#TimeBite', '#SanMartin', '#SaborDeLaSelva', '#DeliveryTarapoto', '#TimeBiteTarapoto'].concat(cat, ['#Peru'], tpl === 'lanzamiento' ? ['#Lanzamiento'] : [])));
    }
    const b = bestTime(tpl, p, net);
    return { text, hashtags, bestTime: b.s, bestTimeLabel: b.label };
  }

  TB.content = { TEMPLATES, FORMATS, ready, products, variants: () => NV, render, caption };
})(typeof window !== 'undefined' ? window : globalThis);
