# Time Bite · Demo — especificación de construcción

Demo web para Time Bite (Tarapoto, San Martín, Perú). Dueño: Alberto. Vende empanadas caseras, marcianos gourmet (helados en tubo), postres, bebidas y chanchito a la caja china los domingos. La presenta VanguardIA el **miércoles 11/11/2026** en el **celular del cliente**, y se la deja para que la pruebe solo. Debe verse como un producto terminado, no como un prototipo.

Cuatro módulos: **Inicio** (panel), **Pedidos** (bot de WhatsApp que toma pedidos + lista de pedidos), **Contenido** (afiches y textos “generados con IA” + calendario), **Clientes** (frecuentes, tarjeta de sellos, difusión “Empanada del día”). Más **Ajustes**.

## Reglas generales

- Sitio estático para GitHub Pages: HTML + CSS + JS vanilla, **sin build ni dependencias**. Scripts clásicos con `defer` que cuelgan de `window.TB`. Rutas relativas. Debe funcionar también servido localmente (`python -m http.server` desde esta carpeta).
- Externo permitido: solo Google Fonts (un `<link>`): Montserrat 400–900 (interfaz y cuerpo de afiches), Lilita One (títulos de la app y titulares de afiches), Kaushan Script (acentos de afiches). Sin analítica, sin CDN, sin otras peticiones. No subas imágenes ni datos a servicios externos.
- **Mobile-first**: se diseña para 390×844 (y debe verse bien de 360 a 430 px de ancho). En pantallas anchas la app se muestra como una columna de celular centrada (máx. 480 px, con su barra inferior) sobre un fondo de marca; no hay diseño de escritorio aparte.
- Parámetro de prueba `?now=2026-11-11T16:30` (hora local): `TB.app.now()` arranca en esa hora y avanza con el reloj. Sirve para probar cualquier día y hora. Sin scroll horizontal. Botones táctiles ≥44 px. `env(safe-area-inset-*)`. Contraste AA. `prefers-reduced-motion` respetado.
- Español de Perú, tuteo, frases en tipo oración, tildes correctas. Dinero `S/ 3.00` (punto decimal). Horas `3:00 p. m.` / `10:00 a. m.`. Fechas `mié. 11 de nov.`.
- Pie de la app: **“Desarrollado por VanguardIA · Versión de demostración”**.
- `<meta name="robots" content="noindex">`, `theme-color` verde, `apple-touch-icon` = `assets/img/logo-verde.webp`, título “Time Bite · Panel”.
- localStorage clave `tb-demo-v1`, siempre en try/catch; la app debe funcionar si falla. Nunca borrar datos salvo con “Reiniciar demo” (con confirmación).
- Hora: la del celular (`TB.app.now()`). La demo debe verse coherente **cualquier día y a cualquier hora** que se abra (el cliente la probará después): todo lo simulado se calcula a partir de la fecha y hora actuales, no se congela al primer arranque.

## Datos reales: `js/data.js` (`TB.data`, solo lectura)

Ya existe. Contiene negocio, marca (colores y logos), horarios por categoría, delivery (zonas y costos, salida 3 p. m., mínimo de 7 marcianos), configuración del bot, categorías y 36 productos con precio, descripción, imágenes (`hero`/`heroSm` recorte transparente, `thumb` foto cuadrada, `foto` rectangular; pueden ser `null`), color de acento y fondo, y alias para el bot. **No inventes ni cambies precios, horarios, zonas, teléfonos ni medios de pago.** Si algo no está en `TB.data`, no lo afirmes como hecho del negocio.

Hechos clave: empanadas S/ 5.00 (mixto regional, pollo, hawaiana, lomo), lunes a viernes 2–8 p. m. · Marcianos S/ 3.00 (cheesecake de maracuyá S/ 3.50; crocante de maracuyá premium S/ 4.00), todos los días 10 a. m.–8 p. m. · Caja china S/ 30.00, delivery solo domingos · Delivery S/ 3.00 Tarapoto, S/ 4.00 La Banda de Shilcayo y Morales; sale a las 3:00 p. m.; marcianos desde 7 unidades · Punto de recojo (“te enviamos la ubicación por aquí”) · Pagos: Yape, Plin, Visa, Mastercard · WhatsApp 956 935 024 · @TimeBiteTarapoto.

Inventado (y así se dirá en el README): clientes, ventas, pedidos simulados, stock, métricas y resultados de difusión.

## Marca y estilo de la app

Tokens CSS en `:root` (app.css): `--tb-verde:#3D7534; --tb-verde-700:#2C5A26; --tb-verde-900:#1C3A18; --tb-verde-50:#EAF2E6; --tb-mostaza:#E8A122; --tb-mostaza-50:#FDF1D8; --tb-crema:#FFF5EC; --tb-crema-2:#F3E6CC; --tb-marron:#42220B; --tb-tinta:#1F2A1D; --tb-tinta-2:#5B6656; --tb-borde:#E5DAC3; --tb-rojo:#C2412D; --tb-azul:#2E5C8A`. Fondo crema, tarjetas blancas con borde suave y sombra muy leve, verde como color primario, mostaza para acentos. Títulos en Lilita One; texto en Montserrat. Iconos SVG en línea (estilo trazo 2 px, redondeado). Sin emojis en la interfaz salvo dentro de mensajes de chat y textos de redes.

Componentes compartidos (definidos en `css/app.css`, úsalos en todos los módulos): `.card`, `.card-head`, `.btn` (+ `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.btn-block`), `.chip` (+ `.chip-on`), `.seg` (control segmentado: `<div class="seg"><button aria-pressed="true">`), `.badge` (+ `.badge-verde`, `.badge-mostaza`, `.badge-rojo`, `.badge-gris`), `.list` / `.list-item`, `.section-title`, `.muted`, `.tile` (cuadro con color de producto + isotipo, para productos sin foto), `.empty`. Prefijos de clase propios por módulo: chat `ch-`, estudio `st-`, inicio `in-`, clientes `cl-`, ajustes `aj-`.

## Archivos y dueños

| Módulo | Archivos (solo los toca su dueño) |
|---|---|
| Shell | `index.html`, `css/app.css`, `js/app.js`, `js/sim.js`, `js/views.js` (Inicio, Clientes, Ajustes) |
| Bot y chat | `js/bot.js`, `js/chat.js`, `css/chat.css`, `tests/bot.test.js` |
| Contenido | `js/content.js`, `js/studio.js`, `css/studio.css`, `tests/flyers.html` (+ script de render) |

`index.html` (shell) carga, en este orden y con `defer`: `js/data.js`, `js/app.js`, `js/sim.js`, `js/views.js`, `js/bot.js`, `js/chat.js`, `js/content.js`, `js/studio.js`; y las hojas `css/app.css`, `css/chat.css`, `css/studio.css`. `app.js` arranca en `DOMContentLoaded` (para entonces ya corrieron todos los `defer`).

## Contratos

### `TB.app` (shell, `js/app.js`)

```js
TB.app.state            // objeto persistido en localStorage 'tb-demo-v1': solo lo que crea el usuario
TB.app.save()
TB.app.on(evt, fn); TB.app.emit(evt, payload)
// eventos: 'order:new' (order), 'order:update' (order), 'post:new' (post), 'state:reset', 'view:show' ({key, params})
TB.app.go(key, params?) // navega (hash '#/pedidos'); llama view.show(params) si existe
TB.app.toast(text, {action?: {label, fn}}?)
TB.app.sheet({title, body /* HTMLElement|string */, actions?: [{label, primary?, danger?, fn}]}) // -> {el, close()} hoja inferior
TB.app.confirm({title, text, ok, cancel, danger?}) // -> Promise<boolean>
TB.app.money(n)         // 'S/ 3.00'
TB.app.fmtTime(d)       // '3:00 p. m.'
TB.app.fmtDate(d)       // 'mié. 11 de nov.'
TB.app.rel(d)           // 'hace 5 min', 'ayer', ...
TB.app.now()            // new Date()
TB.app.icon(name, size?) // string <svg>; nombres: home chat image users settings clock truck bag star bell check x chevron-right chevron-left send sparkles calendar share download phone whatsapp instagram facebook pin alert refresh plus minus trend-up trend-down gift store bot user search more copy
TB.app.productImg(product) // -> {src, kind:'thumb'|'hero'|null} (thumb > heroSm > null; si es null usa .tile)
TB.app.tile(product, size) // -> HTML de la miniatura del producto (foto o .tile con su color e isotipo)
// datos combinados (simulado + lo creado por el usuario):
TB.app.ordersFor(date)  // pedidos de ese día (si es hoy, solo hasta la hora actual), con cambios de estado aplicados, más recientes primero
TB.app.addOrder(order)  // guarda, emite 'order:new', toast "Nuevo pedido TB-1043 · S/ 24.00" con acción "Ver"
TB.app.updateOrder(code, patch) // emite 'order:update'
TB.app.nextOrderCode()  // 'TB-1043', siempre mayor que cualquier código ya mostrado
TB.app.customers()      // clientes simulados + los nuevos que llegan por el bot
TB.app.stock()          // {key: unidades} de hoy, descontando lo vendido (simulado + real)
TB.app.history(days)    // agregados de los últimos N días cerrados: [{date, ventas, pedidos, porCategoria:{...}, bot}]
TB.app.allPosts()       // publicaciones simuladas (relativas a hoy) + las del usuario, ordenadas por fecha
TB.app.addPost(post); TB.app.updatePost(id, patch); TB.app.removePost(id) // 'post:new' (removePost solo para publicaciones del usuario)
TB.views                // array; cada módulo hace TB.views.push({key, title, icon, mount(el), show?(params)})
```

Vistas y orden de pestañas: `inicio` (Inicio, home), `pedidos` (Pedidos, chat), `contenido` (Contenido, image), `clientes` (Clientes, users), `ajustes` (Ajustes, settings). Barra inferior fija en móvil con 5 pestañas e insignia de pedidos nuevos; encabezado superior con logo, nombre de la vista y estado “Abierto”/“Cerrado”. `mount(el)` se llama una vez con un `<section>` vacío; `show(params)` cada vez que se entra.

### Formas de datos

```js
Order = {code:'TB-1043', customer:{name:'Rosa Panduro', phone:'987 ••• 214'}, items:[{key, name, qty, price}], subtotal, mode:'delivery'|'recojo', zone:'Morales'|null, deliveryCost, total,
  slot:{date:'2026-11-11', time:'15:00', label:'Hoy en el delivery de las 3:00 p. m.'}, pay:'Yape'|'Plin'|'Tarjeta', channel:'Bot de WhatsApp'|'WhatsApp (Alberto)'|'Instagram',
  status:'nuevo'|'preparando'|'en camino'|'listo para recojo'|'entregado', createdAt: ISO, note?: string, simulated?: true}
Customer = {id, name, phone /* enmascarado */, zone, orders, spent, last: ISO, fav: productKey, stamps /* 0..9 */, optIn: bool}
Post = {id, template, format:'story'|'post', product, variant, offer?, network:'whatsapp'|'instagram'|'facebook', when: ISO, caption, hashtags:[], status:'programado'|'publicado', createdAt, simulated?: true}
```

### Simulación (`js/sim.js`, shell)

Determinista por fecha (PRNG con semilla = fecha), recalculada al vuelo: pedidos de hoy hasta la hora actual y de días anteriores, historial, stock, clientes y publicaciones programadas. Debe respetar las reglas reales: sin empanadas sábado/domingo ni antes de las 2 p. m.; sin pedidos antes de 10 a. m. ni después de 8 p. m.; pedidos de delivery antes de las 3 p. m. pasan a “en camino”/“entregado” después de las 3; caja china solo pedidos para domingo; zonas y costos reales; mínimo de 7 marcianos en delivery de solo marcianos. Volúmenes creíbles para un negocio pequeño: entre semana ~S/ 380–650 al día y 22–38 pedidos; fin de semana sin empanadas ~S/ 200–380 (domingo suma cajas chinas). ~75–85 % de pedidos los atiende el bot. Unos 40 clientes con nombres y apellidos de San Martín (Panduro, Pinedo, Tuanama, Shapiama, Tapullima, Del Águila, Sangama, Amasifuen, Cachique, Ríos, Vásquez, Rengifo, Arévalo, Fasabi, Satalaya…), teléfonos enmascarados (nunca números reales). 4–6 publicaciones simuladas en los próximos 7 días con productos que tienen foto.

### `TB.bot` (`js/bot.js`, puro: sin DOM, testeable en Node)

```js
TB.bot.createConversation(opts?)   // -> conv (objeto serializable)
TB.bot.reply(conv, text, now)      // -> {messages:[{from:'bot'|'alberto', text, delay /* ms */, product? /* key */, order? /* Order */}], order: Order|null, handoff: {reason}|null}
TB.bot.suggestions(conv, now)      // -> ['¿Qué sabores de marcianos tienen?', ...] (3–5, según el paso)
// en Node: module.exports = TB.bot; lee TB.data de require('./data.js')
```

`order` lleva todos los campos de `Order` salvo `code` (lo asigna `chat.js` con `TB.app.nextOrderCode()`) y `customer.phone`.

### `TB.content` (`js/content.js`)

```js
TB.content.TEMPLATES  // [{key, name, desc}] — 'producto', 'lanzamiento', 'delivery', 'cajachina', 'promo'
TB.content.FORMATS    // {story:{w:1080,h:1920,name:'Historia'}, post:{w:1080,h:1080,name:'Publicación'}}
TB.content.ready()    // Promise: fuentes cargadas
TB.content.products(template) // productos elegibles (con foto adecuada)
TB.content.render(canvas, {template, format, product, variant, offer, scale}) // -> Promise<{title}>
TB.content.caption({template, product, variant, offer, network}) // -> {text, hashtags, bestTime /* 'HH:MM' */, bestTimeLabel}
TB.content.variants(template) // número de variantes
```
