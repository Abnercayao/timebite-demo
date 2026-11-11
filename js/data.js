/* Datos reales de Time Bite (Tarapoto), tomados de sus capturas de WhatsApp, catálogo y afiches.
   Solo lectura: ningún módulo debe cambiar precios, horarios ni reglas aquí.
   Lo no confirmado por el cliente está en SUPUESTOS (ver README). */
(function (root) {
  var IMG = 'assets/img/';

  // Producto: key, cat, nombre (corto, para el menú), largo (para textos), precio, antes (precio tachado),
  // desc, hero (recorte con transparencia), thumb (foto cuadrada), foto (foto rectangular),
  // color (acento oscuro que contrasta con crema), fondo (tinte claro), alias (para el bot, sin tildes).
  function p(key, cat, nombre, largo, precio, extra) {
    var o = { key: key, cat: cat, nombre: nombre, largo: largo, precio: precio, antes: null, desc: '', hero: null, heroSm: null, thumb: null, foto: null, premium: false, color: '#3D7534', fondo: '#FFF5EC', alias: [] };
    for (var k in extra) o[k] = extra[k];
    return o;
  }
  function hero(name) { return { hero: IMG + name + '.webp', heroSm: IMG + name + '-sm.webp' }; }
  function mix(a, b) { for (var k in b) a[k] = b[k]; return a; }

  var EMP = { color: '#3D7534', fondo: '#FFF5EC', desc: 'Empanada 100% casera.' };
  var MAR = { desc: 'Marciano gourmet y cremoso.' };

  var productos = [
    // Empanadas caseras: S/ 5.00 c/u, lunes a viernes de 2 a 8 p. m.
    p('emp-mixto', 'empanadas', 'Mixto regional', 'Empanada de mixto regional', 5, mix({ thumb: IMG + 'thumb-emp-mixto.webp', foto: IMG + 'foto-empanadas.webp', hero: IMG + 'hero-empanadas.webp', heroSm: IMG + 'hero-empanadas-sm.webp', alias: ['mixto regional', 'mixto', 'mixta', 'mixtas', 'regional'] }, EMP)),
    p('emp-pollo', 'empanadas', 'Pollo', 'Empanada de pollo', 5, mix({ thumb: IMG + 'thumb-emp-pollo.webp', hero: IMG + 'hero-empanadas.webp', heroSm: IMG + 'hero-empanadas-sm.webp', alias: ['pollo'] }, EMP)),
    p('emp-hawaiana', 'empanadas', 'Hawaiana', 'Empanada hawaiana', 5, mix({ thumb: IMG + 'thumb-emp-hawaiana.webp', foto: IMG + 'foto-emp-hawaiana.webp', hero: IMG + 'hero-emp-hawaiana.webp', heroSm: IMG + 'hero-emp-hawaiana-sm.webp', alias: ['hawaiana', 'hawaianas', 'hawaiano'] }, EMP)),
    p('emp-lomo', 'empanadas', 'Lomo', 'Empanada de lomo', 5, mix({ thumb: IMG + 'thumb-emp-lomo.webp', hero: IMG + 'hero-empanadas.webp', heroSm: IMG + 'hero-empanadas-sm.webp', alias: ['lomo'] }, EMP)),

    // Marcianos gourmet: S/ 3.00; cheesecake de maracuyá S/ 3.50; crocante premium S/ 4.00. Lunes a domingo de 10 a. m. a 8 p. m.
    p('mar-crocante-maracuya', 'marcianos', 'Crocante de maracuyá', 'Marciano premium crocante de maracuyá', 4, mix(hero('hero-mar-crocante-maracuya'), { premium: true, desc: '¡Gran lanzamiento! Pruébalo: el sabor de la selva.', color: '#6B3416', fondo: '#FCE7B0', props: ['prop-maracuya', 'prop-chocolate'], alias: ['crocante de maracuya', 'crocante', 'premium'] })),
    p('mar-cheesecake-maracuya', 'marcianos', 'Cheesecake de maracuyá', 'Marciano gourmet de cheesecake de maracuyá', 3.5, mix(hero('hero-mar-cheesecake-maracuya'), { desc: 'Con mermelada artesanal y pura pulpa de maracuyá: cremoso, intenso, entre dulce y ácido.', color: '#8A5A0C', fondo: '#FBF0D6', props: ['prop-maracuya'], alias: ['cheesecake de maracuya', 'cheesecake maracuya', 'cheescake de maracuya', 'chescake de maracuya'] })),
    p('mar-arandanos', 'marcianos', 'Arándanos con leche', 'Marciano gourmet de arándanos con leche', 3, mix(hero('hero-mar-arandanos'), { desc: 'Hecho con arándanos frescos y leche cremosa.', color: '#33568A', fondo: '#E3ECF7', props: ['prop-arandanos', 'prop-menta'], alias: ['arandanos con leche', 'arandanos', 'arandano'] })),
    p('mar-maracumango', 'marcianos', 'Maracumango', 'Marciano gourmet de maracumango', 3, mix(hero('hero-mar-maracumango'), { desc: 'Hecho con maracuyá y mango frescos.', color: '#D0700E', fondo: '#FFEBD1', props: ['prop-mango-maracuya', 'prop-menta'], alias: ['maracumango', 'maracumenta', 'maracuya con mango', 'maracuya mango'] })),
    p('mar-fresa', 'marcianos', 'Fresa con leche', 'Marciano gourmet de fresa con leche', 3, mix(hero('hero-mar-fresa'), { desc: 'El sabor premium de la selva.', color: '#C94562', fondo: '#FCE4EA', props: ['prop-fresa'], alias: ['fresa con leche', 'fresa', 'fresas'] })),
    p('mar-mani', 'marcianos', 'Maní con leche', 'Marciano gourmet de maní con leche', 3, mix(hero('hero-mar-mani'), { desc: 'Sabor casero e irresistible; gourmet y cremoso.', color: '#8A5A2B', fondo: '#F6EAD8', alias: ['mani con leche', 'mani'] })),
    p('mar-coco', 'marcianos', 'Coco con leche', 'Marciano gourmet de coco con leche', 3, mix(hero('hero-mar-coco'), { desc: 'Marciano gourmet y cremoso.', color: '#6E5233', fondo: '#F4EEE4', props: ['deco-hoja-1'], alias: ['coco con leche', 'coco'] })),
    p('mar-aguaje', 'marcianos', 'Aguaje', 'Marciano gourmet de aguaje', 3, mix(hero('hero-mar-aguaje'), { desc: 'Hecho con la fruta de la selva y el toque cremoso que amas.', color: '#7E2A1B', fondo: '#F6E5DF', props: ['deco-hoja-1', 'deco-hoja-2'], alias: ['aguaje'] })),
    p('mar-pie-limon', 'marcianos', 'Pie de limón', 'Marciano gourmet de pie de limón', 3, mix(hero('hero-mar-pie-limon'), { desc: 'Sabor auténtico, receta casera y textura cremosa.', color: '#5E8A16', fondo: '#EEF6DC', props: ['prop-lima'], alias: ['pie de limon', 'limon'] })),
    p('mar-ron-pasas', 'marcianos', 'Ron con pasas', 'Marciano gourmet Elite de ron con pasas', 3, mix(hero('hero-mar-ron-pasas'), { desc: 'Elaborado con ingredientes premium. Producto de Tarapoto.', color: '#5A3220', fondo: '#F3E7DC', anclaHero: 'abajo-derecha', alias: ['ron con pasas', 'ron pasas', 'ron'] })),
    // Sabores sin foto propia: en la interfaz se muestran con su color y el isotipo.
    p('mar-cheesecake-fresa', 'marcianos', 'Cheesecake de fresa', 'Marciano gourmet de cheesecake de fresa', 3, mix({ color: '#C2486A', fondo: '#FCE4EA', alias: ['cheesecake de fresa', 'cheescake de fresa', 'chesecake de fresa'] }, MAR)),
    p('mar-chicle', 'marcianos', 'Chicle Bubbaloo', 'Marciano gourmet de chicle Bubbaloo', 3, mix({ color: '#C2408E', fondo: '#FBE3F1', alias: ['chicle', 'bubbaloo', 'boobalou', 'bobbaloo'] }, MAR)),
    p('mar-magnum', 'marcianos', 'Magnum', 'Marciano gourmet Magnum', 3, mix({ color: '#5B3A29', fondo: '#F1E6DE', alias: ['magnum'] }, MAR)),
    p('mar-mocaccino', 'marcianos', 'Mocaccino', 'Marciano gourmet de mocaccino', 3, mix({ color: '#6E4A31', fondo: '#F2E8DF', alias: ['mocaccino', 'mokaccino', 'moccaccino'] }, MAR)),
    p('mar-capuchino', 'marcianos', 'Capuchino', 'Marciano gourmet de capuchino', 3, mix({ color: '#7D5537', fondo: '#F3E9DE', alias: ['capuchino', 'cappuccino', 'capuccino'] }, MAR)),
    p('mar-choco-menta', 'marcianos', 'Choco menta', 'Marciano gourmet de choco menta', 3, mix({ color: '#2E7D5E', fondo: '#E2F3EC', alias: ['choco menta', 'chocomenta', 'menta'] }, MAR)),
    p('mar-tres-leches', 'marcianos', 'Tres leches', 'Marciano gourmet de tres leches', 3, mix({ color: '#9C7339', fondo: '#FAF1E1', alias: ['tres leches', '3 leches'] }, MAR)),
    p('mar-sublime', 'marcianos', 'Sublime', 'Marciano gourmet Sublime', 3, mix({ color: '#5E3622', fondo: '#F1E5DC', alias: ['sublime'] }, MAR)),
    p('mar-oreo', 'marcianos', 'Oreo', 'Marciano gourmet de Oreo', 3, mix({ color: '#2F2F35', fondo: '#ECECEF', alias: ['oreo'] }, MAR)),
    p('mar-mango', 'marcianos', 'Mango con leche', 'Marciano gourmet de mango con leche', 3, mix({ color: '#C9780F', fondo: '#FFEFD6', alias: ['mango con leche', 'mango'] }, MAR)),
    p('mar-lucuma', 'marcianos', 'Lúcuma con leche', 'Marciano gourmet de lúcuma con leche', 3, mix({ color: '#A8661E', fondo: '#FBEBD6', alias: ['lucuma con leche', 'lucuma'] }, MAR)),
    p('mar-crema-volteada', 'marcianos', 'Crema volteada', 'Marciano gourmet de crema volteada', 3, mix({ color: '#A26A1C', fondo: '#FBEFD9', alias: ['crema volteada'] }, MAR)),
    p('mar-chocolucuma', 'marcianos', 'Chocolúcuma', 'Marciano gourmet de chocolúcuma', 3, mix({ color: '#6E4127', fondo: '#F2E6DC', alias: ['chocolucuma', 'choco lucuma'] }, MAR)),

    // Caja china: delivery solo los domingos.
    p('caja-china', 'caja-china', 'Chanchito a la caja china', 'Chanchito a la caja china', 30, { desc: 'Sale 200 g con su papa sancochada, choclo, ajíes en crema y chimichurri.', hero: IMG + 'hero-caja-china.webp', heroSm: IMG + 'hero-caja-china-sm.webp', thumb: IMG + 'thumb-caja-china.webp', foto: IMG + 'foto-caja-china.webp', color: '#1F4A2A', fondo: '#FFF5EC', alias: ['caja china', 'cajas chinas', 'chanchito', 'chancho', 'cerdo'] }),

    // Postres del catálogo de WhatsApp.
    p('kekesitos', 'postres', 'Kekesitos de plátano seda', 'Kekesitos de plátano seda con arándanos', 15, { desc: 'Con arándanos.', thumb: IMG + 'thumb-kekesitos.webp', foto: IMG + 'foto-kekesitos.webp', color: '#8A5A2B', fondo: '#F6EAD8', alias: ['kekesitos', 'kekesito', 'kekitos', 'muffins'] }),
    p('rolls-canela', 'postres', 'Rolls de canela', 'Rolls de canela clásicos y con topping', 15, { desc: 'Clásicos y con topping.', thumb: IMG + 'thumb-rolls-canela.webp', foto: IMG + 'foto-rolls-canela.webp', color: '#8A5A2B', fondo: '#F6EAD8', alias: ['rolls de canela', 'roll de canela', 'rolls', 'roll', 'canela'] }),
    p('keke-grande', 'postres', 'Keke grande 1 kg', 'Keke grande de 1 kg de plátano seda con arándanos', 28, { desc: 'De plátano seda con arándanos y marmoleado.', thumb: IMG + 'thumb-keke-grande.webp', color: '#8A5A2B', fondo: '#F6EAD8', alias: ['keke grande', 'keke de 1 kg', 'keke de un kilo', 'keke'] }),
    p('pie-manzana-grande', 'postres', 'Pie de manzana grande', 'Pie de manzana grande', 65, { antes: 70, desc: 'Para compartir.', thumb: IMG + 'thumb-pie-manzana-grande.webp', color: '#8A5A2B', fondo: '#F6EAD8', alias: ['pie de manzana grande', 'pie grande'] }),
    p('pie-manzana-porcion', 'postres', 'Pie de manzana', 'Pie de manzana', 10, { desc: 'Porción individual.', thumb: IMG + 'thumb-pie-manzana-porcion.webp', color: '#8A5A2B', fondo: '#F6EAD8', alias: ['pie de manzana', 'porcion de pie'] }),
    p('pie-fresa', 'postres', 'Pie de fresa con arándanos', 'Pie de fresa con arándanos', 10, { desc: 'Porción individual.', thumb: IMG + 'thumb-pie-fresa.webp', color: '#C94562', fondo: '#FCE4EA', alias: ['pie de fresa', 'pie de fresa con arandanos'] }),

    // Bebidas.
    p('refresco', 'bebidas', 'Refresco de frutas', 'Refresco de frutas', 5, { antes: 6, desc: 'Pregunta por el sabor del día.', thumb: IMG + 'thumb-refresco.webp', color: '#6B2A5E', fondo: '#F5E4F0', alias: ['refresco', 'refrescos', 'jugo', 'chicha'] }),
    p('gaseosa', 'bebidas', 'Gaseosa 500 ml', 'Gaseosa de 500 ml', 5, { desc: 'Coca-Cola o Inca Kola.', color: '#B3261E', fondo: '#FBE4E2', alias: ['gaseosa', 'gaseosas', 'coca cola', 'cocacola', 'inca kola', 'inka kola'] })
  ];

  var data = {
    negocio: {
      nombre: 'Time Bite',
      nombreWhatsApp: 'Time Bite Empanada',
      dueno: 'Alberto',
      ciudad: 'Tarapoto',
      region: 'San Martín',
      telefono: '956 935 024',
      telefonoE164: '+51956935024',
      telefono2: '944 435 421',
      redes: '@TimeBiteTarapoto',
      pagos: ['Yape', 'Plin', 'Visa', 'Mastercard'],
      recojo: 'Tenemos punto de recojo: te enviamos la ubicación por aquí.',
      eslogans: ['¡El sabor de la selva!', '100% sabor peruano', '¡Las más ricas que vas a probar!', 'Empanadas 100% caseras', '¡El sabor gourmet que te mereces!', 'Hechos con ingredientes reales y mucho amor', 'Producto de Tarapoto'],
      llamados: ['¡Haz tu pedido ya!', '¡Haz tu pedido hoy!', 'Pruébalos, ¡el sabor de la selva!', '¡Delivery a todo Tarapoto!', 'El delivery sale a las 3 p. m.: separa tu pedido', 'Delivery todos los domingos'],
      disponibilidad: '*Sujeto a disponibilidad'
    },
    marca: {
      verde: '#3D7534', verde700: '#2C5A26', verde900: '#1C3A18', verde50: '#EAF2E6',
      mostaza: '#E8A122', mostaza50: '#FDF1D8',
      crema: '#FFF5EC', crema2: '#F3E6CC',
      marron: '#42220B', tinta: '#1F2A1D', tinta2: '#5B6656', borde: '#E5DAC3',
      logo: IMG + 'logo.webp', logoVerde: IMG + 'logo-verde.webp',
      isotipoBlanco: IMG + 'isotipo-blanco.webp', isotipoVerde: IMG + 'isotipo-verde.webp',
      deco: [IMG + 'deco-hoja-1.webp', IMG + 'deco-hoja-2.webp']
    },
    // dias: 0 = domingo … 6 = sábado. Horas en formato 24 h, hora local del celular (Perú).
    horarios: {
      marcianos: { dias: [0, 1, 2, 3, 4, 5, 6], desde: '10:00', hasta: '20:00', texto: 'Lunes a domingo, de 10:00 a. m. a 8:00 p. m.' },
      empanadas: { dias: [1, 2, 3, 4, 5], desde: '14:00', hasta: '20:00', texto: 'Lunes a viernes, de 2:00 p. m. a 8:00 p. m.' },
      postres: { dias: [0, 1, 2, 3, 4, 5, 6], desde: '10:00', hasta: '20:00', texto: 'Lunes a domingo, de 10:00 a. m. a 8:00 p. m.' },
      bebidas: { dias: [0, 1, 2, 3, 4, 5, 6], desde: '10:00', hasta: '20:00', texto: 'Lunes a domingo, de 10:00 a. m. a 8:00 p. m.' },
      'caja-china': { dias: [0], desde: null, hasta: null, texto: 'Delivery todos los domingos' }
    },
    delivery: {
      salida: '15:00',            // el delivery sale a las 3 p. m.
      corte: '15:00',             // pedidos que llegan después salen en el delivery del día siguiente
      minimoMarcianos: 7,         // si el pedido es solo de marcianos, el delivery sale desde 7 unidades
      zonas: [
        { key: 'tarapoto', nombre: 'Tarapoto', costo: 3, alias: ['tarapoto', 'tpp', 'centro', 'plaza de armas', 'jiron', 'jr'] },
        { key: 'banda', nombre: 'La Banda de Shilcayo', costo: 4, alias: ['la banda de shilcayo', 'banda de shilcayo', 'la banda', 'banda', 'shilcayo'] },
        { key: 'morales', nombre: 'Morales', costo: 4, alias: ['morales'] }
      ]
    },
    bot: {
      pedidoGrandeUnidades: 40    // desde aquí el pedido pasa a Alberto
    },
    categorias: [
      { key: 'empanadas', nombre: 'Empanadas caseras', corto: 'Empanadas' },
      { key: 'marcianos', nombre: 'Marcianos gourmet', corto: 'Marcianos' },
      { key: 'caja-china', nombre: 'Chanchito a la caja china', corto: 'Caja china' },
      { key: 'postres', nombre: 'Postres', corto: 'Postres' },
      { key: 'bebidas', nombre: 'Bebidas', corto: 'Bebidas' }
    ],
    productos: productos,
    // Supuestos de la demo: no los confirmó el cliente (ver README).
    SUPUESTOS: [
      'El delivery sale todos los días a las 3:00 p. m.; lo que llega después sale al día siguiente o se recoge.',
      'Postres y bebidas se atienden en el horario de los marcianos.',
      'El mínimo de 7 unidades aplica solo a pedidos de marcianos sin otros productos.',
      'Pagos: Yape, Plin, Visa y Mastercard (no se ofrece efectivo).',
      'Los sabores sin precio publicado cuestan S/ 3.00.',
      'La caja china y los pedidos grandes o para eventos los confirma Alberto.'
    ]
  };

  data.porKey = {};
  productos.forEach(function (x) { data.porKey[x.key] = x; });

  root.TB = root.TB || {};
  root.TB.data = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
