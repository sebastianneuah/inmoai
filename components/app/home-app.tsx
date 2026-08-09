"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Catalogo, Producto } from "@/lib/tipos";
import type { Publicidad } from "@/lib/tienda/publicidades";
import { formatearPrecio } from "@/lib/precio";
import { CardProducto } from "@/components/app/card-producto";
import { HojaProducto } from "@/components/app/hoja-producto";
import { BarraPedido } from "@/components/app/barra-pedido";
import { BannerPublicidad, CarruselPublicidad } from "@/components/app/publicidad";
import { IconoBuscar } from "@/components/app/iconos";

/**
 * Pantalla de inicio de la app: hero de promociones, categorías, más pedidos
 * y el menú por secciones, con los espacios promocionales intercalados de
 * forma discreta (uno arriba y uno en el medio, nada de banners cada dos
 * productos).
 */
export function HomeApp({
  catalogo,
  hero,
  medio,
  entreCategorias,
}: {
  catalogo: Catalogo;
  hero: Publicidad[];
  medio?: Publicidad;
  entreCategorias?: Publicidad;
}) {
  const parametros = useSearchParams();
  const [categoriaActiva, setCategoriaActiva] = useState(catalogo.categorias[0]?.id);
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null);
  const refsSecciones = useRef<Record<string, HTMLElement | null>>({});
  const refsChips = useRef<Record<string, HTMLButtonElement | null>>({});
  const tocandoChip = useRef(false);

  const destacados = useMemo(
    () => catalogo.productos.filter((p) => p.destacado && !p.agotado).slice(0, 10),
    [catalogo.productos]
  );

  // La publicidad del medio se intercala después de la primera categoría
  const indiceCorte = Math.min(1, catalogo.categorias.length - 1);

  /**
   * Un banner puede apuntar a un producto o a una categoría. Se lee de la URL
   * (y no solo al montar) porque tocar un banner desde la propia home es una
   * navegación blanda: el componente no se vuelve a montar.
   */
  const idProducto = parametros.get("producto");
  const idCategoria = parametros.get("categoria");
  useEffect(() => {
    if (idProducto) {
      const producto = catalogo.productos.find((p) => p.id === idProducto);
      if (producto) setProductoAbierto(producto);
    } else if (idCategoria) {
      setTimeout(() => irACategoria(idCategoria), 300);
    }
    if (idProducto || idCategoria) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idProducto, idCategoria]);

  // Scrollspy: la categoría visible queda marcada en la barra de chips
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        if (tocandoChip.current) return;
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) {
          const id = visible.target.id.replace("categoria-", "");
          setCategoriaActiva(id);
          refsChips.current[id]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      },
      { rootMargin: "-160px 0px -70% 0px" }
    );
    Object.values(refsSecciones.current).forEach((el) => el && observador.observe(el));
    return () => observador.disconnect();
  }, [catalogo]);

  function irACategoria(id: string) {
    setCategoriaActiva(id);
    tocandoChip.current = true;
    refsSecciones.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (tocandoChip.current = false), 700);
  }

  return (
    <main className="mx-auto max-w-2xl">
      <CarruselPublicidad publicidades={hero} />

      {/* Buscador: lleva a la pantalla de búsqueda, no filtra acá */}
      <div className="px-4 pt-3">
        <Link
          href="/buscar"
          className="flex min-h-12 items-center gap-2.5 rounded-xl bg-white px-4 text-tinta-suave shadow-sm"
        >
          <IconoBuscar className="h-5 w-5" />
          Buscar en Abraham...
        </Link>
      </div>

      {/* Categorías como chips deslizables, siempre a mano */}
      <nav
        aria-label="Categorías"
        className="sticky top-[calc(env(safe-area-inset-top)+5.5rem)] z-20 mt-3 flex gap-2 overflow-x-auto bg-marfil px-4 py-2 sin-scrollbar"
      >
        {catalogo.categorias.map((categoria) => (
          <button
            key={categoria.id}
            ref={(el) => {
              refsChips.current[categoria.id] = el;
            }}
            onClick={() => irACategoria(categoria.id)}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors ${
              categoriaActiva === categoria.id
                ? "bg-tinta text-white"
                : "bg-white text-tinta-suave"
            }`}
          >
            {categoria.nombre}
          </button>
        ))}
      </nav>

      {destacados.length > 0 && (
        <section className="pt-4">
          <h2 className="px-4 pb-2.5 text-lg font-black">🔥 Más pedidos</h2>
          <ul className="flex gap-3 overflow-x-auto px-4 pb-1 sin-scrollbar">
            {destacados.map((producto) => (
              <li key={producto.id} className="w-36 shrink-0">
                <button
                  onClick={() => setProductoAbierto(producto)}
                  className="w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm"
                >
                  {producto.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={producto.imagen}
                      alt=""
                      loading="lazy"
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-24 w-full place-items-center bg-marfil text-2xl">🍣</span>
                  )}
                  <span className="block p-2.5">
                    <span className="line-clamp-2 block text-xs font-black uppercase leading-tight">
                      {producto.nombre}
                    </span>
                    <span className="mt-1 block text-sm font-black">
                      {formatearPrecio(producto.precio)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {catalogo.categorias.map((categoria, indice) => (
        <div key={categoria.id}>
          <section
            id={`categoria-${categoria.id}`}
            ref={(el) => {
              refsSecciones.current[categoria.id] = el;
            }}
            className="scroll-mt-40 px-4 pt-5"
          >
            <h2 className="pb-2.5 text-lg font-black">{categoria.nombre}</h2>
            <ul className="space-y-2.5">
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

          {/* Un solo espacio en el medio y otro entre secciones: nada invasivo */}
          {indice === indiceCorte && <BannerPublicidad publicidad={medio} slot="home_medio" compacto />}
          {indice === indiceCorte + 2 && (
            <BannerPublicidad publicidad={entreCategorias} slot="entre_categorias" compacto />
          )}
        </div>
      ))}

      {productoAbierto && (
        <HojaProducto producto={productoAbierto} onCerrar={() => setProductoAbierto(null)} />
      )}
      <BarraPedido />
    </main>
  );
}
