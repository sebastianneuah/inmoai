"use client";

import { useEffect, useMemo, useState } from "react";
import type { Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito, type ModificadorElegido } from "@/components/carrito";
import { registrarEvento } from "@/lib/analytics";

/**
 * Detalle de producto: bottom sheet en mobile, modal centrado en desktop.
 * Muestra foto grande, descripción completa, grupos de modificadores con
 * total dinámico, cantidad y aclaración.
 */
export function ModalProducto({
  producto,
  onCerrar,
}: {
  producto: Producto;
  onCerrar: () => void;
}) {
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [aclaracion, setAclaracion] = useState("");
  /** grupoId → opcionIds elegidos */
  const [elegidas, setElegidas] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    registrarEvento("view_product", { id: producto.id, nombre: producto.nombre });
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [onCerrar, producto.id, producto.nombre]);

  const extras = useMemo(() => {
    let suma = 0;
    for (const grupo of producto.grupos) {
      for (const opcionId of elegidas[grupo.id] ?? []) {
        suma += grupo.opciones.find((o) => o.id === opcionId)?.precioExtra ?? 0;
      }
    }
    return suma;
  }, [elegidas, producto.grupos]);

  const precioUnitario = producto.precio + extras;

  function alternarOpcion(grupoId: string, opcionId: string, maximo: number) {
    setError("");
    setElegidas((previo) => {
      const actuales = previo[grupoId] ?? [];
      if (actuales.includes(opcionId)) {
        return { ...previo, [grupoId]: actuales.filter((x) => x !== opcionId) };
      }
      // Grupo de selección única: reemplaza; múltiple: agrega hasta el máximo
      if (maximo <= 1) return { ...previo, [grupoId]: [opcionId] };
      if (actuales.length >= maximo) return previo;
      return { ...previo, [grupoId]: [...actuales, opcionId] };
    });
  }

  function confirmar() {
    // Validar mínimos obligatorios antes de agregar
    for (const grupo of producto.grupos) {
      const elegidasGrupo = elegidas[grupo.id] ?? [];
      if (elegidasGrupo.length < grupo.minimo) {
        setError(
          `Elegí ${grupo.minimo === 1 ? "una opción" : `${grupo.minimo} opciones`} en "${grupo.nombre}".`
        );
        return;
      }
    }

    const modificadores: ModificadorElegido[] = producto.grupos
      .filter((g) => (elegidas[g.id] ?? []).length > 0)
      .map((g) => {
        const opciones = g.opciones.filter((o) => elegidas[g.id].includes(o.id));
        return {
          grupoId: g.id,
          opcionIds: opciones.map((o) => o.id),
          etiqueta: opciones.map((o) => o.nombre).join(", "),
          precioExtra: opciones.reduce((s, o) => s + o.precioExtra, 0),
        };
      });

    agregar(
      {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: precioUnitario,
        aclaracion: aclaracion.trim() || undefined,
        modificadores,
      },
      cantidad
    );
    registrarEvento("add_to_cart", {
      id: producto.id,
      nombre: producto.nombre,
      cantidad,
      valor: precioUnitario * cantidad,
    });
    onCerrar();
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={producto.nombre}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg animate-[subir_.22s_ease-out] overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {producto.imagen && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={producto.imagen}
              alt=""
              className="h-52 w-full rounded-t-3xl object-cover sm:rounded-t-3xl"
            />
            <button
              onClick={onCerrar}
              aria-label="Cerrar"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-lg shadow-md"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-black uppercase leading-tight">{producto.nombre}</h3>
            {!producto.imagen && (
              <button
                onClick={onCerrar}
                aria-label="Cerrar"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marfil text-lg"
              >
                ✕
              </button>
            )}
          </div>

          {producto.descripcionLarga && (
            <p className="mt-2 text-sm leading-relaxed text-tinta-suave first-letter:uppercase">
              {producto.descripcionLarga.toLowerCase()}
            </p>
          )}
          <p className="mt-3 text-lg font-black">{formatearPrecio(producto.precio)}</p>

          {/* Grupos de modificadores */}
          {producto.grupos.map((grupo) => (
            <fieldset key={grupo.id} className="mt-5">
              <legend className="text-sm font-black uppercase">
                {grupo.nombre}
                <span className="ml-2 font-bold normal-case text-tinta-suave">
                  {grupo.minimo > 0
                    ? `· obligatorio (elegí ${grupo.minimo})`
                    : grupo.maximo > 1
                      ? `· hasta ${grupo.maximo}`
                      : "· opcional"}
                </span>
              </legend>
              <div className="mt-2 space-y-1.5">
                {grupo.opciones.map((opcion) => {
                  const activa = (elegidas[grupo.id] ?? []).includes(opcion.id);
                  return (
                    <button
                      key={opcion.id}
                      onClick={() => alternarOpcion(grupo.id, opcion.id, grupo.maximo)}
                      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border-2 px-3 text-left text-sm font-bold transition-colors ${
                        activa
                          ? "border-fuego bg-fuego-claro text-fuego"
                          : "border-gray-200 text-tinta-suave"
                      }`}
                    >
                      <span className="min-w-0 flex-1">{opcion.nombre}</span>
                      {opcion.precioExtra > 0 && (
                        <span className="shrink-0">+{formatearPrecio(opcion.precioExtra)}</span>
                      )}
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-xs ${
                          activa ? "border-fuego bg-fuego text-white" : "border-gray-300"
                        }`}
                        aria-hidden
                      >
                        {activa ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <label className="mt-5 block">
            <span className="text-sm font-bold">Aclaración (opcional)</span>
            <input
              type="text"
              value={aclaracion}
              onChange={(e) => setAclaracion(e.target.value)}
              placeholder='Ej.: "sin verdeo", "bien frío"'
              maxLength={200}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
            />
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-fuego-claro px-3 py-2 text-sm font-bold text-fuego">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-gray-300">
              <button
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                aria-label="Restar uno"
                className="h-12 w-12 text-xl font-black"
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-black" aria-live="polite">
                {cantidad}
              </span>
              <button
                onClick={() => setCantidad((c) => Math.min(99, c + 1))}
                aria-label="Sumar uno"
                className="h-12 w-12 text-xl font-black"
              >
                ＋
              </button>
            </div>
            <button
              onClick={confirmar}
              className="min-h-12 flex-1 rounded-xl bg-fuego px-4 font-black text-white active:bg-fuego-oscuro"
            >
              Agregar · {formatearPrecio(precioUnitario * cantidad)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
