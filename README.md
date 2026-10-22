# La Chiru Jeans · Sistema de gestión comercial — Fase 1 (prototipo)

Prototipo navegable con **datos ficticios**. No guarda nada ni se conecta a Google Sheets todavía.

## Cómo probarlo
**Opción A (más simple):** descomprimí el ZIP y abrí `index.html` con doble clic (Chrome, Edge, Firefox o Safari).

**Opción B (servidor local, recomendada):** en la carpeta, ejecutá `python -m http.server 8000` y abrí http://localhost:8000.

**Opción C (GitHub Pages):** creá un repositorio público, subí **el contenido** de la carpeta (que `index.html` quede en la raíz), y en *Settings → Pages* elegí la rama `main`, carpeta `/ (root)`. En unos minutos queda en `https://TU-USUARIO.github.io/TU-REPO/`.

## Qué revisar
1. Menú: 6 módulos activos; Recepción, Empleados, Bonus, Kits y Configuración aparecen deshabilitados ("Próximamente").
2. **Dashboard:** cambiá las fechas; ventas, compras y rankings de productos/clientes cambian, y los rankings de stock no.
3. **Ventas:** últimos 7 días por defecto; probá los filtros y "Nueva venta" (listas dependientes, precio automático, IVA 21 %, total).
4. **Artículos:** orden por stock, valorizaciones, filtros, "Cargar mercadería" (maqueta).
5. **Clientes:** tocá un cliente para ver su ficha e historial. Julián Pérez no tiene celular (caso de WhatsApp).
6. **Proveedores** y **Reportes** (8 reportes de ejemplo).
7. Achicá la ventana (o abrilo en el celular): aparece la barra inferior y el menú lateral pasa a cajón.

## Personalización
- Logo: guardá `assets/logo.png` y en `index.html` reemplazá el contenido de `#logoSlot` por `<img src="assets/logo.png" alt="La Chiru Jeans">`.
- Activar un módulo futuro: `enabled: true` en `js/config.js` (y entregar su pantalla).

## Todavía NO está implementado
- Conexión con Google Sheets / Apps Script, login, base real.
- Guardar ventas, compras, clientes, proveedores; editar o inactivar artículos; anulaciones.
- Comprobante PDF, WhatsApp, exportación PDF/CSV del Dashboard y Reportes, importaciones CSV.
- Service worker (el manifiesto y el icono sí están), paginación real del servidor, copias de seguridad.
- Pantallas de Recepción, Empleados, Bonus, Kits y Configuración.

## Pruebas realizadas
- Revisión de sintaxis de todos los `.js` y prueba de la lógica de cálculo (totales, IVA, rankings) con Node.
- **No** se probó en navegadores reales ni en celulares, ni la conexión con Google (se hará en la Fase 2).

Documentación: `docs/ARQUITECTURA.md` y `docs/ESQUEMA_DATOS.md`.
