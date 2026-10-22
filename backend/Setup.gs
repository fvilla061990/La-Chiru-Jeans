/** Inicialización de hojas. Ejecutar UNA vez desde el editor: inicializarBase(). Es repetible y no pisa datos. */
const AUD = 'creado_en,actualizado_en,usuario,es_demo';
const ESQUEMA = {
  Configuracion: 'clave,valor,descripcion',
  Categorias: 'id,nombre,activo,' + AUD,
  Subcategorias: 'id,categoria_id,nombre,activo,' + AUD,
  Articulos: 'id,categoria_id,subcategoria_id,detalle,talle,clave_unica,stock_actual,precio_ultima_compra,precio_venta,proveedor_id,fecha_ultima_compra,activo,' + AUD,
  Clientes: 'id,nombre,apellido,email,celular_e164,direccion,localidad,provincia,comentarios,activo,' + AUD,
  Proveedores: 'id,fecha_alta,razon_social,nombre,apellido,email,celular,activo,' + AUD,
  ProveedorCategorias: 'proveedor_id,categoria_id',
  Compras: 'id,fecha,proveedor_id,total,estado,request_id,' + AUD,
  CompraDetalle: 'id,compra_id,articulo_id,cantidad,costo_unitario,importe,' + AUD,
  Ventas: 'id,fecha,cliente_id,forma_pago_id,subtotal,aplica_iva,iva,total,estado,request_id,' + AUD,
  VentaDetalle: 'id,venta_id,articulo_id,cantidad,precio_unitario,importe,' + AUD,
  MovimientosStock: 'id,fecha_hora,articulo_id,tipo,cantidad,origen_id,request_id,' + AUD,
  FormasPago: 'id,nombre,activo,' + AUD,
  Anulaciones: 'id,venta_id,fecha_hora,motivo,usuario,movimiento_ids',
  Importaciones: 'id,fecha_hora,entidad,archivo,filas_total,importadas,omitidas,rechazadas,informe_errores,usuario',
  Auditoria: 'id,fecha_hora,usuario,accion,entidad,entidad_id,detalle',
  Operaciones: 'request_id,tipo,estado,resultado_id,creado_en'
};
const TEXTO = /(^id$|_id$|^fecha|_en$|^celular|^talle$|^clave_unica$|^request_id$)/; // columnas de texto (no se convierten solas)

function inicializarBase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), informe = [];
  Object.keys(ESQUEMA).forEach(function (nombre) {
    const cols = ESQUEMA[nombre].split(',');
    let h = ss.getSheetByName(nombre);
    if (!h) h = ss.insertSheet(nombre);
    if (h.getLastRow() === 0) {
      h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#F7D1D6');
      h.setFrozenRows(1);
      cols.forEach(function (c, i) { if (TEXTO.test(c)) h.getRange(2, i + 1, h.getMaxRows() - 1, 1).setNumberFormat('@'); });
      informe.push(nombre + ': creada');
    } else {
      const act = h.getRange(1, 1, 1, cols.length).getValues()[0];
      informe.push(nombre + (act.join() === cols.join() ? ': ya existía, sin cambios' : ': ENCABEZADOS DISTINTOS, no se tocó'));
    }
  });
  sembrar_(ss);
  Logger.log(informe.join('\n'));
  return informe;
}

/** Datos base (no son demostración): solo si la hoja está vacía. */
function sembrar_(ss) {
  const t = ahora_();
  const poner = function (nombre, filas) {
    const h = ss.getSheetByName(nombre);
    if (h.getLastRow() === 1) h.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
  };
  poner('Configuracion', [
    ['iva_porcentaje', 21, 'IVA opcional en ventas'],
    ['redondeo_decimales', 2, 'Decimales guardados'],
    ['dias_lista_ventas', 7, 'Días mostrados por defecto en Ventas'],
    ['actualizar_precio_venta_con_compra', 'FALSE', 'No pisar el precio de venta al comprar']]);
  poner('FormasPago', [['FP-001', 'Efectivo', true, t, t, 'sistema', false], ['FP-002', 'Transferencia', true, t, t, 'sistema', false], ['FP-003', 'Tarjeta', true, t, t, 'sistema', false]]);
}
