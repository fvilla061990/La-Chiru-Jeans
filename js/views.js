/* Vistas de los módulos activos. Cada vista recibe el contenedor y lee datos solo vía LC.repo.
   Los formularios son maquetas: validan y calculan importes de ejemplo, pero NO guardan nada. */
LC.views = (function () {
  const { esc, fmtARS, fmtNum, fmtDate, $, $$, table, hbars, kpi, select, dateField, input, icon, modal, toast, loading } = LC.ui;
  const { today, daysAgo } = LC.util;
  const opt = (arr, v = 'id', l = 'name') => arr.map(x => ({ value: x[v], label: typeof l === 'function' ? l(x) : x[l] }));
  const val = (root, id) => ($('#' + id, root) || {}).value || '';
  const NOTE = '<div class="note">Prototipo: este formulario no guarda datos. El guardado real llega en una fase posterior.</div>';
  const btnOff = (txt, ic, why) => `<button class="btn primary" disabled title="${esc(why)}">${icon(ic, 18)}${esc(txt)}</button>`;
  const exportBtns = () => `<div class="actions"><button class="btn ghost" disabled title="Exportación disponible en la Fase 4">${icon('download', 18)}PDF</button><button class="btn ghost" disabled title="Exportación disponible en la Fase 4">${icon('download', 18)}CSV</button></div>`;
  const head = (t, sub) => `<div class="section-head"><h2>${esc(t)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;

  /* ---------- Dashboard ---------- */
  async function dashboard(root) {
    root.innerHTML = `<div class="filters">${dateField('f-from', 'Desde', daysAgo(29))}${dateField('f-to', 'Hasta', today())}${exportBtns()}</div><div id="out">${loading()}</div>`;
    const load = async () => {
      const d = await LC.repo.dashboard({ from: val(root, 'f-from'), to: val(root, 'f-to') });
      $('#out', root).innerHTML = `
        <div class="kpis">
          ${kpi('Ventas totales', fmtARS(d.salesTotal, 0), 'Importe sin IVA')}
          ${kpi('Operaciones de venta', fmtNum(d.salesOps), 'Ventas registradas, no unidades')}
          ${kpi('Compras totales', fmtARS(d.purchasesTotal, 0), 'Importe de compras a proveedores')}
          ${kpi('Operaciones de compra', fmtNum(d.purchasesOps), 'Compras registradas, no unidades')}
        </div>
        <div class="grid2">
          <div class="card"><h3>Productos más vendidos</h3><p class="hint">Unidades vendidas en el período</p>${hbars(d.topProducts, n => fmtNum(n) + ' u.')}</div>
          <div class="card"><h3>Clientes con mayor compra</h3><p class="hint">Importe comprado en el período (top 10)</p>${hbars(d.topClients, n => fmtARS(n, 0))}</div>
          <div class="card"><h3>Mayor stock</h3><p class="hint">Situación actual, no depende de las fechas</p>${hbars(d.topStock, n => fmtNum(n) + ' u.')}</div>
          <div class="card"><h3>Menor stock</h3><p class="hint">Situación actual, no depende de las fechas</p>${hbars(d.lowStock, n => fmtNum(n) + ' u.')}</div>
        </div>`;
    };
    $$('input', root).forEach(i => i.addEventListener('change', load));
    load();
  }

  /* ---------- Ventas ---------- */
  async function ventas(root) {
    const cat = await LC.repo.catalog();
    let limit = 20;
    root.innerHTML = `
      <div class="filters">${dateField('f-from', 'Desde', daysAgo(6))}${dateField('f-to', 'Hasta', today())}
        ${select('f-cat', 'Categoría', opt(cat.categories))}${select('f-sub', 'Subcategoría', opt(cat.subcategories))}
        ${select('f-cli', 'Cliente', opt(cat.clients, 'id', LC.repo.cliName))}
        <div class="actions"><button class="btn primary" id="newSale">${icon('plus', 18)}Nueva venta</button></div></div>
      <div id="out">${loading()}</div>`;
    const filters = () => ({ from: val(root, 'f-from'), to: val(root, 'f-to'), catId: val(root, 'f-cat'), subId: val(root, 'f-sub'), clientId: val(root, 'f-cli') });
    const load = async () => {
      const s = await LC.repo.salesSummary(filters());
      const shown = s.lines.slice(0, limit);
      const rows = shown.map(l => ({ ...l, date: fmtDate(l.date), subdet: l.sub + (l.detail ? ' · ' + l.detail : ''), amount: fmtARS(l.amount) }));
      $('#out', root).innerHTML = `
        <div class="grid-head">
          <div class="kpis two">${kpi('Operaciones de venta', fmtNum(s.ops))}${kpi('Importe vendido', fmtARS(s.total, 0), 'Sin IVA')}</div>
          <div class="card"><h3>Top 5 categorías</h3><p class="hint">Por importe vendido</p>${hbars(s.topCategories, n => fmtARS(n, 0))}</div>
        </div>
        <div class="card flush">${table([
          { key: 'date', label: 'Fecha' }, { key: 'saleId', label: 'Venta' }, { key: 'client', label: 'Cliente' }, { key: 'cat', label: 'Producto' },
          { key: 'subdet', label: 'Subproducto / detalle' }, { key: 'size', label: 'Talle' }, { key: 'qty', label: 'Cant.', num: true }, { key: 'amount', label: 'Importe de la línea', num: true }
        ], rows)}
          <div class="table-foot">Mostrando ${shown.length} de ${s.lines.length} líneas${s.lines.length > shown.length ? ' <button class="btn ghost sm" id="more">Ver más</button>' : ''}</div></div>`;
      const more = $('#more', root); if (more) more.onclick = () => { limit += 20; load(); };
    };
    $$('.filters select, .filters input', root).forEach(i => i.addEventListener('change', () => { limit = 20; load(); }));
    $('#newSale', root).onclick = () => saleForm(cat);
    load();
  }

  async function saleForm(cat) {
    const vars = (await LC.repo.variants()).filter(v => v.stock > 0);
    const uniq = a => [...new Set(a)];
    const rowHtml = () => `<div class="line-row">
      <label class="field"><span>Categoría</span><select data-k="cat"><option value="">Elegir…</option>${opt(cat.categories).map(o => `<option value="${o.value}">${esc(o.label)}</option>`).join('')}</select></label>
      <label class="field"><span>Subcategoría</span><select data-k="sub" disabled></select></label>
      <label class="field"><span>Talle</span><select data-k="size" disabled></select></label>
      <label class="field"><span>Artículo</span><select data-k="var" disabled></select></label>
      <label class="field"><span>Cantidad</span><input data-k="qty" type="number" min="1" value="1"></label>
      <label class="field"><span>Precio unitario</span><input data-k="price" readonly placeholder="—"></label>
      <div class="line-amount" data-k="amount">$ 0,00</div>
      <button class="icon-btn" data-rm aria-label="Quitar línea">${icon('close', 18)}</button></div>`;
    const m = modal({
      title: 'Nueva venta', wide: true,
      body: `${NOTE}<div class="form-grid">${input('s-date', 'Fecha', { value: today(), ro: true })}${select('s-cli', 'Cliente', opt(cat.clients, 'id', LC.repo.cliName), '', 'Elegir cliente…')}${select('s-pay', 'Forma de pago', opt(cat.paymentMethods), '', 'Elegir…')}</div>
        <h3 class="mt">Detalle</h3><div id="lines">${rowHtml()}</div>
        <button class="btn ghost sm" id="addLine">${icon('plus', 16)}Agregar línea</button>
        <div class="totals"><label class="check"><input type="checkbox" id="s-vat"> Calcula IVA (21%)</label>
          <dl><dt>Subtotal</dt><dd id="t-sub">$ 0,00</dd><dt>IVA 21%</dt><dd id="t-vat">$ 0,00</dd><dt class="strong">Total</dt><dd class="strong" id="t-tot">$ 0,00</dd></dl></div>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button>${btnOff('Confirmar venta', 'sales', 'El registro real de ventas llega en la Fase 3')}`
    });
    const el = m.el;
    const fill = (sel, items, ph) => { sel.innerHTML = `<option value="">${ph}</option>` + items.map(i => `<option value="${esc(i.value)}">${esc(i.label)}</option>`).join(''); sel.disabled = !items.length; };
    const q = (row, k) => $(`[data-k="${k}"]`, row);
    function onLine(row, k) {
      const c = q(row, 'cat').value, s = q(row, 'sub').value, z = q(row, 'size').value, vid = q(row, 'var').value;
      if (k === 'cat') { const subs = uniq(vars.filter(v => v.catId === c).map(v => v.subId)); fill(q(row, 'sub'), subs.map(id => ({ value: id, label: cat.subcategories.find(x => x.id === id).name })), 'Elegir…'); fill(q(row, 'size'), [], '—'); fill(q(row, 'var'), [], '—'); }
      if (k === 'sub') { fill(q(row, 'size'), uniq(vars.filter(v => v.catId === c && v.subId === s).map(v => v.size)).map(t => ({ value: t, label: t })), 'Elegir…'); fill(q(row, 'var'), [], '—'); }
      if (k === 'size') fill(q(row, 'var'), vars.filter(v => v.catId === c && v.subId === s && v.size === z).map(v => ({ value: v.id, label: `${v.detail} (stock ${v.stock})` })), 'Elegir…');
      const v = vars.find(x => x.id === q(row, 'var').value);
      q(row, 'price').value = v ? fmtARS(v.sellPrice) : '';
      if (v) q(row, 'qty').max = v.stock;
    }
    function recalc() {
      const lines = $$('.line-row', el).map(row => { const v = vars.find(x => x.id === q(row, 'var').value); const qty = Math.max(0, parseInt(q(row, 'qty').value, 10) || 0); const ok = v && qty >= 1 && qty <= v.stock; q(row, 'amount').textContent = ok ? fmtARS(qty * v.sellPrice) : '$ 0,00'; q(row, 'qty').classList.toggle('bad', !!v && !ok); return ok ? { qty, unit: v.sellPrice } : null; }).filter(Boolean);
      const t = LC.repo.saleTotals(lines, $('#s-vat', el).checked);
      $('#t-sub', el).textContent = fmtARS(t.subtotal); $('#t-vat', el).textContent = fmtARS(t.iva); $('#t-tot', el).textContent = fmtARS(t.total);
    }
    el.addEventListener('change', e => { const row = e.target.closest('.line-row'); if (row) onLine(row, e.target.dataset.k); recalc(); });
    el.addEventListener('input', e => { if (e.target.dataset.k === 'qty') recalc(); });
    el.addEventListener('click', e => {
      if (e.target.closest('#addLine')) $('#lines', el).insertAdjacentHTML('beforeend', rowHtml());
      const rm = e.target.closest('[data-rm]'); if (rm && $$('.line-row', el).length > 1) { rm.closest('.line-row').remove(); recalc(); }
    });
  }

  /* ---------- Artículos ---------- */
  async function articulos(root) {
    const cat = await LC.repo.catalog();
    root.innerHTML = `<div class="filters">${select('f-cat', 'Categoría', opt(cat.categories))}${select('f-sub', 'Subcategoría', opt(cat.subcategories))}${select('f-sup', 'Proveedor', opt(cat.suppliers))}
      <div class="actions"><button class="btn primary" id="newRec">${icon('plus', 18)}Cargar mercadería</button></div></div><div id="out">${loading()}</div>`;
    const load = async () => {
      const f = { catId: val(root, 'f-cat'), subId: val(root, 'f-sub'), supplierId: val(root, 'f-sup') };
      const [vs, k] = await Promise.all([LC.repo.variants(f), LC.repo.inventoryKpis(f)]);
      $('#out', root).innerHTML = `<div class="kpis three">${kpi('Variantes de artículos', fmtNum(k.variants), 'Activas')}${kpi('Stock a precio de última compra', fmtARS(k.valuedBuy, 0))}${kpi('Stock a precio de venta', fmtARS(k.valuedSell, 0))}</div>
        <div class="card flush">${table([{ key: 'cat', label: 'Categoría' }, { key: 'sub', label: 'Subcategoría' }, { key: 'detail', label: 'Detalle' }, { key: 'size', label: 'Talle' }, { key: 'stock', label: 'Stock', num: true }, { key: 'buy', label: 'Últ. compra', num: true }, { key: 'supplier', label: 'Proveedor' }, { key: 'sell', label: 'Precio de venta', num: true }],
          vs.map(v => ({ ...v, buy: fmtARS(v.buyPrice), sell: fmtARS(v.sellPrice) })))}<div class="table-foot">Ordenado por stock, de mayor a menor. Editar e inactivar llegan en la Fase 2.</div></div>`;
    };
    $$('select', root).forEach(s => s.addEventListener('change', load));
    $('#newRec', root).onclick = () => receptionForm(cat);
    load();
  }

  function receptionForm(cat) {
    modal({
      title: 'Cargar mercadería', wide: true,
      body: `${NOTE}<div class="form-grid">${input('r-date', 'Fecha', { value: today(), type: 'date' })}${select('r-sup', 'Proveedor', opt(cat.suppliers), '', 'Elegir…')}</div>
        <h3 class="mt">Productos recibidos</h3>
        <div class="form-grid cols4">${select('r-cat', 'Categoría', opt(cat.categories), '', 'Elegir…')}${select('r-sub', 'Subcategoría *', opt(cat.subcategories), '', 'Elegir…')}${input('r-det', 'Detalle (opcional)')}${input('r-size', 'Talle *')}${input('r-qty', 'Cantidad *', { type: 'number' })}${input('r-buy', 'Precio de compra *', { type: 'number' })}${input('r-sell', 'Precio de venta', { type: 'number' })}</div>
        <button class="btn ghost sm" disabled>${icon('plus', 16)}Agregar otro producto</button>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button>${btnOff('Confirmar recepción', 'articles', 'El registro de compras y stock llega en la Fase 2')}`
    });
  }

  /* ---------- Clientes ---------- */
  async function clientes(root) {
    const cat = await LC.repo.catalog();
    root.innerHTML = `<div class="filters">${dateField('f-from', 'Desde', daysAgo(89))}${dateField('f-to', 'Hasta', today())}${select('f-cli', 'Cliente', opt(cat.clients, 'id', LC.repo.cliName))}
      <div class="actions"><button class="btn primary" id="newCli">${icon('plus', 18)}Nuevo cliente</button></div></div><div id="out">${loading()}</div>`;
    const load = async () => {
      const list = await LC.repo.clientsSummary({ from: val(root, 'f-from'), to: val(root, 'f-to'), clientId: val(root, 'f-cli') });
      $('#out', root).innerHTML = `<div class="kpis one">${kpi('Clientes registrados', fmtNum(cat.clients.length), 'No cambia con el filtro de fechas')}</div>
        <div class="card flush">${table([{ key: 'name', label: 'Nombre y apellido' }, { key: 'units', label: 'Unidades compradas', num: true }, { key: 'amt', label: 'Importe comprado', num: true }],
          list.map(c => ({ ...c, amt: fmtARS(c.amount), _attr: `class="clickable" data-id="${c.id}" tabindex="0"` })))}<div class="table-foot">Tocá un cliente para ver su ficha.</div></div>`;
      $$('tr.clickable', root).forEach(tr => { const open = () => clientCard(tr.dataset.id); tr.onclick = open; tr.onkeydown = e => { if (e.key === 'Enter') open(); }; });
    };
    $$('.filters select, .filters input', root).forEach(i => i.addEventListener('change', load));
    $('#newCli', root).onclick = () => clientForm();
    load();
  }

  function clientForm(c = {}) {
    modal({
      title: c.id ? 'Ficha del cliente' : 'Nuevo cliente',
      body: `${NOTE}<div class="form-grid">${input('c-first', 'Nombre', { req: 1, value: c.first })}${input('c-last', 'Apellido', { req: 1, value: c.last })}${input('c-mail', 'Email', { type: 'email', value: c.email })}${input('c-tel', 'Celular (con código de área)', { type: 'tel', value: c.phone })}${input('c-dir', 'Dirección', { value: c.address })}${input('c-loc', 'Localidad o ciudad', { value: c.city })}${input('c-prov', 'Provincia', { value: c.province })}${input('c-com', 'Comentarios', { area: 1, full: 1, value: c.notes })}</div>`,
      footer: `<button class="btn ghost" data-close>Cerrar</button>${btnOff('Guardar cliente', 'clients', 'El guardado real llega en la Fase 3')}`
    });
  }
  async function clientCard(id) {
    const c = await LC.repo.clientDetail(id);
    modal({
      title: c.name, wide: true,
      body: `<div class="kpis two">${kpi('Unidades compradas', fmtNum(c.units))}${kpi('Importe total comprado', fmtARS(c.amount, 0), 'Sin IVA')}</div>
        <dl class="facts"><dt>Email</dt><dd>${esc(c.email || '—')}</dd><dt>Celular</dt><dd>${c.phone ? esc(c.phone) : '<span class="warn-txt">Sin celular: no se podrá enviar por WhatsApp</span>'}</dd><dt>Dirección</dt><dd>${esc(c.address || '—')}</dd><dt>Localidad</dt><dd>${esc(c.city)}, ${esc(c.province)}</dd><dt>Comentarios</dt><dd>${esc(c.notes || '—')}</dd></dl>
        <h3 class="mt">Historial de ventas</h3>${table([{ key: 'date', label: 'Fecha' }, { key: 'saleId', label: 'Venta' }, { key: 'label', label: 'Producto' }, { key: 'qty', label: 'Cant.', num: true }, { key: 'amt', label: 'Importe', num: true }], c.lines.map(l => ({ ...l, date: fmtDate(l.date), amt: fmtARS(l.amount) })), 'Este cliente todavía no tiene compras.')}`,
      footer: `<button class="btn ghost" data-close>Cerrar</button><button class="btn primary" disabled title="La edición llega en la Fase 3">Modificar datos</button>`
    });
  }

  /* ---------- Proveedores ---------- */
  async function proveedores(root) {
    const cat = await LC.repo.catalog();
    root.innerHTML = `<div class="filters">${dateField('f-from', 'Desde', daysAgo(89))}${dateField('f-to', 'Hasta', today())}${select('f-sup', 'Proveedor', opt(cat.suppliers))}${select('f-cat', 'Categoría de producto', opt(cat.categories))}
      <div class="actions"><button class="btn primary" id="newSup">${icon('plus', 18)}Nuevo proveedor</button></div></div><div id="out">${loading()}</div>`;
    const load = async () => {
      const list = await LC.repo.suppliersSummary({ from: val(root, 'f-from'), to: val(root, 'f-to'), supplierId: val(root, 'f-sup'), catId: val(root, 'f-cat') });
      $('#out', root).innerHTML = `<div class="kpis one">${kpi('Proveedores activos', fmtNum(list.length), 'No cambia con el filtro de fechas')}</div>
        <div class="card flush">${table([{ key: 'name', label: 'Razón social' }, { key: 'cats', label: 'Categorías' }, { key: 'units', label: 'Unidades compradas', num: true }, { key: 'amt', label: 'Importe comprado', num: true }], list.map(s => ({ ...s, amt: fmtARS(s.amount) })))}</div>`;
    };
    $$('.filters select, .filters input', root).forEach(i => i.addEventListener('change', load));
    $('#newSup', root).onclick = () => modal({
      title: 'Nuevo proveedor',
      body: `${NOTE}<div class="form-grid">${input('p-date', 'Fecha de alta', { type: 'date', value: today() })}${input('p-rs', 'Razón social', { req: 1 })}${input('p-n', 'Nombre')}${input('p-a', 'Apellido')}${input('p-m', 'Email', { type: 'email' })}${input('p-t', 'Celular', { type: 'tel' })}</div>
        <h3 class="mt">Categorías que comercializa</h3><div class="chips">${cat.categories.map(c => `<label class="chip"><input type="checkbox"> ${esc(c.name)}</label>`).join('')}</div>`,
      footer: `<button class="btn ghost" data-close>Cancelar</button>${btnOff('Guardar proveedor', 'suppliers', 'El guardado real llega en la Fase 2')}`
    });
    load();
  }

  /* ---------- Reportes ---------- */
  const REPORTS = [
    { id: 'ventas-periodo', name: 'Resumen de ventas por período', run: async f => { const l = await LC.repo.salesLines(f); const g = {}; l.forEach(x => { (g[x.date] = g[x.date] || { ids: new Set(), amt: 0 }); g[x.date].ids.add(x.saleId); g[x.date].amt += x.amount; }); return { cols: [{ key: 'a', label: 'Fecha' }, { key: 'b', label: 'Operaciones', num: true }, { key: 'c', label: 'Importe', num: true }], rows: Object.entries(g).sort().reverse().map(([d, o]) => ({ a: fmtDate(d), b: o.ids.size, c: fmtARS(o.amt) })) }; } },
    { id: 'compras-periodo', name: 'Resumen de compras por período', run: async f => { const l = await LC.repo.purchaseLines(f); const g = {}; l.forEach(x => { (g[x.date] = g[x.date] || { ids: new Set(), amt: 0 }); g[x.date].ids.add(x.purchaseId); g[x.date].amt += x.amount; }); return { cols: [{ key: 'a', label: 'Fecha' }, { key: 'b', label: 'Operaciones', num: true }, { key: 'c', label: 'Importe', num: true }], rows: Object.entries(g).sort().reverse().map(([d, o]) => ({ a: fmtDate(d), b: o.ids.size, c: fmtARS(o.amt) })) }; } },
    { id: 'ventas-categoria', name: 'Ventas por categoría y subcategoría', run: async f => { const l = await LC.repo.salesLines(f); const g = {}; l.forEach(x => { const k = x.cat + '|' + x.sub; g[k] = g[k] || { u: 0, a: 0 }; g[k].u += x.qty; g[k].a += x.amount; }); return { cols: [{ key: 'a', label: 'Categoría' }, { key: 'b', label: 'Subcategoría' }, { key: 'c', label: 'Unidades', num: true }, { key: 'd', label: 'Importe', num: true }], rows: Object.entries(g).sort((x, y) => y[1].a - x[1].a).map(([k, o]) => ({ a: k.split('|')[0], b: k.split('|')[1], c: o.u, d: fmtARS(o.a) })) }; } },
    { id: 'mas-vendidos', name: 'Productos más vendidos', run: async f => { const d = await LC.repo.dashboard(f); return { cols: [{ key: 'a', label: 'Producto' }, { key: 'b', label: 'Unidades', num: true }], rows: d.topProducts.map(x => ({ a: x.label, b: x.value })) }; } },
    { id: 'mejores-clientes', name: 'Clientes con mayores compras', run: async f => { const d = await LC.repo.dashboard(f); return { cols: [{ key: 'a', label: 'Cliente' }, { key: 'b', label: 'Importe', num: true }], rows: d.topClients.map(x => ({ a: x.label, b: fmtARS(x.value) })) }; } },
    { id: 'stock', name: 'Stock actual y valorización', run: async () => { const v = await LC.repo.variants(); return { cols: [{ key: 'a', label: 'Producto' }, { key: 'b', label: 'Stock', num: true }, { key: 'c', label: 'A precio de compra', num: true }, { key: 'd', label: 'A precio de venta', num: true }], rows: v.map(x => ({ a: LC.repo.prodLabel(x), b: x.stock, c: fmtARS(x.stock * x.buyPrice), d: fmtARS(x.stock * x.sellPrice) })) }; } },
    { id: 'compras-proveedor', name: 'Compras por proveedor', run: async f => { const s = await LC.repo.suppliersSummary(f); return { cols: [{ key: 'a', label: 'Proveedor' }, { key: 'b', label: 'Unidades', num: true }, { key: 'c', label: 'Importe', num: true }], rows: s.map(x => ({ a: x.name, b: x.units, c: fmtARS(x.amount) })) }; } },
    { id: 'movimientos', name: 'Historial de movimientos de stock', run: async f => { const m = await LC.repo.stockMovements(f); return { cols: [{ key: 'a', label: 'Fecha' }, { key: 'b', label: 'Tipo' }, { key: 'c', label: 'Operación' }, { key: 'd', label: 'Producto' }, { key: 'e', label: 'Cantidad', num: true }], rows: m.map(x => ({ a: fmtDate(x.date), b: x.type, c: x.ref, d: x.label, e: (x.qty > 0 ? '+' : '') + x.qty })) }; } }
  ];
  async function reportes(root) {
    root.innerHTML = `<div class="filters">${select('f-rep', 'Reporte', REPORTS.map(r => ({ value: r.id, label: r.name })), REPORTS[0].id, 'Elegir…')}${dateField('f-from', 'Desde', daysAgo(89))}${dateField('f-to', 'Hasta', today())}${exportBtns()}</div><div id="out">${loading()}</div>`;
    const load = async () => {
      const r = REPORTS.find(x => x.id === val(root, 'f-rep')); if (!r) return;
      const res = await r.run({ from: val(root, 'f-from'), to: val(root, 'f-to') });
      $('#out', root).innerHTML = `${head(r.name, 'Mismos criterios de cálculo que el Dashboard. Datos de demostración.')}<div class="card flush">${table(res.cols, res.rows)}</div>`;
    };
    $$('.filters select, .filters input', root).forEach(i => i.addEventListener('change', load));
    load();
  }

  return { dashboard, ventas, articulos, clientes, proveedores, reportes };
})();
