"use client";

import { useEffect, useState } from "react";
import { useCarrito, CLAVE_CLIENTE, type DatosCliente } from "@/components/carrito";
import { registrarEvento } from "@/lib/analytics";

/**
 * Bottom sheet de "¿Cómo querés recibir tu pedido?". En delivery pide la
 * dirección y la recuerda; en retiro muestra el local. Es la misma elección
 * que después usa el checkout.
 */
export function HojaEntrega({
  direccionLocal,
  tiempoDelivery,
  tiempoRetiro,
  onCerrar,
}: {
  direccionLocal: string;
  tiempoDelivery: string;
  tiempoRetiro: string;
  onCerrar: () => void;
}) {
  const { modoEntrega, setModoEntrega } = useCarrito();
  const [direccion, setDireccion] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    try {
      const guardado = localStorage.getItem(CLAVE_CLIENTE);
      if (guardado) {
        const datos = JSON.parse(guardado) as Partial<DatosCliente>;
        if (typeof datos.direccion === "string") setDireccion(datos.direccion);
      }
    } catch {
      // sin dirección guardada
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", alTeclear);
    };
  }, [onCerrar]);

  function guardarYCerrar() {
    if (modoEntrega === "delivery" && direccion.trim()) {
      try {
        const previo = JSON.parse(localStorage.getItem(CLAVE_CLIENTE) ?? "{}");
        localStorage.setItem(
          CLAVE_CLIENTE,
          JSON.stringify({ ...previo, direccion: direccion.trim() })
        );
      } catch {
        // si no se puede guardar, igual sigue el pedido
      }
    }
    onCerrar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Cómo recibir el pedido"
    >
      <div
        className="w-full max-w-lg animate-[subir_.22s_ease-out] rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-gray-300" aria-hidden />
        <h2 className="text-lg font-black">¿Cómo querés recibir tu pedido?</h2>

        <div className="mt-3 space-y-2">
          {(
            [
              ["delivery", "Delivery", `Te lo llevamos · ${tiempoDelivery}`],
              ["retiro", "Retirar", `Lo buscás vos · ${tiempoRetiro}`],
            ] as const
          ).map(([modo, titulo, detalle]) => (
            <button
              key={modo}
              onClick={() => {
                setModoEntrega(modo);
                registrarEvento("select_delivery", { modo });
              }}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left ${
                modoEntrega === modo ? "border-fuego bg-fuego-claro" : "border-gray-200"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                  modoEntrega === modo ? "border-fuego" : "border-gray-300"
                }`}
                aria-hidden
              >
                {modoEntrega === modo && <span className="h-2.5 w-2.5 rounded-full bg-fuego" />}
              </span>
              <span>
                <span className="block font-black">{titulo}</span>
                <span className="block text-sm text-tinta-suave">{detalle}</span>
              </span>
            </button>
          ))}
        </div>

        {modoEntrega === "delivery" ? (
          <label className="mt-4 block">
            <span className="text-sm font-bold">¿A dónde te lo llevamos?</span>
            <input
              type="text"
              autoComplete="street-address"
              placeholder="Calle y número, piso/depto"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
            />
          </label>
        ) : (
          <p className="mt-4 rounded-xl bg-marfil px-3 py-3 text-sm">📍 {direccionLocal}</p>
        )}

        <button
          onClick={guardarYCerrar}
          className="mt-4 min-h-13 w-full rounded-xl bg-fuego py-3.5 font-black text-white active:bg-fuego-oscuro"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
