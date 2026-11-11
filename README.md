# Time Bite · Panel (versión de demostración)

Demo web móvil que VanguardIA preparó para **Time Bite** (Tarapoto, San Martín): empanadas caseras, marcianos gourmet, postres, bebidas y chanchito a la caja china los domingos. Muestra cómo sería su panel con inteligencia artificial, con su marca, sus precios y sus reglas reales:

- **Inicio**: cómo va el día (ventas, pedidos, ticket promedio, atención del bot), cuenta regresiva al delivery de las 3:00 p. m., últimos pedidos, ventas de la semana, lo más pedido, ventas por categoría y canal, alertas de stock y próxima publicación.
- **Pedidos**: un chat con aspecto de WhatsApp donde un bot toma pedidos en texto libre (delivery o recojo, zona, nombre, pago y confirmación) y pasa a Alberto lo que requiere su atención; más la lista de pedidos del día con estados.
- **Contenido**: afiches de historia (9:16) y publicación (1:1) con 5 plantillas de marca, textos para WhatsApp, Instagram y Facebook con hora sugerida, y un calendario de publicaciones programadas.
- **Clientes**: clientes frecuentes, tarjeta de sellos propuesta (10 pedidos = 1 marciano gratis) y difusión «Empanada del día» a quienes aceptaron recibir novedades.
- **Ajustes**: datos del negocio, horarios, zonas, interruptores del bot, integraciones y «Reiniciar demo».

Es un sitio estático (HTML + CSS + JavaScript sin dependencias ni compilación). Todo corre en el navegador del celular; no hay servidor ni base de datos.

## Cómo correrla

```bash
cd timebite-demo
python -m http.server 8000 --bind 127.0.0.1
# abrir http://127.0.0.1:8000/
```

- Sírvela siempre por `http(s)`: abierta como `file://`, el navegador bloquea la exportación de los afiches («Guardar imagen»).
- Para publicarla basta con GitHub Pages (o cualquier hosting estático) apuntando a esta carpeta. «Copiar texto» necesita HTTPS en el celular.
- Las fuentes (Montserrat, Lilita One, Kaushan Script) vienen de Google Fonts: la primera carga necesita internet.
- **Probar otro día u hora:** `?now=2026-11-14T12:00` (hora local). El reloj arranca ahí y sigue avanzando. Todo lo simulado se recalcula con esa fecha.
- **Volver a empezar:** Ajustes → Reiniciar demo (pide confirmación). Borra solo lo que creó el usuario en ese navegador.
- El estado del usuario se guarda en `localStorage` con la clave `tb-demo-v1`. Si el navegador no lo permite, la demo sigue funcionando en memoria.

## Estructura

```
index.html            marco de la app: encabezado, 5 vistas, barra de pestañas, pie de créditos
css/app.css           tokens de marca, componentes compartidos, marco, hojas, avisos, Inicio/Clientes/Ajustes
css/chat.css          vista Pedidos (prefijo ch-)
css/studio.css        vista Contenido (prefijo st-)
js/data.js            TB.data: datos reales del negocio (solo lectura)
js/app.js             TB.app: estado, eventos, navegación, hojas, avisos, formatos, iconos y datos combinados
js/sim.js             TB.sim: simulación determinista por fecha (pedidos, historial, stock, clientes, publicaciones)
js/views.js           vistas Inicio, Clientes y Ajustes
js/bot.js             TB.bot: motor del bot (puro, sin DOM; corre en el navegador y en Node)
js/chat.js            vista Pedidos: chat y lista de pedidos
js/content.js         TB.content: afiches en Canvas 2D y textos para redes
js/studio.js          vista Contenido: crear, programar y calendario
assets/img/           logos, fotos y recortes de producto (.webp)
tests/bot.test.js     pruebas del bot: node tests/bot.test.js
tests/chat.html       página de prueba del chat (?fresh, &play=demo, &stop=N, &now=...)
tests/flyers.html     un afiche a tamaño real (?t=&f=&p=&v=&o=) o banco de tiempos (?bench=1)
tests/render_flyers.py  captura todas las combinaciones de afiches y arma hojas de contacto (requiere Chrome y Pillow)
SPEC.md               especificación y contratos entre módulos
```

Los scripts son clásicos con `defer` y cuelgan de `window.TB`, en este orden: `data`, `app`, `sim`, `views`, `bot`, `chat`, `content`, `studio`. `app.js` arranca en `DOMContentLoaded`, monta cada vista registrada en `TB.views` y aísla los errores: si un módulo falla, su pestaña muestra un aviso y el resto sigue funcionando.

## Contratos entre módulos

El detalle está en **[SPEC.md](SPEC.md)**: API de `TB.app`, eventos (`order:new`, `order:update`, `post:new`, `state:reset`, `view:show`), formas de datos (`Order`, `Customer`, `Post`), `TB.bot` y `TB.content`. Lo que se agregó durante la construcción y no figura ahí:

- `TB.app.summary(list)`, `TB.app.reset()`, `TB.app.isOpen(date)`, `TB.app.dayKey(date)`; evento `settings:update` (interruptores de Ajustes). `updatePost` y `removePost` también emiten `post:new` (con `null` al borrar).
- Clases compartidas extra: `.btn-danger`, `.badge-azul`, `.switch`, `.sr-only`.
- `TB.app.money()` y `fmtTime()` usan espacios no separables (`S/ 3.00`, `3:00 p. m.`).
- «Ventas» incluye el costo de delivery, igual que el total de cada pedido.
- Estado del usuario en `TB.app.state`: `orders`, `orderPatches` (cambios de estado de pedidos simulados), `posts`, `postPatches`, `broadcasts`, `settings.bot` (`activo`, `pasarAlberto`, `minimoMarcianos`), `chat` (conversación y cola de mensajes) y `studio` (últimas elecciones).
- El bot lee en cada mensaje los interruptores vivos de Ajustes (`TB.app.state.settings.bot`); en Node usa `createConversation({settings: {bot: {...}}})`.
- La etiqueta del horario de entrega (`slot.label`) se recalcula al mostrar el pedido («Hoy», «Mañana», «Ayer» o la fecha), a partir de `slot.date` y `slot.time`.

## Qué es real y qué es simulado

**Real (de `js/data.js`, tomado del material del cliente):** nombre y cuenta de WhatsApp, teléfonos, redes, horarios por categoría, zonas y costos de delivery, salida del delivery a las 3:00 p. m., mínimo de 7 marcianos para delivery de solo marcianos, medios de pago (Yape, Plin, Visa, Mastercard), los 36 productos con precio y descripción, sus fotos, colores y logos. No inventes ni cambies estos datos: si algo no está en `TB.data`, no se afirma como hecho del negocio.

**Simulado:**

- Clientes (40 con nombres y apellidos de San Martín y teléfonos enmascarados), pedidos, ventas, historial, stock, métricas y resultados de difusiones. Se generan de forma determinista a partir de la fecha y hora actuales, así que la demo se ve coherente cualquier día que se abra.
- Lo que el usuario hace en la demo (pedidos del chat, cambios de estado, publicaciones, envíos) se guarda solo en su navegador.
- La «IA» es un motor de reglas: el bot interpreta el texto con alias, números en palabras y reglas del negocio, y responde con frases escritas a mano. Los afiches salen de plantillas dibujadas en Canvas, y los textos para redes de variantes redactadas de antemano.
- Las integraciones de Ajustes se muestran como «Conectado · simulado en esta demo». No se envía nada a WhatsApp, Instagram ni Facebook, y «Enviar mensaje» o «Publicar ahora» solo cambian el estado local.

## Supuestos

Están en `TB.data.SUPUESTOS` y deben confirmarse con el cliente antes de pasar a producción:

- El delivery sale todos los días a las 3:00 p. m.; lo que llega después sale al día siguiente o se recoge.
- Postres y bebidas se atienden en el horario de los marcianos.
- El mínimo de 7 unidades aplica solo a pedidos de marcianos sin otros productos.
- Pagos: Yape, Plin, Visa y Mastercard (no se ofrece efectivo).
- Los sabores sin precio publicado cuestan S/ 3.00.
- La caja china y los pedidos grandes o para eventos los confirma Alberto.

## Cómo hacerla real

1. **WhatsApp Business Platform (Cloud API).** Registrar el número del negocio y recibir los mensajes por webhook en un backend. El bot responde dentro de la ventana de 24 horas; fuera de ella, y para las difusiones como «Empanada del día», se usan plantillas aprobadas por Meta y solo para clientes con consentimiento (opt-in) registrado, con opción de darse de baja. La derivación a Alberto pasa a una bandeja compartida (o a la app de WhatsApp Business del dueño) y pausa el bot en esa conversación.
2. **Modelo de lenguaje con barandas.** Usar un LLM para entender intenciones y cantidades en mensajes libres y para redactar textos de publicaciones, y mantener el motor de reglas actual (`js/bot.js`) como baranda: precios, horarios, zonas, mínimo de marcianos, medios de pago y derivaciones salen siempre de los datos del negocio, nunca del modelo. Las pruebas de `tests/bot.test.js` sirven como base de regresión.
3. **Base de datos.** Pedidos, clientes (con su consentimiento), stock diario, catálogo y precios editables por Alberto, publicaciones y envíos. Reemplazar `js/sim.js` por lecturas reales y mantener las formas de datos de SPEC.md.
4. **Redes.** Programar en Instagram y Facebook con la Meta Graph API (cuentas profesionales vinculadas a una página). Los Estados de WhatsApp no se pueden publicar por API: quedan manuales, con la imagen y el texto listos para compartir desde el celular.
5. **Pagos con Yape y Plin.** Enviar los datos de pago, recibir la captura del cliente y que Alberto (o una conciliación con el banco) confirme el pago antes de preparar el pedido; con tarjeta, un enlace de pago de una pasarela local.
6. **Acceso de Alberto.** Inicio de sesión (por ejemplo, código por WhatsApp o correo) y roles si se suma personal.
7. **Hosting.** El panel puede seguir siendo estático (instalable como PWA); el backend del webhook necesita un servicio con HTTPS siempre encendido, variables de entorno para los tokens de Meta y registros de errores.

## Limitaciones conocidas

- No se probó en celulares reales (iOS y Android): áreas seguras, teclado virtual, «Agregar a la pantalla de inicio». El chat se adapta al teclado con `visualViewport` y oculta la barra de pestañas mientras se escribe; se verificó solo en emulación.
- Los datos viven en un solo navegador; no hay sincronización entre dispositivos.
- Los códigos de pedido reservan 12 números por día para los pedidos creados en la demo. Con más de 12 en un día, y retrocediendo el reloj con `?now=`, podrían repetirse (subir `GAP` en `js/app.js`).
- El bot entiende los alias y errores comunes registrados en `TB.data`; una errata no prevista recibe la ayuda general. Tras dos mensajes no entendidos ofrece «escribe Alberto», pero no deriva solo. Después de una derivación, Alberto sigue en la conversación hasta que el cliente escribe «Quiero hacer otro pedido» o se reinicia el chat.
- Los pedidos simulados solo avanzan de estado; los de días pasados figuran como entregados. Las comparaciones de Inicio aparecen cuando hay al menos 5 pedidos en ambos días.
- Un afiche de historia tarda unos 30 ms en una PC; en un celular de gama media se esperan unos 150 ms.
- En historias, «*Sujeto a disponibilidad» y la cuenta de redes quedan cerca de la barra de respuesta de los Estados (texto secundario, a propósito).

## Próximos pasos

1. Confirmar con el cliente los supuestos y las dudas abiertas (número oficial, horarios, precios faltantes, cobertura y pagos).
2. Validar la demo en su celular y en uno Android de gama media.
3. Backend con webhook de WhatsApp Cloud API y base de datos; migrar la simulación a datos reales.
4. Integrar el LLM detrás del motor de reglas y ampliar las pruebas con conversaciones reales (anonimizadas).
5. Programación real en Instagram y Facebook, plantillas de difusión aprobadas y registro de consentimientos.
6. Panel de catálogo para que Alberto edite precios, sabores y stock.
