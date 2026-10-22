/* Capa de acceso a datos + reglas de cálculo CENTRALIZADAS.
   Dashboard, Ventas, Clientes, Proveedores y Reportes consumen estas mismas funciones,
   así los números coinciden en todas las pantallas.
   Todas las funciones son async: en la Fase 2 se reemplaza el cuerpo por llamadas al backend
   (Apps Script) sin tocar las vistas. Aquí lee LC.demo (solo lectura, nada se guarda).

   Criterios (a confirmar con el cliente):
   - "Importe vendido/comprado" = suma de líneas SIN IVA (el IVA es un recargo del comprobante).
   - "Cantidad de ventas/compras" = operaciones (cabeceras), no unidades. */
LC.repo = (function () {
  const D = LC.demo, r2 = LC.util.round2;
  const idx = a => Object.fromEntries(a.map(x => [x.id, x]));
  const M = { cat: idx(D.categories), sub: idx(D.subcategories), v: idx(D.variants), cli: idx(D.clients), sup: idx(D.suppliers), pay: idx(D.paymentMethods) };
  const inRange = (d, f) => (!f.from || d >= f.from) && (!f.to || d <= f.to);
  const cliName = c => `${c.first} ${c.last}`;
  const enrich = v => ({ ...v, cat: M.cat[v.catId].name, sub: M.sub[v.subId].name, supplier: M.sup[v.supplierId]?.name || '—' });
  const prodLabel = v => `${M.cat[v.catId].name} · ${M.sub[v.subId].name}${v.detail ? ' ' + v.detail : ''} (T. ${v.size})`;
  const group = (rows, keyFn) => { const o = {}; rows.forEach(r => { const k = keyFn(r); (o[k] = o[k] || []).push(r); }); return o; };
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

  // Regla de totales de venta (el backend repetirá este cálculo: nunca confiar solo en el navegador)
  function saleTotals(lines, vat) {
    const subtotal = r2(sum(lines, l => r2(l.qty * l.unit)));
    const iva = vat ? r2(subtotal * LC.config.vatRate) : 0;
    return { subtotal, iva, total: r2(subtotal + iva) };
  }

  async function salesLines(f = {}) {
    const out = [];
    D.sales.filter(s => s.status === 'CONFIRMADA' && inRange(s.date, f) && (!f.clientId || s.clientId === f.clientId)).forEach(s =>
      s.lines.forEach(l => {
        const v = M.v[l.variantId];
        if (f.catId && v.catId !== f.catId) return;
        if (f.subId && v.subId !== f.subId) return;
        out.push({ saleId: s.id, date: s.date, clientId: s.clientId, client: cliName(M.cli[s.clientId]), variantId: v.id,
          catId: v.catId, cat: M.cat[v.catId].name, subId: v.subId, sub: M.sub[v.subId].name, detail: v.detail, size: v.size,
          label: prodLabel(v), qty: l.qty, amount: r2(l.qty * l.unit) });
      }));
    return out.sort((a, b) => b.date.localeCompare(a.date) || b.saleId.localeCompare(a.saleId));
  }
  async function purchaseLines(f = {}) {
    const out = [];
    D.purchases.filter(p => inRange(p.date, f) && (!f.supplierId || p.supplierId === f.supplierId)).forEach(p =>
      p.lines.forEach(l => {
        const v = M.v[l.variantId];
        if (f.catId && v.catId !== f.catId) return;
        out.push({ purchaseId: p.id, date: p.date, supplierId: p.supplierId, supplier: M.sup[p.supplierId].name, variantId: v.id, catId: v.catId, cat: M.cat[v.catId].name, label: prodLabel(v), qty: l.qty, amount: r2(l.qty * l.cost) });
      }));
    return out;
  }
  const distinct = (rows, k) => new Set(rows.map(r => r[k])).size;

  return {
    saleTotals, prodLabel, cliName,
    async catalog() { return { categories: D.categories, subcategories: D.subcategories, paymentMethods: D.paymentMethods, suppliers: D.suppliers, clients: D.clients }; },
    salesLines, purchaseLines,

    async variants(f = {}) {
      return D.variants.filter(v => v.active && (!f.catId || v.catId === f.catId) && (!f.subId || v.subId === f.subId) && (!f.supplierId || v.supplierId === f.supplierId))
        .map(enrich).sort((a, b) => b.stock - a.stock);
    },
    async inventoryKpis(f = {}) {
      const vs = await this.variants(f);
      return { variants: vs.length, valuedBuy: r2(sum(vs, v => v.stock * v.buyPrice)), valuedSell: r2(sum(vs, v => v.stock * v.sellPrice)) };
    },

    async salesSummary(f = {}) {
      const lines = await salesLines(f);
      const byCat = Object.entries(group(lines, l => l.cat)).map(([k, a]) => ({ label: k, value: r2(sum(a, x => x.amount)) })).sort((a, b) => b.value - a.value).slice(0, 5);
      return { lines, ops: distinct(lines, 'saleId'), total: r2(sum(lines, l => l.amount)), topCategories: byCat };
    },

    async clientsSummary(f = {}) {
      const lines = await salesLines({ from: f.from, to: f.to });
      const g = group(lines, l => l.clientId);
      return D.clients.filter(c => !f.clientId || c.id === f.clientId).map(c => {
        const a = g[c.id] || [];
        return { ...c, name: cliName(c), units: sum(a, x => x.qty), amount: r2(sum(a, x => x.amount)) };
      }).sort((a, b) => b.amount - a.amount);
    },
    async clientDetail(id) {
      const c = M.cli[id], lines = await salesLines({ clientId: id });
      return { ...c, name: cliName(c), lines, units: sum(lines, l => l.qty), amount: r2(sum(lines, l => l.amount)) };
    },

    async suppliersSummary(f = {}) {
      const lines = await purchaseLines({ from: f.from, to: f.to, catId: f.catId });
      const g = group(lines, l => l.supplierId);
      return D.suppliers.filter(s => s.active && (!f.supplierId || s.id === f.supplierId) && (!f.catId || s.catIds.includes(f.catId))).map(s => {
        const a = g[s.id] || [];
        return { ...s, cats: s.catIds.map(c => M.cat[c].name).join(', '), units: sum(a, x => x.qty), amount: r2(sum(a, x => x.amount)) };
      });
    },

    async dashboard(f = {}) {
      const sl = await salesLines(f), pl = await purchaseLines(f), vs = await this.variants();
      const top = (map, n) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
      const units = {}; sl.forEach(l => units[l.label] = (units[l.label] || 0) + l.qty);
      const cli = {}; sl.forEach(l => cli[l.client] = r2((cli[l.client] || 0) + l.amount));
      const stockRow = v => ({ label: prodLabel(v), value: v.stock });
      return {
        salesTotal: r2(sum(sl, l => l.amount)), salesOps: distinct(sl, 'saleId'),
        purchasesTotal: r2(sum(pl, l => l.amount)), purchasesOps: distinct(pl, 'purchaseId'),
        topProducts: top(units, 10), topClients: top(cli, 10),
        topStock: [...vs].sort((a, b) => b.stock - a.stock).slice(0, 10).map(stockRow),   // situación actual, sin filtro de fecha
        lowStock: [...vs].sort((a, b) => a.stock - b.stock).slice(0, 10).map(stockRow)
      };
    },

    // Movimientos de stock derivados de compras y ventas (en Fase 2 vendrán de la hoja MovimientosStock)
    async stockMovements(f = {}) {
      const mv = [];
      (await purchaseLines(f)).forEach(l => mv.push({ date: l.date, type: 'Compra', ref: l.purchaseId, label: l.label, qty: l.qty }));
      (await salesLines(f)).forEach(l => mv.push({ date: l.date, type: 'Venta', ref: l.saleId, label: l.label, qty: -l.qty }));
      return mv.sort((a, b) => b.date.localeCompare(a.date));
    }
  };
})();
