"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiAdmin } from "@/components/admin/api";
import { formatearPrecio } from "@/lib/precio";

type ProductoAdmin = {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
  disponible: boolean;
  destacado: boolean;
  imagen_url: string | null;
  categoria_id: number;
  categoria_nombre: string;
};

type Filtro = "todos" | "activos" | "agotados" | "ocultos";

export default function AdminProductos() {
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [aviso, setAviso] = useState("");
  const [mostrarAumentos, setMostrarAumentos] = useState(false);

  async function cargar() {
    const r = await apiAdmin<{ productos: ProductoAdmin[] }>("/api/admin/productos");
    if (r.ok) setProductos(r.productos);
    setCargando(false);
  }
  useEffect(() => {
    // ?filtro=agotados desde el dashboard
    const parametro = new URLSearchParams(window.location.search).get("filtro");
    if (parametro === "agotados" || parametro === "activos" || parametro === "ocultos") {
      setFiltro(parametro);
    }
    cargar();
  }, []);

  function avisar(texto: string) {
    setAviso(texto);
    setTimeout(() => setAviso(""), 2500);
  }

  const categorias = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const p of productos) mapa.set(p.categoria_id, p.categoria_nombre);
    return Array.from(mapa.entries());
  }, [productos]);

  const visibles = productos.filter((p) => {
    if (filtro === "activos" && (!p.activo || !p.disponible)) return false;
    if (filtro === "agotados" && (!p.activo || p.disponible)) return false;
    if (filtro === "ocultos" && p.activo) return false;
    if (categoriaFiltro && String(p.categoria_id) !== categoriaFiltro) return false;
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  async function guardarPrecio(id: number, texto: string) {
    const precio = Number(texto.replace(/\D/g, ""));
    if (!Number.isInteger(precio) || precio <= 0) return;
    const r = await apiAdmin("/api/admin/productos", {
      metodo: "PATCH",
      cuerpo: { id, precio },
    });
    if (r.ok) {
      setProductos((prev) => prev.map((p) => (p.id === id ? { ...p, precio } : p)));
      avisar("Precio actualizado ✓");
    } else {
      avisar(r.error ?? "No se pudo actualizar");
    }
  }

  async function alternarDisponible(p: ProductoAdmin) {
    const r = await apiAdmin("/api/admin/productos", {
      metodo: "PATCH",
      cuerpo: { id: p.id, disponible: !p.disponible },
    });
    if (r.ok) {
      setProductos((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, disponible: !p.disponible } : x))
      );
      avisar(!p.disponible ? "Disponible de nuevo ✓" : "Marcado como agotado ✓");
    } else {
      avisar(r.error ?? "No se pudo actualizar");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Productos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarAumentos(true)}
            className="min-h-11 rounded-xl border-2 border-tinta px-4 text-sm font-black"
          >
            Aumentar precios
          </button>
          <Link
            href="/admin/productos/nuevo"
            className="grid min-h-11 place-items-center rounded-xl bg-fuego px-4 text-sm font-black text-white"
          >
            ＋ Nuevo
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Buscar producto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 sm:w-64"
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold"
        >
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="agotados">Agotados</option>
          <option value="ocultos">Ocultos</option>
        </select>
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="min-h-11 max-w-48 rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </select>
      </div>

      {aviso && (
        <p className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-tinta px-5 py-2.5 text-sm font-bold text-white shadow-lg">
          {aviso}
        </p>
      )}

      {cargando ? (
        <p className="mt-8 text-center text-tinta-suave">Cargando…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visibles.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ${
                !p.activo ? "opacity-50" : ""
              }`}
            >
              {p.imagen_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imagen_url}
                  alt=""
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-marfil text-xl">
                  🍣
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold uppercase leading-tight">
                  {p.destacado && <span title="Destacado">⭐ </span>}
                  {p.nombre}
                </p>
                <p className="truncate text-xs text-tinta-suave">{p.categoria_nombre}</p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Precio de ${p.nombre}`}
                    defaultValue={p.precio.toLocaleString("es-AR")}
                    onBlur={(e) => {
                      const nuevo = Number(e.target.value.replace(/\D/g, ""));
                      if (nuevo !== p.precio) guardarPrecio(p.id, e.target.value);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm font-black"
                  />
                  <span className="text-xs text-tinta-suave">pesos</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  onClick={() => alternarDisponible(p)}
                  className={`min-h-8 rounded-full px-3 text-xs font-black ${
                    p.disponible
                      ? "bg-green-100 text-green-700"
                      : "bg-fuego-claro text-fuego"
                  }`}
                >
                  {p.disponible ? "Disponible" : "Agotado"}
                </button>
                <Link
                  href={`/admin/productos/${p.id}`}
                  className="min-h-8 rounded-full bg-marfil px-3 py-1.5 text-xs font-black"
                >
                  Editar
                </Link>
              </div>
            </li>
          ))}
          {visibles.length === 0 && (
            <p className="py-8 text-center text-tinta-suave">
              No hay productos con ese filtro.
            </p>
          )}
        </ul>
      )}

      {mostrarAumentos && (
        <DialogoAumentos
          categorias={categorias}
          onCerrar={() => setMostrarAumentos(false)}
          onAplicado={() => {
            setMostrarAumentos(false);
            cargar();
            avisar("Precios actualizados ✓");
          }}
        />
      )}
    </div>
  );
}

function DialogoAumentos({
  categorias,
  onCerrar,
  onAplicado,
}: {
  categorias: [number, string][];
  onCerrar: () => void;
  onAplicado: () => void;
}) {
  const [alcance, setAlcance] = useState<"todo" | "categoria">("todo");
  const [categoriaId, setCategoriaId] = useState("");
  const [tipo, setTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [valor, setValor] = useState("");
  const [preview, setPreview] = useState<{ nombre: string; antes: number; despues: number }[] | null>(null);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  function cuerpoBase() {
    return {
      alcance,
      categoriaId: alcance === "categoria" ? Number(categoriaId) : undefined,
      tipo,
      valor: Number(valor),
    };
  }

  async function verPreview() {
    setError("");
    setTrabajando(true);
    const r = await apiAdmin<{ cambios: { nombre: string; antes: number; despues: number }[] }>(
      "/api/admin/productos/precios",
      { cuerpo: cuerpoBase() }
    );
    setTrabajando(false);
    if (r.ok) setPreview(r.cambios);
    else setError(r.error ?? "No se pudo calcular");
  }

  async function aplicar() {
    setTrabajando(true);
    const r = await apiAdmin("/api/admin/productos/precios", {
      cuerpo: { ...cuerpoBase(), confirmar: true },
    });
    setTrabajando(false);
    if (r.ok) onAplicado();
    else setError(r.error ?? "No se pudo aplicar");
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center" onClick={onCerrar}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black">Aumentar precios</h2>

        {!preview ? (
          <>
            <label className="mt-4 block text-sm font-bold">
              Alcance
              <select
                value={alcance === "todo" ? "todo" : categoriaId}
                onChange={(e) => {
                  if (e.target.value === "todo") setAlcance("todo");
                  else {
                    setAlcance("categoria");
                    setCategoriaId(e.target.value);
                  }
                }}
                className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3 font-normal"
              >
                <option value="todo">Toda la carta</option>
                {categorias.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    Solo {nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  ["porcentaje", "% porcentaje"],
                  ["monto", "$ monto fijo"],
                ] as const
              ).map(([t, etiqueta]) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`min-h-11 rounded-xl border-2 text-sm font-black ${
                    tipo === t ? "border-fuego bg-fuego-claro text-fuego" : "border-gray-200"
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <label className="mt-3 block text-sm font-bold">
              {tipo === "porcentaje" ? "Porcentaje (ej: 10 = +10%)" : "Monto en pesos (ej: 500)"}
              <input
                type="text"
                inputMode="numeric"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d-]/g, ""))}
                className="mt-1 min-h-11 w-full rounded-xl border border-gray-300 px-3 font-normal"
              />
            </label>

            {error && <p className="mt-3 text-sm font-bold text-fuego">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button onClick={onCerrar} className="min-h-12 flex-1 rounded-xl bg-marfil font-black">
                Cancelar
              </button>
              <button
                onClick={verPreview}
                disabled={trabajando || !valor}
                className="min-h-12 flex-1 rounded-xl bg-tinta font-black text-white disabled:opacity-50"
              >
                {trabajando ? "Calculando…" : "Ver cambios"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-tinta-suave">
              {preview.length} productos van a cambiar. Revisá antes de confirmar:
            </p>
            <ul className="mt-3 max-h-64 divide-y divide-gray-100 overflow-y-auto text-sm">
              {preview.map((c) => (
                <li key={c.nombre} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate font-bold uppercase">{c.nombre}</span>
                  <span className="text-tinta-suave line-through">{formatearPrecio(c.antes)}</span>
                  <span className="font-black text-fuego">{formatearPrecio(c.despues)}</span>
                </li>
              ))}
            </ul>
            {error && <p className="mt-3 text-sm font-bold text-fuego">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPreview(null)}
                className="min-h-12 flex-1 rounded-xl bg-marfil font-black"
              >
                ← Volver
              </button>
              <button
                onClick={aplicar}
                disabled={trabajando}
                className="min-h-12 flex-1 rounded-xl bg-fuego font-black text-white disabled:opacity-50"
              >
                {trabajando ? "Aplicando…" : `Confirmar ${preview.length} cambios`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
