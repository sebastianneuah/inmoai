"use client";

import type { PedidoConfirmado } from "@/lib/tipos";

/**
 * Traslado del pedido confirmado del checkout a la pantalla de confirmación.
 *
 * Canal principal: memoria del módulo (sobrevive la navegación interna de la
 * SPA aunque localStorage esté bloqueado — Safari privado, storage lleno).
 * Respaldo: localStorage, para que la confirmación aguante una recarga.
 */

const CLAVE_ULTIMO_PEDIDO = "abraham.ultimoPedido.v1";

let pedidoEnMemoria: PedidoConfirmado | null = null;

export function guardarUltimoPedido(pedido: PedidoConfirmado) {
  pedidoEnMemoria = pedido;
  try {
    localStorage.setItem(CLAVE_ULTIMO_PEDIDO, JSON.stringify(pedido));
  } catch {
    // la confirmación igual se muestra gracias a la copia en memoria
  }
}

export function leerUltimoPedido(): PedidoConfirmado | null {
  if (pedidoEnMemoria) return pedidoEnMemoria;
  try {
    const guardado = localStorage.getItem(CLAVE_ULTIMO_PEDIDO);
    if (!guardado) return null;
    const pedido = JSON.parse(guardado) as PedidoConfirmado;
    // Validación de forma: un registro corrupto no debe romper la página.
    // Se chequea todo lo que la confirmación desreferencia sin guardas.
    if (
      typeof pedido !== "object" ||
      pedido === null ||
      typeof pedido.numero !== "string" ||
      !Array.isArray(pedido.items) ||
      typeof pedido.total !== "number" ||
      typeof pedido.pago !== "object" ||
      pedido.pago === null ||
      (pedido.pago.metodo !== "efectivo" && pedido.pago.metodo !== "transferencia") ||
      typeof pedido.datosPago !== "object" ||
      pedido.datosPago === null ||
      typeof pedido.cliente !== "object" ||
      pedido.cliente === null
    ) {
      return null;
    }
    return pedido;
  } catch {
    return null;
  }
}
