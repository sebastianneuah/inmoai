"use client";

import { useEffect, useState } from "react";
import { apiAdmin } from "@/components/admin/api";

type CategoriaAdmin = {
  id: number;
  nombre: string;
  activa: boolean;
  orden: number;
  productos: number;
};

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState("");
  const [aviso, setAviso] = useState("");

  async function cargar() {
    const r = await apiAdmin<{ categorias: CategoriaAdmin[] }>("/api/admin/categorias");
    if (r.ok) setCategorias(r.categorias);
    setCargando(false);
  }
  useEffect(() => {
    cargar();
  }, []);

  function avisar(texto: string) {
    setAviso(texto);
    setTimeout(() => setAviso(""), 2500);
  }

  async function crear() {
    if (!nueva.trim()) return;
    const r = await apiAdmin("/api/admin/categorias", { cuerpo: { nombre: nueva.trim() } });
    if (r.ok) {
      setNueva("");
      cargar();
      avisar("Categoría creada ✓");
    } else avisar(r.error ?? "No se pudo crear");
  }

  async function alternar(c: CategoriaAdmin) {
    const r = await apiAdmin("/api/admin/categorias", {
      metodo: "PATCH",
      cuerpo: { id: c.id, activa: !c.activa },
    });
    if (r.ok) {
      setCategorias((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, activa: !c.activa } : x))
      );
      avisar(c.activa ? "Categoría desactivada" : "Categoría activada ✓");
    }
  }

  async function renombrar(c: CategoriaAdmin, nombre: string) {
    if (!nombre.trim() || nombre === c.nombre) return;
    const r = await apiAdmin("/api/admin/categorias", {
      metodo: "PATCH",
      cuerpo: { id: c.id, nombre: nombre.trim() },
    });
    if (r.ok) {
      setCategorias((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, nombre: nombre.trim() } : x))
      );
      avisar("Nombre actualizado ✓");
    }
  }

  /** Sube o baja una categoría intercambiando el orden con su vecina. */
  async function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= categorias.length) return;
    const copia = [...categorias];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    const ordenes = copia.map((c, i) => ({ id: c.id, orden: i }));
    setCategorias(copia.map((c, i) => ({ ...c, orden: i })));
    await apiAdmin("/api/admin/categorias", { metodo: "PATCH", cuerpo: { ordenes } });
    avisar("Orden actualizado ✓");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black">Categorías</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        El orden de acá es el orden de la carta. Usá las flechas para mover.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Nueva categoría…"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && crear()}
          className="min-h-11 flex-1 rounded-xl border border-gray-300 bg-white px-3"
        />
        <button
          onClick={crear}
          disabled={!nueva.trim()}
          className="min-h-11 rounded-xl bg-fuego px-4 font-black text-white disabled:opacity-50"
        >
          Crear
        </button>
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
          {categorias.map((c, i) => (
            <li
              key={c.id}
              className={`flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ${
                !c.activa ? "opacity-50" : ""
              }`}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${c.nombre}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-sm font-black disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => mover(i, 1)}
                  disabled={i === categorias.length - 1}
                  aria-label={`Bajar ${c.nombre}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-sm font-black disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  defaultValue={c.nombre}
                  onBlur={(e) => renombrar(c, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="w-full rounded-lg border border-transparent px-2 py-1 font-black uppercase hover:border-gray-300 focus:border-gray-300"
                />
                <p className="px-2 text-xs text-tinta-suave">{c.productos} productos</p>
              </div>
              <button
                onClick={() => alternar(c)}
                className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-black ${
                  c.activa ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                }`}
              >
                {c.activa ? "Activa" : "Oculta"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
