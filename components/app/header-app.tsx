"use client";

import { useState } from "react";
import { useCarrito } from "@/components/carrito";
import { IconoCampana, IconoChevron } from "@/components/app/iconos";
import { HojaEntrega } from "@/components/app/hoja-entrega";
import { useEstadoLocal } from "@/components/app/estado-local";

/**
 * Header compacto de app: logo, modo de entrega y estado del local. No ocupa
 * media pantalla — la comida tiene que aparecer enseguida.
 */
export function HeaderApp({
  abierto: abiertoServidor,
  proxima: proximaServidor,
  tiempoDelivery,
  tiempoRetiro,
  direccionLocal,
}: {
  abierto: boolean;
  proxima: string;
  tiempoDelivery: string;
  tiempoRetiro: string;
  direccionLocal: string;
}) {
  const { modoEntrega } = useCarrito();
  const [hojaAbierta, setHojaAbierta] = useState(false);
  // El estado se recalcula en el navegador cada 30s: si el local cierra
  // mientras el cliente mira el menú, el cartel cambia solo
  const estado = useEstadoLocal();
  const abierto = estado.calculado ? estado.abierto : abiertoServidor;
  const proxima = estado.calculado ? estado.proxima : proximaServidor;

  return (
    <>
      <header className="sticky top-0 z-30 bg-tinta text-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
          <span className="text-xl font-black leading-none tracking-tight">
            ABRAHAM<span className="text-fuego">.</span>
          </span>

          <button
            onClick={() => setHojaAbierta(true)}
            className="ml-auto flex min-h-11 items-center gap-1 rounded-xl px-2 text-left active:bg-white/10"
          >
            <span>
              <span className="block text-[10px] leading-tight text-white/60">
                {modoEntrega === "delivery" ? "Delivery a" : "Retirás en"}
              </span>
              <span className="block text-sm font-bold leading-tight">
                {modoEntrega === "delivery" ? "Palermo" : "el local"}
              </span>
            </span>
            <IconoChevron className="h-4 w-4 text-white/60" />
          </button>

          <button
            aria-label="Novedades"
            onClick={() => setHojaAbierta(true)}
            className="grid h-11 w-11 place-items-center rounded-full active:bg-white/10"
          >
            <IconoCampana className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 pb-2.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${abierto ? "bg-green-400" : "bg-red-400"}`}
            aria-hidden
          />
          <span className="font-bold">
            {abierto ? "Abierto ahora" : `Cerrado · abrimos ${proxima}`}
          </span>
          {abierto && (
            <span className="text-white/60">
              · {modoEntrega === "delivery" ? tiempoDelivery : tiempoRetiro}
            </span>
          )}
        </div>
      </header>

      {hojaAbierta && (
        <HojaEntrega
          direccionLocal={direccionLocal}
          tiempoDelivery={tiempoDelivery}
          tiempoRetiro={tiempoRetiro}
          onCerrar={() => setHojaAbierta(false)}
        />
      )}
    </>
  );
}
