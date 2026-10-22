/* Utilidades de interfaz: formato, iconos, modales, avisos y componentes simples. */
LC.util = {
  iso(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: LC.config.timeZone }).format(d); },
  today() { return LC.util.iso(new Date()); },
  daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return LC.util.iso(d); },
  round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
};

LC.ui = (function () {
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    sales: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
    articles: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    clients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    suppliers: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    reports: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    reception: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    employees: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M8 17a4 4 0 0 1 8 0"/>',
    bonus: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    kits: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };
  const icon = (n, size = 20) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtARS = (n, dec = 2) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);
  const fmtNum = n => new Intl.NumberFormat('es-AR').format(n || 0);
  const fmtDate = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + type; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }

  function modal({ title, body, footer = '', wide = false }) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-back"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></div>
      <div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ''}</div></div>`;
    const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    root.querySelector('.modal-back').addEventListener('mousedown', e => { if (e.target.classList.contains('modal-back')) close(); });
    $$('[data-close]', root).forEach(b => b.addEventListener('click', close));
    return { el: root.querySelector('.modal'), close };
  }

  const select = (id, label, options, value = '', placeholder = 'Todas') =>
    `<label class="field"><span>${esc(label)}</span><select id="${id}"><option value="">${esc(placeholder)}</option>${options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
  const dateField = (id, label, value) => `<label class="field"><span>${esc(label)}</span><input type="date" id="${id}" value="${value || ''}"></label>`;
  const input = (id, label, o = {}) => `<label class="field ${o.full ? 'full' : ''}"><span>${esc(label)}${o.req ? ' *' : ''}</span>${o.area ? `<textarea id="${id}" rows="2"></textarea>` : `<input id="${id}" type="${o.type || 'text'}" ${o.value != null ? `value="${esc(o.value)}"` : ''} ${o.ro ? 'readonly' : ''}>`}</label>`;

  function table(cols, rows, empty = 'No hay registros para los filtros elegidos.') {
    if (!rows.length) return `<div class="empty">${esc(empty)}</div>`;
    return `<div class="table-wrap"><table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr ${r._attr || ''}>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? r[c.key] : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function hbars(items, fmt = fmtNum) {
    if (!items.length) return '<div class="empty">Sin datos en el período.</div>';
    const max = Math.max(...items.map(i => i.value)) || 1;
    return `<ul class="hbars">${items.map(i => `<li><span class="hb-label" title="${esc(i.label)}">${esc(i.label)}</span><span class="hb-track"><span class="hb-fill" style="width:${Math.max(2, i.value / max * 100).toFixed(1)}%"></span></span><span class="hb-val">${fmt(i.value)}</span></li>`).join('')}</ul>`;
  }

  const kpi = (label, value, hint = '') => `<div class="kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${value}</div>${hint ? `<div class="kpi-hint">${esc(hint)}</div>` : ''}</div>`;
  const loading = () => '<div class="loading"><span class="spinner"></span>Cargando…</div>';
  const notImpl = (txt = 'Disponible en una fase posterior') => `title="${esc(txt)}" disabled`;

  return { icon, esc, fmtARS, fmtNum, fmtDate, $, $$, toast, modal, select, dateField, input, table, hbars, kpi, loading, notImpl };
})();
