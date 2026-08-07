"use client";

import { useEffect, useState } from "react";
import { apiAdmin } from "@/components/admin/api";
import { formatearPrecio } from "@/lib/precio";

type AcompAdmin = {
  id: number;
  nombre: string;
  tipo: "salsa" | "palitos" | "otro";
  precio: number;
  maximo: number;
  activo: boolean;
  mostrar_en_checkout: boolean;
};

const NOMBRES_TIPO = { salsa: "Salsa", palitos: "Palitos", otro: "Otro" } as const;

export default function AdminAcompanamientos() {
  const [lista, setLista] = useState<AcompAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", tipo: "salsa", precio: "0", maximo: "6" });

  async function cargar() {
    const r = await apiAdmin<{ acompanamientos: AcompAdmin[] }>("/api/admin/acompanamientos");
    if (r.ok) setLista(r.acompanamientos);
    setCargando(false);
  }
  useEffect(() => {
    cargar();
  }, []);

  function avisar(texto: string) {
    setAviso(texto);
    setTimeout(() => setAviso(""), 2500);
  }

  async function actualizar(id: number, cambios: Partial<AcompAdmin>) {
    const r = await apiAdmin("/api/admin/acompanamientos", {
      metodo: "PATCH",
      cuerpo: { id, ...cambios },
    });
    if (r.ok) {
      setLista((prev) => prev.map((a) => (a.id === id ? { ...a, ...cambios } : a)));
      avisar("Guardado ✓");
    } else avisar(r.error ?? "No se pudo guardar");
  }

  async function crear() {
    if (!nuevo.nombre.trim()) return;
    const r = await apiAdmin("/api/admin/acompanamientos", {
      cuerpo: {
        nombre: nuevo.nombre.trim(),
        tipo: nuevo.tipo,
        precio: Number(nuevo.precio) || 0,
        maximo: Number(nuevo.maximo) || 6,
      },
    });
    if (r.ok) {
      setNuevo({ nombre: "", tipo: "salsa", precio: "0", maximo: "6" });
      cargar();
      avisar("Creado ✓");
    } else avisar(r.error ?? "No se pudo crear");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black">Acompañamientos</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        Las salsas y los palitos que se ofrecen en el paso &quot;¿Con qué acompañamos tu
        pedido?&quot; del checkout. Precio 0 = gratis.
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 rounded-2xl bg-white p-3 shadow-sm">
        <label className="text-xs font-bold">
          Nombre
          <input
            type="text"
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 px-2"
          />
        </label>
        <label className="text-xs font-bold">
          Tipo
          <select
            value={nuevo.tipo}
            onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
            className="mt-1 min-h-10 rounded-lg border border-gray-300 px-1"
          >
            <option value="salsa">Salsa</option>
            <option value="palitos">Palitos</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          Precio
          <input
            type="text"
            inputMode="numeric"
            value={nuevo.precio}
            onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value.replace(/\D/g, "") })}
            className="mt-1 min-h-10 w-16 rounded-lg border border-gray-300 px-2"
          />
        </label>
        <label className="text-xs font-bold">
          Máx.
          <input
            type="text"
            inputMode="numeric"
            value={nuevo.maximo}
            onChange={(e) => setNuevo({ ...nuevo, maximo: e.target.value.replace(/\D/g, "") })}
            className="mt-1 min-h-10 w-12 rounded-lg border border-gray-300 px-2"
          />
        </label>
        <button
          onClick={crear}
          disabled={!nuevo.nombre.trim()}
          className="min-h-10 rounded-xl bg-fuego px-3 font-black text-white disabled:opacity-50"
        >
          ＋
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
          {lista.map((a) => (
            <li
              key={a.id}
              className={`flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ${
                !a.activo ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-black uppercase leading-tight">{a.nombre}</p>
                <p className="text-xs text-tinta-suave">
                  {NOMBRES_TIPO[a.tipo]} · {a.precio === 0 ? "Gratis" : formatearPrecio(a.precio)} ·
                  máx {a.maximo}
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                aria-label={`Precio de ${a.nombre}`}
                defaultValue={a.precio}
                onBlur={(e) => {
                  const precio = Number(e.target.value.replace(/\D/g, ""));
                  if (precio !== a.precio) actualizar(a.id, { precio });
                }}
                className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-black"
              />
              <button
                onClick={() => actualizar(a.id, { mostrar_en_checkout: !a.mostrar_en_checkout })}
                title="Ofrecer automáticamente durante el checkout"
                className={`min-h-9 rounded-full px-3 text-xs font-black ${
                  a.mostrar_en_checkout ? "bg-fuego-claro text-fuego" : "bg-gray-100 text-gray-500"
                }`}
              >
                {a.mostrar_en_checkout ? "En checkout" : "No se ofrece"}
              </button>
              <button
                onClick={() => actualizar(a.id, { activo: !a.activo })}
                className={`min-h-9 rounded-full px-3 text-xs font-black ${
                  a.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                }`}
              >
                {a.activo ? "Activo" : "Inactivo"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
