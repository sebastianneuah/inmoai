"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Catalogo, Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito } from "@/components/carrito";
import { ModalProducto } from "@/components/modal-producto";
import { registrarEvento } from "@/lib/analytics";

/**
 * Catálogo con la estructura del menú de Fudo del local: buscador arriba,
 * pestañas de categorías con scroll horizontal (sticky) y cards con la foto
 * a la derecha. Tocar la card abre el detalle; el botón ＋ agrega directo
 * (salvo que el producto tenga modificadores obligatorios).
 */

const BADGES: Record<string, { texto: string; clase: string }> = {
  popular: { texto: "Más pedido", clase: "bg-fuego text-white" },
  vegetariano: { texto: "Vegetariano", clase: "bg-green-100 text-green-800" },
  "sin-queso": { texto: "Sin queso", clase: "bg-amber-100 text-amber-800" },
  picante: { texto: "Picante", clase: "bg-orange-100 text-orange-800" },
  crudo: { texto: "Crudo", clase: "bg-blue-100 text-blue-800" },
  panizado: { texto: "Panizado", clase: "bg-yellow-100 text-yellow-900" },
  "solo-mediodia": { texto: "Solo mediodía", clase: "bg-sky-100 text-sky-800" },
  promo: { texto: "Promo", clase: "bg-fuego-claro text-fuego" },
};

/** Los nombres del menú vienen TODO EN MAYÚSCULAS: se normalizan visualmente */
function enOracion(texto: string): string {
  if (!texto) return "";
  const minusculas = texto.toLocaleLowerCase("es-AR");
  return minusculas.charAt(0).toLocaleUpperCase("es-AR") + minusculas.slice(1);
}

export function CatalogoUI({ catalogo }: { catalogo: Catalogo }) {
  const [categoriaActiva, setCategoriaActiva] = useState(catalogo.categorias[0]?.id);
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const refsSecciones = useRef<Record<string, HTMLElement | null>>({});
  const refsTabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tocandoTab = useRef(false);

  const filtrando = busqueda.trim().length > 0;
  const destacados = useMemo(
    () => catalogo.productos.filter((p) => p.destacado && !p.agotado).slice(0, 8),
    [catalogo.productos]
  );

  const visible = useMemo(() => {
    if (!filtrando) return catalogo;
    const texto = busqueda.trim().toLocaleLowerCase("es-AR");
    const palabras = texto.split(/\s+/);
    const productos = catalogo.productos.filter((p) => {
      const donde = `${p.nombre} ${p.descripcion} ${p.descripcionLarga} ${p.etiquetas.join(" ")}`
        .toLocaleLowerCase("es-AR")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      return palabras.every((palabra) =>
        donde.includes(palabra.normalize("NFD").replace(/[̀-ͯ]/g, ""))
      );
    });
    const categorias = catalogo.categorias.filter((c) =>
      productos.some((p) => p.categoriaId === c.id)
    );
    return { categorias, productos };
  }, [catalogo, busqueda, filtrando]);

  // Registrar búsquedas (con debounce) para el embudo
  useEffect(() => {
    if (!filtrando) return;
    const t = setTimeout(
      () => registrarEvento("search", { texto: busqueda.trim(), resultados: visible.productos.length }),
      800
    );
    return () => clearTimeout(t);
  }, [busqueda, filtrando, visible.productos.length]);

  // Scrollspy: resalta la pestaña de la categoría visible al scrollear
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        if (tocandoTab.current) return;
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) {
          const id = visible.target.id.replace("categoria-", "");
          setCategoriaActiva(id);
          // Mantener la pestaña activa a la vista dentro de la barra
          refsTabs.current[id]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
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
          <div className="relative">
            <span
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg"
              aria-hidden
            >
              🔍
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className="min-h-12 w-full rounded-xl border-0 bg-white pl-11 pr-11 text-base shadow-sm"
            />
            {filtrando && (
              <button
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-lg text-tinta-suave"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {!filtrando && (
          <nav
            aria-label="Categorías"
            className="sticky top-0 z-10 flex gap-1 overflow-x-auto bg-fuego px-4 py-3 sin-scrollbar"
          >
            {visible.categorias.map((categoria) => (
              <button
                key={categoria.id}
                ref={(el) => {
                  refsTabs.current[categoria.id] = el;
                }}
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

        {/* Los más pedidos: solo sin búsqueda activa y si el admin marcó destacados */}
        {!filtrando && destacados.length > 0 && (
          <section className="px-4 pt-4">
            <h2 className="pb-3 text-xl font-black uppercase tracking-wide text-white">
              ⭐ Los más pedidos
            </h2>
            <ul className="flex gap-3 overflow-x-auto pb-2 sin-scrollbar">
              {destacados.map((producto) => (
                <li key={producto.id} className="w-40 shrink-0">
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
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-28 w-full place-items-center bg-marfil text-3xl">
                        🍣
                      </span>
                    )}
                    <span className="block p-3">
                      <span className="line-clamp-2 block text-sm font-black uppercase leading-tight">
                        {producto.nombre}
                      </span>
                      <span className="mt-1 block font-black">
                        {formatearPrecio(producto.precio)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
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
            className="scroll-mt-20 px-4 pt-5"
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
  const [agregado, setAgregado] = useState(false);
  // Con modificadores obligatorios el ＋ tiene que abrir el detalle
  const requiereEleccion = producto.grupos.some((g) => g.minimo > 0);

  function agregarDirecto() {
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

  return (
    <li className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
      <button
        onClick={onAbrir}
        disabled={producto.agotado}
        className="flex w-full items-stretch text-left"
        aria-label={`Ver ${producto.nombre}`}
      >
        <span className="min-w-0 flex-1 p-4">
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
            <span className="mt-1 line-clamp-2 text-sm text-tinta-suave first-letter:uppercase">
              {enOracion(producto.descripcion)}
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
            className={`w-32 shrink-0 self-stretch object-cover sm:w-40 ${
              producto.agotado ? "grayscale" : ""
            }`}
          />
        )}
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
          className={`absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full text-xl font-black text-white shadow-md transition-transform active:scale-90 ${
            agregado ? "scale-110 bg-green-600" : "bg-fuego"
          }`}
        >
          {agregado ? "✓" : "＋"}
        </button>
      )}
    </li>
  );
}
