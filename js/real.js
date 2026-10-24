/* Modo real (Fase 2B): Artículos y Proveedores conectados al backend. Con apiUrl vacío no hace nada (modo demostración). */
(function () {
  if (!LC.config.apiUrl) return;
  const { esc, fmtARS, fmtNum, $, kpi, icon, modal, toast, loading } = LC.ui;
  const { today, daysAgo } = LC.util;
  const CACHE = {}, TTL = 45000, LECT = { catalogo: 1, articulo_listar: 1, proveedor_listar: 1, compra_listar: 1 };
  const limpiar = () => Object.keys(CACHE).forEach(k => delete CACHE[k]);
  function poner(k, p) { CACHE[k] = { t: Date.now(), p }; p.catch(() => { if (CACHE[k] && CACHE[k].p === p) delete CACHE[k]; }); }
  /* Lecturas: se reutilizan 45 s (y se comparten si hay una en curso). Cualquier escritura vacía la caché. */
  const api = (a, d = {}) => {
    if (!LECT[a]) return LC.api.call(a, d).finally(limpiar);
    const k = a + JSON.stringify(d), h = CACHE[k];
    if (h && Date.now() - h.t < TTL) return h.p;
    const p = LC.api.call(a, d); poner(k, p); return p;
  };
  const okMsg = m => toast(m, 'success'), fail = e => toast(e.message || 'Error', 'error');
  LC.config.ready = ['articulos', 'proveedores'];
  LC.expectedBackend = '2C-2'; // versión de Code.gs que necesita esta interfaz
  let CAT = null;
  const catalogo = async () => (CAT = await api('catalogo'));
  const opts = (arr, v, l, s) => arr.map(x => `<option value="${esc(x[v])}"${x[v] === s ? ' selected' : ''}>${esc(x[l])}</option>`).join('');
  const sel = (id, label, html, ph = 'Todas') => `<label class="field"><span>${esc(label)}</span><select id="${id}"><option value="">${esc(ph)}</option>${html}</select></label>`;
  const fld = (id, label, o = {}) => `<label class="field"><span>${esc(label)}${o.req ? ' *' : ''}</span><input id="${id}" type="${o.type || 'text'}" value="${esc(o.value ?? '')}"${o.list ? ` list="${o.list}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.step ? ` step="${o.step}" min="0"` : ''}${o.dis ? ' disabled' : ''}></label>`;
  const v = (el, id) => (el.querySelector('#' + id) || {}).value || '';
  const tbl = (cols, rows) => !rows.length ? '<div class="empty">No hay registros para los filtros elegidos.</div>' :
    `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? r[c.k] : esc(r[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const acc = id => `<button class="btn ghost sm" data-edit="${esc(id)}">Editar</button> <button class="btn ghost sm" data-off="${esc(id)}">Inactivar</button>`;
  async function enviar(btn, accion, datos, m, done, onErr) {
    btn.disabled = true;
    try { const r = await api(accion, datos); CAT = null; m.close(); okMsg(r.duplicado ? 'Esa operación ya estaba registrada: no se duplicó.' : 'Guardado correctamente.'); done(); }
    catch (e) { if (!(onErr && onErr(e))) fail(e); btn.disabled = false; }
  }
  function validarArticulo(d, nuevo, teniaProv, teniaPrecio) {
    if (nuevo && !String(d.categoria || '').trim()) return 'La categoría es obligatoria.';
    if (nuevo && !String(d.subcategoria || '').trim()) return 'La subcategoría es obligatoria.';
    if (!String(d.talle || '').trim()) return 'El talle es obligatorio.';
    if ((nuevo || teniaProv) && !d.proveedor_id) return 'Seleccioná un proveedor: es obligatorio.';
    if ((nuevo || teniaPrecio) && !(Number(d.precio_venta) > 0)) return 'El precio de venta es obligatorio y debe ser mayor que 0.';
    if (d.precio_venta !== '' && !(Number(d.precio_venta) >= 0)) return 'El precio de venta no es válido.';
    return null;
  }
  function validarRecepcion(d) {
    if (!d.fecha) return 'Indicá la fecha.';
    if (d.fecha > today()) return 'La fecha no puede ser futura.';
    if (!d.proveedor_id) return 'Seleccioná el proveedor.';
    if (!d.lineas.length) return 'Agregá al menos un artículo.';
    const vistos = {};
    for (let i = 0; i < d.lineas.length; i++) {
      const l = d.lineas[i], n = 'Línea ' + (i + 1) + ': ';
      if (!l.articulo_id) return n + 'elegí el artículo.';
      if (vistos[l.articulo_id]) return n + 'el artículo está repetido.';
      vistos[l.articulo_id] = true;
      if (l.cantidad === '' || !Number.isInteger(Number(l.cantidad)) || Number(l.cantidad) < 1) return n + 'la cantidad debe ser un entero mayor que 0.';
      if (l.costo_unitario === '' || !(Number(l.costo_unitario) > 0)) return n + 'el costo unitario debe ser mayor que 0.';
    }
    return null;
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
      ${sel('a-prov', 'Proveedor *', opts(c.proveedores, 'id', 'razon_social', a && a.proveedor_id) + (a && a.proveedor_id && !c.proveedores.some(p => p.id === a.proveedor_id) ? `<option value="${esc(a.proveedor_id)}" selected>${esc(a.proveedor)} (inactivo)</option>` : ''), 'Seleccionar…')}${fld('a-pv', 'Precio de venta (ARS)', { req: 1, type: 'number', step: '0.01', value: a ? a.precio_venta : '' })}</div>
      <datalist id="dl-cat">${c.categorias.map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist><datalist id="dl-sub">${c.subcategorias.map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist>
      <div class="note">${nuevo ? 'Si la categoría o subcategoría no existe, se crea. El stock inicial es 0: se carga con una recepción de mercadería.' : 'Categoría y subcategoría no se pueden cambiar. Los precios históricos de compras y ventas no se modifican.'}</div>` });
    m.el.querySelector('#sv').onclick = e => {
      const d = { id: a && a.id, categoria: v(m.el, 'a-cat'), subcategoria: v(m.el, 'a-sub'), detalle: v(m.el, 'a-det'), talle: v(m.el, 'a-talle'), proveedor_id: v(m.el, 'a-prov'), precio_venta: v(m.el, 'a-pv') };
      const msg = validarArticulo(d, nuevo, !!(a && a.proveedor_id), !!(a && a.precio_venta > 0)); if (msg) return fail({ message: msg });
      enviar(e.target, 'articulo_guardar', d, m, done);
    };
  }
  LC.views.articulos = async function (root) {
    let c; try { c = await catalogo(); } catch (e) { root.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const subs = cid => opts(c.subcategorias.filter(s => !cid || s.categoria_id === cid), 'id', 'nombre');
    root.innerHTML = `<div class="filters">${sel('f-cat', 'Categoría', opts(c.categorias, 'id', 'nombre'))}${sel('f-sub', 'Subcategoría', subs(''))}${sel('f-sup', 'Proveedor', opts(c.proveedores, 'id', 'razon_social'))}
      <div class="actions"><button class="btn primary" id="newArt">${icon('plus', 18)}Nuevo artículo</button><button class="btn ghost" id="newRec">Cargar mercadería</button><button class="btn ghost" id="manCat">Categorías</button></div></div><div id="out">${loading()}</div>`;
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
    root.querySelector('#newArt').onclick = () => artForm(null, async () => { await catalogo(); load(); });
    root.querySelector('#newRec').onclick = () => recForm(load);
    root.querySelector('#manCat').onclick = () => catModal(() => LC.views.articulos(root));
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
      enviar(e.target, 'proveedor_guardar', { id: p && p.id, fecha_alta: v(m.el, 'p-date'), razon_social: v(m.el, 'p-rs'), nombre: v(m.el, 'p-n'), apellido: v(m.el, 'p-a'), email: v(m.el, 'p-m'), celular: v(m.el, 'p-c'), categorias: cats }, m, done, x => {
        if (x.codigo !== 'PROVEEDOR_INACTIVO') return false;
        m.close(); confirmar(x.message + ' ¿Querés recuperarlo en lugar de crear uno nuevo?', 'Recuperar proveedor', async () => { await api('proveedor_reactivar', { id: x.datos.proveedor_id }); CAT = null; done(); });
        return true;
      });
    };
  }
  LC.views.proveedores = async function (root) {
    let c; try { c = await catalogo(); } catch (e) { root.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    root.innerHTML = `<div class="filters">${fld('f-from', 'Desde', { type: 'date', value: daysAgo(89) })}${fld('f-to', 'Hasta', { type: 'date', value: today() })}${sel('f-sup', 'Proveedor', opts(c.proveedores, 'id', 'razon_social'))}${sel('f-cat', 'Categoría de producto', opts(c.categorias, 'nombre', 'nombre'))}<label class="field"><span>Mostrar</span><select id="f-est"><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
      <div class="actions"><button class="btn primary" id="newSup">${icon('plus', 18)}Nuevo proveedor</button></div></div><div id="out">${loading()}</div>`;
    let all = [];
    const load = async () => {
      try {
        const r = await api('proveedor_listar', { desde: v(root, 'f-from'), hasta: v(root, 'f-to'), estado: v(root, 'f-est') || 'activos' }); all = r.proveedores; const inact = v(root, 'f-est') === 'inactivos';
        const f = all.filter(s => (!v(root, 'f-sup') || s.id === v(root, 'f-sup')) && (!v(root, 'f-cat') || s.categorias.includes(v(root, 'f-cat'))));
        $('#out', root).innerHTML = `<div class="kpis one">${kpi('Proveedores activos', fmtNum(r.total_activos), 'Inactivos: ' + fmtNum(r.total_inactivos))}</div><div class="card flush">${tbl([{ k: 'razon_social', l: 'Razón social' }, { k: 'cats', l: 'Categorías' }, { k: 'unidades', l: 'Unidades compradas', num: 1 }, { k: 'amt', l: 'Importe comprado', num: 1 }, { k: 'acc', l: '', html: 1 }], f.map(s => ({ ...s, cats: s.categorias.join(', '), amt: fmtARS(s.importe), acc: inact ? `<button class="btn ghost sm" data-react="${esc(s.id)}">Reactivar</button>` : acc(s.id) })))}</div>`;
      } catch (e) { $('#out', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.querySelectorAll('.filters select, .filters input').forEach(i => i.addEventListener('change', load));
    root.querySelector('#newSup').onclick = () => supForm(null, async () => { await catalogo(); load(); });
    root.addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]'), off = e.target.closest('[data-off]');
      const re = e.target.closest('[data-react]');
      if (re) { const s = all.find(x => x.id === re.dataset.react); confirmar(`¿Reactivar a "${s.razon_social}"? Vuelve a la lista de activos con su mismo historial.`, 'Reactivar', async () => { await api('proveedor_reactivar', { id: s.id }); CAT = null; load(); }); }
      if (ed) supForm(all.find(s => s.id === ed.dataset.edit), load);
      if (off) { const s = all.find(x => x.id === off.dataset.off); confirmar(`¿Inactivar a "${s.razon_social}"? Su historial de compras se conserva.`, 'Inactivar', async () => { await api('proveedor_inactivar', { id: s.id }); load(); }); }
    });
    load();
  };

  /* ---------- Recepción de mercadería (2C) ---------- */
  const lbl = a => `${a.categoria} ${a.subcategoria}${a.detalle ? ' ' + a.detalle : ''} · T${a.talle}`;
  async function recForm(done) {
    let arts; try { arts = (await api('articulo_listar', {})).articulos; await catalogo(); } catch (e) { return fail(e); }
    const c = CAT, rid = crypto.randomUUID();
    const linea = () => `<tr class="ln"><td><select class="l-art"><option value="">Seleccionar…</option>${arts.map(a => `<option value="${esc(a.id)}">${esc(lbl(a))}</option>`).join('')}</select></td><td><input class="l-qty" type="number" min="1" step="1" inputmode="numeric"></td><td><input class="l-cost" type="number" min="0" step="0.01" inputmode="decimal"></td><td class="num l-imp">—</td><td><button class="btn ghost sm l-del" type="button">Quitar</button></td></tr>`;
    const m = modal({ title: 'Recepción de mercadería', footer: foot, body: `<div class="form-grid">${fld('r-date', 'Fecha', { type: 'date', value: today(), req: 1 })}${sel('r-prov', 'Proveedor *', opts(c.proveedores, 'id', 'razon_social'), 'Seleccionar…')}</div>
      <div class="table-wrap"><table><thead><tr><th>Artículo *</th><th>Cantidad *</th><th>Costo unit. (ARS) *</th><th class="num">Importe</th><th></th></tr></thead><tbody id="r-lines">${linea()}</tbody></table></div>
      <p><button class="btn ghost" id="r-add" type="button">${icon('plus', 18)}Agregar artículo</button></p>
      <div class="note">Total: <b id="r-total">${fmtARS(0)}</b>. El stock se actualiza con movimientos registrados al confirmar. Si falla, podés reintentar sin duplicar.</div>` });
    const body = m.el, tb = body.querySelector('#r-lines');
    const leer = () => [...tb.querySelectorAll('.ln')].map(tr => ({ tr, articulo_id: tr.querySelector('.l-art').value, cantidad: tr.querySelector('.l-qty').value, costo_unitario: tr.querySelector('.l-cost').value }));
    const calc = () => { let t = 0; leer().forEach(l => { const i = Number(l.cantidad) * Number(l.costo_unitario); l.tr.querySelector('.l-imp').textContent = i > 0 ? fmtARS(i) : '—'; if (i > 0) t += i; }); body.querySelector('#r-total').textContent = fmtARS(t); };
    body.addEventListener('input', calc); body.addEventListener('change', calc);
    body.querySelector('#r-add').onclick = () => tb.insertAdjacentHTML('beforeend', linea());
    body.addEventListener('click', e => { const d = e.target.closest('.l-del'); if (d && tb.querySelectorAll('.ln').length > 1) { d.closest('.ln').remove(); calc(); } });
    body.querySelector('#sv').onclick = e => {
      const datos = { request_id: rid, fecha: v(body, 'r-date'), proveedor_id: v(body, 'r-prov'), lineas: leer().map(l => ({ articulo_id: l.articulo_id, cantidad: l.cantidad, costo_unitario: l.costo_unitario })) };
      const msg = validarRecepcion(datos); if (msg) return fail({ message: msg });
      enviar(e.target, 'compra_registrar', datos, m, done);
    };
  }
  /* ---------- Categorías: renombrar / eliminar ---------- */
  function catModal(refresh) {
    const m = modal({ title: 'Categorías y subcategorías', footer: '<button class="btn ghost" data-close>Cerrar</button>', body: '<div id="cat-tree"></div>' });
    const box = m.el.querySelector('#cat-tree');
    const fila = (x, tipo) => `<div class="cat-row" data-id="${esc(x.id)}" data-tipo="${tipo}" data-name="${esc(x.nombre)}" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;${tipo === 'subcategoria' ? 'margin-left:22px;' : 'font-weight:600;'}"><span style="flex:1;min-width:120px">${esc(x.nombre)}</span><button class="btn ghost sm" data-act="ren">Renombrar</button><button class="btn ghost sm" data-act="del">Eliminar</button></div>`;
    const draw = async () => { try { const c = await catalogo(); box.innerHTML = c.categorias.map(k => fila(k, 'categoria') + c.subcategorias.filter(s => s.categoria_id === k.id).map(s => fila(s, 'subcategoria')).join('')).join('') || '<div class="empty">Todavía no hay categorías.</div>'; } catch (e) { box.textContent = e.message; } };
    const aplicar = async (accion, datos, msg) => { try { const r = await api(accion, datos); okMsg(typeof msg === 'function' ? msg(r) : msg); await draw(); refresh(); } catch (e) { fail(e); } };
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const f = b.closest('.cat-row'), id = f.dataset.id, tipo = f.dataset.tipo, name = f.dataset.name, a = b.dataset.act;
      if (a === 'ren') f.innerHTML = `<input class="c-new" value="${esc(name)}" maxlength="60" style="flex:1;min-width:120px"><button class="btn primary sm" data-act="ren-ok">Guardar</button><button class="btn ghost sm" data-act="cancel">Cancelar</button>`;
      if (a === 'ren-ok') aplicar(tipo + '_renombrar', { id, nombre: f.querySelector('.c-new').value }, 'Nombre actualizado.');
      if (a === 'del') f.innerHTML = `<span style="flex:1;min-width:120px">¿Eliminar "${esc(name)}"? Si está en uso se oculta en lugar de borrarse.</span><button class="btn primary sm" data-act="del-ok">Sí, eliminar</button><button class="btn ghost sm" data-act="cancel">No</button>`;
      if (a === 'del-ok') aplicar(tipo + '_eliminar', { id }, r => r.eliminada ? 'Eliminada.' : 'Estaba en uso: se ocultó (los artículos existentes la conservan).');
      if (a === 'cancel') draw();
    });
    draw();
  }
  /* Precarga (1 sola solicitud) tras iniciar sesión: la primera navegación ya encuentra los datos. */
  function prefetch() {
    const ds = [['catalogo', {}], ['articulo_listar', { categoria_id: '', subcategoria_id: '', proveedor_id: '' }], ['proveedor_listar', { desde: daysAgo(89), hasta: today(), estado: 'activos' }]];
    const L = LC.api.call('lote', { acciones: ds.map(x => ({ accion: x[0], datos: x[1] })) });
    ds.forEach((x, k) => poner(x[0] + JSON.stringify(x[1]), L.then(r => r.resultados[k])));
  }
  LC.real = { validarArticulo, validarRecepcion, prefetch, kit: { api, opts, sel, fld, v, tbl, confirmar, okMsg, fail, foot, enviar, LECT } };
})();
