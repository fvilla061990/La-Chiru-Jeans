/* Módulo Clientes (entrega 3A). Archivo nuevo: se apoya en las utilidades de real.js y no modifica otros módulos. */
(function () {
  if (!LC.config.apiUrl || !LC.real || !LC.real.kit) return;
  const { api, opts, sel, fld, v, tbl, confirmar, okMsg, fail, foot, enviar, LECT } = LC.real.kit;
  const { esc, fmtARS, fmtNum, $, kpi, icon, modal, loading } = LC.ui;
  const { today } = LC.util;
  LECT.cliente_listar = 1; LECT.cliente_ficha = 1; // lecturas: se reutilizan 45 s y toda escritura vacía la caché
  LC.config.ready.push('clientes'); LC.expectedBackend = '3A-1';
  const RN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.\- ]{2,60}$/;
  function validarCliente(d) {
    if (!RN.test(String(d.nombre || '').trim())) return 'El nombre es obligatorio (2 a 60 letras, sin números).';
    if (!RN.test(String(d.apellido || '').trim())) return 'El apellido es obligatorio (2 a 60 letras, sin números).';
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.email).trim())) return 'El email no es válido.';
    if (d.celular && /[^\d\s()+\-.]/.test(d.celular)) return 'El celular solo puede tener números, espacios, + y guiones.';
    return null;
  }
  function cliForm(c, done) {
    const m = modal({ title: c ? 'Editar cliente' : 'Nuevo cliente', footer: foot, body: `<div class="form-grid">${fld('c-n', 'Nombre', { req: 1, value: c && c.nombre, max: 60 })}${fld('c-a', 'Apellido', { req: 1, value: c && c.apellido, max: 60 })}${fld('c-m', 'Email', { type: 'email', value: c && c.email, max: 100 })}${fld('c-c', 'Celular', { value: c && c.celular })}${fld('c-d', 'Dirección', { value: c && c.direccion, max: 120 })}${fld('c-l', 'Localidad / ciudad', { value: c && c.localidad, max: 80 })}${fld('c-p', 'Provincia', { value: c && c.provincia, max: 60 })}${fld('c-o', 'Comentarios', { value: c && c.comentarios, max: 300 })}</div><div class="note">Celular: escribilo como quieras (ej. 11 5555-1234); se guarda en formato internacional para WhatsApp.</div>` });
    m.el.querySelector('#sv').onclick = e => {
      const d = { id: c && c.id, nombre: v(m.el, 'c-n'), apellido: v(m.el, 'c-a'), email: v(m.el, 'c-m'), celular: v(m.el, 'c-c'), direccion: v(m.el, 'c-d'), localidad: v(m.el, 'c-l'), provincia: v(m.el, 'c-p'), comentarios: v(m.el, 'c-o') };
      const msg = validarCliente(d); if (msg) return fail({ message: msg });
      enviar(e.target, 'cliente_guardar', d, m, done, x => {
        if (x.codigo === 'HOMONIMO') { m.close(); confirmar(x.message + ' ¿Es otra persona? Podés crearla igual.', 'Crear igual', async () => { await api('cliente_guardar', { ...d, forzar: true }); done(); }); return true; }
        if (x.codigo === 'CLIENTE_INACTIVO') { m.close(); confirmar(x.message + ' ¿Querés recuperarlo?', 'Recuperar cliente', async () => { await api('cliente_reactivar', { id: x.datos.cliente_id }); done(); }); return true; }
        return false;
      });
    };
  }
  async function ficha(id, done) {
    try {
      const r = await api('cliente_ficha', { id }), c = r.cliente;
      const m = modal({ title: `${c.apellido}, ${c.nombre}`, footer: `<button class="btn ghost" data-close>Cerrar</button>${c.activo ? '<button class="btn primary" id="ed">Editar datos</button>' : ''}`,
        body: `<dl><dt>Email</dt><dd>${esc(c.email || '—')}</dd><dt>Celular</dt><dd>${esc(c.celular || 'Sin celular')}</dd><dt>Dirección</dt><dd>${esc([c.direccion, c.localidad, c.provincia].filter(Boolean).join(', ') || '—')}</dd><dt>Comentarios</dt><dd>${esc(c.comentarios || '—')}</dd><dt>Unidades compradas</dt><dd>${fmtNum(r.unidades)}</dd><dt>Importe total comprado</dt><dd>${fmtARS(r.importe)}</dd></dl>`
          + tbl([{ k: 'fecha', l: 'Fecha' }, { k: 'venta_id', l: 'Venta' }, { k: 'estado', l: 'Estado' }, { k: 'unidades', l: 'Unidades', num: 1 }, { k: 'tot', l: 'Total', num: 1 }], r.historial.map(h => ({ ...h, tot: fmtARS(h.total) }))) });
      const ed = m.el.querySelector('#ed'); if (ed) ed.onclick = () => { m.close(); cliForm(c, done); };
    } catch (e) { fail(e); }
  }
  LC.views.clientes = async function (root) {
    root.innerHTML = `<div class="filters">${fld('f-from', 'Desde', { type: 'date', value: '' })}${fld('f-to', 'Hasta', { type: 'date', value: today() })}${sel('f-cli', 'Cliente', '', 'Todos')}<label class="field"><span>Mostrar</span><select id="f-est"><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label><div class="actions"><button class="btn primary" id="newCli">${icon('plus', 18)}Nuevo cliente</button></div></div><div id="out">${loading()}</div>`;
    let all = [];
    const load = async () => {
      try {
        const r = await api('cliente_listar', { desde: v(root, 'f-from'), hasta: v(root, 'f-to'), estado: v(root, 'f-est') || 'activos' });
        all = r.clientes; const inact = v(root, 'f-est') === 'inactivos', pick = v(root, 'f-cli');
        root.querySelector('#f-cli').innerHTML = '<option value="">Todos</option>' + opts(all, 'id', 'nombre_completo', pick);
        const rows = all.filter(c => !pick || c.id === pick);
        $('#out', root).innerHTML = `<div class="kpis one">${kpi('Clientes registrados', fmtNum(r.total_activos), 'Inactivos: ' + fmtNum(r.total_inactivos))}</div><div class="card flush">${tbl([{ k: 'nom', l: 'Cliente', html: 1 }, { k: 'unidades', l: 'Unidades compradas', num: 1 }, { k: 'imp', l: 'Importe comprado', num: 1 }, { k: 'acc', l: '', html: 1 }],
          rows.map(c => ({ ...c, nom: `<button class="link" data-ficha="${esc(c.id)}">${esc(c.nombre_completo)}</button>`, imp: fmtARS(c.importe), acc: inact ? `<button class="btn ghost sm" data-react="${esc(c.id)}">Reactivar</button>` : `<button class="btn ghost sm" data-edit="${esc(c.id)}">Editar</button> <button class="btn ghost sm" data-off="${esc(c.id)}">Inactivar</button>` })))}<div class="table-foot">Las fechas filtran las compras; no cambian la cantidad de clientes registrados.</div></div>`;
      } catch (e) { $('#out', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.querySelectorAll('.filters select, .filters input').forEach(i => i.addEventListener('change', load));
    root.querySelector('#newCli').onclick = () => cliForm(null, load);
    root.addEventListener('click', async e => {
      const fi = e.target.closest('[data-ficha]'), ed = e.target.closest('[data-edit]'), off = e.target.closest('[data-off]'), re = e.target.closest('[data-react]');
      if (fi) ficha(fi.dataset.ficha, load);
      if (ed) { try { cliForm((await api('cliente_ficha', { id: ed.dataset.edit })).cliente, load); } catch (x) { fail(x); } }
      if (off) { const c = all.find(x => x.id === off.dataset.off); confirmar(`¿Inactivar a "${c.nombre_completo}"? Su historial de compras se conserva.`, 'Inactivar', async () => { await api('cliente_inactivar', { id: c.id }); load(); }); }
      if (re) { const c = all.find(x => x.id === re.dataset.react); confirmar(`¿Reactivar a "${c.nombre_completo}"? Vuelve a la lista de activos con su historial.`, 'Reactivar', async () => { await api('cliente_reactivar', { id: c.id }); load(); }); }
    });
    load();
  };
  LC.clienteUI = { validarCliente };
})();
