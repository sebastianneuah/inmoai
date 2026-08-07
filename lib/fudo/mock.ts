import type { ClienteFudo, ResultadoInyeccion } from "@/lib/fudo/types";
import type { PedidoConfirmado } from "@/lib/tipos";

/**
 * Mock de la API de inyección de Fudo, con la misma interfaz que el cliente
 * real. Se usa con FUDO_MODE=mock mientras Fudo no habilite credenciales.
 *
 * Para probar el flujo de fallback (aviso por WhatsApp al local), agregar
 * la palabra "fallar" en la aclaración general del pedido.
 */
export const clienteMock: ClienteFudo = {
  async crearPedido(pedido: PedidoConfirmado): Promise<ResultadoInyeccion> {
    if (pedido.aclaracionGeneral?.toLowerCase().includes("fallar")) {
      return { ok: false, error: "Fallo simulado (mock)" };
    }
    console.log(
      `[fudo:mock] Pedido #${pedido.numero} inyectado — ${pedido.items.length} ítems, total ${pedido.total}`
    );
    return { ok: true, idFudo: `mock-${pedido.numero}` };
  },
};
