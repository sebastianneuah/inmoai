"use client";

import { useEffect, useState } from "react";

/**
 * Invitación a agregar Abraham a la pantalla de inicio. Aparece discreta y
 * SOLO después del primer pedido confirmado — nunca en la primera visita ni
 * interrumpiendo el flujo de compra. Si la descartan, no vuelve a aparecer.
 */

const CLAVE_DESCARTADO = "abraham.instalar.descartado";
export const CLAVE_PEDIDO_HECHO = "abraham.pedidoHecho";

type EventoInstalacion = Event & { prompt: () => Promise<void> };

export function AvisoInstalar() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const yaPidio = localStorage.getItem(CLAVE_PEDIDO_HECHO) === "si";
    const descartado = localStorage.getItem(CLAVE_DESCARTADO) === "si";
    const instalada = window.matchMedia("(display-mode: standalone)").matches;
    if (!yaPidio || descartado || instalada) return;

    const alPoder = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
      // Un respiro antes de mostrarlo: nunca encima de otra acción
      setTimeout(() => setVisible(true), 2500);
    };
    window.addEventListener("beforeinstallprompt", alPoder);
    return () => window.removeEventListener("beforeinstallprompt", alPoder);
  }, []);

  function descartar() {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE_DESCARTADO, "si");
    } catch {
      // si no se puede guardar, simplemente vuelve a ofrecerse otro día
    }
  }

  if (!visible || !evento) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 flex items-center gap-3 rounded-2xl bg-tinta p-3 text-white shadow-xl">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fuego text-lg font-black">
        A
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold leading-tight">
        Agregá Abraham a tu inicio
        <span className="block text-xs font-normal text-white/70">
          Pedí más rápido la próxima vez
        </span>
      </p>
      <button
        onClick={async () => {
          setVisible(false);
          await evento.prompt().catch(() => {});
        }}
        className="min-h-10 shrink-0 rounded-xl bg-white px-3 text-sm font-black text-tinta"
      >
        Instalar
      </button>
      <button
        onClick={descartar}
        aria-label="Ahora no"
        className="grid h-10 w-8 shrink-0 place-items-center text-white/60"
      >
        ✕
      </button>
    </div>
  );
}
