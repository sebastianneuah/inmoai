"use client";

import { useEffect, useState } from "react";
import type { Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito } from "@/components/carrito";

/**
 * Modal simple de producto: descripción completa, selector de cantidad y
 * aclaración ("sin verdeo", elección de gusto en bebidas, etc.).
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

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  function confirmar() {
    agregar(
      {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        aclaracion: aclaracion.trim() || undefined,
      },
      cantidad
    );
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
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-black leading-tight">{producto.nombre}</h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marfil text-lg"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">{producto.descripcion}</p>
        <p className="mt-2 text-lg font-black text-fuego">
          {formatearPrecio(producto.precio)}
        </p>

        <label className="mt-4 block">
          <span className="text-sm font-bold">Aclaración (opcional)</span>
          <input
            type="text"
            value={aclaracion}
            onChange={(e) => setAclaracion(e.target.value)}
            placeholder='Ej.: "sin verdeo", "Sprite"'
            maxLength={200}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
          />
        </label>

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
            Agregar {formatearPrecio(producto.precio * cantidad)}
          </button>
        </div>
      </div>
    </div>
  );
}
