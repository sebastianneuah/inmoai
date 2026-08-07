import { NEGOCIO } from "@/config/negocio";
import type { ClienteFudo, ResultadoInyeccion } from "@/lib/fudo/types";
import type { PedidoConfirmado } from "@/lib/tipos";

/**
 * Cliente real de la API de inyección de pedidos de Fudo.
 *
 * Autenticación: Client ID + Client Secret (los genera Fudo al habilitar la
 * integración). Este módulo corre SOLO en el servidor: las credenciales
 * jamás llegan al navegador.
 *
 * ⚠️ Las URLs y el formato exacto del payload se confirman con la
 * documentación que manda Fudo al habilitar la API (está en Beta).
 * Ajustar las constantes y `armarPayload` según esa doc; la interfaz
 * pública (crearPedido) no cambia.
 */

const URL_AUTH = process.env.FUDO_AUTH_URL ?? "https://auth.fu.do/api";
const URL_API = process.env.FUDO_API_URL ?? "https://api.fu.do/v1alpha1";

let tokenCache: { token: string; expira: number } | null = null;

async function obtenerToken(): Promise<string> {
  const ahora = Date.now();
  if (tokenCache && tokenCache.expira > ahora) return tokenCache.token;

  const respuesta = await fetch(URL_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: process.env.FUDO_CLIENT_ID,
      apiSecret: process.env.FUDO_CLIENT_SECRET,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`Auth Fudo falló: ${respuesta.status}`);
  }
  const datos = (await respuesta.json()) as { token: string; exp?: number };
  // Renovamos 5 minutos antes del vencimiento (o cada 20 min si no informa exp)
  const expira = datos.exp ? datos.exp * 1000 - 5 * 60 * 1000 : ahora + 20 * 60 * 1000;
  tokenCache = { token: datos.token, expira };
  return datos.token;
}

function armarPayload(pedido: PedidoConfirmado) {
  const notas: string[] = [];
  if (pedido.pago.metodo === "transferencia") {
    notas.push(NEGOCIO.textos.notaEsperaComprobante);
  }
  if (pedido.pago.metodo === "efectivo" && pedido.pago.pagaCon !== "justo") {
    notas.push(`Paga con $${pedido.pago.pagaCon} — vuelto $${pedido.vuelto}`);
  }
  if (pedido.aclaracionGeneral) notas.push(pedido.aclaracionGeneral);
  notas.push(`Pedido web #${pedido.numero}`);

  return {
    order: {
      type: pedido.modoEntrega === "delivery" ? "delivery" : "takeaway",
      items: pedido.items.map((i) => ({
        productId: i.productoId,
        quantity: i.cantidad,
        price: i.precioUnitario,
        comment: i.aclaracion ?? null,
      })),
      customer: {
        name: pedido.cliente.nombre,
        phone: pedido.cliente.telefono,
        address:
          pedido.modoEntrega === "delivery"
            ? `${pedido.cliente.direccion}${pedido.cliente.referencias ? ` (${pedido.cliente.referencias})` : ""}`
            : null,
      },
      shippingCost: pedido.costoEnvio,
      payment: {
        method: pedido.pago.metodo === "efectivo" ? "cash" : "transfer",
        amount: pedido.total,
      },
      comment: notas.join(" | "),
      externalReference: pedido.numero,
    },
  };
}

export const clienteReal: ClienteFudo = {
  async crearPedido(pedido: PedidoConfirmado): Promise<ResultadoInyeccion> {
    try {
      const token = await obtenerToken();
      const respuesta = await fetch(`${URL_API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(armarPayload(pedido)),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.text();
        return { ok: false, error: `Fudo respondió ${respuesta.status}: ${cuerpo.slice(0, 300)}` };
      }
      const datos = (await respuesta.json()) as { data?: { id?: string } };
      return { ok: true, idFudo: datos.data?.id ?? "desconocido" };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};
