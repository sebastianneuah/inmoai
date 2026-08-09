"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCarrito } from "@/components/carrito";
import { formatearPrecio } from "@/lib/precio";
import { registrarEvento } from "@/lib/analytics";

/**
 * Barra flotante del pedido en curso. Va por encima de la navegación
 * inferior y solo aparece mientras hay algo en el carrito; en la pantalla de
 * Pedido no se muestra (ahí ya está todo a la vista).
 */
export function BarraPedido() {
  const { cantidadTotal, subtotal, listo } = useCarrito();
  const ruta = usePathname();
  const [pulso, setPulso] = useState(false);

  useEffect(() => {
    if (cantidadTotal === 0) return;
    setPulso(true);
    const t = setTimeout(() => setPulso(false), 300);
    return () => clearTimeout(t);
  }, [cantidadTotal]);

  if (!listo || cantidadTotal === 0 || ruta.startsWith("/pedido")) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
      <Link
        href="/pedido"
        onClick={() => registrarEvento("begin_checkout", { items: cantidadTotal, valor: subtotal })}
        className="mx-auto flex min-h-13 max-w-2xl items-center justify-between rounded-2xl bg-fuego px-4 py-3 font-black text-white shadow-xl active:bg-fuego-oscuro"
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
