import { formatearPrecio } from "@/lib/precio";
import type { PedidoConfirmado } from "@/lib/tipos";

/** Arma un deep link wa.me con el texto prearmado. */
export function linkWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Mensaje que manda el CLIENTE al local con el comprobante de transferencia. */
export function mensajeComprobante(pedido: PedidoConfirmado): string {
  return `Hola! Soy ${pedido.cliente.nombre}. Pedido #${pedido.numero} por ${formatearPrecio(
    pedido.total
  )}. Adjunto comprobante:`;
}

/**
 * Línea de acompañamientos para los mensajes y la nota de Fudo. Los palitos
 * ya vienen dentro de `acompanamientos`; si el cliente pidió cero se dice
 * explícitamente, para que en el local no los agreguen "por las dudas".
 */
export function resumenAcompanamientos(pedido: PedidoConfirmado): string {
  const partes = (pedido.acompanamientos ?? []).map(
    (a) => `${a.cantidad}× ${a.nombre}`
  );
  if (pedido.palitos === 0) partes.push("SIN palitos");
  return partes.join(", ");
}

/**
 * Mensaje de respaldo con el detalle completo del pedido, para cuando la
 * inyección a Fudo falló y el local tiene que cargarlo a mano.
 */
export function mensajeRespaldoPedido(pedido: PedidoConfirmado): string {
  const acompanamientos = resumenAcompanamientos(pedido);
  const lineas = [
    `⚠️ PEDIDO WEB #${pedido.numero} (cargar a mano — no entró al sistema)`,
    ``,
    `Cliente: ${pedido.cliente.nombre} — Tel: ${pedido.cliente.telefono}`,
    pedido.modoEntrega === "delivery"
      ? `Delivery a: ${pedido.cliente.direccion}${pedido.cliente.referencias ? ` (${pedido.cliente.referencias})` : ""}${pedido.zonaEnvio ? ` — Zona: ${pedido.zonaEnvio}` : ""}`
      : `Retiro por el local`,
    ``,
    ...pedido.items.map(
      (i) =>
        `• ${i.cantidad}× ${i.nombre}${
          i.modificadores?.length ? ` [${i.modificadores.map((m) => m.nombre).join(", ")}]` : ""
        } — ${formatearPrecio(i.precioUnitario * i.cantidad)}${i.aclaracion ? ` (${i.aclaracion})` : ""}`
    ),
    acompanamientos ? `ACOMPAÑAMIENTOS: ${acompanamientos}` : "",
    pedido.aclaracionGeneral ? `Aclaración: ${pedido.aclaracionGeneral}` : "",
    ``,
    pedido.costoEnvio > 0 ? `Envío: ${formatearPrecio(pedido.costoEnvio)}` : "",
    `TOTAL: ${formatearPrecio(pedido.total)}`,
    pedido.pago.metodo === "efectivo"
      ? `Paga en efectivo${
          pedido.pago.pagaCon === "justo"
            ? " (monto justo)"
            : ` con ${formatearPrecio(pedido.pago.pagaCon)} (vuelto ${formatearPrecio(pedido.vuelto)})`
        }`
      : `Paga por transferencia — ESPERA COMPROBANTE`,
  ];
  return lineas.filter((l) => l !== "").join("\n");
}
