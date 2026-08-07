# Abraham — Pedidos online (V2)

Plataforma de pedidos propia de **Abraham** (sushi kosher, Palermo), pensada
para reemplazar la página "Tu Delivery" de Fudo y ahorrarse la comisión del 4%.
Los pedidos se inyectan en el sistema Fudo del local vía su API.

**En producción:** https://abraham-pedidos.vercel.app
**Panel administrativo:** https://abraham-pedidos.vercel.app/admin

- **Stack**: Next.js 14 (App Router) + TypeScript + Tailwind + Postgres. Deploy en Vercel.
- **Mobile-first**: el 90%+ del tráfico es celular; todo el flujo se hace con una mano.
- **Sin pasarela de pago**: efectivo (con vuelto) o transferencia a un alias de
  Mercado Pago con comprobante por WhatsApp.
- **Administrable sin tocar código**: precios, fotos, productos, categorías,
  salsas, horarios y configuración se editan desde `/admin`.

## Cómo correr el proyecto

```bash
npm install
cp .env.example .env.local   # completar valores (ver abajo)
npm run dev
```

Abrí http://localhost:3000. Sin `DATABASE_URL` la carta se sirve del snapshot
`data/catalogo.json` y el admin queda en modo solo lectura: la web pública
funciona igual.

Para trabajar con la base completa:

```bash
export DATABASE_URL=postgres://usuario:clave@host/base
node scripts/migrar.mjs    # crea las tablas (idempotente)
node scripts/seed.mjs      # migra el catálogo real del repo a la base
```

> Para probar el flujo de respaldo (cuando Fudo falla), escribí la palabra
> "fallar" en la aclaración general del pedido: el mock simula el error y la
> confirmación muestra el botón para reenviar el pedido al local por WhatsApp.

## Variables de entorno

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Postgres (Neon, Supabase, el que sea). Sin ella: catálogo del JSON y admin solo lectura |
| `ADMIN_USUARIO` | Usuario del panel administrativo |
| `ADMIN_PASSWORD_HASH` | Hash scrypt de la contraseña. Generar con `node scripts/generar-hash-admin.mjs "tu-contraseña"` |
| `SESSION_SECRET` | Cadena aleatoria larga para firmar la cookie de sesión |
| `BLOB_READ_WRITE_TOKEN` | Lo agrega Vercel solo al conectar un Blob store (subida de fotos) |
| `ALIAS_MP` | Alias de Mercado Pago que se muestra al cliente (se puede editar desde el admin) |
| `WHATSAPP_NUMERO` | WhatsApp del local, sin `+` (editable desde el admin) |
| `FUDO_MODE` | `mock` (sin credenciales) o `live` (API real de Fudo) |
| `FUDO_CLIENT_ID` / `FUDO_CLIENT_SECRET` | Credenciales que entrega Fudo (⚠️ nunca commitearlas) |

## Panel administrativo (`/admin`)

No hay ningún enlace al panel desde la web pública. El primer administrador se
crea con variables de entorno (no hay registro abierto):

```bash
node scripts/generar-hash-admin.mjs "una-contraseña-larga"
# imprime ADMIN_PASSWORD_HASH=... y una sugerencia de SESSION_SECRET
```

Cargá `ADMIN_USUARIO`, `ADMIN_PASSWORD_HASH` y `SESSION_SECRET` en Vercel y
entrá a `/admin`. La contraseña nunca viaja al navegador ni queda en el código.

Desde el panel se administra:

- **Productos**: buscador y filtros (todos / activos / agotados / ocultos /
  por categoría), **edición de precio desde el listado**, agotar y reactivar en
  un tap, alta y edición completa con **subida de imagen**, etiquetas (badges),
  destacados y grupos de modificadores.
- **Aumentos masivos**: por toda la carta o por categoría, en % o en pesos,
  **siempre con preview antes/después** antes de confirmar.
- **Categorías**: crear, renombrar, activar/desactivar y reordenar (el orden de
  la carta pública es el de esta pantalla).
- **Acompañamientos**: las salsas y los palitos del checkout, con precio,
  máximo por pedido y si se ofrecen automáticamente.
- **Pedidos**: los del día con su estado (nuevo → confirmado → preparando →
  listo → enviado → entregado), con el detalle completo desplegable.
- **Configuración**: alias, WhatsApp, dirección, costo de envío, pedido mínimo,
  tiempos estimados, horarios (incluido Shabat) y los interruptores del paso de
  salsas y del upsell.

## Catálogo

- Fuente de verdad: la **base de datos** (administrable desde `/admin`).
- Respaldo: el snapshot `data/catalogo.json` con el catálogo real importado del
  menú de Fudo. Se usa si no hay `DATABASE_URL` o si la base no responde, así la
  carta nunca se cae.
- Para re-importar el menú desde Fudo:
  `node scripts/importar-catalogo-fudo.mjs` (requiere Playwright) y después
  `node scripts/seed.mjs`.

## Base de datos

Migraciones en `db/migraciones/`, aplicadas con `node scripts/migrar.mjs`
(registra lo aplicado, correrlo dos veces no rompe nada).

| Tabla | Para qué |
|---|---|
| `categorias` | Secciones de la carta, con orden y activa/oculta |
| `productos` | Nombre, precios, fotos, descripciones, etiquetas, destacado, activo/disponible |
| `grupos_modificadores` / `opciones_modificador` | "Elegí tus rolls", "sacale algo", con mínimo, máximo y precio extra |
| `producto_modificadores` | Qué grupos aplican a qué productos |
| `acompanamientos` | Salsas, palitos y otros del paso del checkout |
| `pedidos` | Respaldo de cada pedido confirmado y panel de pedidos |
| `configuracion` | Valores editables del negocio (lo sensible sigue en variables de entorno) |

## Cómo pasar de `FUDO_MODE=mock` a `live`

1. Pedir la habilitación de la **API de inyección de pedidos** a Fudo
   (está en Beta): mail desde la cuenta admin del local pidiendo la integración
   y la documentación.
2. Cargar `FUDO_CLIENT_ID`, `FUDO_CLIENT_SECRET` y `FUDO_MODE=live` en Vercel.
3. Contra la documentación oficial, revisar endpoints y payload en
   [`lib/fudo/client.ts`](lib/fudo/client.ts) (`URL_AUTH`, `URL_API` y
   `armarPayload`). La interfaz del módulo no cambia.
4. Hacer un pedido de prueba y verificar que llegue con la nota
   `ESPERA COMPROBANTE` cuando el pago es por transferencia, y con la línea
   `ACOMPAÑAMIENTOS:` cuando el cliente pidió salsas o palitos.

## Cómo deployar (Vercel)

1. Importar el repo en https://vercel.com/new.
2. Cargar las variables de entorno de la tabla de arriba.
3. Conectar un Blob store (Storage → Blob) para las fotos de productos.
4. Deploy. Dominio: agregar `pedidos.abrahamsushi.com` en Settings → Domains.

## Estructura del proyecto

```
db/migraciones/       ← esquema SQL versionado
scripts/              ← migrar, seed, hash de admin, importar menú de Fudo
config/negocio.ts     ← valores por defecto (la config editable vive en la base)
data/catalogo.json    ← snapshot de respaldo del catálogo real
app/
  page.tsx            ← home = catálogo
  checkout/           ← carrito → salsas y palitos → entrega y pago
  confirmacion/       ← confirmación e instrucciones de pago
  admin/              ← panel (login + secciones)
  api/pedidos/        ← validación server-side + inyección en Fudo + fallback
  api/admin/          ← APIs del panel (todas exigen sesión)
lib/
  tienda/             ← catálogo, configuración, acompañamientos, pedidos
  admin/              ← autenticación y guardas
  fudo/               ← cliente real + mock (elegido por FUDO_MODE)
  horarios.ts         ← lógica Abierto/Cerrado en hora de Buenos Aires
components/           ← UI pública y del admin
```

## Decisiones de diseño

- **El servidor decide todos los precios**: el carrito manda IDs y cantidades;
  la API recalcula producto + modificadores + acompañamientos + envío contra la
  base. Nada que venga del navegador se usa como precio.
- **Las credenciales nunca llegan al navegador**: la inyección a Fudo y la
  validación de sesión corren en funciones serverless.
- **Si Fudo falla, el pedido no se pierde**: queda guardado en la base, logueado,
  y el cliente ve un botón para mandar el detalle completo al WhatsApp del local.
- **Doble tap / reintentos**: cada pedido viaja con una clave de idempotencia y
  el número de pedido se deriva de ella, así reintentar nunca duplica.
- **Las salsas se preguntan una sola vez**, al pasar del carrito a los datos —
  no cada vez que se agrega un producto — y no se borran si el cliente vuelve
  atrás a editar la comida.
- **Sin service worker**: el manifest permite instalar la app en el celular sin
  arriesgar que alguien vea una versión vieja del menú desde la caché.
