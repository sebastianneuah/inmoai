"use client";

/**
 * Eventos de analítica del embudo de pedido. Hoy quedan disponibles en
 * `window.dataLayer` (y en consola durante desarrollo): enchufar Google
 * Analytics, Plausible o similar es agregar el script, sin tocar los
 * llamados que ya están repartidos por la app.
 *
 * No se registran datos personales: solo ids de producto, montos y pasos.
 */

export type EventoAnalytics =
  | "view_product"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "select_sauces"
  | "select_delivery"
  | "purchase"
  | "search";

export function registrarEvento(
  evento: EventoAnalytics,
  datos: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;
  const ventana = window as unknown as { dataLayer?: unknown[] };
  ventana.dataLayer = ventana.dataLayer ?? [];
  ventana.dataLayer.push({ event: evento, ...datos, ts: Date.now() });
}
