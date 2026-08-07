# Abraham — Pedidos online

Página de pedidos propia de **Abraham** (sushi kosher, Palermo), pensada para
reemplazar la página "Tu Delivery" de Fudo y ahorrarse la comisión del 4%.
Los pedidos se inyectan directo en el sistema Fudo del local vía su API.

- **Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS. Deploy en Vercel.
- **Mobile-first**: el 90%+ del tráfico es celular; todo el flujo se hace con una mano.
- **Sin pasarela de pago**: efectivo (con cálculo de vuelto) o transferencia a un
  alias de Mercado Pago con comprobante por WhatsApp.

## Cómo correr el proyecto

```bash
npm install
cp .env.example .env.local   # completar valores (ver abajo)
npm run dev
```

Abrí http://localhost:3000. Con `FUDO_MODE=mock` no hace falta ninguna credencial.

> Para probar el flujo de respaldo (cuando Fudo falla), escribí la palabra
> "fallar" en la aclaración general del pedido: el mock simula el error y la
> confirmación muestra el botón para reenviar el pedido al local por WhatsApp.

## Variables de entorno (`.env.local`)

| Variable | Qué es |
|---|---|
| `ALIAS_MP` | Alias de Mercado Pago que se muestra al cliente para transferir (⚠️ si falta, el cliente no ve el alias) |
| `WHATSAPP_NUMERO` | WhatsApp del local, formato internacional sin `+` (ej. `54911...`) — recibe comprobantes y pedidos de respaldo |
| `FUDO_MODE` | `mock` (sin credenciales) o `live` (API real de Fudo) |
| `FUDO_CLIENT_ID` | Credencial que entrega Fudo al habilitar la integración |
| `FUDO_CLIENT_SECRET` | Credencial que entrega Fudo (⚠️ nunca commitearla) |

## Cómo editar la configuración del negocio

**Todo vive en un solo archivo: [`config/negocio.ts`](config/negocio.ts).**

- **Horarios por día** (`horarios`): array de rangos `{ desde, hasta }` por día
  (0 = domingo … 6 = sábado). Array vacío = cerrado ese día.
  - **Shabat**: el viernes se pone la hora de cierre antes de la puesta del sol y
    el sábado la hora de reapertura a la noche. Como la puesta del sol cambia,
    conviene ajustarlo cada semana o dejar margen de seguridad.
- **Pedido mínimo de delivery**: `entrega.pedidoMinimoDelivery` (en pesos).
- **Costo de envío**: `entrega.envio.costoUnico`. Para cobrar por zona, cargar
  `entrega.envio.zonas`: el checkout muestra automáticamente el selector de zona
  (obligatorio) y cobra el costo de la zona elegida.
- **Tiempos estimados** y **dirección del local**: en `entrega`.

Fuera de horario la página se ve igual, pero el botón de confirmar se reemplaza
por "Cerrado ahora — abrimos {próximo horario}".

## Catálogo

- Hoy: catálogo local en [`data/catalogo.json`](data/catalogo.json), con la
  **misma estructura JSON:API que devuelve la API de Fudo** (Product /
  ProductCategory). Editarlo a mano para cambiar precios o marcar agotados
  (`"active": false` = Agotado).
- Mañana: cuando Fudo habilite la API, la capa [`lib/catalogo.ts`](lib/catalogo.ts)
  pasa a leer de la API con revalidación cada 15 minutos (ya configurada en
  `app/page.tsx` con `revalidate = 900`). El resto de la app no cambia.

## Cómo pasar de `FUDO_MODE=mock` a `live`

1. Pedir la habilitación de la **API de inyección de pedidos** a Fudo
   (está en Beta): mandar mail desde la cuenta admin del local pidiendo
   la integración y la documentación.
2. Cargar en `.env.local` (o en las variables de entorno de Vercel):
   `FUDO_CLIENT_ID`, `FUDO_CLIENT_SECRET` y `FUDO_MODE=live`.
3. Contra la documentación oficial, revisar los endpoints y el payload en
   [`lib/fudo/client.ts`](lib/fudo/client.ts) (constantes `URL_AUTH` / `URL_API`
   y la función `armarPayload`). La interfaz del módulo no cambia.
4. Hacer un pedido de prueba y verificar que aparezca en el Fudo del local con
   la nota `ESPERA COMPROBANTE` cuando el pago es por transferencia.

## Cómo deployar (Vercel)

1. Importar este repo en https://vercel.com/new.
2. Cargar las variables de entorno del `.env.example` en el proyecto.
3. Deploy. Vercel detecta Next.js solo; no hay nada más que configurar.
4. Dominio: agregar `pedidos.abrahamsushi.com` en Settings → Domains y crear
   el CNAME en el DNS del dominio.

## Estructura del proyecto

```
config/negocio.ts     ← ⚙️ TODA la configuración del negocio (horarios, mínimo, envío…)
data/catalogo.json    ← catálogo local (estructura de la API de Fudo)
app/
  page.tsx            ← home = catálogo
  checkout/           ← carrito + datos + pago
  confirmacion/       ← confirmación + instrucciones de pago
  api/pedidos/        ← validación server-side + inyección en Fudo + fallback
lib/
  fudo/               ← cliente real + mock (elegido por FUDO_MODE)
  horarios.ts         ← lógica Abierto/Cerrado (zona horaria del local)
  whatsapp.ts         ← deep links de WhatsApp con mensajes prearmados
components/           ← UI (catálogo, carrito, checkout, confirmación)
```

## Decisiones de diseño

- **Las credenciales de Fudo nunca llegan al navegador**: la inyección corre en
  una función serverless (`app/api/pedidos`). El alias y el WhatsApp también se
  leen del entorno en el servidor y viajan solo en la respuesta del pedido.
- **Los precios los decide el servidor**: el carrito manda IDs y cantidades;
  la API recalcula todo contra el catálogo (nadie puede pedir con precios viejos
  o adulterados).
- **Si Fudo falla, el pedido no se pierde**: queda logueado en el servidor y el
  cliente ve un botón grande para mandar el detalle completo al WhatsApp del
  local (carga manual). El cliente ve su confirmación normal igual.
- **Doble tap / reintentos**: cada pedido viaja con una clave de idempotencia;
  reintentar no duplica el pedido.
