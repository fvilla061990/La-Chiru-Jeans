/* Módulo Ventas (entrega 3B). Archivo nuevo: se apoya en las utilidades de real.js. El servidor recalcula y valida todo. */
(function () {
  if (!LC.config.apiUrl || !LC.real || !LC.real.kit) return;
  const { api, opts, sel, fld, v, tbl, confirmar, okMsg, fail, LECT } = LC.real.kit;
  const { esc, fmtARS, fmtNum, $, kpi, icon, modal, loading, hbars } = LC.ui;
  const { today, daysAgo } = LC.util;
  ['venta_listar', 'venta_detalle', 'cliente_listar', 'catalogo'].forEach(k => { LECT[k] = 1; });
  LC.config.ready.push('ventas'); LC.expectedBackend = '3B-1';
  const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

  /* ---- funciones puras (el servidor repite estos cálculos y es quien manda) ---- */
  function calcular(lineas, conIva, pct = 21) {
    const subtotal = r2(lineas.reduce((s, l) => s + r2(Number(l.cantidad) * Number(l.precio_unitario)), 0)), iva = conIva ? r2(subtotal * pct / 100) : 0;
    return { subtotal, iva, total: r2(subtotal + iva) };
  }
  function validarVenta(d) {
    if (!d.fecha) return 'Indicá la fecha.';
    if (d.fecha > today()) return 'La fecha no puede ser futura.';
    if (d.fecha < daysAgo(30)) return 'La fecha no puede ser anterior a 30 días.';
    if (!d.cliente_id) return 'Seleccioná un cliente.';
    if (!d.forma_pago_id) return 'Seleccioná la forma de pago.';
    if (!d.lineas.length) return 'Agregá al menos un artículo.';
    const vistos = {};
    for (let i = 0; i < d.lineas.length; i++) {
      const l = d.lineas[i], n = 'Línea ' + (i + 1) + ': ';
      if (!l.articulo_id) return n + 'elegí categoría, subcategoría y artículo.';
      if (vistos[l.articulo_id]) return n + 'el artículo está repetido.'; vistos[l.articulo_id] = true;
      if (l.cantidad === '' || !Number.isInteger(Number(l.cantidad)) || Number(l.cantidad) < 1) return n + 'la cantidad debe ser un entero mayor que 0.';
      if (l.stock !== undefined && Number(l.cantidad) > l.stock) return n + 'stock insuficiente (disponible: ' + l.stock + ').';
    }
    return null;
  }
  const waLink = (cel, texto) => cel ? 'https://wa.me/' + String(cel).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto) : null;
  const waTexto = r => `Hola ${r.cliente.nombre_completo.split(', ')[1] || ''}, gracias por tu compra en La Chiru Jeans (${r.venta.fecha}).\n` + r.lineas.map(l => `• ${l.cantidad} x ${l.articulo}: ${fmtARS(l.importe)}`).join('\n') + `\nSubtotal: ${fmtARS(r.venta.subtotal)}` + (r.venta.aplica_iva ? `\nIVA ${r.iva_porcentaje}%: ${fmtARS(r.venta.iva)}` : '') + `\nTotal: ${fmtARS(r.venta.total)}\nForma de pago: ${r.forma_pago}`;
  const comprobanteHTML = r => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante ${esc(r.venta.id)}</title><style>body{font:14px/1.4 Arial,sans-serif;color:#222;margin:24px}h1{font:italic 700 24px Georgia,serif;color:#8B3F56;margin:0}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}.tot td{border:0}.n{color:#666;font-size:12px}</style></head><body><h1>La Chiru Jeans</h1><div class="n">Comprobante de venta · documento no fiscal</div><p>Fecha: ${esc(r.venta.fecha)} · N° ${esc(r.venta.id)}<br>Cliente: ${esc(r.cliente.nombre_completo)}<br>Forma de pago: ${esc(r.forma_pago)}${r.venta.estado === 'ANULADA' ? '<br><b>VENTA ANULADA</b>' : ''}</p><table><thead><tr><th>Detalle</th><th class="r">Cant.</th><th class="r">Precio</th><th class="r">Importe</th></tr></thead><tbody>${r.lineas.map(l => `<tr><td>${esc(l.articulo)}</td><td class="r">${l.cantidad}</td><td class="r">${esc(fmtARS(l.precio_unitario))}</td><td class="r">${esc(fmtARS(l.importe))}</td></tr>`).join('')}</tbody></table><table class="tot"><tr><td class="r">Subtotal</td><td class="r">${esc(fmtARS(r.venta.subtotal))}</td></tr>${r.venta.aplica_iva ? `<tr><td class="r">IVA ${esc(r.iva_porcentaje)}%</td><td class="r">${esc(fmtARS(r.venta.iva))}</td></tr>` : ''}<tr><td class="r"><b>Total</b></td><td class="r"><b>${esc(fmtARS(r.venta.total))}</b></td></tr></table><p class="n">Documento no fiscal. Gracias por tu compra.</p></body></html>`;
  function abrirComprobante(r) {
    const w = window.open('', '_blank');
    if (!w) return fail({ message: 'El navegador bloqueó la ventana del comprobante. Permití ventanas emergentes para este sitio.' });
    w.document.write(comprobanteHTML(r)); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); // en el diálogo de impresión elegí "Guardar como PDF"
  }
  const lbl = a => `T${a.talle}${a.detalle ? ' · ' + a.detalle : ''} · stock ${a.stock}`;

  /* ---- detalle / comprobante / WhatsApp / anulación ---- */
  async function ventaModal(id, done, recien) {
    let r; try { r = await api('venta_detalle', { id }); } catch (e) { return fail(e); }
    const ve = r.venta, tel = waLink(r.cliente.celular, waTexto(r));
    const m = modal({ title: recien ? 'Venta registrada' : `Venta ${ve.id}`, wide: true, footer: `<button class="btn ghost" data-close>Cerrar</button><button class="btn ghost" id="pdf">Comprobante PDF</button><button class="btn ghost" id="wa">WhatsApp</button>${ve.estado === 'CONFIRMADA' ? '<button class="btn primary" id="anu">Anular venta</button>' : ''}`,
      body: `<dl><dt>Fecha</dt><dd>${esc(ve.fecha)}</dd><dt>Cliente</dt><dd>${esc(r.cliente.nombre_completo)}</dd><dt>Forma de pago</dt><dd>${esc(r.forma_pago)}</dd><dt>Estado</dt><dd>${esc(ve.estado)}${r.anulacion ? ' — ' + esc(r.anulacion.motivo) : ''}</dd></dl>`
        + tbl([{ k: 'articulo', l: 'Artículo' }, { k: 'cantidad', l: 'Cant.', num: 1 }, { k: 'pu', l: 'Precio', num: 1 }, { k: 'imp', l: 'Importe', num: 1 }], r.lineas.map(l => ({ ...l, pu: fmtARS(l.precio_unitario), imp: fmtARS(l.importe) })))
        + `<p class="note">Subtotal ${fmtARS(ve.subtotal)}${ve.aplica_iva ? ` · IVA ${r.iva_porcentaje}% ${fmtARS(ve.iva)}` : ''} · <b>Total ${fmtARS(ve.total)}</b></p><p class="note">El PDF no se envía solo: generalo y compartilo vos. WhatsApp abre el chat con el mensaje listo.${tel ? '' : ' Este cliente no tiene celular cargado: podés generar el PDF igualmente.'}</p>` });
    m.el.querySelector('#pdf').onclick = () => abrirComprobante(r);
    m.el.querySelector('#wa').onclick = () => tel ? window.open(tel, '_blank') : fail({ message: 'El cliente no tiene celular cargado.' });
    const an = m.el.querySelector('#anu'); if (an) an.onclick = () => { m.close(); anularForm(ve.id, done); };
  }
  function anularForm(vid, done) {
    const rid = crypto.randomUUID();
    const m = modal({ title: `Anular venta ${vid}`, footer: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ok">Anular venta</button>',
      body: `${fld('an-m', 'Motivo (obligatorio)', { req: 1, max: 200 })}<div class="note">Se repone el stock con un movimiento compensatorio. La venta no se borra: queda en el historial como anulada. Esta acción no se puede deshacer.</div>` });
    m.el.querySelector('#ok').onclick = async e => {
      const motivo = v(m.el, 'an-m').trim(); if (motivo.length < 3) return fail({ message: 'Indicá el motivo de la anulación.' });
      e.target.disabled = true;
      try { const r = await api('venta_anular', { request_id: rid, venta_id: vid, motivo }); m.close(); okMsg(r.duplicado ? 'Esa anulación ya estaba registrada.' : 'Venta anulada y stock repuesto.'); done(); }
      catch (x) { fail(x); e.target.disabled = false; }
    };
  }

  /* ---- alta de venta ---- */
  async function ventaForm(done) {
    let F; try { F = await LC.api.call('venta_formulario'); } catch (e) { return fail(e); } // siempre datos frescos (stock y precios)
    if (!F.articulos.length) return fail({ message: 'No hay artículos con stock y precio de venta para vender.' });
    if (!F.clientes.length) return fail({ message: 'Primero cargá al menos un cliente.' });
    const rid = crypto.randomUUID(), cats = [...new Set(F.articulos.map(a => a.categoria))].sort();
    const linea = () => `<tr class="ln"><td><select class="l-cat"><option value="">Categoría…</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></td><td><select class="l-sub"><option value="">Subcategoría…</option></select></td><td><select class="l-art"><option value="">Artículo…</option></select></td><td><input class="l-qty" type="number" min="1" step="1" inputmode="numeric" style="width:70px"></td><td class="num l-pre">—</td><td class="num l-imp">—</td><td><button class="btn ghost sm l-del" type="button">Quitar</button></td></tr>`;
    const m = modal({ title: 'Nueva venta', wide: true, body: `<div id="paso1"><div class="form-grid">${fld('v-date', 'Fecha', { type: 'date', value: today(), req: 1 })}${sel('v-cli', 'Cliente *', opts(F.clientes, 'id', 'nombre_completo'), 'Seleccionar…')}${sel('v-fp', 'Forma de pago *', opts(F.formas_pago, 'id', 'nombre'), 'Seleccionar…')}</div>
      <div class="table-wrap"><table><thead><tr><th>Categoría</th><th>Subcategoría</th><th>Artículo (talle)</th><th>Cant.</th><th class="num">Precio</th><th class="num">Importe</th><th></th></tr></thead><tbody id="v-lines">${linea()}</tbody></table></div>
      <p><button class="btn ghost" id="v-add" type="button">${icon('plus', 18)}Agregar artículo</button></p>
      <label><input type="checkbox" id="v-iva"> Calcula IVA (${F.iva_porcentaje}% sobre el subtotal)</label><div class="note" id="v-tot"></div>
      <div class="actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="rev">Revisar venta</button></div></div><div id="paso2" hidden></div>` });
    const body = m.el, tb = body.querySelector('#v-lines');
    const art = id => F.articulos.find(a => a.id === id);
    const leer = () => [...tb.querySelectorAll('.ln')].map(tr => { const a = art(tr.querySelector('.l-art').value); return { tr, articulo_id: a ? a.id : '', cantidad: tr.querySelector('.l-qty').value, precio_unitario: a ? a.precio_venta : 0, stock: a ? a.stock : undefined, a }; });
    const calc = () => { const ls = leer().filter(l => l.a && Number(l.cantidad) > 0); leer().forEach(l => { l.tr.querySelector('.l-pre').textContent = l.a ? fmtARS(l.a.precio_venta) : '—'; l.tr.querySelector('.l-imp').textContent = l.a && Number(l.cantidad) > 0 ? fmtARS(r2(l.cantidad * l.a.precio_venta)) : '—'; });
      const t = calcular(ls, body.querySelector('#v-iva').checked, F.iva_porcentaje); body.querySelector('#v-tot').innerHTML = `Subtotal ${fmtARS(t.subtotal)}${t.iva ? ` · IVA ${fmtARS(t.iva)}` : ''} · <b>Total ${fmtARS(t.total)}</b>`; return t; };
    body.addEventListener('change', e => {
      const tr = e.target.closest('.ln');
      if (tr && e.target.classList.contains('l-cat')) { const subs = [...new Set(F.articulos.filter(a => a.categoria === e.target.value).map(a => a.subcategoria))].sort(); tr.querySelector('.l-sub').innerHTML = '<option value="">Subcategoría…</option>' + subs.map(s => `<option>${esc(s)}</option>`).join(''); tr.querySelector('.l-art').innerHTML = '<option value="">Artículo…</option>'; }
      if (tr && e.target.classList.contains('l-sub')) tr.querySelector('.l-art').innerHTML = '<option value="">Artículo…</option>' + F.articulos.filter(a => a.categoria === tr.querySelector('.l-cat').value && a.subcategoria === e.target.value).map(a => `<option value="${esc(a.id)}">${esc(lbl(a))}</option>`).join('');
      calc();
    });
    body.addEventListener('input', calc);
    body.querySelector('#v-add').onclick = () => tb.insertAdjacentHTML('beforeend', linea());
    body.addEventListener('click', e => { const d = e.target.closest('.l-del'); if (d && tb.querySelectorAll('.ln').length > 1) { d.closest('.ln').remove(); calc(); } });
    calc();
    const datos = () => ({ request_id: rid, fecha: v(body, 'v-date'), cliente_id: v(body, 'v-cli'), forma_pago_id: v(body, 'v-fp'), aplica_iva: body.querySelector('#v-iva').checked, lineas: leer().map(l => ({ articulo_id: l.articulo_id, cantidad: l.cantidad, precio_unitario: l.precio_unitario, stock: l.stock })) });
    body.querySelector('#rev').onclick = () => {
      const d = datos(), msg = validarVenta(d); if (msg) return fail({ message: msg });
      const t = calcular(d.lineas, d.aplica_iva, F.iva_porcentaje), cli = F.clientes.find(c => c.id === d.cliente_id), fp = F.formas_pago.find(f => f.id === d.forma_pago_id);
      const p2 = body.querySelector('#paso2'); body.querySelector('#paso1').hidden = true; p2.hidden = false;
      p2.innerHTML = `<h3>Revisá la venta antes de confirmar</h3><dl><dt>Fecha</dt><dd>${esc(d.fecha)}</dd><dt>Cliente</dt><dd>${esc(cli.nombre_completo)}</dd><dt>Forma de pago</dt><dd>${esc(fp.nombre)}</dd></dl>${tbl([{ k: 'n', l: 'Artículo' }, { k: 'cantidad', l: 'Cant.', num: 1 }, { k: 'pu', l: 'Precio', num: 1 }, { k: 'imp', l: 'Importe', num: 1 }], leer().map(l => ({ n: `${l.a.categoria} ${l.a.subcategoria} ${l.a.detalle || ''} T${l.a.talle}`, cantidad: l.cantidad, pu: fmtARS(l.precio_unitario), imp: fmtARS(r2(l.cantidad * l.precio_unitario)) })))}<p class="note">Subtotal ${fmtARS(t.subtotal)}${t.iva ? ` · IVA ${F.iva_porcentaje}% ${fmtARS(t.iva)}` : ''} · <b>Total ${fmtARS(t.total)}</b></p><div class="actions"><button class="btn ghost" id="back">Volver</button><button class="btn primary" id="ok">Confirmar venta</button></div>`;
      p2.querySelector('#back').onclick = () => { p2.hidden = true; body.querySelector('#paso1').hidden = false; };
      p2.querySelector('#ok').onclick = async e => {
        e.target.disabled = true; p2.querySelector('#back').disabled = true;
        try { const r = await api('venta_registrar', { ...d, total_esperado: t.total, lineas: d.lineas.map(({ articulo_id, cantidad, precio_unitario }) => ({ articulo_id, cantidad, precio_unitario })) });
          m.close(); okMsg(r.duplicado ? 'Esa venta ya estaba registrada: no se duplicó.' : 'Venta registrada.'); done(); ventaModal(r.venta_id, done, true); }
        catch (x) { fail(x); e.target.disabled = false; p2.querySelector('#back').disabled = false; } // el mismo request_id permite reintentar sin duplicar
      };
    };
  }

  /* ---- pantalla principal ---- */
  LC.views.ventas = async function (root) {
    let c; try { c = await api('catalogo'); } catch (e) { root.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const cl = await api('cliente_listar', { desde: '', hasta: '', estado: 'activos' }).catch(() => ({ clientes: [] }));
    const subs = cid => opts(c.subcategorias.filter(s => !cid || s.categoria_id === cid), 'id', 'nombre');
    root.innerHTML = `<div class="filters">${fld('f-from', 'Desde', { type: 'date', value: daysAgo(6) })}${fld('f-to', 'Hasta', { type: 'date', value: today() })}${sel('f-cat', 'Categoría', opts(c.categorias, 'id', 'nombre'))}${sel('f-sub', 'Subcategoría', subs(''))}${sel('f-cli', 'Cliente', opts(cl.clientes, 'id', 'nombre_completo'))}<div class="actions"><button class="btn primary" id="newVta">${icon('plus', 18)}Nueva venta</button></div></div><div id="out">${loading()}</div>`;
    const load = async () => {
      try {
        const r = await api('venta_listar', { desde: v(root, 'f-from'), hasta: v(root, 'f-to'), categoria_id: v(root, 'f-cat'), subcategoria_id: v(root, 'f-sub'), cliente_id: v(root, 'f-cli') });
        const pend = r.pendientes.length ? `<div class="note">⚠ Hay ${r.pendientes.length} venta(s) incompleta(s): ${r.pendientes.map(p => `${esc(p.id)} <button class="btn ghost sm" data-recup="${esc(p.id)}">Recuperar</button>`).join(' ')}</div>` : '';
        $('#out', root).innerHTML = `${pend}<div class="kpis">${kpi('Operaciones de venta', fmtNum(r.operaciones), 'Ventas registradas')}${kpi('Importe vendido', fmtARS(r.total, 0), 'Con IVA · sin IVA: ' + fmtARS(r.neto, 0))}</div><div class="card"><h2>Top 5 categorías por importe</h2>${r.top_categorias.length ? hbars(r.top_categorias, x => fmtARS(x, 0)) : '<div class="empty">Sin ventas en el período.</div>'}</div><div class="card flush">${tbl([{ k: 'f', l: 'Fecha', html: 1 }, { k: 'cliente', l: 'Cliente' }, { k: 'categoria', l: 'Producto' }, { k: 'det', l: 'Subproducto / detalle' }, { k: 'talle', l: 'Talle' }, { k: 'cantidad', l: 'Cant.', num: 1 }, { k: 'imp', l: 'Importe', num: 1 }],
          r.lineas.map(l => ({ ...l, f: `${esc(l.fecha)} · <button class="link" data-venta="${esc(l.venta_id)}">${esc(l.venta_id)}</button>`, det: [l.subcategoria, l.detalle].filter(Boolean).join(' · '), imp: fmtARS(l.importe) })))}<div class="table-foot">Solo ventas confirmadas (las anuladas no suman). Tocá el número de venta para ver el detalle, el comprobante o anularla.${r.truncado ? ' Se muestran las primeras 500 líneas.' : ''}</div></div>`;
      } catch (e) { $('#out', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.querySelector('#f-cat').onchange = () => { root.querySelector('#f-sub').innerHTML = '<option value="">Todas</option>' + subs(v(root, 'f-cat')); load(); };
    root.querySelectorAll('.filters select:not(#f-cat), .filters input').forEach(i => i.addEventListener('change', load));
    root.querySelector('#newVta').onclick = () => ventaForm(load);
    root.addEventListener('click', e => {
      const vt = e.target.closest('[data-venta]'), rc = e.target.closest('[data-recup]');
      if (vt) ventaModal(vt.dataset.venta, load);
      if (rc) confirmar('Esta venta quedó incompleta. Se completará con lo ya registrado si alcanza el stock, o se descartará si no tiene detalle. ¿Continuar?', 'Recuperar', async () => { await api('venta_recuperar', { venta_id: rc.dataset.recup }); load(); });
    });
    load();
  };
  LC.ventaUI = { calcular, validarVenta, waLink, comprobanteHTML };
})();
