"use client";

import { useEffect, useRef, useState } from "react";
import { apiAdmin } from "@/components/admin/api";

export type PublicidadAdmin = {
  id: number;
  nombre: string;
  titulo: string;
  subtitulo: string;
  imagen_url: string | null;
  cta: string;
  tipo: "internal" | "external";
  anunciante: string;
  slot: string;
  producto_id: number | null;
  categoria_id: number | null;
  destino_url: string | null;
  desde: string | null;
  hasta: string | null;
  dias: number[];
  hora_desde: string | null;
  hora_hasta: string | null;
  activo: boolean;
  prioridad: number;
  orden: number;
  estado: string;
  impresiones: number;
  clicks: number;
  conversiones: number;
  ventas: number;
  ctr: number;
};

const SLOTS = [
  ["home_hero", "Hero del inicio", "Banner grande arriba de todo (hasta 3 en carrusel)"],
  ["home_medio", "Inicio · medio", "Después de «Más pedidos»"],
  ["entre_categorias", "Entre categorías", "Discreto, entre dos secciones del menú"],
  ["carrito", "Carrito", "Cross-selling: «agregá una bebida»"],
  ["confirmacion", "Confirmación", "Después de confirmar: no compite con la venta"],
  ["beneficios", "Beneficios", "La sección de promos y marcas amigas"],
] as const;

const DIAS = ["D", "L", "M", "M", "J", "V", "S"];

/** Formulario de campaña con vista previa mobile antes de publicar. */
export function FormularioPublicidad({
  publicidad,
  onCerrar,
  onGuardado,
}: {
  publicidad: PublicidadAdmin | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const refArchivo = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nombre: publicidad?.nombre ?? "",
    titulo: publicidad?.titulo ?? "",
    subtitulo: publicidad?.subtitulo ?? "",
    imagen_url: publicidad?.imagen_url ?? "",
    cta: publicidad?.cta ?? "Pedir ahora",
    tipo: publicidad?.tipo ?? "internal",
    anunciante: publicidad?.anunciante ?? "",
    slot: publicidad?.slot ?? "home_hero",
    producto_id: publicidad?.producto_id ? String(publicidad.producto_id) : "",
    categoria_id: publicidad?.categoria_id ? String(publicidad.categoria_id) : "",
    destino_url: publicidad?.destino_url ?? "",
    desde: publicidad?.desde ?? "",
    hasta: publicidad?.hasta ?? "",
    dias: publicidad?.dias ?? [],
    hora_desde: publicidad?.hora_desde ?? "",
    hora_hasta: publicidad?.hora_hasta ?? "",
    activo: publicidad?.activo ?? true,
    prioridad: String(publicidad?.prioridad ?? 0),
  });
  const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [verPreview, setVerPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([
        apiAdmin<{ productos: { id: number; nombre: string }[] }>("/api/admin/productos"),
        apiAdmin<{ categorias: { id: number; nombre: string }[] }>("/api/admin/categorias"),
      ]);
      if (p.ok) setProductos(p.productos);
      if (c.ok) setCategorias(c.categorias);
    })();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
    if (!form.nombre.trim()) {
      setError("Poné un nombre interno para reconocer la campaña.");
      return;
    }
    setGuardando(true);
    setError("");
    const cuerpo = {
      ...(publicidad ? { id: publicidad.id } : {}),
      ...form,
      producto_id: form.producto_id || null,
      categoria_id: form.categoria_id || null,
      prioridad: Number(form.prioridad) || 0,
    };
    const r = await apiAdmin("/api/admin/ads", {
      metodo: publicidad ? "PATCH" : "POST",
      cuerpo,
    });
    setGuardando(false);
    if (r.ok) onGuardado();
    else setError(r.error ?? "No se pudo guardar");
  }

  const campo = "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-marfil sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <h2 className="font-black">{publicidad ? "Editar campaña" : "Nueva campaña"}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setVerPreview((v) => !v)}
              className={`min-h-10 rounded-xl px-3 text-sm font-black ${
                verPreview ? "bg-tinta text-white" : "bg-marfil"
              }`}
            >
              {verPreview ? "Editar" : "Vista previa"}
            </button>
            <button onClick={onCerrar} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full bg-marfil">
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {verPreview ? (
            <VistaPrevia form={form} />
          ) : (
            <div className="space-y-4">
              <section className="rounded-2xl bg-white p-4">
                <h3 className="text-sm font-black uppercase text-tinta-suave">Contenido</h3>
                <label className="mt-2 block text-sm font-bold">
                  Nombre interno (solo lo ves vos)
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Promo 30 piezas agosto"
                    className={campo}
                  />
                </label>
                <label className="mt-2 block text-sm font-bold">
                  Título
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="30 piezas + bebida"
                    className={campo}
                  />
                </label>
                <label className="mt-2 block text-sm font-bold">
                  Subtítulo
                  <input
                    type="text"
                    value={form.subtitulo}
                    onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
                    placeholder="Ideal para compartir"
                    className={campo}
                  />
                </label>
                <label className="mt-2 block text-sm font-bold">
                  Texto del botón
                  <input
                    type="text"
                    value={form.cta}
                    onChange={(e) => setForm({ ...form, cta: e.target.value })}
                    className={campo}
                  />
                </label>

                <div className="mt-3">
                  <p className="text-sm font-bold">Imagen</p>
                  <div className="mt-2 flex items-center gap-3">
                    {form.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.imagen_url} alt="" className="h-20 w-32 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-20 w-32 place-items-center rounded-xl bg-marfil text-2xl">📣</span>
                    )}
                    <button
                      onClick={() => refArchivo.current?.click()}
                      disabled={subiendo}
                      className="min-h-10 rounded-xl bg-tinta px-4 text-sm font-black text-white disabled:opacity-50"
                    >
                      {subiendo ? "Subiendo…" : form.imagen_url ? "Cambiar" : "Subir imagen"}
                    </button>
                    <input
                      ref={refArchivo}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4">
                <h3 className="text-sm font-black uppercase text-tinta-suave">Dónde y de quién</h3>
                <label className="mt-2 block text-sm font-bold">
                  Espacio
                  <select
                    value={form.slot}
                    onChange={(e) => setForm({ ...form, slot: e.target.value })}
                    className={campo}
                  >
                    {SLOTS.map(([valor, nombre, detalle]) => (
                      <option key={valor} value={valor}>
                        {nombre} — {detalle}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["internal", "Promo de Abraham"],
                      ["external", "Campaña de terceros"],
                    ] as const
                  ).map(([valor, etiqueta]) => (
                    <button
                      key={valor}
                      onClick={() => setForm({ ...form, tipo: valor })}
                      className={`min-h-11 rounded-xl border-2 text-sm font-black ${
                        form.tipo === valor
                          ? "border-fuego bg-fuego-claro text-fuego"
                          : "border-gray-200 text-tinta-suave"
                      }`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                {form.tipo === "external" && (
                  <>
                    <p className="mt-2 text-xs text-tinta-suave">
                      Las campañas de terceros se muestran rotuladas como “Publicidad”.
                    </p>
                    <label className="mt-2 block text-sm font-bold">
                      Anunciante
                      <input
                        type="text"
                        value={form.anunciante}
                        onChange={(e) => setForm({ ...form, anunciante: e.target.value })}
                        className={campo}
                      />
                    </label>
                  </>
                )}

                <label className="mt-3 block text-sm font-bold">
                  Al tocar, lleva a…
                  <select
                    value={form.producto_id ? `p:${form.producto_id}` : form.categoria_id ? `c:${form.categoria_id}` : ""}
                    onChange={(e) => {
                      const [tipo, id] = e.target.value.split(":");
                      setForm({
                        ...form,
                        producto_id: tipo === "p" ? id : "",
                        categoria_id: tipo === "c" ? id : "",
                      });
                    }}
                    className={campo}
                  >
                    <option value="">Nada en particular (o link externo)</option>
                    <optgroup label="Producto">
                      {productos.map((p) => (
                        <option key={p.id} value={`p:${p.id}`}>
                          {p.nombre}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Categoría">
                      {categorias.map((c) => (
                        <option key={c.id} value={`c:${c.id}`}>
                          {c.nombre}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <label className="mt-2 block text-sm font-bold">
                  O un link externo
                  <input
                    type="url"
                    value={form.destino_url}
                    onChange={(e) => setForm({ ...form, destino_url: e.target.value })}
                    placeholder="https://…"
                    className={campo}
                  />
                </label>
              </section>

              <section className="rounded-2xl bg-white p-4">
                <h3 className="text-sm font-black uppercase text-tinta-suave">Cuándo se muestra</h3>
                <p className="mt-1 text-xs text-tinta-suave">
                  Todo en hora de Buenos Aires. Sin fechas, corre siempre.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="block text-sm font-bold">
                    Desde
                    <input
                      type="date"
                      value={form.desde ?? ""}
                      onChange={(e) => setForm({ ...form, desde: e.target.value })}
                      className={campo}
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Hasta
                    <input
                      type="date"
                      value={form.hasta ?? ""}
                      onChange={(e) => setForm({ ...form, hasta: e.target.value })}
                      className={campo}
                    />
                  </label>
                </div>

                <p className="mt-3 text-sm font-bold">Días (ninguno = todos)</p>
                <div className="mt-1 flex gap-1.5">
                  {DIAS.map((letra, dia) => (
                    <button
                      key={dia}
                      onClick={() =>
                        setForm({
                          ...form,
                          dias: form.dias.includes(dia)
                            ? form.dias.filter((d) => d !== dia)
                            : [...form.dias, dia],
                        })
                      }
                      aria-pressed={form.dias.includes(dia)}
                      className={`h-11 flex-1 rounded-xl border-2 text-sm font-black ${
                        form.dias.includes(dia)
                          ? "border-fuego bg-fuego-claro text-fuego"
                          : "border-gray-200 text-tinta-suave"
                      }`}
                    >
                      {letra}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block text-sm font-bold">
                    Desde las
                    <input
                      type="text"
                      placeholder="11:00"
                      value={form.hora_desde ?? ""}
                      onChange={(e) => setForm({ ...form, hora_desde: e.target.value })}
                      className={campo}
                    />
                  </label>
                  <label className="block text-sm font-bold">
                    Hasta las
                    <input
                      type="text"
                      placeholder="15:30"
                      value={form.hora_hasta ?? ""}
                      onChange={(e) => setForm({ ...form, hora_hasta: e.target.value })}
                      className={campo}
                    />
                  </label>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="flex min-h-11 flex-1 items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                      className="h-5 w-5 accent-fuego"
                    />
                    Campaña encendida
                  </label>
                  <label className="block text-sm font-bold">
                    Prioridad
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.prioridad}
                      onChange={(e) =>
                        setForm({ ...form, prioridad: e.target.value.replace(/\D/g, "") })
                      }
                      className={`${campo} w-20`}
                    />
                  </label>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-3">
          {error && <p className="mb-2 text-sm font-bold text-fuego">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onCerrar} className="min-h-12 flex-1 rounded-xl bg-marfil font-black">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="min-h-12 flex-[2] rounded-xl bg-fuego font-black text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : publicidad ? "Guardar cambios" : "Crear campaña"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cómo se va a ver en el celular del cliente, antes de publicar. */
function VistaPrevia({ form }: { form: { titulo: string; subtitulo: string; cta: string; imagen_url: string; tipo: string; slot: string } }) {
  const esHero = form.slot === "home_hero";
  return (
    <div>
      <p className="mb-3 text-center text-sm font-bold text-tinta-suave">
        Así se ve en el celular
      </p>
      <div className="mx-auto w-[320px] overflow-hidden rounded-[2rem] border-8 border-tinta bg-marfil">
        <div className="bg-tinta px-4 py-2 text-white">
          <p className="text-sm font-black">
            ABRAHAM<span className="text-fuego">.</span>
          </p>
        </div>
        <div className="p-3">
          <div
            className={`relative overflow-hidden rounded-2xl bg-tinta ${
              esHero ? "aspect-[16/7]" : "aspect-[16/5]"
            }`}
          >
            {form.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imagen_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 bg-gradient-to-br from-fuego to-fuego-oscuro" />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <span className="relative flex h-full flex-col justify-end gap-0.5 p-3 text-white">
              {form.tipo === "external" && (
                <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase">
                  Publicidad
                </span>
              )}
              {form.titulo && (
                <span className="text-base font-black leading-tight">{form.titulo}</span>
              )}
              {form.subtitulo && <span className="text-xs text-white/85">{form.subtitulo}</span>}
              {form.cta && (
                <span className="mt-1.5 w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-tinta">
                  {form.cta}
                </span>
              )}
            </span>
          </div>
          <div className="mt-3 h-10 rounded-xl bg-white" />
          <div className="mt-2 flex gap-2">
            <span className="h-8 w-20 rounded-full bg-tinta" />
            <span className="h-8 w-20 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
