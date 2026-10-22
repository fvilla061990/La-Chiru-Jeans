/* Modo real (Fase 2B): Artículos y Proveedores conectados al backend. Con apiUrl vacío no hace nada (modo demostración). */
(function () {
  if (!LC.config.apiUrl) return;
  const { esc, fmtARS, fmtNum, $, kpi, icon, modal, toast, loading } = LC.ui;
  const { today, daysAgo } = LC.util;
  const api = (a, d) => LC.api.call(a, d);
  const okMsg = m => toast(m, 'success'), fail = e => toast(e.message || 'Error', 'error');
  LC.config.ready = ['articulos', 'proveedores'];
  let CAT = null;
  const catalogo = async force => (CAT && !force) ? CAT : (CAT = await api('catalogo'));
  const opts = (arr, v, l, s) => arr.map(x => `<option value="${esc(x[v])}"${x[v] === s ? ' selected' : ''}>${esc(x[l])}</option>`).join('');
  const sel = (id, label, html, ph = 'Todas') => `<label class="field"><span>${esc(label)}</span><select id="${id}"><option value="">${esc(ph)}</option>${html}</select></label>`;
  const fld = (id, label, o = {}) => `<label class="field"><span>${esc(label)}${o.req ? ' *' : ''}</span><input id="${id}" type="${o.type || 'text'}" value="${esc(o.value ?? '')}"${o.list ? ` list="${o.list}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.step ? ` step="${o.step}" min="0"` : ''}${o.dis ? ' disabled' : ''}></label>`;
  const v = (el, id) => (el.querySelector('#' + id) || {}).value || '';
  const tbl = (cols, rows) => !rows.length ? '<div class="empty">No hay registros para los filtros elegidos.</div>' :
    `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? r[c.k] : esc(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const acc = id => `<button class="btn ghost sm" data-edit="${esc(id)}">Editar</button> <button class="btn ghost sm" data-off="${esc(id)}">Inactivar</button>`;
  async function enviar(btn, accion, datos, m, done) {
    btn.disabled = true;
    try { await api(accion, datos); CAT = null; m.close(); okMsg('Guardado correctamente.'); done(); }
    catch (e) { fail(e); btn.disabled = false; }
  }
  function confirmar(texto, label, fn) {
    const m = modal({ title: 'Confirmar', body: `<p>${esc(texto)}</p>`, footer: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="cf">${esc(label)}</button>` });
    m.el.querySelector('#cf').onclick = async e => { e.target.disabled = true; try { await fn(); m.close(); okMsg('Listo.'); } catch (x) { fail(x); e.target.disabled = false; } };
  }
  const foot = `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="sv">Guardar</button>`;

  /* ---------- Artículos ---------- */
  function artForm(a, done) {
    const c = CAT, nuevo = !a;
    const m = modal({ title: nuevo ? 'Nuevo artículo' : 'Editar artículo', footer: foot, body: `<div class="form-grid">
      ${nuevo ? fld('a-cat', 'Categoría', { req: 1, list: 'dl-cat', max: 60 }) + fld('a-sub', 'Subcategoría', { req: 1, list: 'dl-sub', max: 60 }) : fld('a-cat', 'Categoría', { value: a.categoria, dis: 1 }) + fld('a-sub', 'Subcategoría', { value: a.subcategoria, dis: 1 })}
      ${fld('a-det', 'Detalle (opcional)', { value: a && a.detalle, max: 80 })}${fld('a-talle', 'Talle', { req: 1, value: a && a.talle, max: 10 })}
      ${sel('a-prov', 'Proveedor', opts(c.proveedores, 'id', 'razon_social', a && a.proveedor_id), 'Sin proveedor')}${fld('a-pv', 'Precio de venta (ARS)', { type: 'number', step: '0.01', value: a ? a.precio_venta : '' })}</div>
      <datalist id="dl-cat">${c.categorias.map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist><datalist id="dl-sub">${c.subcategorias.map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist>
      <div class="note">${nuevo ? 'Si la categoría o subcategoría no existe, se crea. El stock inicial es 0: se carga con una recepción de mercadería (entrega 2C).' : 'Categoría y subcategoría no se pueden cambiar. Los precios históricos de compras y ventas no se modifican.'}</div>` });
    m.el.querySelector('#sv').onclick = e => enviar(e.target, 'articulo_guardar', { id: a && a.id, categoria: v(m.el, 'a-cat'), subcategoria: v(m.el, 'a-sub'), detalle: v(m.el, 'a-det'), talle: v(m.el, 'a-talle'), proveedor_id: v(m.el, 'a-prov'), precio_venta: v(m.el, 'a-pv') }, m, done);
  }
  LC.views.articulos = async function (root) {
    let c; try { c = await catalogo(true); } catch (e) { root.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const subs = cid => opts(c.subcategorias.filter(s => !cid || s.categoria_id === cid), 'id', 'nombre');
    root.innerHTML = `<div class="filters">${sel('f-cat', 'Categoría', opts(c.categorias, 'id', 'nombre'))}${sel('f-sub', 'Subcategoría', subs(''))}${sel('f-sup', 'Proveedor', opts(c.proveedores, 'id', 'razon_social'))}
      <div class="actions"><button class="btn primary" id="newArt">${icon('plus', 18)}Nuevo artículo</button><button class="btn ghost" disabled title="Disponible en la entrega 2C">Cargar mercadería</button></div></div><div id="out">${loading()}</div>`;
    let rows = [];
    const load = async () => {
      try {
        rows = (await api('articulo_listar', { categoria_id: v(root, 'f-cat'), subcategoria_id: v(root, 'f-sub'), proveedor_id: v(root, 'f-sup') })).articulos;
        const sum = f => rows.reduce((s, a) => s + f(a), 0);
        $('#out', root).innerHTML = `<div class="kpis three">${kpi('Variantes de artículos', fmtNum(rows.length), 'Activas')}${kpi('Stock a precio de última compra', fmtARS(sum(a => a.stock * a.precio_compra), 0))}${kpi('Stock a precio de venta', fmtARS(sum(a => a.stock * a.precio_venta), 0))}</div>
          <div class="card flush">${tbl([{ k: 'categoria', l: 'Categoría' }, { k: 'subcategoria', l: 'Subcategoría' }, { k: 'detalle', l: 'Detalle' }, { k: 'talle', l: 'Talle' }, { k: 'stock', l: 'Stock', num: 1 }, { k: 'pc', l: 'Últ. compra', num: 1 }, { k: 'proveedor', l: 'Proveedor' }, { k: 'pv', l: 'Precio venta', num: 1 }, { k: 'acc', l: '', html: 1 }],
          rows.map(a => ({ ...a, pc: fmtARS(a.precio_compra), pv: fmtARS(a.precio_venta), acc: acc(a.id) })))}<div class="table-foot">Ordenado por stock, de mayor a menor. El stock solo cambia con movimientos.</div></div>`;
      } catch (e) { $('#out', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.querySelector('#f-cat').onchange = () => { root.querySelector('#f-sub').innerHTML = '<option value="">Todas</option>' + subs(v(root, 'f-cat')); load(); };
    root.querySelector('#f-sub').onchange = root.querySelector('#f-sup').onchange = load;
    root.querySelector('#newArt').onclick = () => artForm(null, async () => { await catalogo(true); load(); });
    root.addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]'), off = e.target.closest('[data-off]');
      if (ed) artForm(rows.find(a => a.id === ed.dataset.edit), load);
      if (off) { const a = rows.find(x => x.id === off.dataset.off); confirmar(`¿Inactivar "${a.categoria} ${a.subcategoria} ${a.detalle} T. ${a.talle}"? Su stock actual (${a.stock}) y su historial se conservan.`, 'Inactivar', async () => { await api('articulo_inactivar', { id: a.id }); load(); }); }
    });
    load();
  };

  /* ---------- Proveedores ---------- */
  function supForm(p, done) {
    const c = CAT;
    const m = modal({ title: p ? 'Editar proveedor' : 'Nuevo proveedor', footer: foot, body: `<div class="form-grid">${fld('p-date', 'Fecha de alta', { type: 'date', value: p ? p.fecha_alta : today() })}${fld('p-rs', 'Razón social', { req: 1, value: p && p.razon_social, max: 100 })}${fld('p-n', 'Nombre', { value: p && p.nombre })}${fld('p-a', 'Apellido', { value: p && p.apellido })}${fld('p-m', 'Email', { type: 'email', value: p && p.email })}${fld('p-c', 'Celular', { value: p && p.celular })}</div>
      <h3 class="mt">Categorías que comercializa</h3><div class="chips">${c.categorias.map(x => `<label class="chip"><input type="checkbox" data-cat="${esc(x.nombre)}"${p && p.categorias.includes(x.nombre) ? ' checked' : ''}> ${esc(x.nombre)}</label>`).join('')}</div>${fld('p-newcat', 'Agregar categoría nueva (opcional)', { max: 60 })}` });
    m.el.querySelector('#sv').onclick = e => {
      const cats = [...m.el.querySelectorAll('[data-cat]:checked')].map(i => i.dataset.cat), nc = v(m.el, 'p-newcat').trim(); if (nc) cats.push(nc);
      enviar(e.target, 'proveedor_guardar', { id: p && p.id, fecha_alta: v(m.el, 'p-date'), razon_social: v(m.el, 'p-rs'), nombre: v(m.el, 'p-n'), apellido: v(m.el, 'p-a'), email: v(m.el, 'p-m'), celular: v(m.el, 'p-c'), categorias: cats }, m, done);
    };
  }
  LC.views.proveedores = async function (root) {
    let c; try { c = await catalogo(true); } catch (e) { root.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    root.innerHTML = `<div class="filters">${fld('f-from', 'Desde', { type: 'date', value: daysAgo(89) })}${fld('f-to', 'Hasta', { type: 'date', value: today() })}${sel('f-sup', 'Proveedor', opts(c.proveedores, 'id', 'razon_social'))}${sel('f-cat', 'Categoría de producto', opts(c.categorias, 'nombre', 'nombre'))}
      <div class="actions"><button class="btn primary" id="newSup">${icon('plus', 18)}Nuevo proveedor</button></div></div><div id="out">${loading()}</div>`;
    let all = [];
    const load = async () => {
      try {
        all = (await api('proveedor_listar', { desde: v(root, 'f-from'), hasta: v(root, 'f-to') })).proveedores;
        const f = all.filter(s => (!v(root, 'f-sup') || s.id === v(root, 'f-sup')) && (!v(root, 'f-cat') || s.categorias.includes(v(root, 'f-cat'))));
        $('#out', root).innerHTML = `<div class="kpis one">${kpi('Proveedores activos', fmtNum(all.length), 'No cambia con el filtro de fechas')}</div><div class="card flush">${tbl([{ k: 'razon_social', l: 'Razón social' }, { k: 'cats', l: 'Categorías' }, { k: 'unidades', l: 'Unidades compradas', num: 1 }, { k: 'amt', l: 'Importe comprado', num: 1 }, { k: 'acc', l: '', html: 1 }], f.map(s => ({ ...s, cats: s.categorias.join(', '), amt: fmtARS(s.importe), acc: acc(s.id) })))}</div>`;
      } catch (e) { $('#out', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.querySelectorAll('.filters select, .filters input').forEach(i => i.addEventListener('change', load));
    root.querySelector('#newSup').onclick = () => supForm(null, async () => { await catalogo(true); load(); });
    root.addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]'), off = e.target.closest('[data-off]');
      if (ed) supForm(all.find(s => s.id === ed.dataset.edit), load);
      if (off) { const s = all.find(x => x.id === off.dataset.off); confirmar(`¿Inactivar a "${s.razon_social}"? Su historial de compras se conserva.`, 'Inactivar', async () => { await api('proveedor_inactivar', { id: s.id }); load(); }); }
    });
    load();
  };
})();
