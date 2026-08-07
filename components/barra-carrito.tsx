"use client";

import Link from "next/link";
import { useCarrito } from "@/components/carrito";
import { formatearPrecio } from "@/lib/precio";

/** Barra fija inferior con el resumen del carrito, siempre visible. */
export function BarraCarrito() {
  const { cantidadTotal, subtotal, listo } = useCarrito();

  if (!listo || cantidadTotal === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href="/checkout"
        className="mx-auto flex min-h-14 max-w-2xl items-center justify-between rounded-xl bg-fuego px-5 font-black text-white active:bg-fuego-oscuro"
      >
        <span>
          🛒 {cantidadTotal} {cantidadTotal === 1 ? "ítem" : "ítems"}
        </span>
        <span>Ver pedido · {formatearPrecio(subtotal)}</span>
      </Link>
    </div>
  );
}
