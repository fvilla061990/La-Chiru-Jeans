# Fase 2 · Entrega 2A — Base real: acceso, backend y hojas

Esta entrega conecta el prototipo con el backend **ya probado** y crea las hojas. Artículos, Proveedores, Compras/Stock e Importaciones llegan en las entregas 2B–2D. Mientras `apiUrl` esté vacío, la app sigue en modo demostración (como en la Fase 1).

## Qué cambió
- `backend/Code.gs` (nuevo): mismas funciones de autenticación de la prueba + enrutador con `ping` y `estado`.
- `backend/Setup.gs` (nuevo): crea las 17 hojas del esquema.
- `js/api.js`, `js/auth.js` (nuevos): llamadas al backend y login con Google.
- `js/config.js`, `js/app.js`, `index.html`: modo real (`apiUrl`), pantalla de acceso, módulos sin conectar = aviso "próxima entrega" (sin datos ficticios).
- `docs/ESQUEMA_DATOS.md`: se quitó la hoja `Usuarios` (explicado al final).

## Instalación (usá una hoja NUEVA para los datos reales; la de la prueba queda aparte)
1. Creá una Google Sheet "La Chiru Jeans - Base" → *Extensiones → Apps Script*. Pegá `backend/Code.gs` y `backend/Setup.gs` como dos archivos.
2. *Configuración del proyecto → Propiedades del script*: `CLIENT_ID` (el mismo ID de cliente de la prueba) y `EMAILS_AUTORIZADOS`.
3. En el editor elegí la función `inicializarBase` → **Ejecutar** (autorizá permisos). Debe crear 17 hojas.
4. *Implementar → Nueva implementación → Aplicación web*: ejecutar como **Yo**, acceso **Cualquier usuario**. Copiá la URL `/exec`.
5. En Google Cloud, en el ID de cliente OAuth, confirmá que el origen autorizado sea el de tu GitHub Pages (`https://USUARIO.github.io`).
6. Editá `js/config.js`: `apiUrl: 'URL/exec'` y `googleClientId: 'ID.apps.googleusercontent.com'` (ambos públicos).
7. Subí el contenido de `chiru/` a GitHub Pages (como en el README de la Fase 1).

## Verificación REAL obligatoria (por tocar el acceso)
Desde la URL de GitHub Pages: (a) entrar con la cuenta autorizada → aparece tu email y el menú; (b) *Salir* y entrar con una cuenta NO autorizada → "Tu cuenta de Google no está autorizada" y ningún dato; (c) en la hoja, las 17 pestañas con sus encabezados; (d) cada módulo muestra "próxima entrega" y ningún dato ficticio.

## Pruebas
- **Automatizadas (con simulacros de Google, ejecutadas):** 11 comprobaciones del backend: rechazo sin token y con email no autorizado (también en `estado`), `ping`, acción inexistente, creación de 17 hojas, encabezados, datos base, segunda ejecución sin duplicados. Sintaxis de todos los `.js`. Resultado: todas OK.
- **Reales:** la prueba de conexión previa (hecha por vos) cubre el acceso. **Esta entrega todavía no se probó en real**: faltan los pasos (a)–(d).

## Pendiente
Artículos, Proveedores, Compras/Recepción, stock e importaciones (2B–2D); `demo-data.js` se retirará de la carga cuando los módulos estén conectados. Ventas, Clientes, Dashboard y Reportes: Fases 3 y 4.
