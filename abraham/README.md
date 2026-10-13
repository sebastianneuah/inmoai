# ABRAHAM — App de pedidos (prototipo)

Prototipo interactivo de la experiencia de pedidos de ABRAHAM, sushi kosher en Buenos Aires.
React + TypeScript + Vite + Tailwind CSS + Lucide. Mobile-first, preparado para empaquetarse con Capacitor.

```bash
cd abraham
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build estático en dist/
```

## Qué funciona

- 5 pestañas: Inicio, Menú, Ofertas, Pedidos, Mi cuenta (barra inferior en móvil, navegación superior en desktop).
- Menú con búsqueda, navegación de categorías fija y scroll-spy.
- Detalle de producto con modificadores aplicables, aclaraciones, cantidad y sugerencias.
- Carrito editable, cupones, envío y totales calculados en un único lugar (`src/lib/pricing.ts`).
- Delivery / Retiro, selección de sucursal (Belgrano inactiva), cobertura por barrios, direcciones guardadas.
- Checkout con validaciones, confirmación y seguimiento **simulado**; historial con "Repetir pedido".
- Persistencia local (`localStorage`) de carrito, sesión, pedidos y preferencias.

## Datos de demostración — reemplazar antes de lanzar

| Qué | Dónde |
| --- | --- |
| Logo oficial | `public/brand/` + `brandConfig.logoSrc` en `src/config/app.ts` (hoy se muestra un wordmark tipográfico provisorio, **no** es el logo oficial) |
| Fotos de productos | campo `image` en `src/data/products.ts` (hoy: placeholders tonales “Foto pendiente”) |
| Fotos de campañas | `src/data/campaigns.ts` |
| Precios | `src/data/products.ts`, `src/data/modifiers.ts` (**valores de demo**) |
| Costo de envío y zonas | `src/data/branches.ts` (**valores de demo**) |
| Cupones | `src/data/coupons.ts` (**demo**) |
| Pedidos de ejemplo | `src/data/sampleOrders.ts` (marcados como “Ejemplo”) |

Ningún pedido se envía a cocina y ningún pago se procesa. Mercado Pago figura como “Disponible próximamente”.

## Estructura

```
src/
  components/ui/        primitivas: Button, IconButton, Segmented, Field, Choice, BottomSheet, QuantityStepper…
  components/{product,promo,order,cart,fulfillment,layout,media,brand}/
  screens/              pantallas (rutas en App.tsx, hash router para Capacitor)
  data/                 catálogo, sucursales, cupones, campañas (fácil de editar)
  store/                estado (zustand + persistencia)
  services/             capa de acceso a datos — ver services/README.md
  lib/                  precios, formato ARS, cobertura
  config/app.ts         flags de integraciones y assets de marca
tailwind.config.ts      design tokens (color, tipografía, radios, sombras)
```

## Próxima etapa (no implementado)

Supabase, autenticación, panel de administración, validación de cupones en servidor, Fudo (ruteo a `branch.kitchenRef`),
Mercado Pago Checkout Pro con webhooks verificados, notificaciones push y empaquetado con Capacitor.
