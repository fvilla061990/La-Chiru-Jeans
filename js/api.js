/* Cliente del backend (Apps Script). Toda llamada lleva el token de Google; el servidor lo verifica. */
LC.api = (function () {
  let token = null, onExpire = () => {};
  const MSG = { NO_AUTORIZADO: 'Tu cuenta de Google no está autorizada.', TOKEN_VENCIDO: 'La sesión venció. Ingresá de nuevo.', TOKEN_INVALIDO: 'Sesión inválida. Ingresá de nuevo.',
    TOKEN_OTRA_APP: 'Configuración de acceso incorrecta (ID de cliente).', CONFIG_FALTANTE: 'Falta configurar el backend.', SIN_TOKEN: 'Ingresá con Google.',
    DATOS_INVALIDOS: 'Datos inválidos.', ACCION_DESCONOCIDA: 'El servidor está desactualizado: publicá una nueva versión de Apps Script (ver README).', ERROR_INTERNO: 'Error interno del servidor.' };
  async function call(accion, datos = {}) {
    if (!token) { const e = new Error(MSG.SIN_TOKEN); e.codigo = 'SIN_TOKEN'; throw e; }
    let j;
    try {
      const r = await fetch(LC.config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion, token, ...datos }) });
      j = JSON.parse(await r.text());
    } catch (x) { const e = new Error('No se pudo conectar con el servidor. Revisá tu conexión.'); e.codigo = 'RED'; throw e; }
    if (!j.ok) {
      const e = new Error(j.mensaje || MSG[j.codigo] || 'Error del servidor.'); e.codigo = j.codigo;
      if (['TOKEN_VENCIDO', 'TOKEN_INVALIDO', 'NO_AUTORIZADO'].includes(j.codigo)) { token = null; onExpire(e.message); }
      throw e;
    }
    return j;
  }
  return { call, setToken: t => { token = t; }, hasSession: () => !!token, onExpire: f => { onExpire = f; } };
})();
