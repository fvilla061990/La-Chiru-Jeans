/* Exportación común (la usa el Dashboard y la usarán los Reportes). CSV pensado para Excel en español:
   separador ";", decimales con coma, fechas AAAA-MM-DD, UTF-8 con BOM (tildes correctas). */
(function () {
  const peligrosa = /^[=+\-@\t\r]/;
  function celda(v) {
    if (typeof v === 'number') return isFinite(v) ? String(v).replace('.', ',') : '';
    let s = String(v == null ? '' : v);
    if (peligrosa.test(s)) s = "'" + s; // evita que Excel interprete un texto como fórmula
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const csvTexto = filas => '\ufeff' + filas.map(f => f.map(celda).join(';')).join('\r\n') + '\r\n';
  function descargarCSV(nombre, filas) {
    const url = URL.createObjectURL(new Blob([csvTexto(filas)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function imprimir(html) { // abre el informe en otra ventana; en el diálogo de impresión elegir "Guardar como PDF"
    const w = window.open('', '_blank'); if (!w) return false;
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); return true;
  }
  LC.exportar = { csvTexto, descargarCSV, imprimir };
})();
