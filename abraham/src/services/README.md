# Services

Screens never talk to data sources directly; they go through this folder.
Today every service is local and synchronous-safe. Planned replacements:

| Service      | Prototype                         | Next stage                                        |
| ------------ | --------------------------------- | ------------------------------------------------- |
| Catálogo     | `src/data/*.ts`                   | Supabase tables (products, categories, branches) |
| Cupones      | `coupons.ts` (local list)         | Server-side validation (Supabase RPC)             |
| Pedidos      | `orders.ts` → `submitOrder` (demo)| Supabase insert + routing to `branch.kitchenRef` (Fudo) |
| Pagos        | No online payments                | Mercado Pago Checkout Pro + verified webhooks     |
| Persistencia | `lib/storage.ts` (localStorage)   | `@capacitor/preferences` on native                |
| Notificaciones | Preferences only                | Push infrastructure                               |

Totals are always recomputed with `lib/pricing.ts`; the backend must do the same and never trust client totals.
