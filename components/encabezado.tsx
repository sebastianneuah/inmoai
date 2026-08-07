"use client";

import { NEGOCIO } from "@/config/negocio";
import { useCarrito } from "@/components/carrito";

/** Barra superior: logo, estado Abierto/Cerrado y selector Delivery/Retiro. */
export function Encabezado({ abierto, proxima }: { abierto: boolean; proxima: string }) {
  const { modoEntrega, setModoEntrega } = useCarrito();

  return (
    <header className="bg-tinta text-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            {NEGOCIO.nombre.toUpperCase()}
            <span className="text-fuego">.</span>
          </h1>
          <p className="text-xs text-white/70">{NEGOCIO.descripcion}</p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            abierto ? "bg-white/10 text-green-400" : "bg-white/10 text-red-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${abierto ? "bg-green-400" : "bg-red-400"}`}
            aria-hidden
          />
          {abierto ? "Abierto" : `Cerrado · abrimos ${proxima}`}
        </span>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-4 pt-3">
        <div
          role="radiogroup"
          aria-label="Modo de entrega"
          className="grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1"
        >
          {(
            [
              ["delivery", "🛵 Delivery"],
              ["retiro", "🏪 Retiro"],
            ] as const
          ).map(([modo, etiqueta]) => (
            <button
              key={modo}
              role="radio"
              aria-checked={modoEntrega === modo}
              onClick={() => setModoEntrega(modo)}
              className={`min-h-12 rounded-lg text-sm font-bold transition-colors ${
                modoEntrega === modo
                  ? "bg-fuego text-white"
                  : "text-white/80 active:bg-white/10"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
