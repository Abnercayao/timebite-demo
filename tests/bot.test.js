/* Pruebas del bot de pedidos (js/bot.js). Ejecutar: node tests/bot.test.js
   Fechas fijas (hora local): mié. 11/11/2026, jue. 12/11, sáb. 14/11 y dom. 15/11. */
'use strict';
const assert = require('node:assert');
const D = require('../js/data.js');
const bot = require('../js/bot.js');

const T = {
  wed11: '2026-11-11T11:00', wed1630: '2026-11-11T16:30', wed2130: '2026-11-11T21:30',
  thu08: '2026-11-12T08:00', sat12: '2026-11-14T12:00', sun10: '2026-11-15T10:00', fri16: '2026-11-13T16:00'
};
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e.message).split('\n').join('\n      ')); }
}
// Conversación completa: devuelve la última respuesta, todas las respuestas y la conversación.
function chat(when, lines, opts) {
  const c = bot.createConversation(opts), now = new Date(when), all = [];
  for (const l of lines) all.push(bot.reply(c, l, now));
  const r = all[all.length - 1];
  return { c, r, all, now, text: r.messages.map(m => m.text).join('\n') };
}
const txt = r => r.messages.map(m => m.text).join('\n');
const cart = c => Object.fromEntries(c.cart.map(i => [i.key, i.qty]));
const items = s => Object.fromEntries(bot.parse(s).items.map(i => [i.key, i.qty]));
const HAPPY = ['Hola', 'Quiero 2 empanadas de pollo y 8 marcianos de aguaje', 'Delivery a Morales', 'Rosa Panduro', 'Yape', 'Sí, confirmo'];

console.log('Saludo según el día y la hora');
test('mié. 11:00: buenos días, marcianos ya y empanadas desde las 2:00 p. m.', () => {
  const t = chat(T.wed11, ['Hola']).text;
  assert.match(t, /Buenos días/); assert.match(t, /marcianos/); assert.match(t, /empanadas salen desde las 2:00 p\. m\./);
});
test('mié. 16:30: el delivery de hoy ya salió, recojo hasta las 8:00 p. m.', () => {
  const t = chat(T.wed1630, ['buenas tardes']).text;
  assert.match(t, /Buenas tardes/); assert.match(t, /delivery de hoy ya salió/); assert.match(t, /8:00 p\. m\./);
});
test('mié. 21:30: cerrado, se separa para mañana', () => {
  const t = chat(T.wed2130, ['hola']).text;
  assert.match(t, /Buenas noches/); assert.match(t, /ya cerramos/); assert.match(t, /mañana/);
});
test('jue. 08:00: abre a las 10:00 a. m. y ya se puede pedir', () => assert.match(chat(T.thu08, ['hola']).text, /Abrimos hoy a las 10:00 a\. m\./));
test('sáb. 12:00: empanadas solo de lunes a viernes y caja china mañana', () => {
  const t = chat(T.sat12, ['hola']).text;
  assert.match(t, /empanadas las preparamos de lunes a viernes/); assert.match(t, /Mañana domingo hay chanchito/);
});
test('dom. 10:00: hoy hay caja china', () => assert.match(chat(T.sun10, ['hola']).text, /hoy hay chanchito a la caja china/));
test('un segundo «hola» no repite el saludo completo', () => assert.match(chat(T.wed11, ['hola', 'hola']).text, /Hola de nuevo/));

console.log('Información del negocio');
test('carta por categorías con precios reales', () => {
  const t = chat(T.wed11, ['¿me pasas la carta?']).text;
  for (const s of ['Empanadas caseras', 'S/ 5.00', 'Marcianos gourmet', 'S/ 3.00', 'S/ 3.50', 'S/ 4.00', 'Postres', 'Kekesitos', 'S/ 65.00 (antes S/ 70.00)', 'Bebidas', 'Gaseosa 500 ml', 'S/ 30.00']) assert.ok(t.includes(s), 'falta ' + s);
});
test('sabores de marcianos: los 23, con sus tres precios y la tarjeta del lanzamiento', () => {
  const { r } = chat(T.wed11, ['¿Qué sabores de marcianos tienen?']), t = txt(r);
  const mar = D.productos.filter(p => p.cat === 'marcianos');
  assert.strictEqual(mar.length, 23);
  assert.match(t, /23 sabores/);
  for (const p of mar) assert.ok(t.toLowerCase().includes(p.nombre.toLowerCase()), 'falta ' + p.nombre);
  assert.match(t, /\*S\/ 3\.50:\* cheesecake de maracuyá/); assert.match(t, /\*S\/ 4\.00:\* crocante de maracuyá premium/);
  assert.ok(r.messages.some(m => m.product === 'mar-crocante-maracuya'));
});
test('precio de un producto: tarjeta del producto y sin tocar el carrito', () => {
  const { r, c } = chat(T.wed11, ['¿cuánto cuesta el de aguaje?']);
  assert.ok(r.messages.some(m => m.product === 'mar-aguaje'));
  assert.match(txt(r), /S\/ 3\.00/); assert.strictEqual(c.cart.length, 0);
});
test('precio con oferta muestra el precio anterior', () => assert.match(chat(T.wed11, ['¿precio del pie de manzana grande?']).text, /S\/ 65\.00\* \(antes S\/ 70\.00\)/));
test('empanadas un sábado: precio y aviso de que se preparan de lunes a viernes', () => {
  const { r } = chat(T.sat12, ['¿tienen empanadas de pollo?']);
  assert.strictEqual(r.messages[0].product, 'emp-pollo'); assert.match(txt(r), /S\/ 5\.00\* c\/u/); assert.match(txt(r), /lunes a viernes/);
});
test('horarios reales sin «p. m..»', () => {
  const t = chat(T.wed11, ['¿cuál es su horario?']).text;
  assert.match(t, /10:00 a\. m\. a 8:00 p\. m\./); assert.match(t, /2:00 p\. m\. a 8:00 p\. m\./); assert.match(t, /domingos/); assert.doesNotMatch(t, /m\.\./);
});
test('delivery a Morales: costo, salida a las 3:00 p. m. y mínimo de marcianos', () => {
  const t = chat(T.wed11, ['¿Hacen delivery a Morales?']).text;
  assert.match(t, /Morales: el delivery cuesta S\/ 4\.00/); assert.match(t, /3:00 p\. m\./); assert.match(t, /7 unidades/);
});
test('zonas de delivery con sus costos', () => {
  const t = chat(T.wed11, ['¿cuánto cobran de delivery?']).text;
  assert.match(t, /Tarapoto: S\/ 3\.00/); assert.match(t, /La Banda de Shilcayo: S\/ 4\.00/); assert.match(t, /Morales: S\/ 4\.00/);
});
test('medios de pago: Yape, Plin, Visa y Mastercard; nunca ofrece efectivo', () => {
  const t = chat(T.wed11, ['¿aceptan tarjeta?']).text, t2 = chat(T.wed11, ['¿aceptan efectivo?']).text;
  for (const s of ['Yape', 'Plin', 'Visa', 'Mastercard']) assert.ok(t.includes(s));
  assert.doesNotMatch(t + t2, /efectivo/i);
});
test('punto de recojo: «te enviamos la ubicación por aquí»', () => assert.match(chat(T.wed11, ['¿dónde los recojo?']).text, /te enviamos la ubicación por aquí/));
test('redes del negocio', () => assert.match(chat(T.wed11, ['¿tienen instagram?']).text, /@TimeBiteTarapoto/));

console.log('Lectura de pedidos en texto libre');
test('cantidades en palabras: media docena, una docena, un par, dos docenas', () => {
  assert.deepStrictEqual(items('media docena de empanadas de pollo'), { 'emp-pollo': 6 });
  assert.deepStrictEqual(items('una docena de marcianos de coco'), { 'mar-coco': 12 });
  assert.deepStrictEqual(items('un par de rolls de canela'), { 'rolls-canela': 2 });
  assert.strictEqual(bot.parse('dos docenas de marcianos').cats[0].qty, 24);
});
test('varios productos con cifras y palabras', () => {
  assert.deepStrictEqual(items('3 empanadas de pollo y 2 de lomo'), { 'emp-pollo': 3, 'emp-lomo': 2 });
  assert.deepStrictEqual(items('quiero tres de mixto, dos hawaianas y una gaseosa'), { 'emp-mixto': 3, 'emp-hawaiana': 2, gaseosa: 1 });
});
test('cantidad después del producto (pollo x2, lomo 3)', () => {
  assert.deepStrictEqual(items('pollo x2 y lomo x3'), { 'emp-pollo': 2, 'emp-lomo': 3 });
  assert.deepStrictEqual(items('pollo 2 lomo 3'), { 'emp-pollo': 2, 'emp-lomo': 3 });
});
test('sin tildes, plurales y errores comunes (alias de TB.data)', () => {
  assert.deepStrictEqual(items('2 HAWAIANAS, 3 de lucuma y un chescake de maracuya'), { 'emp-hawaiana': 2, 'mar-lucuma': 3, 'mar-cheesecake-maracuya': 1 });
  assert.deepStrictEqual(items('4 boobalou y 2 mokaccino'), { 'mar-chicle': 4, 'mar-mocaccino': 2 });
});
test('gana el alias más largo', () => {
  assert.deepStrictEqual(items('2 cheesecake de fresa'), { 'mar-cheesecake-fresa': 2 });
  assert.deepStrictEqual(items('un pie de fresa'), { 'pie-fresa': 1 });
  assert.deepStrictEqual(items('1 marciano de fresa con leche'), { 'mar-fresa': 1 });
});
test('«3 leches» es un sabor, no una cantidad', () => assert.deepStrictEqual(items('2 de 3 leches'), { 'mar-tres-leches': 2 }));
test('«crocante premium» es un solo producto', () => assert.deepStrictEqual(items('quiero un crocante premium'), { 'mar-crocante-maracuya': 1 }));
test('horas y montos no son cantidades', () => {
  assert.deepStrictEqual(items('quiero 2 de pollo para las 4'), { 'emp-pollo': 2 });
  assert.deepStrictEqual(items('2 de lomo, tengo S/ 20'), { 'emp-lomo': 2 });
});

console.log('Ambigüedad y cambios');
test('«maracuyá» solo: pregunta cheesecake (S/ 3.50) o crocante (S/ 4.00)', () => {
  const { c, text } = chat(T.wed11, ['quiero 2 de maracuya']);
  assert.match(text, /cheesecake de maracuyá\* \(S\/ 3\.50\)/); assert.match(text, /crocante de maracuyá premium\* \(S\/ 4\.00\)/);
  assert.strictEqual(c.cart.length, 0); assert.strictEqual(c.pending.type, 'ambig');
});
test('la respuesta resuelve la ambigüedad con la cantidad pedida', () => {
  assert.deepStrictEqual(cart(chat(T.wed11, ['quiero 2 de maracuya', 'el cheesecake']).c), { 'mar-cheesecake-maracuya': 2 });
  assert.deepStrictEqual(cart(chat(T.wed11, ['quiero 3 de maracuya', 'el premium']).c), { 'mar-crocante-maracuya': 3 });
});
test('agregar más: «también 2 de lomo»', () => assert.deepStrictEqual(cart(chat(T.wed11, ['quiero 3 de pollo', 'también 2 de lomo']).c), { 'emp-pollo': 3, 'emp-lomo': 2 }));
test('quitar: «quita el de lomo»', () => assert.deepStrictEqual(cart(chat(T.wed11, ['3 de pollo y 2 de lomo', 'quita el de lomo']).c), { 'emp-pollo': 3 }));
test('cambiar cantidad: «que sean 4 de pollo»', () => assert.deepStrictEqual(cart(chat(T.wed11, ['quiero 2 de pollo y 1 de lomo', 'que sean 4 de pollo']).c), { 'emp-pollo': 4, 'emp-lomo': 1 }));
test('cambiar sabor: «mejor de lomo»', () => assert.deepStrictEqual(cart(chat(T.wed11, ['quiero 2 de pollo', 'mejor de lomo']).c), { 'emp-lomo': 2 }));
test('cancelar vacía el pedido', () => {
  const { c, text } = chat(T.wed11, ['quiero 2 de pollo', 'delivery', 'cancela']);
  assert.strictEqual(c.cart.length, 0); assert.strictEqual(c.mode, null); assert.match(text, /cancelé tu pedido/);
});
test('solo categoría: pregunta el sabor y reparte la cantidad', () => {
  const t = chat(T.wed11, ['quiero 4 empanadas']);
  assert.match(t.text, /mixto regional\*, \*pollo\*, \*hawaiana\* y \*lomo/);
  assert.deepStrictEqual(cart(chat(T.wed11, ['quiero 4 empanadas', 'de pollo y lomo']).c), { 'emp-pollo': 2, 'emp-lomo': 2 });
});
test('«dame 3» después de preguntar por un producto', () => assert.deepStrictEqual(cart(chat(T.wed11, ['¿tienen de aguaje?', 'dame 3']).c), { 'mar-aguaje': 3 }));

console.log('Pedido completo');
test('delivery: resumen con tarjeta y luego pedido confirmado con todos los campos', () => {
  const { all, r } = chat(T.wed11, HAPPY);
  const summary = all[4];
  assert.strictEqual(summary.order, null);
  const prev = summary.messages.find(m => m.order).order;
  assert.strictEqual(prev.total, 38); assert.ok(!prev.code);
  const o = r.order;
  assert.ok(o, 'sin pedido');
  assert.deepStrictEqual(o.items, [{ key: 'emp-pollo', name: 'Empanada de pollo', qty: 2, price: 5 }, { key: 'mar-aguaje', name: 'Marciano gourmet de aguaje', qty: 8, price: 3 }]);
  assert.strictEqual(o.subtotal, 34); assert.strictEqual(o.mode, 'delivery'); assert.strictEqual(o.zone, 'Morales');
  assert.strictEqual(o.deliveryCost, 4); assert.strictEqual(o.total, 38);
  assert.deepStrictEqual(o.slot, { date: '2026-11-11', time: '15:00', label: 'Hoy en el delivery de las 3:00 p. m.' });
  assert.strictEqual(o.pay, 'Yape'); assert.strictEqual(o.channel, 'Bot de WhatsApp'); assert.strictEqual(o.status, 'nuevo');
  assert.deepStrictEqual(o.customer, { name: 'Rosa Panduro' });
  assert.strictEqual(o.createdAt, new Date(T.wed11).toISOString());
  assert.ok(!('code' in o)); assert.ok(r.messages.some(m => m.order === o), 'el mensaje lleva el mismo objeto');
  assert.match(txt(r), /Rosa/);
});
test('recojo a las 4:30 p. m.: listo desde las 4:50 p. m., sin costo de delivery', () => {
  const o = chat(T.wed1630, ['Quiero 3 empanadas de pollo y 2 de lomo', 'Paso a recoger', 'soy Carlos Pinedo', 'plin', 'si']).r.order;
  assert.strictEqual(o.mode, 'recojo'); assert.strictEqual(o.zone, null); assert.strictEqual(o.deliveryCost, 0);
  assert.strictEqual(o.total, 25); assert.strictEqual(o.pay, 'Plin'); assert.strictEqual(o.customer.name, 'Carlos Pinedo');
  assert.deepStrictEqual(o.slot, { date: '2026-11-11', time: '16:50', label: 'Hoy para recoger desde las 4:50 p. m.' });
});
test('cuentas con S/ 3.50 y S/ 4.00 más delivery a La Banda (justo 7 marcianos)', () => {
  const o = chat(T.wed11, ['4 cheesecake de maracuya y 3 crocante', 'delivery a la banda', 'Ana', 'tarjeta', 'ok']).r.order;
  assert.strictEqual(o.subtotal, 26); assert.strictEqual(o.deliveryCost, 4); assert.strictEqual(o.total, 30);
  assert.strictEqual(o.zone, 'La Banda de Shilcayo'); assert.strictEqual(o.pay, 'Tarjeta');
});
test('costos por zona: Tarapoto S/ 3.00, Banda y Morales S/ 4.00', () => {
  for (const [z, cost, name] of [['tarapoto', 3, 'Tarapoto'], ['shilcayo', 4, 'La Banda de Shilcayo'], ['morales', 4, 'Morales']]) {
    const o = chat(T.wed11, ['quiero 2 de pollo', 'delivery a ' + z, 'Luis', 'yape', 'si']).r.order;
    assert.strictEqual(o.deliveryCost, cost); assert.strictEqual(o.zone, name); assert.strictEqual(o.total, 10 + cost);
  }
});
test('zona sin cobertura: explica, ofrece recojo o Alberto', () => {
  const t = chat(T.wed11, ['quiero 2 de pollo', 'delivery a cacatachi']);
  assert.match(t.text, /Tarapoto, La Banda de Shilcayo y Morales/); assert.match(t.text, /recoger/); assert.match(t.text, /Alberto/);
  const t2 = chat(T.wed11, ['quiero 2 de pollo', 'delivery a cacatachi', 'paso a recoger']);
  assert.strictEqual(t2.c.mode, 'recojo'); assert.strictEqual(t2.c.step, 'nombre');
  assert.deepStrictEqual(chat(T.wed11, ['quiero 2 de pollo', 'delivery a cacatachi', 'Hablar con Alberto']).r.handoff, { reason: 'Delivery fuera de zona' });
});
test('pide efectivo: no lo acepta y vuelve a preguntar el pago', () => {
  const t = chat(T.wed11, ['quiero 2 de pollo', 'recojo', 'Rosa', 'efectivo']);
  assert.strictEqual(t.c.pay, null); assert.strictEqual(t.c.step, 'pago'); assert.match(t.text, /Yape, Plin y tarjeta/);
});
test('dirección escrita: toma la zona y la guarda como nota', () => {
  const o = chat(T.wed11, ['quiero 2 de pollo', 'Jr. Los Pinos 123, Morales', 'Ana', 'yape', 'si']).r.order;
  assert.strictEqual(o.zone, 'Morales'); assert.match(o.note, /Jr\. Los Pinos 123/);
});
test('en el resumen se puede cambiar el pago antes de confirmar', () => {
  const o = chat(T.wed11, ['quiero 2 de pollo', 'recojo', 'Rosa', 'plin', 'mejor con yape', 'si']).r.order;
  assert.strictEqual(o.pay, 'Yape');
});
test('el nombre «Alberto» en el paso del nombre no deriva la conversación', () => {
  const t = chat(T.wed11, ['quiero 2 de pollo', 'recojo', 'Alberto']);
  assert.strictEqual(t.c.name, 'Alberto'); assert.strictEqual(t.c.handoff, null);
});

console.log('Reglas de horario');
test('después del corte (4:30 p. m.) el delivery sale mañana a las 3:00 p. m.', () => {
  const o = chat(T.wed1630, ['quiero 2 de pollo', 'delivery a tarapoto', 'Luis', 'yape', 'si']).r.order;
  assert.deepStrictEqual(o.slot, { date: '2026-11-12', time: '15:00', label: 'Mañana en el delivery de las 3:00 p. m.' });
});
test('9:30 p. m.: preventa para mañana (recojo desde las 10:00 a. m. o delivery a las 3:00 p. m.)', () => {
  const t = chat(T.wed2130, ['quiero 2 de fresa']);
  assert.match(t.text, /ya cerramos: te lo dejo separado para mañana/);
  assert.deepStrictEqual(chat(T.wed2130, ['quiero 2 de fresa', 'recojo', 'Ana', 'yape', 'si']).r.order.slot, { date: '2026-11-12', time: '10:00', label: 'Mañana para recoger desde las 10:00 a. m.' });
  assert.strictEqual(chat(T.wed2130, ['quiero 8 de fresa', 'delivery a morales', 'Ana', 'yape', 'si']).r.order.slot.date, '2026-11-12');
});
test('8:00 a. m.: antes de abrir se separa para el delivery de hoy', () => {
  const t = chat(T.thu08, ['quiero 7 de coco']);
  assert.match(t.text, /Abrimos a las 10:00 a\. m\./);
  assert.deepStrictEqual(chat(T.thu08, ['quiero 7 de coco', 'delivery a morales', 'Ana', 'yape', 'si']).r.order.slot, { date: '2026-11-12', time: '15:00', label: 'Hoy en el delivery de las 3:00 p. m.' });
});
test('empanadas a las 11:00 a. m.: se separan para hoy, recojo desde las 2:00 p. m.', () => {
  const t = chat(T.wed11, ['quiero 2 de pollo']);
  assert.match(t.text, /salen desde las 2:00 p\. m\.: te las dejo separadas para hoy/);
  assert.deepStrictEqual(chat(T.wed11, ['quiero 2 de pollo', 'recojo', 'Ana', 'yape', 'si']).r.order.slot, { date: '2026-11-11', time: '14:00', label: 'Hoy para recoger desde las 2:00 p. m.' });
});
test('empanadas el sábado: preventa para el lunes 16', () => {
  const t = chat(T.sat12, ['quiero 4 empanadas de lomo']);
  assert.match(t.text, /te las separo para el lunes 16 de noviembre/);
  assert.deepStrictEqual(chat(T.sat12, ['quiero 4 empanadas de lomo', 'recojo', 'Ana', 'yape', 'si']).r.order.slot, { date: '2026-11-16', time: '14:00', label: 'Lun. 16 de nov. para recoger desde las 2:00 p. m.' });
  assert.deepStrictEqual(chat(T.sat12, ['quiero 4 empanadas de lomo', 'delivery a tarapoto', 'Ana', 'yape', 'si']).r.order.slot, { date: '2026-11-16', time: '15:00', label: 'Lun. 16 de nov. en el delivery de las 3:00 p. m.' });
});
test('viernes después del corte con empanadas: delivery el lunes', () => {
  assert.strictEqual(chat(T.fri16, ['quiero 2 de pollo', 'delivery a tarapoto', 'Ana', 'yape', 'si']).r.order.slot.date, '2026-11-16');
});
test('domingo: los marcianos salen en el delivery de hoy', () => {
  assert.deepStrictEqual(chat(T.sun10, ['quiero 7 de mango', 'delivery a morales', 'Ana', 'plin', 'si']).r.order.slot, { date: '2026-11-15', time: '15:00', label: 'Hoy en el delivery de las 3:00 p. m.' });
});

console.log('Mínimo de 7 marcianos para delivery');
test('solo marcianos y menos de 7: ofrece completar o recoger', () => {
  const t = chat(T.wed2130, ['3 marcianos con delivery']);
  assert.match(t.text, /desde \*7 unidades\*/); assert.match(t.text, /recoger/); assert.strictEqual(t.c.pending.type, 'min7');
});
test('completar a 7 con el mismo sabor', () => {
  const t = chat(T.wed11, ['quiero 3 de aguaje', 'delivery a tarapoto', 'sí, complétalo']);
  assert.deepStrictEqual(cart(t.c), { 'mar-aguaje': 7 }); assert.strictEqual(t.c.step, 'nombre');
});
test('completar a 7 cuando aún no eligió sabores', () => {
  const t = chat(T.wed2130, ['3 marcianos con delivery', 'si', '4 de aguaje y 3 de coco']);
  assert.deepStrictEqual(cart(t.c), { 'mar-aguaje': 4, 'mar-coco': 3 }); assert.strictEqual(t.c.step, 'zona');
});
test('elegir el sabor tras el aviso del mínimo no duplica la cantidad', () => {
  const t = chat(T.wed11, ['quiero 3 marcianos con delivery', '3 de aguaje']);
  assert.deepStrictEqual(cart(t.c), { 'mar-aguaje': 3 }); assert.match(t.text, /llevas 3\./); assert.match(t.text, /4 más de aguaje/);
});
test('pasar a recoger no tiene mínimo', () => {
  const o = chat(T.wed11, ['quiero 3 de aguaje', 'delivery', 'mejor paso a recoger', 'Ana', 'yape', 'si']).r.order;
  assert.strictEqual(o.mode, 'recojo'); assert.strictEqual(o.total, 9);
});
test('pedido mixto (empanadas + marcianos) no tiene mínimo', () => {
  const t = chat(T.wed11, ['1 de pollo y 2 de coco', 'delivery a morales']);
  assert.strictEqual(t.c.pending, null); assert.strictEqual(t.c.step, 'nombre');
});
test('con recordarMinimo apagado no pide el mínimo', () => {
  const t = chat(T.wed11, ['quiero 3 de aguaje', 'delivery a morales'], { settings: { bot: { recordarMinimo: false } } });
  assert.strictEqual(t.c.pending, null); assert.strictEqual(t.c.step, 'nombre');
});

console.log('Derivación a Alberto');
test('caja china el domingo: explica, cuesta S/ 30.00 y pasa a Alberto', () => {
  const { r } = chat(T.sun10, ['Quiero una caja china para el domingo']), t = txt(r);
  assert.ok(r.messages.some(m => m.product === 'caja-china'));
  assert.match(t, /S\/ 30\.00/); assert.match(t, /domingos/);
  assert.match(D.porKey['caja-china'].desc, /papa sancochada/, 'la tarjeta del producto muestra qué incluye');
  assert.strictEqual(r.messages[r.messages.length - 1].from, 'alberto'); assert.match(t, /hoy domingo/);
  assert.deepStrictEqual(r.handoff, { reason: 'Caja china' }); assert.strictEqual(r.order, null);
});
test('pregunta por la caja china: informa, ofrece separar y con «sí» pasa a Alberto', () => {
  const t = chat(T.wed11, ['¿cuánto cuesta la caja china?']);
  assert.strictEqual(t.r.handoff, null); assert.match(t.text, /domingo 15 de noviembre/);
  const t2 = chat(T.wed11, ['¿cuánto cuesta la caja china?', 'si']);
  assert.deepStrictEqual(t2.r.handoff, { reason: 'Caja china' });
  assert.strictEqual(t2.r.messages.filter(m => m.product === 'caja-china').length, 0, 'no repite la tarjeta');
});
test('con pasarAlberto apagado (Ajustes) el bot atiende el pedido grande', () => {
  const t = chat(T.wed11, ['quiero 50 empanadas de pollo'], { settings: { bot: { pasarAlberto: false } } });
  assert.strictEqual(t.r.handoff, null); assert.deepStrictEqual(cart(t.c), { 'emp-pollo': 50 });
});
test('el interruptor minimoMarcianos de Ajustes apaga el mínimo', () => {
  const t = chat(T.wed11, ['quiero 3 de aguaje', 'delivery a morales'], { settings: { bot: { minimoMarcianos: false } } });
  assert.strictEqual(t.c.pending, null); assert.strictEqual(t.c.step, 'nombre');
});
test('pedido grande (desde ' + D.bot.pedidoGrandeUnidades + ' unidades) pasa a Alberto', () => {
  assert.deepStrictEqual(chat(T.wed11, ['quiero 50 empanadas de pollo']).r.handoff, { reason: 'Pedido grande' });
  assert.strictEqual(chat(T.wed11, ['quiero 39 de coco']).r.handoff, null);
});
test('eventos y pedidos por mayor', () => {
  assert.deepStrictEqual(chat(T.wed11, ['hacen para un cumpleaños?']).r.handoff, { reason: 'Evento o pedido especial' });
  assert.ok(chat(T.wed11, ['venden al por mayor?']).r.handoff);
});
test('reclamo', () => {
  const r = chat(T.wed11, ['mi pedido llegó frío, pésimo']).r;
  assert.deepStrictEqual(r.handoff, { reason: 'Reclamo' }); assert.strictEqual(r.messages[1].from, 'alberto');
});
test('«quiero hablar con una persona»', () => assert.deepStrictEqual(chat(T.wed11, ['quiero hablar con una persona']).r.handoff, { reason: 'Pidió hablar con una persona' }));
test('después de la derivación responde Alberto, y puede volver al asistente', () => {
  const t = chat(T.wed11, ['quiero hablar con una persona', '¿cuánto demora?']);
  assert.strictEqual(t.r.messages.length, 1); assert.strictEqual(t.r.messages[0].from, 'alberto'); assert.strictEqual(t.r.handoff, null);
  const t2 = chat(T.wed11, ['quiero hablar con una persona', 'Quiero hacer otro pedido', 'quiero 2 de pollo']);
  assert.strictEqual(t2.c.handoff, null); assert.deepStrictEqual(cart(t2.c), { 'emp-pollo': 2 });
});
test('cancelar un pedido ya confirmado lo ve Alberto', () => {
  assert.deepStrictEqual(chat(T.wed11, HAPPY.concat(['cancela mi pedido'])).r.handoff, { reason: 'Cancelar un pedido confirmado' });
});

console.log('Ajustes, robustez y sugerencias');
test('bot apagado: avisa que una persona responde pronto', () => {
  const r = chat(T.wed11, ['quiero 2 de pollo'], { settings: { bot: { activo: false } } }).r;
  assert.match(txt(r), /Alberto/); assert.strictEqual(r.order, null);
});
test('mensaje que no entiende: ayuda con opciones y al segundo ofrece a Alberto', () => {
  const t = chat(T.wed11, ['asdfgh']);
  assert.match(t.text, /carta/); assert.match(t.text, /pedido/);
  assert.match(chat(T.wed11, ['asdfgh', 'qwerty']).text, /Alberto/);
  assert.match(chat(T.wed11, ['quiero 2 de pollo', 'zzz']).text, /delivery/, 'en medio del pedido repite la pregunta');
});
test('mensaje vacío no rompe', () => assert.ok(chat(T.wed11, ['   ']).r.messages.length === 1));
test('conv es JSON y se puede retomar desde localStorage', () => {
  const c = bot.createConversation(), now = new Date(T.wed11);
  ['quiero 2 de pollo', 'delivery a morales'].forEach(l => bot.reply(c, l, now));
  const back = JSON.parse(JSON.stringify(c));
  ['Rosa', 'yape'].forEach(l => bot.reply(back, l, now));
  const r = bot.reply(back, 'si', now);
  assert.strictEqual(r.order.total, 14);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(back)), back);
});
test('una conversación vieja o incompleta no rompe', () => assert.ok(bot.reply({ step: 'inicio' }, 'hola', new Date(T.wed11)).messages.length));
test('1 a 3 burbujas, 500–1800 ms y como máximo 2 emojis por turno', () => {
  const emoji = /\p{Extended_Pictographic}/gu, scripts = [
    [T.wed11, HAPPY], [T.wed2130, ['hola, ¿qué sabores de marcianos tienen?', '3 marcianos con delivery', 'si', '4 de aguaje y 3 de coco']],
    [T.sun10, ['Quiero una caja china para el domingo', 'gracias']], [T.wed11, ['carta', 'horario', 'quiero 50 de coco']]];
  for (const [when, lines] of scripts) for (const r of chat(when, lines).all) {
    assert.ok(r.messages.length >= 1 && r.messages.length <= 3, 'burbujas: ' + r.messages.length);
    for (const m of r.messages) assert.ok(m.delay >= 500 && m.delay <= 1800 && m.text.trim(), 'delay ' + m.delay);
    assert.ok((txt(r).match(emoji) || []).length <= 2, 'emojis en: ' + txt(r));
  }
});
test('formatos: dinero S/ 0.00, horas «3:00 p. m.», nunca «S/.» ni «p.m.»', () => {
  const all = chat(T.wed11, ['carta'].concat(HAPPY)).all.map(txt).join('\n');
  assert.doesNotMatch(all, /S\/\.|S\/\d|\dpm|p\.m\.|a\.m\./);
  for (const m of all.match(/S\/ [\d.]+/g)) assert.match(m, /^S\/ \d+\.\d{2}$/);
});
test('sugerencias al inicio: las cuatro del guion', () => {
  const s = bot.suggestions(bot.createConversation(), new Date(T.wed11));
  for (const x of ['¿Qué sabores de marcianos tienen?', 'Quiero 3 empanadas de pollo y 2 de lomo', '¿Hacen delivery a Morales?', 'Quiero una caja china para el domingo']) assert.ok(s.includes(x), 'falta ' + x);
  assert.ok(s.length >= 3 && s.length <= 5);
});
test('sugerencias según el paso del pedido', () => {
  const sug = lines => { const t = chat(T.wed11, lines); return bot.suggestions(t.c, t.now); };
  assert.ok(sug(['quiero 2 de pollo']).includes('Paso a recoger'));
  assert.deepStrictEqual(sug(['quiero 2 de pollo', 'delivery']).slice(0, 3), ['Tarapoto', 'La Banda de Shilcayo', 'Morales']);
  assert.deepStrictEqual(sug(['quiero 2 de pollo', 'recojo', 'Rosa']), ['Yape', 'Plin', 'Tarjeta']);
  assert.ok(sug(['quiero 3 de aguaje', 'delivery a morales']).includes('Mejor paso a recoger'));
  assert.ok(sug(['quiero 2 de pollo', 'recojo', 'Rosa', 'yape'])[0].startsWith('Sí'));
  assert.ok(sug(['quiero hablar con una persona']).includes('Quiero hacer otro pedido'));
  for (const lines of [[], ['quiero 2 de maracuya'], ['quiero 4 empanadas'], ['¿cuánto cuesta la caja china?']]) {
    const s = sug(lines.length ? lines : ['hola']);
    assert.ok(s.length >= 2 && s.length <= 5, lines + ': ' + s.length);
  }
});
test('cada sugerencia obtiene una respuesta útil (nunca el mensaje de no entendí)', () => {
  const walk = (when, lines) => {
    const c = bot.createConversation(), now = new Date(when);
    lines.forEach(l => bot.reply(c, l, now));
    for (const s of bot.suggestions(c, now)) {
      const copy = JSON.parse(JSON.stringify(c));
      assert.doesNotMatch(txt(bot.reply(copy, s, now)), /no te entendí/, 'chip: ' + s);
    }
  };
  for (const when of [T.wed11, T.wed1630, T.wed2130, T.sat12]) {
    walk(when, []); walk(when, ['quiero 2 de pollo']); walk(when, ['quiero 2 de pollo', 'delivery']);
    walk(when, ['quiero 2 de pollo', 'recojo']); walk(when, ['quiero 2 de pollo', 'recojo', 'Rosa']); walk(when, ['quiero 2 de pollo', 'recojo', 'Rosa', 'yape']);
    walk(when, ['quiero 2 de maracuya']); walk(when, ['quiero 4 empanadas']); walk(when, ['quiero 3 de aguaje', 'delivery a morales']);
  }
});

console.log('\n' + passed + ' pruebas correctas, ' + failed + ' con error');
process.exitCode = failed ? 1 : 0;
