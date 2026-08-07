"use client";

import { useEffect, useState } from "react";
import { apiAdmin } from "@/components/admin/api";
import type { ConfigNegocio } from "@/lib/tienda/configuracion";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function AdminConfiguracion() {
  const [config, setConfig] = useState<ConfigNegocio | null>(null);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await apiAdmin<{ config: ConfigNegocio }>("/api/admin/configuracion");
      if (r.ok) setConfig(r.config);
    })();
  }, []);

  async function guardar() {
    if (!config) return;
    setGuardando(true);
    setError("");
    const r = await apiAdmin("/api/admin/configuracion", {
      metodo: "PUT",
      cuerpo: {
        costo_envio: config.costoEnvio,
        pedido_minimo: config.pedidoMinimo,
        tiempo_delivery: config.tiempoDelivery,
        tiempo_retiro: config.tiempoRetiro,
        direccion_local: config.direccionLocal,
        alias_mp: config.aliasMp,
        whatsapp_numero: config.whatsappNumero,
        upsell_activo: config.upsellActivo,
        paso_acompanamientos_activo: config.pasoAcompanamientosActivo,
        horarios: config.horarios,
      },
    });
    setGuardando(false);
    if (r.ok) {
      setAviso("Configuración guardada ✓");
      setTimeout(() => setAviso(""), 2500);
    } else setError(r.error ?? "No se pudo guardar");
  }

  if (!config) return <p className="mt-8 text-center text-tinta-suave">Cargando…</p>;

  const estiloCampo = "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5";

  function cambiarRango(dia: number, indice: number, campo: "desde" | "hasta", valor: string) {
    setConfig((c) => {
      if (!c) return c;
      const horarios = structuredClone(c.horarios);
      const rangos = horarios[dia as keyof typeof horarios];
      rangos[indice] = { ...rangos[indice], [campo]: valor };
      return { ...c, horarios };
    });
  }

  function agregarRango(dia: number) {
    setConfig((c) => {
      if (!c) return c;
      const horarios = structuredClone(c.horarios);
      horarios[dia as keyof typeof horarios].push({ desde: "10:00", hasta: "23:00" });
      return { ...c, horarios };
    });
  }

  function quitarRango(dia: number, indice: number) {
    setConfig((c) => {
      if (!c) return c;
      const horarios = structuredClone(c.horarios);
      horarios[dia as keyof typeof horarios].splice(indice, 1);
      return { ...c, horarios };
    });
  }

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="text-2xl font-black">Configuración</h1>

      <section className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black">Pagos y contacto</h2>
        <label className="block text-sm font-bold">
          Alias de Mercado Pago
          <input
            type="text"
            value={config.aliasMp}
            onChange={(e) => setConfig({ ...config, aliasMp: e.target.value })}
            className={estiloCampo}
          />
        </label>
        <label className="block text-sm font-bold">
          WhatsApp del local (con código de país, sin +)
          <input
            type="text"
            inputMode="numeric"
            placeholder="5491123456789"
            value={config.whatsappNumero}
            onChange={(e) =>
              setConfig({ ...config, whatsappNumero: e.target.value.replace(/\D/g, "") })
            }
            className={estiloCampo}
          />
        </label>
        <label className="block text-sm font-bold">
          Dirección del local (para retiro)
          <input
            type="text"
            value={config.direccionLocal}
            onChange={(e) => setConfig({ ...config, direccionLocal: e.target.value })}
            className={estiloCampo}
          />
        </label>
      </section>

      <section className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black">Entrega</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold">
            Costo de envío ($)
            <input
              type="text"
              inputMode="numeric"
              value={config.costoEnvio}
              onChange={(e) =>
                setConfig({ ...config, costoEnvio: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
              className={estiloCampo}
            />
          </label>
          <label className="block text-sm font-bold">
            Pedido mínimo delivery ($, 0 = sin mínimo)
            <input
              type="text"
              inputMode="numeric"
              value={config.pedidoMinimo}
              onChange={(e) =>
                setConfig({ ...config, pedidoMinimo: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
              className={estiloCampo}
            />
          </label>
          <label className="block text-sm font-bold">
            Tiempo estimado delivery
            <input
              type="text"
              value={config.tiempoDelivery}
              onChange={(e) => setConfig({ ...config, tiempoDelivery: e.target.value })}
              className={estiloCampo}
            />
          </label>
          <label className="block text-sm font-bold">
            Tiempo estimado retiro
            <input
              type="text"
              value={config.tiempoRetiro}
              onChange={(e) => setConfig({ ...config, tiempoRetiro: e.target.value })}
              className={estiloCampo}
            />
          </label>
        </div>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black">Checkout</h2>
        {(
          [
            ["pasoAcompanamientosActivo", "Preguntar salsas y palitos antes de los datos"],
            ["upsellActivo", "Sugerir bebidas y postres (upsell)"],
          ] as const
        ).map(([campo, etiqueta]) => (
          <label key={campo} className="flex min-h-11 items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={config[campo]}
              onChange={(e) => setConfig({ ...config, [campo]: e.target.checked })}
              className="h-5 w-5 accent-fuego"
            />
            {etiqueta}
          </label>
        ))}
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black">Horarios</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          Hora de Buenos Aires. Sin rangos = cerrado todo el día. Para cerrar a medianoche
          usá 24:00; un rango que termina después de medianoche (ej. 20:45 a 00:30) vale.
          <b> Shabat:</b> ajustá el cierre del viernes y la reapertura del sábado según la
          puesta del sol de cada semana.
        </p>
        <div className="mt-3 space-y-3">
          {DIAS.map((nombre, dia) => (
            <div key={dia} className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm font-black">{nombre}</span>
              {(config.horarios[dia as keyof typeof config.horarios] ?? []).map((rango, i) => (
                <span key={i} className="flex items-center gap-1 rounded-xl bg-marfil px-2 py-1">
                  <input
                    type="text"
                    value={rango.desde}
                    aria-label={`${nombre} desde`}
                    onChange={(e) => cambiarRango(dia, i, "desde", e.target.value)}
                    className="w-14 rounded-lg border border-gray-300 px-1 py-1 text-center text-sm"
                  />
                  <span className="text-xs">a</span>
                  <input
                    type="text"
                    value={rango.hasta}
                    aria-label={`${nombre} hasta`}
                    onChange={(e) => cambiarRango(dia, i, "hasta", e.target.value)}
                    className="w-14 rounded-lg border border-gray-300 px-1 py-1 text-center text-sm"
                  />
                  <button
                    onClick={() => quitarRango(dia, i)}
                    aria-label="Quitar rango"
                    className="px-1 text-sm font-black text-fuego"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button
                onClick={() => agregarRango(dia)}
                className="min-h-8 rounded-full bg-marfil px-3 text-xs font-black"
              >
                ＋ rango
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {error && <p className="flex-1 text-sm font-bold text-fuego">{error}</p>}
          {aviso && <p className="flex-1 text-sm font-bold text-green-700">{aviso}</p>}
          <button
            onClick={guardar}
            disabled={guardando}
            className="ml-auto min-h-12 rounded-xl bg-fuego px-8 font-black text-white disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
