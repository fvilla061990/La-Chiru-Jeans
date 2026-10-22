# Esquema de Google Sheets y relaciones

## Reglas comunes
- Cada hoja: fila 1 = encabezados fijos. `id` único y estable, con prefijo (`ART-000123`) generado por el backend; nunca se reutiliza.
- Relaciones **solo por ID**. Nombres son datos de presentación.
- Fechas: `fecha` en `AAAA-MM-DD` (texto ISO) y `*_en` en ISO con hora. Zona `America/Argentina/Buenos_Aires`.
- Importes: números puros (punto decimal), redondeados a 2 decimales por el backend. Formato regional solo en pantalla.
- Columnas de auditoría en todas: `creado_en`, `actualizado_en`, `usuario`, `es_demo` (VERDADERO en datos de demostración).
- Nada se borra: se usa `activo = FALSO` o estados.

## Hojas
| Hoja | Columnas principales |
|---|---|
| `Configuracion` | clave, valor, descripcion (IVA 21 %, redondeo, días de lista de ventas, regla de precio de venta) |
| `Usuarios` | id, usuario, sal, hash_clave, rol, activo |
| `Categorias` | id, nombre, activo |
| `Subcategorias` | id, categoria_id, nombre, activo |
| `Articulos` (variantes) | id, categoria_id, subcategoria_id, detalle, talle, **clave_unica**, stock_actual, precio_ultima_compra, precio_venta, proveedor_id, fecha_ultima_compra, activo |
| `Clientes` | id, nombre, apellido, email, celular_e164, direccion, localidad, provincia, comentarios, activo |
| `Proveedores` | id, fecha_alta, razon_social, nombre, apellido, email, celular, activo |
| `ProveedorCategorias` | proveedor_id, categoria_id |
| `Compras` | id, fecha, proveedor_id, total, estado, request_id |
| `CompraDetalle` | id, compra_id, articulo_id, cantidad, costo_unitario, importe |
| `Ventas` | id, fecha, cliente_id, forma_pago_id, subtotal, aplica_iva, iva, total, estado (CONFIRMADA / ANULADA), request_id |
| `VentaDetalle` | id, venta_id, articulo_id, cantidad, precio_unitario, importe |
| `MovimientosStock` | id, fecha_hora, articulo_id, tipo (INICIAL / COMPRA / VENTA / ANULACION / AJUSTE), cantidad (+/−), origen_id, request_id |
| `FormasPago` | id, nombre, activo |
| `Anulaciones` | id, venta_id, fecha_hora, motivo, usuario, movimiento_ids |
| `Importaciones` | id, fecha_hora, entidad, archivo, filas_total, importadas, omitidas, rechazadas, informe_errores |
| `Auditoria` | id, fecha_hora, usuario, accion, entidad, entidad_id, detalle |
| `Operaciones` | request_id, tipo, estado (INICIADA / COMPLETADA / FALLIDA), resultado_id, creado_en (idempotencia y recuperación) |

## Relaciones
```
Categorias 1─n Subcategorias 1─n Articulos n─1 Proveedores
Proveedores n─n Categorias   (ProveedorCategorias)
Compras 1─n CompraDetalle n─1 Articulos ; Compras n─1 Proveedores
Ventas  1─n VentaDetalle  n─1 Articulos ; Ventas n─1 Clientes ; Ventas n─1 FormasPago
Articulos 1─n MovimientosStock (origen: Compras / Ventas / Anulaciones)
Ventas 1─n Anulaciones
```

## Decisiones de diseño
- **Variante única:** `clave_unica` = categoría|subcategoría|detalle|talle normalizados (sin espacios dobles, minúsculas, sin tildes). El backend rechaza duplicados.
- **Stock:** `stock_actual` es un valor derivado; la verdad es la suma de `MovimientosStock`. Una rutina de conciliación detecta diferencias.
- **Precios históricos:** `VentaDetalle.precio_unitario` y `CompraDetalle.costo_unitario` guardan el precio del momento; cambiar el precio actual no los toca.
- **Anulación:** la venta pasa a ANULADA, se crea un movimiento `ANULACION` que revierte el stock y un registro en `Anulaciones`. Nada se borra.
- **Orden de una venta:** (1) validar sesión y datos, recalcular importes en servidor; (2) tomar `LockService`; (3) revisar `Operaciones` por `request_id`; (4) verificar stock; (5) escribir cabecera, detalle y movimientos en lote; (6) marcar COMPLETADA; (7) liberar el bloqueo. Si se corta, `Operaciones` queda INICIADA y se recupera sin duplicar.
- **Criterio provisional:** "importe vendido/comprado" = suma de líneas sin IVA. A confirmar.

## Inicialización
1. Crear una hoja de cálculo vacía en la cuenta Google → *Extensiones → Apps Script*.
2. Pegar los `.gs` de la Fase 2 y ejecutar `inicializarBase()` (una sola vez, pide permisos): crea hojas, encabezados, validaciones y los datos base (formas de pago, categorías).
3. Ejecutar `crearUsuarioAdmin()` y definir la clave (se guarda solo el hash).
4. Opcional: `cargarDatosDemo()` (marca `es_demo`) y `reiniciarDemo()`, que solo borra filas con `es_demo = VERDADERO` y pide confirmación.

## Cambios en la Fase 2 (entrega 2A)
- Se **elimina la hoja `Usuarios`**: el acceso se resuelve con Google (token verificado en el servidor) y la lista `EMAILS_AUTORIZADOS` en las Propiedades del script. Si más adelante se necesitan roles, se agrega una hoja de roles por email.
- Las hojas se crean con `backend/Setup.gs → inicializarBase()` (repetible, no pisa datos). Datos base: formas de pago y configuración. **No se cargan datos de demostración en la base real.**
