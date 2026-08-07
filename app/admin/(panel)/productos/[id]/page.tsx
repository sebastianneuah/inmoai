"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiAdmin } from "@/components/admin/api";

type Formulario = {
  nombre: string;
  categoria_id: string;
  precio: string;
  descripcion_corta: string;
  descripcion_larga: string;
  imagen_url: string;
  activo: boolean;
  disponible: boolean;
  destacado: boolean;
  orden: string;
  etiquetas: string[];
  grupo_ids: number[];
};

const ETIQUETAS_DISPONIBLES = [
  ["popular", "🔥 Popular"],
  ["vegetariano", "🌱 Vegetariano"],
  ["sin-queso", "🥑 Sin queso"],
  ["picante", "🌶 Picante"],
  ["crudo", "🍣 Crudo"],
  ["panizado", "🍤 Panizado"],
  ["solo-mediodia", "☀️ Solo mediodía"],
  ["promo", "🏷 Promo"],
] as const;

export default function EditarProducto() {
  const { id } = useParams<{ id: string }>();
  const esNuevo = id === "nuevo";
  const router = useRouter();
  const refArchivo = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Formulario>({
    nombre: "",
    categoria_id: "",
    precio: "",
    descripcion_corta: "",
    descripcion_larga: "",
    imagen_url: "",
    activo: true,
    disponible: true,
    destacado: false,
    orden: "0",
    etiquetas: [],
    grupo_ids: [],
  });
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [grupos, setGrupos] = useState<{ id: number; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const [cats, mods, prods] = await Promise.all([
        apiAdmin<{ categorias: { id: number; nombre: string }[] }>("/api/admin/categorias"),
        apiAdmin<{ grupos: { id: number; nombre: string }[] }>("/api/admin/modificadores"),
        esNuevo
          ? Promise.resolve(null)
          : apiAdmin<{ productos: Record<string, unknown>[] }>("/api/admin/productos"),
      ]);
      if (cats.ok) setCategorias(cats.categorias);
      if (mods.ok) setGrupos(mods.grupos);
      if (prods?.ok) {
        const p = prods.productos.find((x) => String(x.id) === id);
        if (p) {
          setForm({
            nombre: String(p.nombre),
            categoria_id: String(p.categoria_id),
            precio: String(p.precio),
            descripcion_corta: String(p.descripcion_corta ?? ""),
            descripcion_larga: String(p.descripcion_larga ?? ""),
            imagen_url: String(p.imagen_url ?? ""),
            activo: Boolean(p.activo),
            disponible: Boolean(p.disponible),
            destacado: Boolean(p.destacado),
            orden: String(p.orden ?? 0),
            etiquetas: (p.etiquetas as string[]) ?? [],
            grupo_ids: ((p.grupo_ids as number[]) ?? []).filter(Boolean),
          });
        }
      }
      setCargando(false);
    })();
  }, [id, esNuevo]);

  async function subirImagen(archivo: File) {
    setSubiendo(true);
    setError("");
    const formulario = new FormData();
    formulario.append("archivo", archivo);
    const r = await apiAdmin<{ url: string }>("/api/admin/imagenes", { formulario });
    setSubiendo(false);
    if (r.ok) setForm((f) => ({ ...f, imagen_url: r.url }));
    else setError(r.error ?? "No se pudo subir la imagen");
  }

  async function guardar() {
    setError("");
    if (!form.nombre.trim() || !form.categoria_id || !form.precio) {
      setError("Completá nombre, categoría y precio.");
      return;
    }
    setGuardando(true);
    const cuerpo = {
      ...(esNuevo ? {} : { id: Number(id) }),
      nombre: form.nombre,
      categoria_id: Number(form.categoria_id),
      precio: Number(form.precio.replace(/\D/g, "")),
      descripcion_corta: form.descripcion_corta,
      descripcion_larga: form.descripcion_larga,
      imagen_url: form.imagen_url || null,
      activo: form.activo,
      disponible: form.disponible,
      destacado: form.destacado,
      orden: Number(form.orden) || 0,
      etiquetas: form.etiquetas,
      grupo_ids: form.grupo_ids,
    };
    const r = await apiAdmin("/api/admin/productos", {
      metodo: esNuevo ? "POST" : "PATCH",
      cuerpo,
    });
    setGuardando(false);
    if (r.ok) router.push("/admin/productos");
    else setError(r.error ?? "No se pudo guardar");
  }

  if (cargando) return <p className="text-center text-tinta-suave">Cargando…</p>;

  const estiloCampo = "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-3";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black">{esNuevo ? "Nuevo producto" : "Editar producto"}</h1>

      <div className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold">
          Nombre
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className={estiloCampo}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold">
            Categoría
            <select
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              className={estiloCampo}
            >
              <option value="">Elegir…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            Precio (pesos)
            <input
              type="text"
              inputMode="numeric"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value.replace(/\D/g, "") })}
              className={estiloCampo}
            />
          </label>
        </div>

        <label className="block text-sm font-bold">
          Descripción corta (para la card, 1-2 líneas)
          <input
            type="text"
            maxLength={140}
            value={form.descripcion_corta}
            onChange={(e) => setForm({ ...form, descripcion_corta: e.target.value })}
            className={estiloCampo}
          />
        </label>

        <label className="block text-sm font-bold">
          Descripción completa (para el detalle)
          <textarea
            rows={3}
            value={form.descripcion_larga}
            onChange={(e) => setForm({ ...form, descripcion_larga: e.target.value })}
            className={estiloCampo}
          />
        </label>

        {/* Imagen */}
        <div>
          <p className="text-sm font-bold">Imagen</p>
          <div className="mt-2 flex items-center gap-3">
            {form.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imagen_url} alt="" className="h-24 w-24 rounded-xl object-cover" />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-xl bg-marfil text-3xl">🍣</span>
            )}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => refArchivo.current?.click()}
                disabled={subiendo}
                className="min-h-10 rounded-xl bg-tinta px-4 text-sm font-black text-white disabled:opacity-50"
              >
                {subiendo ? "Subiendo…" : form.imagen_url ? "Cambiar imagen" : "Subir imagen"}
              </button>
              {form.imagen_url && (
                <button
                  onClick={() => setForm({ ...form, imagen_url: "" })}
                  className="min-h-10 rounded-xl bg-marfil px-4 text-sm font-black"
                >
                  Quitar
                </button>
              )}
            </div>
            <input
              ref={refArchivo}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
            />
          </div>
          <p className="mt-1 text-xs text-tinta-suave">JPG, PNG, WebP o AVIF · máximo 4 MB</p>
        </div>

        {/* Estados */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["disponible", "Disponible", "Si está apagado se muestra Agotado"],
              ["activo", "Visible en la carta", "Apagado = oculto"],
              ["destacado", "⭐ Destacado", 'Aparece en "Los más pedidos"'],
            ] as const
          ).map(([campo, etiqueta, ayuda]) => (
            <label
              key={campo}
              title={ayuda}
              className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-2 text-center text-xs font-black ${
                form[campo] ? "border-fuego bg-fuego-claro text-fuego" : "border-gray-200 text-tinta-suave"
              }`}
            >
              <input
                type="checkbox"
                checked={form[campo]}
                onChange={(e) => setForm({ ...form, [campo]: e.target.checked })}
                className="sr-only"
              />
              {etiqueta}
            </label>
          ))}
        </div>

        {/* Etiquetas */}
        <div>
          <p className="text-sm font-bold">Etiquetas (badges en la carta)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ETIQUETAS_DISPONIBLES.map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() =>
                  setForm({
                    ...form,
                    etiquetas: form.etiquetas.includes(valor)
                      ? form.etiquetas.filter((t) => t !== valor)
                      : [...form.etiquetas, valor],
                  })
                }
                className={`min-h-10 rounded-full border-2 px-3 text-sm font-bold ${
                  form.etiquetas.includes(valor)
                    ? "border-fuego bg-fuego-claro text-fuego"
                    : "border-gray-200 text-tinta-suave"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        {/* Modificadores */}
        {grupos.length > 0 && (
          <div>
            <p className="text-sm font-bold">Grupos de modificadores</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {grupos.map((g) => (
                <button
                  key={g.id}
                  onClick={() =>
                    setForm({
                      ...form,
                      grupo_ids: form.grupo_ids.includes(g.id)
                        ? form.grupo_ids.filter((x) => x !== g.id)
                        : [...form.grupo_ids, g.id],
                    })
                  }
                  className={`min-h-10 rounded-full border-2 px-3 text-sm font-bold ${
                    form.grupo_ids.includes(g.id)
                      ? "border-tinta bg-tinta text-white"
                      : "border-gray-200 text-tinta-suave"
                  }`}
                >
                  {g.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block text-sm font-bold">
          Orden dentro de la categoría (menor = primero)
          <input
            type="text"
            inputMode="numeric"
            value={form.orden}
            onChange={(e) => setForm({ ...form, orden: e.target.value.replace(/\D/g, "") })}
            className={`${estiloCampo} w-32`}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-fuego-claro px-3 py-2 text-sm font-bold text-fuego">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/productos")}
            className="min-h-12 flex-1 rounded-xl bg-marfil font-black"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="min-h-12 flex-1 rounded-xl bg-fuego font-black text-white disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
