"use client";

import { useEffect, useMemo, useState } from "react";
import type { Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { useCarrito, type ModificadorElegido } from "@/components/carrito";
import { useFavoritos } from "@/lib/favoritos";
import { IconoCorazon } from "@/components/app/iconos";
import { enOracion } from "@/components/app/card-producto";
import { registrarEvento } from "@/lib/analytics";

/**
 * Detalle de producto como bottom sheet de app: ocupa casi toda la pantalla,
 * la foto arriba, los modificadores en el medio y el botón de agregar fijo
 * abajo con el total siempre actualizado.
 */
export function HojaProducto({
  producto,
  onCerrar,
}: {
  producto: Producto;
  onCerrar: () => void;
}) {
  const { agregar } = useCarrito();
  const { esFavorito, alternar } = useFavoritos();
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
  const favorito = esFavorito(producto.id);

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={producto.nombre}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg animate-[subir_.24s_ease-out] flex-col overflow-hidden rounded-t-3xl bg-white sm:max-h-[88vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative">
            {producto.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={producto.imagen} alt="" className="h-56 w-full object-cover" />
            ) : (
              <div className="grid h-32 w-full place-items-center bg-marfil text-4xl">🍣</div>
            )}
            <button
              onClick={onCerrar}
              aria-label="Cerrar"
              className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-lg shadow-md"
            >
              ✕
            </button>
            <button
              onClick={() => alternar(producto.id)}
              aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
              aria-pressed={favorito}
              className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-md ${
                favorito ? "text-fuego" : "text-tinta-suave"
              }`}
            >
              <IconoCorazon relleno={favorito} />
            </button>
          </div>

          <div className="p-5">
            <h3 className="text-xl font-black uppercase leading-tight">{producto.nombre}</h3>
            {producto.descripcionLarga && (
              <p className="mt-2 text-sm leading-relaxed text-tinta-suave">
                {enOracion(producto.descripcionLarga)}
              </p>
            )}
            <p className="mt-3 text-lg font-black">{formatearPrecio(producto.precio)}</p>

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
              <p
                role="alert"
                className="mt-3 rounded-lg bg-fuego-claro px-3 py-2 text-sm font-bold text-fuego"
              >
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Botón fijo abajo: el total se ve siempre, sin scrollear */}
        <div className="flex items-center gap-3 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center rounded-xl border border-gray-300">
            <button
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              aria-label="Restar uno"
              className="h-12 w-11 text-xl font-black"
            >
              −
            </button>
            <span className="w-7 text-center text-lg font-black" aria-live="polite">
              {cantidad}
            </span>
            <button
              onClick={() => setCantidad((c) => Math.min(99, c + 1))}
              aria-label="Sumar uno"
              className="h-12 w-11 text-xl font-black"
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
  );
}
