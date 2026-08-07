"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCarrito } from "@/components/carrito";
import { formatearPrecio } from "@/lib/precio";
import { registrarEvento } from "@/lib/analytics";

/** Barra fija inferior con el resumen del carrito, siempre visible. */
export function BarraCarrito() {
  const { cantidadTotal, subtotal, listo } = useCarrito();
  const [pulso, setPulso] = useState(false);

  // Micro-feedback: el contador late cuando cambia la cantidad
  useEffect(() => {
    if (cantidadTotal === 0) return;
    setPulso(true);
    const t = setTimeout(() => setPulso(false), 300);
    return () => clearTimeout(t);
  }, [cantidadTotal]);

  if (!listo || cantidadTotal === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href="/checkout"
        onClick={() => registrarEvento("begin_checkout", { items: cantidadTotal, valor: subtotal })}
        className="mx-auto flex min-h-14 max-w-2xl items-center justify-between rounded-xl bg-fuego px-5 font-black text-white active:bg-fuego-oscuro"
      >
        <span className="flex items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-full bg-white text-fuego transition-transform ${
              pulso ? "scale-125" : ""
            }`}
          >
            {cantidadTotal}
          </span>
          Ver pedido
        </span>
        <span>{formatearPrecio(subtotal)}</span>
      </Link>
    </div>
  );
}
