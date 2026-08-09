"use client";

import type { PedidoConfirmado } from "@/lib/tipos";

/**
 * Historial de pedidos del cliente. Como se puede comprar sin cuenta, se
 * guarda en el navegador (los pedidos también quedan en la base, pero
 * listarlos ahí exigiría identificar a la persona: acá alcanza y no expone
 * datos de nadie). Sirve para "Repetir pedido".
 */

const CLAVE = "abraham.historial.v1";
const MAXIMO = 15;

export type PedidoHistorial = {
  numero: string;
  creadoEn: string;
  total: number;
  modoEntrega: string;
  items: { productoId: string; nombre: string; cantidad: number; aclaracion?: string }[];
  acompanamientos: { nombre: string; cantidad: number }[];
  palitos: number;
};

export function leerHistorial(): PedidoHistorial[] {
  try {
    const guardado = localStorage.getItem(CLAVE);
    const datos = guardado ? JSON.parse(guardado) : [];
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (p) =>
        typeof p === "object" && p !== null &&
        typeof p.numero === "string" && Array.isArray(p.items)
    );
  } catch {
    return [];
  }
}

export function agregarAlHistorial(pedido: PedidoConfirmado) {
  const entrada: PedidoHistorial = {
    numero: pedido.numero,
    creadoEn: pedido.creadoEn,
    total: pedido.total,
    modoEntrega: pedido.modoEntrega,
    items: pedido.items.map((i) => ({
      productoId: i.productoId,
      nombre: i.nombre,
      cantidad: i.cantidad,
      aclaracion: i.aclaracion,
    })),
    acompanamientos: (pedido.acompanamientos ?? []).map((a) => ({
      nombre: a.nombre,
      cantidad: a.cantidad,
    })),
    palitos: pedido.palitos,
  };
  try {
    const previos = leerHistorial().filter((p) => p.numero !== entrada.numero);
    localStorage.setItem(CLAVE, JSON.stringify([entrada, ...previos].slice(0, MAXIMO)));
  } catch {
    // sin espacio: el pedido igual se confirmó, solo no queda en el historial
  }
}

/** Texto corto tipo "domingo 3 de agosto" para mostrar en la lista. */
export function fechaAmable(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
