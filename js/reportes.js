/* Reportes (entrega 4B). Solo lectura: el servidor calcula y devuelve columnas, filas y totales; acá se muestran y se exportan. */
(function () {
  if (!LC.config.apiUrl || !LC.real || !LC.real.kit || !LC.exportar) return;
  const { api, fld, v, tbl, fail, LECT } = LC.real.kit;
  const { esc, fmtARS, fmtNum, $, loading } = LC.ui;
  const { today, daysAgo } = LC.util;
  LECT.reporte = 1; LC.config.ready.push('reportes'); LC.expectedBackend = '4B-1';
  const CATALOGO = [
    { id: 'ventas_periodo', nombre: 'Resumen de ventas por período', agrupar: true }, { id: 'compras_periodo', nombre: 'Resumen de compras por período', agrupar: true },
    { id: 'ventas_categoria', nombre: 'Ventas por categoría y subcategoría' }, { id: 'productos_vendidos', nombre: 'Productos más vendidos' }, { id: 'clientes_compras', nombre: 'Clientes con mayores compras' },
    { id: 'stock_valorizado', nombre: 'Stock actual y valorización', actual: true }, { id: 'compras_proveedor', nombre: 'Compras por proveedor' }, { id: 'movimientos_stock', nombre: 'Historial de movimientos de stock' }];
  const txt = (c, x) => x == null || x === '' ? '' : c.tipo === 'ars' ? fmtARS(x) : c.tipo === 'entero' ? fmtNum(x) : String(x);
  const periodoTxt = r => `${r.desde || 'el inicio'} al ${r.hasta || 'hoy'}`;
  /* CSV: una fila de títulos + los datos + la fila de totales; números como números, fechas AAAA-MM-DD */
  function filasCSV(r) { const f = [r.columnas.map(c => c.label), ...r.filas]; if (r.totales) f.push(r.totales); return f; }
  function informeHTML(r, actual) {
    const num = c => c.tipo !== 'texto' ? ' class="r"' : '', fila = (x, b) => `<tr>${x.map((y, i) => `<td${num(r.columnas[i])}>${b ? '<b>' : ''}${esc(txt(r.columnas[i], y))}${b ? '</b>' : ''}</td>`).join('')}</tr>`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(r.titulo)} · La Chiru Jeans</title><style>body{font:12px/1.4 Arial,sans-serif;color:#222;margin:24px}h1{font:italic 700 26px Georgia,serif;color:#8B3F56;margin:0}h2{margin:12px 0 2px;color:#8B3F56}.n{color:#666;font-size:11px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:4px 5px;border-bottom:1px solid #ddd;text-align:left}th{background:#FBEAEA;color:#8B3F56}.r{text-align:right;white-space:nowrap}tfoot td{border-top:2px solid #8B3F56}</style></head><body><h1>La Chiru Jeans</h1><h2>${esc(r.titulo)}</h2><p class="n">${actual ? 'Situación actual (no depende de las fechas)' : 'Período: ' + esc(periodoTxt(r))} · Generado: ${esc(String(r.generado).replace('T', ' '))}</p>
      <table><thead><tr>${r.columnas.map(c => `<th${num(c)}>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${r.filas.map(x => fila(x)).join('')}</tbody>${r.totales ? `<tfoot>${fila(r.totales, true)}</tfoot>` : ''}</table>${r.truncado ? '<p class="n">Se muestran solo las primeras filas: acotá las fechas para ver el resto.</p>' : ''}<p class="n">${esc(r.nota || '')}</p></body></html>`;
  }
  LC.views.reportes = async function (root) {
    root.innerHTML = `<div class="filters"><label class="field"><span>Reporte</span><select id="f-rep">${CATALOGO.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</select></label>${fld('f-from', 'Desde', { type: 'date', value: daysAgo(89) })}${fld('f-to', 'Hasta', { type: 'date', value: today() })}<label class="field" id="w-agr"><span>Agrupar por</span><select id="f-agr"><option value="dia">Día</option><option value="mes">Mes</option></select></label><div class="actions"><button class="btn ghost" id="xpdf" disabled>Exportar PDF</button><button class="btn ghost" id="xcsv" disabled>Exportar CSV</button></div></div><div id="out">${loading()}</div>`;
    let datos = null, actual = false, seq = 0;
    const botones = () => { root.querySelector('#xpdf').disabled = root.querySelector('#xcsv').disabled = !datos; };
    const load = async () => {
      const def = CATALOGO.find(c => c.id === v(root, 'f-rep')); actual = !!def.actual;
      root.querySelector('#w-agr').hidden = !def.agrupar; root.querySelectorAll('#f-from, #f-to').forEach(i => { i.disabled = actual; });
      const desde = actual ? '' : v(root, 'f-from'), hasta = actual ? '' : v(root, 'f-to'), mi = ++seq; datos = null; botones();
      if (desde && hasta && desde > hasta) { $('#out', root).innerHTML = '<div class="empty">La fecha "desde" no puede ser posterior a "hasta".</div>'; return; }
      try {
        const r = await api('reporte', { id: def.id, desde, hasta, agrupar: def.agrupar ? v(root, 'f-agr') : 'dia' }); if (mi !== seq) return; datos = r; botones();
        const cols = r.columnas.map((c, i) => ({ k: 'c' + i, l: c.label, num: c.tipo !== 'texto', html: 1 })), fila = (x, b) => Object.fromEntries(x.map((y, i) => ['c' + i, b ? `<b>${esc(txt(r.columnas[i], y))}</b>` : esc(txt(r.columnas[i], y))]));
        $('#out', root).innerHTML = `<div class="card flush"><div class="table-foot"><b>${esc(r.titulo)}</b> · ${actual ? 'situación actual' : esc(periodoTxt(r))}</div>${r.filas.length ? tbl(cols, r.filas.map(x => fila(x)).concat(r.totales ? [fila(r.totales, true)] : [])) : '<div class="empty">Sin datos en el período.</div>'}<div class="table-foot">${esc(r.nota || '')}${r.truncado ? ' <b>Se muestran solo las primeras filas.</b>' : ''}</div></div>`;
      } catch (e) { if (mi === seq) $('#out', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.querySelectorAll('.filters select, .filters input').forEach(i => i.addEventListener('change', load));
    root.querySelector('#xpdf').onclick = () => { if (datos && !LC.exportar.imprimir(informeHTML(datos, actual))) fail({ message: 'El navegador bloqueó la ventana del informe. Permití ventanas emergentes para este sitio.' }); };
    root.querySelector('#xcsv').onclick = () => { if (datos) LC.exportar.descargarCSV(`reporte_${datos.id}_${datos.desde || 'inicio'}_${datos.hasta || 'hoy'}.csv`, filasCSV(datos)); };
    load();
  };
  LC.reportesUI = { CATALOGO, filasCSV, informeHTML };
})();
