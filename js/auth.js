/* Inicio de sesión con Google. El email mostrado viene del servidor (ping), no del navegador. */
LC.auth = (function () {
  const { $, esc, toast } = LC.ui;
  let onReady = () => {}, loaded = false;
  function showLogin(msg) {
    $('#pageTitle').textContent = 'Acceso';
    $('#view').innerHTML = `<div class="empty"><h2>Ingresá con tu cuenta de Google</h2><p>Solo pueden entrar las cuentas autorizadas.</p><div id="gbtn" style="display:inline-block"></div><p class="warn-txt">${esc(msg || '')}</p></div>`;
    const u = $('#userBox'); if (u) u.remove();
    if (loaded) window.google.accounts.id.renderButton($('#gbtn'), { theme: 'outline', size: 'large', locale: 'es' });
  }
  async function credential(r) {
    LC.api.setToken(r.credential);
    try {
      const p = await LC.api.call('ping');
      const box = document.createElement('span'); box.id = 'userBox'; box.className = 'note';
      box.innerHTML = `${esc(p.email)} <button class="btn" id="logoutBtn">Salir</button>`;
      $('.topbar').appendChild(box);
      $('#logoutBtn').onclick = () => { LC.api.setToken(null); window.google.accounts.id.disableAutoSelect(); showLogin(); };
      onReady();
    } catch (e) { LC.api.setToken(null); showLogin(e.message); }
  }
  function start(ready) {
    onReady = ready; LC.api.onExpire(showLogin); showLogin();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => { loaded = true; window.google.accounts.id.initialize({ client_id: LC.config.googleClientId, callback: credential }); if (!LC.api.hasSession()) showLogin(); };
    s.onerror = () => toast('No se pudo cargar el acceso de Google.', 'error');
    document.head.appendChild(s);
  }
  return { start, showLogin };
})();
