# Arquitectura recomendada (Fase 1)

## Resumen
```
Navegador (PC / tablet / celular)           Google (cuenta del desarrollador)
┌──────────────────────────────┐  HTTPS   ┌────────────────────────────────────┐
│ Interfaz estática (GitHub    │  POST    │ Apps Script "Web App"               │
│ Pages): HTML + CSS + JS      │ ───────▶ │  - login y sesiones                 │
│  views.js  → repository.js   │ ◀─────── │  - validación y reglas de negocio   │
│  (ver "Capas")               │  JSON    │  - LockService + idempotencia       │
└──────────────────────────────┘          │  - acceso a la hoja (por lotes)     │
                                          └──────────────┬─────────────────────┘
                                                         ▼
                                              Google Sheets (base central)
```
**Capas** (ya separadas en el prototipo): `views.js` (pantallas) → `repository.js` (acceso a datos + cálculos) → en Fase 2 `repository.js` llama al backend en lugar de leer `demo-data.js`. Las vistas no cambian.

## Conexión interfaz ↔ Google Sheets
- La interfaz **nunca** toca la hoja: solo habla con el Web App de Apps Script (implementado como "Ejecutar como: yo", "Acceso: cualquier persona").
- Llamadas con `fetch` usando `POST` y `Content-Type: text/plain;charset=utf-8` con el cuerpo en JSON. Es una "solicitud simple": el navegador no hace preflight (Apps Script no responde `OPTIONS`) y la respuesta JSON se puede leer desde otro dominio.
- **No se usa JSONP** (prohibido por el pedido: expone datos y permite modificaciones por GET).
- Como la URL del Web App es pública, la protección es **de aplicación**: ningún dato se devuelve sin sesión válida.
  - Login usuario + clave. El backend compara contra un hash con sal (hoja `Usuarios`, sin claves en texto plano) y entrega un token aleatorio guardado en `CacheService`/`PropertiesService` con vencimiento.
  - Bloqueo temporal tras varios intentos fallidos (contador en `CacheService`).
  - Ninguna clave, token ni ID privado vive en el HTML/JS ni en GitHub. Lo único público es la URL del Web App (`config.js → apiUrl`).
- Operaciones críticas (vender, comprar, anular): `LockService` + `request_id` generado por el navegador (idempotencia: un doble clic o reintento devuelve el resultado ya registrado) + diario de operaciones (`Operaciones`) para detectar y recuperar las que quedaron a medias.
- El navegador muestra "venta registrada" **solo** cuando el backend lo confirma.

## Riesgos y limitaciones (a validar en Fase 2, con una prueba real)
| Riesgo | Mitigación |
|---|---|
| CORS entre GitHub Pages y Apps Script: el patrón `POST text/plain` está ampliamente usado pero **no fue verificado acá** (sin acceso a red). | Primer entregable de Fase 2: un Web App mínimo + `fetch` desde GitHub Pages. Si falla, ver "Plan B". |
| Latencia de Apps Script (1–3 s por llamada, arranque en frío). | Operaciones por lotes, paginación, caché de catálogos en el navegador; indicadores de carga. |
| Cuotas: tiempo de ejecución por llamada (6 min), ejecuciones simultáneas (~30), lecturas/escrituras diarias. | Un local minorista queda muy por debajo; se documentan límites y se evitan lecturas completas repetidas. |
| Seguridad por clave propia (más débil que "Iniciar sesión con Google"). | Claves largas, bloqueo por intentos, vencimiento de sesión, auditoría. Alternativa: acceso solo para cuentas Google autorizadas (cada usuario necesita cuenta Google). |
| Cada nueva implementación del Web App puede cambiar la URL. | Actualizar siempre la misma implementación ("Administrar implementaciones → editar → nueva versión"). |
| La base vive en la cuenta personal del desarrollador. | Documentar la transferencia de propiedad (Hoja + script) a la cuenta del comercio. |
| La PWA solo cachea la interfaz; las ventas requieren conexión. | Es lo pedido: no hay modo offline para operaciones. |
| Hojas de cálculo no son una base transaccional. | Stock por movimientos trazables, bloqueo, idempotencia, copias automáticas. |

**Plan B (si CORS o el login no resultan confiables):** que Apps Script sirva la interfaz (`HtmlService`) sin GitHub Pages. Se pierde el service worker y la instalación PWA completa; es la alternativa gratuita más simple. No se construirá una integración simulada.

## Copias de seguridad
Activador diario de Apps Script que copia la hoja a una carpeta de Drive (`Backups/AAAA-MM-DD`, conserva las últimas N) y exportación manual a CSV/XLSX desde Configuración. La recuperación se documenta en Fase 5.

## Archivos del proyecto
```
index.html               Estructura de la página y carga de scripts
manifest.webmanifest     Identidad PWA (service worker: Fase 5)
assets/icon.svg          Icono provisorio  (logo real: assets/logo.png)
css/styles.css           Paleta, layout responsive, componentes
js/config.js             Módulos activables, IVA, apiUrl
js/ui.js                 Formato ARS/fechas, iconos, modal, tablas, barras
js/demo-data.js          Datos FICTICIOS (se retira en Fase 2)
js/repository.js         Acceso a datos + reglas de cálculo centralizadas
js/views.js              Pantallas de los 6 módulos activos
js/app.js                Menú, router, arranque
docs/                    Esta arquitectura y el esquema de datos
```
Archivos previstos más adelante: `backend/Code.gs`, `Auth.gs`, `Sheets.gs`, `Ventas.gs`, `Compras.gs`, `Import.gs`, `Backup.gs`, `Setup.gs` (Fase 2+); `sw.js` (Fase 5).

## Plan de implementación
1. **Fase 1 (esta):** arquitectura, esquema, prototipo navegable.
2. **Fase 2:** validar CORS con un Web App mínimo → `Setup.gs` que crea las hojas → login → artículos, proveedores, compras, stock, importaciones.
3. **Fase 3:** clientes, ventas (idempotentes), anulaciones, comprobante PDF, WhatsApp.
4. **Fase 4:** Dashboard y Reportes reales, exportación PDF/CSV.
5. **Fase 5:** pruebas integrales, seguridad, GitHub Pages, PWA, manuales.
