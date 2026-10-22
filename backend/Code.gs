/**
 * La Chiru Jeans — Backend (Apps Script). Fase 2, entrega 2A.
 * Las funciones de autenticación (verificarToken_, autorizado_) son las MISMAS que pasaron la prueba real.
 * Propiedades del script: CLIENT_ID, EMAILS_AUTORIZADOS (nunca en GitHub).
 */
const TZ = 'America/Argentina/Buenos_Aires';

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function err_(codigo) { const e = new Error(codigo); e.codigo = codigo; return e; }
function ahora_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }

/** GET: solo confirma que el servicio existe. No devuelve datos. */
function doGet() { return out_({ ok: true, servicio: 'chiru-backend' }); }

/** Verifica el token de Google EN EL SERVIDOR. Nunca se usa el email que declare el navegador. */
function verificarToken_(t) {
  if (!t || typeof t !== 'string' || t.length > 4000) throw err_('SIN_TOKEN');
  const cache = CacheService.getScriptCache();
  const clave = 'tk_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t));
  const hit = cache.get(clave);
  if (hit) return JSON.parse(hit);
  const cid = PropertiesService.getScriptProperties().getProperty('CLIENT_ID');
  if (!cid) throw err_('CONFIG_FALTANTE');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(t), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw err_('TOKEN_INVALIDO');
  const p = JSON.parse(r.getContentText());
  if (p.aud !== cid) throw err_('TOKEN_OTRA_APP');
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(p.iss) < 0) throw err_('TOKEN_INVALIDO');
  if (String(p.email_verified) !== 'true' || !p.email) throw err_('EMAIL_NO_VERIFICADO');
  const resta = Number(p.exp) - Math.floor(Date.now() / 1000);
  if (!(resta > 0)) throw err_('TOKEN_VENCIDO');
  const u = { email: String(p.email).toLowerCase() };
  cache.put(clave, JSON.stringify(u), Math.min(resta, 300)); // se cachea la identidad, NO la autorización
  return u;
}

/** Autorización: se consulta siempre (quitar un email surte efecto de inmediato). */
function autorizado_(email) {
  const lista = String(PropertiesService.getScriptProperties().getProperty('EMAILS_AUTORIZADOS') || '')
    .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
  return lista.indexOf(email) >= 0;
}

/** Acciones disponibles. Cada una recibe (usuario_verificado, cuerpo). Se agregan en cada entrega. */
const ACCIONES = {
  ping: function (u) { return { email: u.email, hora: ahora_() }; },
  estado: function () { return estado_(); }
};

function doPost(e) {
  try {
    const cuerpo = (e && e.postData && e.postData.contents) || '';
    if (cuerpo.length > 200000) throw err_('DATOS_INVALIDOS');
    let b; try { b = JSON.parse(cuerpo); } catch (x) { throw err_('DATOS_INVALIDOS'); }
    const u = verificarToken_(b.token);
    if (!autorizado_(u.email)) throw err_('NO_AUTORIZADO');
    if (!Object.prototype.hasOwnProperty.call(ACCIONES, b.accion)) throw err_('ACCION_DESCONOCIDA');
    const r = ACCIONES[b.accion](u, b);
    r.ok = true;
    return out_(r);
  } catch (x) {
    if (!x.codigo) console.error(x);
    return out_({ ok: false, codigo: x.codigo || 'ERROR_INTERNO' });
  }
}

function estado_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = Object.keys(ESQUEMA).map(function (n) {
    const h = ss.getSheetByName(n);
    return { nombre: n, existe: !!h, filas: h ? Math.max(0, h.getLastRow() - 1) : 0 };
  });
  return { inicializada: hojas.every(function (x) { return x.existe; }), hojas: hojas };
}
