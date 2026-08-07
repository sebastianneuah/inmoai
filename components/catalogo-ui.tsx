"use client";

import { useEffect, useRef, useState } from "react";
import type { Catalogo, Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito } from "@/components/carrito";
import { ModalProducto } from "@/components/modal-producto";

/**
 * Catálogo estilo Fudo: pestañas de categorías con scroll horizontal
 * (sticky arriba) y lista de productos por categoría. Tocar un producto
 * abre el modal con cantidad y aclaraciones; el botón ＋ agrega directo.
 */
export function CatalogoUI({ catalogo }: { catalogo: Catalogo }) {
  const [categoriaActiva, setCategoriaActiva] = useState(catalogo.categorias[0]?.id);
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null);
  const refsSecciones = useRef<Record<string, HTMLElement | null>>({});
  const tocandoTab = useRef(false);

  // Scrollspy: resalta la pestaña de la categoría visible al scrollear
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        if (tocandoTab.current) return;
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) setCategoriaActiva(visible.target.id.replace("categoria-", ""));
      },
      { rootMargin: "-120px 0px -70% 0px" }
    );
    Object.values(refsSecciones.current).forEach((el) => el && observador.observe(el));
    return () => observador.disconnect();
  }, [catalogo]);

  function irACategoria(id: string) {
    setCategoriaActiva(id);
    tocandoTab.current = true;
    refsSecciones.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (tocandoTab.current = false), 700);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <nav
        aria-label="Categorías"
        className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 sin-scrollbar"
      >
        {catalogo.categorias.map((categoria) => (
          <button
            key={categoria.id}
            onClick={() => irACategoria(categoria.id)}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors ${
              categoriaActiva === categoria.id
                ? "bg-tinta text-white"
                : "bg-marfil text-tinta-suave active:bg-gray-200"
            }`}
          >
            {categoria.nombre}
          </button>
        ))}
      </nav>

      {catalogo.categorias.map((categoria) => (
        <section
          key={categoria.id}
          id={`categoria-${categoria.id}`}
          ref={(el) => {
            refsSecciones.current[categoria.id] = el;
          }}
          className="scroll-mt-16 px-4 pb-2 pt-5"
        >
          <h2 className="pb-2 text-lg font-black">{categoria.nombre}</h2>
          <ul className="divide-y divide-gray-100">
            {catalogo.productos
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
    <li className="flex items-stretch gap-3 py-3">
      <button
        onClick={onAbrir}
        disabled={producto.agotado}
        className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:opacity-50"
        aria-label={`Ver ${producto.nombre}`}
      >
        {producto.imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={producto.imagen}
            alt=""
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        )}
        <span className="min-w-0">
          <span className="block font-bold leading-snug">{producto.nombre}</span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-tinta-suave">
            {producto.descripcion}
          </span>
          <span className="mt-1 block font-black text-fuego">
            {formatearPrecio(producto.precio)}
          </span>
        </span>
      </button>

      {producto.agotado ? (
        <span className="self-center rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
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
          className="h-12 w-12 shrink-0 self-center rounded-xl bg-fuego text-2xl font-black text-white active:bg-fuego-oscuro"
        >
          ＋
        </button>
      )}
    </li>
  );
}
