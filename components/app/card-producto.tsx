"use client";

import { useState } from "react";
import type { Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito } from "@/components/carrito";
import { useFavoritos } from "@/lib/favoritos";
import { IconoCorazon } from "@/components/app/iconos";
import { registrarEvento } from "@/lib/analytics";

/** Los nombres del menú vienen en mayúsculas: se normalizan visualmente. */
export function enOracion(texto: string): string {
  if (!texto) return "";
  const minusculas = texto.toLocaleLowerCase("es-AR");
  return minusculas.charAt(0).toLocaleUpperCase("es-AR") + minusculas.slice(1);
}

export const BADGES: Record<string, { texto: string; clase: string }> = {
  popular: { texto: "Más pedido", clase: "bg-fuego text-white" },
  vegetariano: { texto: "Vegetariano", clase: "bg-green-100 text-green-800" },
  "sin-queso": { texto: "Sin queso", clase: "bg-amber-100 text-amber-800" },
  picante: { texto: "Picante", clase: "bg-orange-100 text-orange-800" },
  crudo: { texto: "Crudo", clase: "bg-blue-100 text-blue-800" },
  panizado: { texto: "Panizado", clase: "bg-yellow-100 text-yellow-900" },
  "solo-mediodia": { texto: "Solo mediodía", clase: "bg-sky-100 text-sky-800" },
  promo: { texto: "Promo", clase: "bg-fuego-claro text-fuego" },
};

/**
 * Card de producto estilo app: foto a la derecha con proporción constante,
 * nombre, dos líneas de descripción, precio y botón circular de agregar.
 */
export function CardProducto({
  producto,
  onAbrir,
}: {
  producto: Producto;
  onAbrir: () => void;
}) {
  const { agregar } = useCarrito();
  const { esFavorito, alternar } = useFavoritos();
  const [agregado, setAgregado] = useState(false);
  // Con modificadores obligatorios el ＋ tiene que abrir el detalle
  const requiereEleccion = producto.grupos.some((g) => g.minimo > 0);

  function agregarDirecto(e: React.MouseEvent) {
    e.stopPropagation();
    if (requiereEleccion) {
      onAbrir();
      return;
    }
    agregar({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
    });
    registrarEvento("add_to_cart", {
      id: producto.id,
      nombre: producto.nombre,
      cantidad: 1,
      valor: producto.precio,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 900);
  }

  const badges = producto.etiquetas.map((e) => BADGES[e]).filter(Boolean);
  const favorito = esFavorito(producto.id);

  return (
    <li className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
      <button
        onClick={onAbrir}
        disabled={producto.agotado}
        className="flex w-full items-stretch text-left"
        aria-label={`Ver ${producto.nombre}`}
      >
        <span className="min-w-0 flex-1 p-3.5">
          {badges.length > 0 && (
            <span className="mb-1.5 flex flex-wrap gap-1">
              {badges.map((b) => (
                <span
                  key={b.texto}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${b.clase}`}
                >
                  {b.texto}
                </span>
              ))}
            </span>
          )}
          <span className="block font-black uppercase leading-snug">{producto.nombre}</span>
          {producto.descripcion && (
            <span className="mt-1 line-clamp-2 text-sm leading-snug text-tinta-suave">
              {enOracion(producto.descripcion)}
            </span>
          )}
          <span className="mt-2 block text-lg font-black">
            {formatearPrecio(producto.precio)}
          </span>
        </span>

        {producto.imagen && (
          <span className="relative w-28 shrink-0 self-stretch sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={producto.imagen}
              alt=""
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover ${
                producto.agotado ? "grayscale" : ""
              }`}
            />
          </span>
        )}
      </button>

      {/* El corazón va sobre la foto para no pisar el nombre del producto */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          alternar(producto.id);
        }}
        aria-label={
          favorito
            ? `Quitar ${producto.nombre} de favoritos`
            : `Guardar ${producto.nombre} en favoritos`
        }
        aria-pressed={favorito}
        className={`absolute top-2 grid h-9 w-9 place-items-center rounded-full transition-colors ${
          producto.imagen ? "right-2 bg-white/85 shadow-sm" : "right-2"
        } ${favorito ? "text-fuego" : "text-gray-400"}`}
      >
        <IconoCorazon relleno={favorito} />
      </button>

      {producto.agotado ? (
        <>
          <span className="absolute inset-0 bg-white/55" aria-hidden />
          <span className="absolute bottom-3 right-3 rounded-full bg-tinta px-3 py-1.5 text-xs font-black text-white">
            Agotado por hoy
          </span>
        </>
      ) : (
        <button
          onClick={agregarDirecto}
          aria-label={`Agregar ${producto.nombre} al carrito`}
          className={`absolute bottom-2.5 right-2.5 grid h-10 w-10 place-items-center rounded-full text-xl font-black text-white shadow-lg transition-transform active:scale-90 ${
            agregado ? "scale-110 bg-green-600" : "bg-fuego"
          }`}
        >
          {agregado ? "✓" : "＋"}
        </button>
      )}
    </li>
  );
}
