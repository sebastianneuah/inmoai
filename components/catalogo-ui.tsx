"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalogo, Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito } from "@/components/carrito";
import { ModalProducto } from "@/components/modal-producto";

/**
 * Catálogo calcado del menú de Fudo del local: fondo rojo, buscador arriba,
 * pestañas de categorías con scroll horizontal (sticky) y cards blancas con
 * la foto grande a la derecha. Tocar la card abre el modal con cantidad y
 * aclaraciones; el botón ＋ sobre la foto agrega directo.
 */
export function CatalogoUI({ catalogo }: { catalogo: Catalogo }) {
  const [categoriaActiva, setCategoriaActiva] = useState(catalogo.categorias[0]?.id);
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const refsSecciones = useRef<Record<string, HTMLElement | null>>({});
  const tocandoTab = useRef(false);

  const filtrando = busqueda.trim().length > 0;
  const visible = useMemo(() => {
    if (!filtrando) return catalogo;
    const texto = busqueda.trim().toLowerCase();
    const productos = catalogo.productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) ||
        p.descripcion.toLowerCase().includes(texto)
    );
    const categorias = catalogo.categorias.filter((c) =>
      productos.some((p) => p.categoriaId === c.id)
    );
    return { categorias, productos };
  }, [catalogo, busqueda, filtrando]);

  // Scrollspy: resalta la pestaña de la categoría visible al scrollear
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        if (tocandoTab.current) return;
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) setCategoriaActiva(visible.target.id.replace("categoria-", ""));
      },
      { rootMargin: "-140px 0px -70% 0px" }
    );
    Object.values(refsSecciones.current).forEach((el) => el && observador.observe(el));
    return () => observador.disconnect();
  }, [visible]);

  function irACategoria(id: string) {
    setCategoriaActiva(id);
    tocandoTab.current = true;
    refsSecciones.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (tocandoTab.current = false), 700);
  }

  return (
    <div className="bg-fuego pb-6">
      <div className="mx-auto max-w-2xl">
        <div className="px-4 pt-4">
          <label className="relative block">
            <span className="sr-only">Buscar por productos</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por productos"
              className="min-h-12 w-full rounded-xl border-0 bg-white pl-11 pr-4 text-base shadow-sm"
            />
          </label>
        </div>

        {!filtrando && (
          <nav
            aria-label="Categorías"
            className="sticky top-0 z-10 flex gap-1 overflow-x-auto bg-fuego px-4 py-3 sin-scrollbar"
          >
            {visible.categorias.map((categoria) => (
              <button
                key={categoria.id}
                onClick={() => irACategoria(categoria.id)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-black uppercase tracking-wide transition-colors ${
                  categoriaActiva === categoria.id
                    ? "bg-tinta text-white"
                    : "text-white/90 active:bg-white/10"
                }`}
              >
                {categoria.nombre}
              </button>
            ))}
          </nav>
        )}

        {visible.categorias.length === 0 && (
          <p className="px-4 py-10 text-center font-bold text-white">
            No encontramos productos con “{busqueda.trim()}”.
          </p>
        )}

        {visible.categorias.map((categoria) => (
          <section
            key={categoria.id}
            id={`categoria-${categoria.id}`}
            ref={(el) => {
              refsSecciones.current[categoria.id] = el;
            }}
            className="scroll-mt-20 px-4 pt-4"
          >
            <h2 className="pb-3 text-xl font-black uppercase tracking-wide text-white">
              {categoria.nombre}
            </h2>
            <ul className="space-y-3">
              {visible.productos
                .filter((p) => p.categoriaId === categoria.id)
                .map((producto) => (
                  <CardProducto
                    key={producto.id}
                    producto={producto}
                    onAbrir={() => setProductoAbierto(producto)}
                  />
                ))}
            </ul>
          </section>
        ))}
      </div>

      {productoAbierto && (
        <ModalProducto
          producto={productoAbierto}
          onCerrar={() => setProductoAbierto(null)}
        />
      )}
    </div>
  );
}

function CardProducto({
  producto,
  onAbrir,
}: {
  producto: Producto;
  onAbrir: () => void;
}) {
  const { agregar } = useCarrito();

  return (
    <li className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
      <button
        onClick={onAbrir}
        disabled={producto.agotado}
        className="flex w-full items-stretch text-left disabled:opacity-60"
        aria-label={`Ver ${producto.nombre}`}
      >
        <span className="min-w-0 flex-1 p-4">
          <span className="block font-black uppercase leading-snug">
            {producto.nombre}
          </span>
          {producto.descripcion && (
            <span className="mt-1 line-clamp-2 text-sm text-tinta-suave">
              {producto.descripcion}
            </span>
          )}
          <span className="mt-2 block text-lg font-black">
            {formatearPrecio(producto.precio)}
          </span>
        </span>
        {producto.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={producto.imagen}
            alt=""
            loading="lazy"
            className="w-32 shrink-0 self-stretch object-cover sm:w-40"
          />
        )}
      </button>

      {producto.agotado ? (
        <span className="absolute bottom-3 right-3 rounded-full bg-tinta/80 px-3 py-1 text-xs font-bold text-white">
          Agotado
        </span>
      ) : (
        <button
          onClick={() =>
            agregar({
              productoId: producto.id,
              nombre: producto.nombre,
              precio: producto.precio,
            })
          }
          aria-label={`Agregar ${producto.nombre} al carrito`}
          className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-fuego text-xl font-black text-white shadow-md active:bg-fuego-oscuro"
        >
          ＋
        </button>
      )}
    </li>
  );
}
