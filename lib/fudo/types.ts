/**
 * Contrato interno con la API de inyección de pedidos de Fudo.
 *
 * ⚠️ Los nombres de campos exactos se confirman contra la documentación
 * oficial cuando Fudo habilite la integración (se pide por mail desde la
 * cuenta admin). La interfaz de este módulo NO cambia: solo se ajusta el
 * mapeo dentro de client.ts.
 */

import type { PedidoConfirmado } from "@/lib/tipos";

export type ResultadoInyeccion =
  | { ok: true; idFudo: string }
  | { ok: false; error: string };

export interface ClienteFudo {
  /** Inyecta un pedido confirmado en el sistema Fudo del local. */
  crearPedido(pedido: PedidoConfirmado): Promise<ResultadoInyeccion>;
}

/** Estados que Fudo notifica sobre un pedido inyectado (para fase 2: seguimiento). */
export type EstadoPedidoFudo =
  | "confirmado"
  | "rechazado"
  | "listo-para-entregar"
  | "enviado"
  | "cerrado";
