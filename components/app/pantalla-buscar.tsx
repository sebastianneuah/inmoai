"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalogo, Producto } from "@/lib/tipos";
import { CardProducto } from "@/components/app/card-producto";
import { HojaProducto } from "@/components/app/hoja-producto";
import { BarraPedido } from "@/components/app/barra-pedido";
import { IconoBuscar } from "@/components/app/iconos";
import { useFavoritos } from "@/lib/favoritos";
import { registrarEvento } from "@/lib/analytics";

/** Búsquedas rápidas: lo que la gente realmente pide en un sushi kosher. */
const SUGERENCIAS = [
  "Salmón",
  "Panizado",
  "Sin queso",
  "Vegetariano",
  "Nigiri",
  "Hot",
  "Combo",
  "Bagel",
];

/** Quita tildes para que "salmon" encuentre "salmón". */
function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function PantallaBuscar({ catalogo }: { catalogo: Catalogo }) {
  const [texto, setTexto] = useState("");
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const { favoritos } = useFavoritos();

  useEffect(() => {
    entrada.current?.focus();
  }, []);

  const buscando = texto.trim().length > 0;

  const resultados = useMemo(() => {
    if (!buscando) return [];
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
    return catalogo.productos.filter((p) => {
      const donde = normalizar(
        `${p.nombre} ${p.descripcion} ${p.descripcionLarga} ${p.etiquetas.join(" ")}`
      );
      return palabras.every((palabra) => donde.includes(palabra));
    });
  }, [catalogo.productos, texto, buscando]);

  useEffect(() => {
    if (!buscando) return;
    const t = setTimeout(
      () => registrarEvento("search", { texto: texto.trim(), resultados: resultados.length }),
      800
    );
    return () => clearTimeout(t);
  }, [texto, buscando, resultados.length]);

  const guardados = catalogo.productos.filter((p) => favoritos.includes(p.id));

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4">
      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <IconoBuscar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-suave" />
        <input
          ref={entrada}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué tenés ganas de comer?"
          className="min-h-13 w-full rounded-xl border-0 bg-white py-3.5 pl-11 pr-11 text-base shadow-sm"
        />
        {buscando && (
          <button
            onClick={() => {
              setTexto("");
              entrada.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-lg text-tinta-suave"
          >
            ✕
          </button>
        )}
      </label>

      {!buscando ? (
        <>
          <h2 className="mt-6 text-sm font-black uppercase tracking-wide text-tinta-suave">
            Búsquedas frecuentes
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGERENCIAS.map((sugerencia) => (
              <button
                key={sugerencia}
                onClick={() => setTexto(sugerencia)}
                className="min-h-11 rounded-full bg-white px-4 text-sm font-bold shadow-sm"
              >
                {sugerencia}
              </button>
            ))}
          </div>

          {guardados.length > 0 && (
            <>
              <h2 className="mt-7 text-sm font-black uppercase tracking-wide text-tinta-suave">
                ♡ Tus favoritos
              </h2>
              <ul className="mt-2 space-y-2.5">
                {guardados.map((producto) => (
                  <CardProducto
                    key={producto.id}
                    producto={producto}
                    onAbrir={() => setProductoAbierto(producto)}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      ) : resultados.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl" aria-hidden>
            🔍
          </p>
          <p className="mt-3 font-bold">No encontramos “{texto.trim()}”</p>
          <p className="mt-1 text-sm text-tinta-suave">
            Probá con otro nombre o mirá las sugerencias.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm font-bold text-tinta-suave">
            {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
          </p>
          <ul className="mt-2 space-y-2.5">
            {resultados.map((producto) => (
              <CardProducto
                key={producto.id}
                producto={producto}
                onAbrir={() => setProductoAbierto(producto)}
              />
            ))}
          </ul>
        </>
      )}

      {productoAbierto && (
        <HojaProducto producto={productoAbierto} onCerrar={() => setProductoAbierto(null)} />
      )}
      <BarraPedido />
    </main>
  );
}
