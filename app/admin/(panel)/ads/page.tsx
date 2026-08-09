"use client";

import { useEffect, useState } from "react";
import { apiAdmin } from "@/components/admin/api";
import { formatearPrecio } from "@/lib/precio";
import { FormularioPublicidad, type PublicidadAdmin } from "@/components/admin/formulario-ad";

const NOMBRE_SLOT: Record<string, string> = {
  home_hero: "Hero de inicio",
  home_medio: "Inicio · medio",
  entre_categorias: "Entre categorías",
  carrito: "Carrito",
  confirmacion: "Confirmación",
  beneficios: "Beneficios",
};

const COLOR_ESTADO: Record<string, string> = {
  activa: "bg-green-100 text-green-700",
  programada: "bg-amber-100 text-amber-700",
  pausada: "bg-gray-200 text-gray-600",
};

export default function AdminPublicidades() {
  const [publicidades, setPublicidades] = useState<PublicidadAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<PublicidadAdmin | "nueva" | null>(null);
  const [aviso, setAviso] = useState("");

  async function cargar() {
    const r = await apiAdmin<{ publicidades: PublicidadAdmin[] }>("/api/admin/ads");
    if (r.ok) setPublicidades(r.publicidades);
    setCargando(false);
  }
  useEffect(() => {
    cargar();
  }, []);

  function avisar(texto: string) {
    setAviso(texto);
    setTimeout(() => setAviso(""), 2500);
  }

  async function alternarActivo(ad: PublicidadAdmin) {
    const r = await apiAdmin("/api/admin/ads", {
      metodo: "PATCH",
      cuerpo: { id: ad.id, activo: !ad.activo },
    });
    if (r.ok) {
      cargar();
      avisar(ad.activo ? "Campaña pausada" : "Campaña activada ✓");
    } else avisar(r.error ?? "No se pudo actualizar");
  }

  async function eliminar(ad: PublicidadAdmin) {
    const r = await apiAdmin(`/api/admin/ads?id=${ad.id}`, { metodo: "DELETE" });
    if (r.ok) {
      cargar();
      avisar("Campaña eliminada");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Publicidades</h1>
          <p className="text-sm text-tinta-suave">
            Promos propias, cross-selling y campañas de terceros.
          </p>
        </div>
        <button
          onClick={() => setEditando("nueva")}
          className="min-h-11 rounded-xl bg-fuego px-4 text-sm font-black text-white"
        >
          ＋ Nueva campaña
        </button>
      </div>

      {aviso && (
        <p className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-tinta px-5 py-2.5 text-sm font-bold text-white shadow-lg">
          {aviso}
        </p>
      )}

      {cargando ? (
        <p className="mt-8 text-center text-tinta-suave">Cargando…</p>
      ) : publicidades.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-4xl" aria-hidden>
            📣
          </p>
          <p className="mt-3 font-black">Todavía no hay campañas</p>
          <p className="mt-1 text-sm text-tinta-suave">
            Creá la primera para el hero del inicio: una promo de Abraham rinde más que
            cualquier banner de terceros.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {publicidades.map((ad) => (
            <li key={ad.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                {ad.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ad.imagen_url}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-marfil text-xl">
                    📣
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-black leading-tight">{ad.nombre}</p>
                  <p className="text-xs text-tinta-suave">
                    {NOMBRE_SLOT[ad.slot] ?? ad.slot} ·{" "}
                    {ad.tipo === "external" ? `Externa${ad.anunciante ? ` · ${ad.anunciante}` : ""}` : "Abraham"}
                  </p>
                  <p className="mt-0.5 text-xs text-tinta-suave">
                    {ad.desde || ad.hasta
                      ? `${ad.desde ?? "—"} → ${ad.hasta ?? "sin fin"}`
                      : "Sin fecha de fin"}
                    {ad.hora_desde && ` · ${ad.hora_desde}–${ad.hora_hasta ?? "cierre"}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${
                    COLOR_ESTADO[ad.estado] ?? ""
                  }`}
                >
                  {ad.estado}
                </span>
              </div>

              {/* Métricas */}
              <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 text-center">
                {(
                  [
                    ["Vistas", ad.impresiones.toLocaleString("es-AR")],
                    ["Clicks", ad.clicks.toLocaleString("es-AR")],
                    ["CTR", `${ad.ctr}%`],
                    ["Ventas", ad.ventas > 0 ? formatearPrecio(ad.ventas) : `${ad.conversiones}`],
                  ] as const
                ).map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <dd className="font-black">{valor}</dd>
                    <dt className="text-[11px] uppercase text-tinta-suave">{etiqueta}</dt>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setEditando(ad)}
                  className="min-h-10 flex-1 rounded-xl bg-marfil text-sm font-black"
                >
                  Editar
                </button>
                <button
                  onClick={() => alternarActivo(ad)}
                  className="min-h-10 flex-1 rounded-xl bg-tinta text-sm font-black text-white"
                >
                  {ad.activo ? "Pausar" : "Activar"}
                </button>
                <button
                  onClick={() => eliminar(ad)}
                  aria-label={`Eliminar ${ad.nombre}`}
                  className="min-h-10 rounded-xl px-3 text-sm font-black text-fuego"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <FormularioPublicidad
          publicidad={editando === "nueva" ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
            avisar("Campaña guardada ✓");
          }}
        />
      )}
    </div>
  );
}
