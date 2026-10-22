/* DATOS FICTICIOS DE DEMOSTRACIÓN (es_demo = true en todos los registros).
   En la Fase 2 este archivo deja de usarse: los datos vendrán de Google Sheets. */
LC.demo = (function () {
  const ago = LC.util.daysAgo;
  const categories = [
    { id: 'CAT-1', name: 'Jeans' }, { id: 'CAT-2', name: 'Remeras' }, { id: 'CAT-3', name: 'Camperas' },
    { id: 'CAT-4', name: 'Camisas' }, { id: 'CAT-5', name: 'Buzos' }, { id: 'CAT-6', name: 'Accesorios' }
  ];
  const subcategories = [
    { id: 'SUB-11', catId: 'CAT-1', name: 'Chupín' }, { id: 'SUB-12', catId: 'CAT-1', name: 'Recto' },
    { id: 'SUB-13', catId: 'CAT-1', name: 'Mom' }, { id: 'SUB-14', catId: 'CAT-1', name: 'Wide leg' },
    { id: 'SUB-21', catId: 'CAT-2', name: 'Básica' }, { id: 'SUB-22', catId: 'CAT-2', name: 'Estampada' },
    { id: 'SUB-31', catId: 'CAT-3', name: 'Jean' }, { id: 'SUB-32', catId: 'CAT-3', name: 'Puffer' },
    { id: 'SUB-41', catId: 'CAT-4', name: 'Lisa' }, { id: 'SUB-51', catId: 'CAT-5', name: 'Canguro' },
    { id: 'SUB-61', catId: 'CAT-6', name: 'Cinturón' }
  ];
  const paymentMethods = [
    { id: 'FP-1', name: 'Efectivo' }, { id: 'FP-2', name: 'Transferencia' },
    { id: 'FP-3', name: 'Débito' }, { id: 'FP-4', name: 'Crédito' }
  ];
  const suppliers = [
    { id: 'PRV-1', name: 'Denim Sur S.R.L. (demo)', contact: 'Contacto demo', email: 'ventas@denimsur.example', phone: '5491155550201', catIds: ['CAT-1', 'CAT-3'], active: true },
    { id: 'PRV-2', name: 'Textil Palermo S.A. (demo)', contact: 'Contacto demo', email: 'pedidos@textilpalermo.example', phone: '5491155550202', catIds: ['CAT-2', 'CAT-4', 'CAT-5'], active: true },
    { id: 'PRV-3', name: 'Accesorios del Plata (demo)', contact: 'Contacto demo', email: 'info@delplata.example', phone: '5491155550203', catIds: ['CAT-6', 'CAT-3'], active: true },
    { id: 'PRV-4', name: 'Hilados Norte S.A. (demo)', contact: 'Contacto demo', email: 'hilados@norte.example', phone: '5491155550204', catIds: ['CAT-2', 'CAT-5'], active: true }
  ];
  const v = (id, catId, subId, detail, size, stock, buy, sell, supId, lastBuy, active = true) =>
    ({ id, catId, subId, detail, size, stock, buyPrice: buy, sellPrice: sell, supplierId: supId, lastBuy: ago(lastBuy), active });
  const variants = [
    v('ART-001', 'CAT-1', 'SUB-11', 'Tiro alto azul', '38', 14, 18000, 38000, 'PRV-1', 5),
    v('ART-002', 'CAT-1', 'SUB-11', 'Tiro alto azul', '40', 11, 18000, 38000, 'PRV-1', 44),
    v('ART-003', 'CAT-1', 'SUB-12', 'Clásico azul', '42', 20, 17000, 36000, 'PRV-1', 5),
    v('ART-004', 'CAT-1', 'SUB-12', 'Clásico azul', '44', 3, 17000, 36000, 'PRV-1', 44),
    v('ART-005', 'CAT-1', 'SUB-13', 'Mom celeste', '38', 9, 19000, 41000, 'PRV-1', 44),
    v('ART-006', 'CAT-1', 'SUB-14', 'Wide leg negro', '40', 7, 20500, 44000, 'PRV-1', 44),
    v('ART-007', 'CAT-2', 'SUB-21', 'Blanca', 'S', 25, 6500, 15000, 'PRV-2', 10),
    v('ART-008', 'CAT-2', 'SUB-21', 'Blanca', 'M', 30, 6500, 15000, 'PRV-2', 10),
    v('ART-009', 'CAT-2', 'SUB-21', 'Negra', 'M', 2, 6500, 15000, 'PRV-2', 60),
    v('ART-010', 'CAT-2', 'SUB-22', 'Estampa floral', 'L', 12, 7200, 16500, 'PRV-4', 30),
    v('ART-011', 'CAT-3', 'SUB-31', 'Jean oversize', 'M', 5, 32000, 72000, 'PRV-1', 44),
    v('ART-012', 'CAT-3', 'SUB-32', 'Puffer negra', 'L', 4, 41000, 89000, 'PRV-3', 18),
    v('ART-013', 'CAT-4', 'SUB-41', 'Lisa blanca', 'M', 10, 13000, 29000, 'PRV-2', 10),
    v('ART-014', 'CAT-5', 'SUB-51', 'Gris melange', 'L', 16, 16500, 36000, 'PRV-4', 30),
    v('ART-015', 'CAT-5', 'SUB-51', 'Gris melange', 'M', 1, 16500, 36000, 'PRV-4', 70),
    v('ART-016', 'CAT-6', 'SUB-61', 'Cuero marrón', 'Único', 18, 6000, 14500, 'PRV-3', 18),
    v('ART-017', 'CAT-1', 'SUB-12', 'Clásico azul', '46', 6, 17000, 36000, 'PRV-1', 44),
    v('ART-018', 'CAT-4', 'SUB-41', 'Lisa celeste (discontinuada)', 'L', 0, 13000, 29000, 'PRV-2', 90, false)
  ];
  const clients = [
    { id: 'CLI-1', first: 'Lucía', last: 'Fernández', email: 'lucia@demo.example', phone: '5491155550101', address: 'Calle Demo 123', city: 'Berazategui', province: 'Buenos Aires', notes: 'Cliente de demostración' },
    { id: 'CLI-2', first: 'Martín', last: 'Gómez', email: '', phone: '5491155550102', address: '', city: 'Quilmes', province: 'Buenos Aires', notes: '' },
    { id: 'CLI-3', first: 'Camila', last: 'Rodríguez', email: 'camila@demo.example', phone: '5491155550103', address: 'Av. Demo 456', city: 'Bernal', province: 'Buenos Aires', notes: 'Prefiere talles chicos' },
    { id: 'CLI-4', first: 'Julián', last: 'Pérez', email: '', phone: '', address: '', city: 'La Plata', province: 'Buenos Aires', notes: 'Sin celular cargado' },
    { id: 'CLI-5', first: 'Sofía', last: 'Martínez', email: 'sofia@demo.example', phone: '5491155550105', address: '', city: 'Berazategui', province: 'Buenos Aires', notes: '' },
    { id: 'CLI-6', first: 'Nicolás', last: 'López', email: '', phone: '5491155550106', address: '', city: 'Quilmes', province: 'Buenos Aires', notes: '' },
    { id: 'CLI-7', first: 'Valentina', last: 'Sosa', email: '', phone: '5491155550107', address: '', city: 'Ranelagh', province: 'Buenos Aires', notes: '' },
    { id: 'CLI-8', first: 'Agustín', last: 'Romero', email: '', phone: '5491155550108', address: '', city: 'Berazategui', province: 'Buenos Aires', notes: '' }
  ];
  const byId = Object.fromEntries(variants.map(x => [x.id, x]));
  let n = 0;
  // venta: [días atrás, cliente, forma de pago, calcula IVA, [[artículo, cantidad], ...]]
  const sale = (d, cli, pay, vat, lines) => ({
    id: 'VTA-' + String(++n).padStart(4, '0'), date: ago(d), clientId: cli, payId: pay, vat, status: 'CONFIRMADA',
    lines: lines.map(([a, q]) => ({ variantId: a, qty: q, unit: byId[a].sellPrice }))
  });
  const sales = [
    sale(0, 'CLI-1', 'FP-1', false, [['ART-001', 1], ['ART-007', 2]]),
    sale(1, 'CLI-2', 'FP-3', true, [['ART-003', 1]]),
    sale(1, 'CLI-3', 'FP-2', false, [['ART-010', 1], ['ART-016', 1]]),
    sale(2, 'CLI-4', 'FP-4', false, [['ART-006', 1]]),
    sale(3, 'CLI-1', 'FP-1', false, [['ART-008', 3]]),
    sale(4, 'CLI-5', 'FP-2', true, [['ART-012', 1], ['ART-005', 1]]),
    sale(5, 'CLI-6', 'FP-3', false, [['ART-014', 2]]),
    sale(6, 'CLI-7', 'FP-1', false, [['ART-013', 1], ['ART-002', 1]]),
    sale(9, 'CLI-2', 'FP-1', false, [['ART-004', 1], ['ART-009', 2]]),
    sale(12, 'CLI-8', 'FP-2', false, [['ART-011', 1]]),
    sale(15, 'CLI-3', 'FP-1', false, [['ART-001', 2], ['ART-016', 2]]),
    sale(20, 'CLI-5', 'FP-3', false, [['ART-015', 1], ['ART-007', 4]]),
    sale(26, 'CLI-4', 'FP-4', false, [['ART-003', 2]]),
    sale(33, 'CLI-6', 'FP-1', false, [['ART-010', 2], ['ART-008', 1]]),
    sale(41, 'CLI-1', 'FP-2', false, [['ART-005', 2]])
  ];
  let m = 0;
  const buy = (d, sup, lines) => ({ id: 'CMP-' + String(++m).padStart(4, '0'), date: ago(d), supplierId: sup, lines: lines.map(([a, q, c]) => ({ variantId: a, qty: q, cost: c })) });
  const purchases = [
    buy(5, 'PRV-1', [['ART-001', 10, 18000], ['ART-003', 12, 17000]]),
    buy(10, 'PRV-2', [['ART-007', 20, 6500], ['ART-008', 20, 6500], ['ART-013', 10, 13000]]),
    buy(18, 'PRV-3', [['ART-012', 5, 41000], ['ART-016', 15, 6000]]),
    buy(30, 'PRV-4', [['ART-010', 12, 7200], ['ART-014', 10, 16500]]),
    buy(44, 'PRV-1', [['ART-005', 8, 19000], ['ART-006', 6, 20500], ['ART-011', 4, 32000]])
  ];
  return { categories, subcategories, paymentMethods, suppliers, variants, clients, sales, purchases };
})();
