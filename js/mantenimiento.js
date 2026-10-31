/* Configuración → Mantenimiento (entrega 5A): copias de seguridad, verificación de datos y recepciones incompletas.
   Habilita el módulo "Configuración" desde acá, así no hace falta tocar js/config.js. */
(function () {
  if (!LC.config.apiUrl || !LC.real || !LC.real.kit || !LC.exportar) return;
  const { fail, okMsg, confirmar, tbl, api } = LC.real.kit;
  const { esc, fmtARS, fmtNum, $, loading } = LC.ui;
  const mod = (LC.config.modules || []).find(m => m.key === 'configuracion'); if (mod) mod.enabled = true;
  LC.config.ready.push('configuracion'); LC.expectedBackend = '5A-1';
  const call = (a, d) => LC.api.call(a, d || {}); // lecturas sin caché: siempre el estado actual
  const https = u => /^https:\/\//.test(String(u)) ? String(u) : '#';

  function estadoHTML(e) {
    const prog = e.programada === true ? '✔ Copia diaria programada (alrededor de las 3 de la mañana).' : e.programada === false ? '⚠ <b>No hay copia diaria programada.</b> Ejecutá <code>instalarCopiaDiaria</code> una vez en Apps Script (ver README).' : 'No se pudo verificar si hay copia diaria programada (revisá los permisos de Apps Script).';
    return `<p>${prog}</p><p class="hint">Se conservan las últimas ${esc(e.maximo)} copias en la carpeta "${esc(e.carpeta)}" de tu Google Drive. Copias actuales: ${esc(e.total)}. Una copia incluye todas las hojas; los accesos autorizados se guardan aparte en Apps Script.</p><div class="actions"><button class="btn primary" id="bkNow">Crear copia ahora</button></div>`
      + (e.copias.length ? tbl([{ k: 'nombre', l: 'Copia', html: 1 }, { k: 'fecha', l: 'Fecha', html: 1 }, { k: 'abrir', l: '', html: 1 }], e.copias.map(c => ({ nombre: esc(c.nombre), fecha: esc(c.fecha), abrir: `<a href="${esc(https(c.url))}" target="_blank" rel="noopener">Abrir</a>` }))) : '<div class="empty">Todavía no hay copias: creá una ahora.</div>');
  }
  function filasCSV(r) { return [['Gravedad', 'Hoja', 'Registro', 'Problema'], ...r.problemas.map(p => [p.gravedad, p.hoja, p.id, p.problema])]; }
  function resultadoHTML(r) {
    if (!r.resumen.total) return '<div class="note">✔ Todo en orden: no se encontraron problemas.</div>';
    return `<p>Problemas: <b>${r.resumen.alta}</b> altos · <b>${r.resumen.media}</b> medios · <b>${r.resumen.baja}</b> informativos.${r.truncado ? ' Se muestran los primeros 500.' : ''}</p>`
      + tbl([{ k: 'g', l: 'Gravedad', html: 1 }, { k: 'hoja', l: 'Hoja', html: 1 }, { k: 'id', l: 'Registro', html: 1 }, { k: 'problema', l: 'Problema', html: 1 }], r.problemas.map(p => ({ g: `<span class="badge">${esc(p.gravedad)}</span>`, hoja: esc(p.hoja), id: esc(p.id), problema: esc(p.problema) })));
  }

  LC.views.configuracion = async function (root) {
    root.innerHTML = `<div class="card"><h3>Copias de seguridad</h3><div id="bk">${loading()}</div></div>
      <div class="card"><h3>Verificar datos</h3><p class="hint">Revisa que el stock coincida con los movimientos, que no haya registros huérfanos, duplicados ni importes que no cierren. <b>Solo lectura: no modifica ni elimina nada.</b> ALTA = revisar cuanto antes · MEDIA = revisar · BAJA = informativo.</p><div class="actions"><button class="btn primary" id="vf">Verificar ahora</button><button class="btn ghost" id="vfcsv" disabled>Exportar CSV</button></div><div id="vo"></div></div>
      <div class="card"><h3>Recepciones incompletas</h3><div id="pc">${loading()}</div></div>`;
    let ultimo = null;
    const cargarBk = async () => { try { $('#bk', root).innerHTML = estadoHTML(await call('backup_estado')); } catch (e) { $('#bk', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; } };
    const cargarPend = async () => {
      try {
        const p = (await call('compra_listar', {})).compras.filter(c => c.estado === 'PENDIENTE');
        $('#pc', root).innerHTML = p.length ? `<p class="hint">Estas recepciones no terminaron de registrarse (por ejemplo por un corte de conexión). Recuperar completa lo ya guardado sin duplicar; si no tiene detalle, se descarta.</p>` + tbl([{ k: 'id', l: 'N°', html: 1 }, { k: 'fecha', l: 'Fecha', html: 1 }, { k: 'proveedor', l: 'Proveedor', html: 1 }, { k: 'tot', l: 'Total', num: 1, html: 1 }, { k: 'acc', l: '', html: 1 }], p.map(c => ({ id: esc(c.id), fecha: esc(c.fecha), proveedor: esc(c.proveedor), tot: esc(fmtARS(c.total)), acc: `<button class="btn ghost sm" data-recup="${esc(c.id)}">Recuperar</button>` }))) : '<div class="note">✔ No hay recepciones incompletas.</div>';
      } catch (e) { $('#pc', root).innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
    };
    root.addEventListener('click', async e => {
      if (e.target.closest('#bkNow')) confirmar('Se creará una copia completa de la base en tu Google Drive. Puede tardar unos segundos. ¿Continuar?', 'Crear copia', async () => { const r = await call('backup_crear'); okMsg('Copia creada: ' + r.nombre); await cargarBk(); });
      const rc = e.target.closest('[data-recup]');
      if (rc) confirmar('Se completará la recepción con lo ya registrado (sin duplicar) o se descartará si no tiene detalle. ¿Continuar?', 'Recuperar', async () => { await api('compra_recuperar', { compra_id: rc.dataset.recup }); await cargarPend(); });
      if (e.target.closest('#vf')) {
        const b = root.querySelector('#vf'); b.disabled = true; ultimo = null; root.querySelector('#vfcsv').disabled = true; $('#vo', root).innerHTML = loading();
        try { ultimo = await call('verificar_datos'); $('#vo', root).innerHTML = resultadoHTML(ultimo); root.querySelector('#vfcsv').disabled = !ultimo.problemas.length; } catch (x) { $('#vo', root).innerHTML = `<div class="empty">${esc(x.message)}</div>`; }
        b.disabled = false;
      }
      if (e.target.closest('#vfcsv') && ultimo) LC.exportar.descargarCSV('verificacion_datos.csv', filasCSV(ultimo));
    });
    cargarBk(); cargarPend();
  };
  LC.mantUI = { estadoHTML, filasCSV, resultadoHTML };
})();
