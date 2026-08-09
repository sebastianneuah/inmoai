"use client";

import { useState } from "react";
import type { Acompanamiento } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito } from "@/components/carrito";
import { registrarEvento } from "@/lib/analytics";

/**
 * Paso "¿Con qué acompañamos tu pedido?": aparece UNA SOLA VEZ, al avanzar
 * desde el carrito hacia los datos — nunca cada vez que se agrega un producto.
 * Las elecciones quedan guardadas en el carrito, así volver atrás a editar la
 * comida no las borra.
 */
export function PasoAcompanamientos({
  acompanamientos,
  onContinuar,
  onVolver,
}: {
  acompanamientos: Acompanamiento[];
  onContinuar: () => void;
  onVolver: () => void;
}) {
  const carrito = useCarrito();
  const [sinNada, setSinNada] = useState(false);

  const salsas = acompanamientos.filter((a) => a.tipo !== "palitos");
  const palitos = acompanamientos.find((a) => a.tipo === "palitos");
  const maximoPalitos = palitos?.maximo ?? 6;
  const opcionesPalitos = Array.from({ length: Math.min(maximoPalitos, 6) + 1 }, (_, i) => i);

  const extra =
    salsas.reduce(
      (suma, a) => suma + (carrito.acompanamientos.cantidades[a.id] ?? 0) * a.precio,
      0
    ) + (palitos ? (carrito.acompanamientos.palitos ?? 0) * palitos.precio : 0);

  function noNecesitoNada() {
    for (const a of salsas) carrito.setAcompanamiento(a.id, 0);
    carrito.setPalitos(0);
    setSinNada(true);
    registrarEvento("select_sauces", { salsas: 0, palitos: 0 });
    onContinuar();
  }

  function continuar() {
    // Si no tocó los palitos, asumimos 0 explícito (no desperdiciar)
    if (carrito.acompanamientos.palitos === null) carrito.setPalitos(0);
    registrarEvento("select_sauces", {
      salsas: Object.values(carrito.acompanamientos.cantidades).reduce((s, n) => s + n, 0),
      palitos: carrito.acompanamientos.palitos ?? 0,
    });
    onContinuar();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-44 pt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onVolver}
          aria-label="Volver al pedido"
          className="grid h-11 w-11 place-items-center rounded-full bg-marfil text-lg"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-black">¿Con qué acompañamos tu pedido?</h1>
          <p className="text-sm text-tinta-suave">Elegí solo lo que vayas a usar.</p>
        </div>
      </div>

      {salsas.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-tinta-suave">
            Elegí tus salsas
          </h2>
          <ul className="mt-2 space-y-2">
            {salsas.map((a) => {
              const cantidad = carrito.acompanamientos.cantidades[a.id] ?? 0;
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-3 transition-colors ${
                    cantidad > 0 ? "border-fuego" : "border-transparent"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-black uppercase leading-tight">{a.nombre}</p>
                    <p className="text-xs text-tinta-suave">
                      {a.precio === 0 ? "Sin cargo" : formatearPrecio(a.precio)} · máx {a.maximo}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center rounded-xl border border-gray-300">
                    <button
                      onClick={() => {
                        setSinNada(false);
                        carrito.setAcompanamiento(a.id, cantidad - 1);
                      }}
                      disabled={cantidad === 0}
                      aria-label={`Restar ${a.nombre}`}
                      className="h-11 w-11 text-lg font-black disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-black" aria-live="polite">
                      {cantidad}
                    </span>
                    <button
                      onClick={() => {
                        setSinNada(false);
                        carrito.setAcompanamiento(a.id, cantidad + 1);
                      }}
                      disabled={cantidad >= a.maximo}
                      aria-label={`Sumar ${a.nombre}`}
                      className="h-11 w-11 text-lg font-black disabled:opacity-30"
                    >
                      ＋
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {palitos && (
        <section className="mt-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-tinta-suave">
            ¿Cuántos pares de palitos necesitás?
          </h2>
          {palitos.precio > 0 && (
            <p className="mt-1 text-xs text-tinta-suave">
              {formatearPrecio(palitos.precio)} por par
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {opcionesPalitos.map((n) => (
              <button
                key={n}
                onClick={() => {
                  setSinNada(false);
                  carrito.setPalitos(n);
                }}
                className={`min-h-12 min-w-12 rounded-xl border-2 px-4 font-black ${
                  carrito.acompanamientos.palitos === n
                    ? "border-fuego bg-fuego-claro text-fuego"
                    : "border-gray-200 bg-white text-tinta-suave"
                }`}
              >
                {n === 0 ? "No necesito" : n}
              </button>
            ))}
            {maximoPalitos > 6 && (
              <button
                onClick={() => {
                  setSinNada(false);
                  carrito.setPalitos(maximoPalitos);
                }}
                className={`min-h-12 rounded-xl border-2 px-4 font-black ${
                  (carrito.acompanamientos.palitos ?? 0) > 6
                    ? "border-fuego bg-fuego-claro text-fuego"
                    : "border-gray-200 bg-white text-tinta-suave"
                }`}
              >
                {maximoPalitos}+
              </button>
            )}
          </div>
        </section>
      )}

      <button
        onClick={noNecesitoNada}
        className={`mt-6 min-h-12 w-full rounded-xl border-2 font-bold ${
          sinNada ? "border-fuego bg-fuego-claro text-fuego" : "border-gray-200 text-tinta-suave"
        }`}
      >
        No necesito salsas ni palitos
      </button>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-gray-200 bg-white p-3">
        <div className="mx-auto max-w-2xl">
          {extra > 0 && (
            <p className="mb-1 flex justify-between text-sm text-tinta-suave">
              <span>Acompañamientos</span>
              <span>+{formatearPrecio(extra)}</span>
            </p>
          )}
          <button
            onClick={continuar}
            className="min-h-14 w-full rounded-xl bg-fuego font-black text-white active:bg-fuego-oscuro"
          >
            Continuar con mi pedido
          </button>
        </div>
      </div>
    </main>
  );
}
