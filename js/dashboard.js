/* Dashboard (entrega 4A). Solo lectura: pide los cálculos al servidor (una única solicitud). */
(function () {
  if (!LC.config.apiUrl || !LC.real || !LC.real.kit || !LC.exportar) return;
  const { api, fld, v, fail, LECT } = LC.real.kit;
  const { esc, fmtARS, fmtNum, $, kpi, loading, hbars } = LC.ui;
  const { today, daysAgo } = LC.util;
  LECT.dashboard_datos = 1; LC.config.ready.push('dashboard'); LC.expectedBackend = '4A-1';
  const periodoTxt = d => `${d.periodo.desde || 'el inicio'} al ${d.periodo.hasta || 'hoy'}`;
  const bloques = d => [['Productos más vendidos (unidades)', d.productos_vendidos, 'unidades'], ['Clientes con mayor compra (importe, con IVA)', d.clientes_top, 'ARS'], ['Mayor stock (situación actual)', d.stock_mayor, 'unidades'], ['Menor stock (situación actual)', d.stock_menor, 'unidades']];

  /* CSV estructurado: Seccion;Posicion;Concepto;Valor;Unidad (fechas y números exportables a Excel) */
  function filasCSV(d) {
    const f = [['Seccion', 'Posicion', 'Concepto', 'Valor', 'Unidad'], ['Informe', '', 'Negocio', 'La Chiru Jeans', ''], ['Informe', '', 'Periodo desde', d.periodo.desde, 'fecha'], ['Informe', '', 'Periodo hasta', d.periodo.hasta, 'fecha'], ['Informe', '', 'Generado', d.generado, 'fecha_hora'],
      ['Indicadores', '', 'Ventas totales (con IVA)', d.ventas.total, 'ARS'], ['Indicadores', '', 'Ventas sin IVA', d.ventas.neto, 'ARS'], ['Indicadores', '', 'Operaciones de venta', d.ventas.operaciones, 'operaciones'],
      ['Indicadores', '', 'Compras totales', d.compras.total, 'ARS'], ['Indicadores', '', 'Operaciones de compra', d.compras.operaciones, 'operaciones']];
    bloques(d).forEach(([t, items, un]) => items.forEach((x, i) => f.push([t, i + 1, x.label, x.value, un])));
    return f;
  }
  /* Informe imprimible (PDF): encabezado, período, fecha de generación, indicadores y rankings */
  function informeHTML(d) {
    const max = a => Math.max(1, ...a.map(x => x.value));
    const tabla = (t, items, un) => `<h3>${esc(t)}</h3>${items.length ? `<table>${items.map((x, i) => `<tr><td>${i + 1}. ${esc(x.label)}</td><td class="b"><div style="width:${Math.max(3, x.value / max(items) * 100)}%"></div></td><td class="r">${un === 'ARS' ? esc(fmtARS(x.value, 0)) : esc(fmtNum(x.value))}</td></tr>`).join('')}</table>` : '<p class="n">Sin datos en el período.</p>'}`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Dashboard La Chiru Jeans</title><style>body{font:13px/1.4 Arial,sans-serif;color:#222;margin:24px}h1{font:italic 700 26px Georgia,serif;color:#8B3F56;margin:0}h3{color:#8B3F56;margin:18px 0 6px}.n{color:#666;font-size:12px}.k{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.k div{border:1px solid #EBCFD5;border-radius:8px;padding:8px 12px;min-width:150px}.k b{display:block;font-size:18px;color:#8B3F56}table{width:100%;border-collapse:collapse}td{padding:3px 4px;border-bottom:1px solid #eee}.r{text-align:right;white-space:nowrap}.b{width:35%}.b div{height:9px;background:#D17C8E;border-radius:5px}</style></head><body><h1>La Chiru Jeans</h1><div class="n">Informe del Dashboard</div><p>Período: <b>${esc(periodoTxt(d))}</b><br>Generado: ${esc(String(d.generado).replace('T', ' '))}</p>
      <div class="k"><div>Ventas totales (con IVA)<b>${esc(fmtARS(d.ventas.total, 0))}</b>sin IVA: ${esc(fmtARS(d.ventas.neto, 0))}</div><div>Operaciones de venta<b>${esc(fmtNum(d.ventas.operaciones))}</b></div><div>Compras totales<b>${esc(fmtARS(d.compras.total, 0))}</b></div><div>Operaciones de compra<b>${esc(fmtNum(d.compras.operaciones))}</b></div></div>
      ${bloques(d).map(([t, it, un]) => tabla(t, it, un)).join('')}<p class="n">Operaciones = ventas o compras registradas, no unidades. Los rankings de stock muestran la situación actual y no dependen de las fechas.</p></body></html>`;
  }

  LC.views.dashboard = async function (root) {
    root.innerHTML = `<div class="filters">${fld('f-from', 'Desde', { type: 'date', value: daysAgo(29) })}${fld('f-to', 'Hasta', { type: 'date', value: today() })}<div class="actions"><button class="btn ghost" id="xpdf" disabled>Exportar PDF</button><button class="btn ghost" id="xcsv" disabled>Exportar CSV</button></div></div><div id="out">${loading()}</div>`;
    let datos = null, seq = 0;
    const botones = () => { root.querySelector('#xpdf').disabled = root.querySelector('#xcsv').disabled = !datos; };
    const vacio = (items, fmt) => items.length ? hbars(items, fmt) : '<div class="empty">Sin datos en el período.</div>';
    const load = async () => {
      const desde = v(root, 'f-from'), hasta = v(root, 'f-to'), mi = ++seq; datos = null; botones();
      if (desde && hasta && desde > hasta) { $('#out', root).innerHTML = '<div class="empty">La fecha "desde" no puede ser posterior a "hasta".</div>'; return; }
      try {
        const d = await api('dashboard_datos', { desde, hasta }); if (mi !== seq) return; datos = d; botones();
        $('#out', root).innerHTML = `<div class="kpis">${kpi('Ventas totales', fmtARS(d.ventas.total, 0), 'Con IVA · sin IVA: ' + fmtARS(d.ventas.neto, 0))}${kpi('Operaciones de venta', fmtNum(d.ventas.operaciones), 'Ventas registradas, no unidades')}${kpi('Compras totales', fmtARS(d.compras.total, 0), 'Compras a proveedores')}${kpi('Operaciones de compra', fmtNum(d.compras.operaciones), 'Compras registradas, no unidades')}</div>
          <div class="grid2"><div class="card"><h3>Productos más vendidos</h3><p class="hint">Unidades vendidas en el período (top 10)</p>${vacio(d.productos_vendidos, n => fmtNum(n) + ' u.')}</div>
          <div class="card"><h3>Clientes con mayor compra</h3><p class="hint">Importe comprado en el período, con IVA (top 10)</p>${vacio(d.clientes_top, n => fmtARS(n, 0))}</div>
          <div class="card"><h3>Mayor stock</h3><p class="hint">Situación actual, no depende de las fechas</p>${vacio(d.stock_mayor, n => fmtNum(n) + ' u.')}</div>
          <div class="card"><h3>Menor stock</h3><p class="hint">Situación actual, no depende de las fechas</p>${vacio(d.stock_menor, n => fmtNum(n) + ' u.')}</div></div>`;
      } catch (e) { if (mi === seq) $('#out', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.querySelectorAll('.filters input').forEach(i => i.addEventListener('change', load));
    root.querySelector('#xpdf').onclick = () => { if (datos && !LC.exportar.imprimir(informeHTML(datos))) fail({ message: 'El navegador bloqueó la ventana del informe. Permití ventanas emergentes para este sitio.' }); };
    root.querySelector('#xcsv').onclick = () => { if (datos) LC.exportar.descargarCSV(`dashboard_${datos.periodo.desde || 'inicio'}_${datos.periodo.hasta || 'hoy'}.csv`, filasCSV(datos)); };
    load();
  };
  LC.dashboardUI = { filasCSV, informeHTML };
})();
