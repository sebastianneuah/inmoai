"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Publicidad, SlotPublicidad } from "@/lib/tienda/publicidades";
import { registrarEvento } from "@/lib/analytics";

/**
 * Espacios promocionales. Reglas de la casa:
 *  - Las campañas externas se rotulan siempre ("Publicidad").
 *  - Nada de popups, autoplay ni pantallas completas.
 *  - Un banner nunca se disfraza de botón de compra.
 */

/** Manda la métrica sin bloquear la interfaz. */
function medir(
  id: string,
  slot: string,
  evento: "impression" | "click" | "conversion",
  monto?: number
) {
  registrarEvento(evento === "click" ? "add_to_cart" : "view_product", {
    ad_id: id,
    ad_slot: slot,
    ad_event: evento,
  });
  const cuerpo = JSON.stringify({ id, slot, evento, monto });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/ads/evento", new Blob([cuerpo], { type: "application/json" }));
      return;
    }
  } catch {
    // seguimos con fetch
  }
  fetch("/api/ads/evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cuerpo,
    keepalive: true,
  }).catch(() => {});
}

function destinoDe(ad: Publicidad): string {
  if (ad.destinoUrl) return ad.destinoUrl;
  if (ad.productoId) return `/?producto=${ad.productoId}`;
  if (ad.categoriaId) return `/?categoria=${ad.categoriaId}`;
  return "/";
}

function Banner({
  ad,
  slot,
  alto,
}: {
  ad: Publicidad;
  slot: SlotPublicidad;
  alto: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const medido = useRef(false);

  // La impresión se cuenta cuando el banner entra en pantalla de verdad
  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting && !medido.current) {
          medido.current = true;
          medir(ad.id, slot, "impression");
        }
      },
      { threshold: 0.5 }
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [ad.id, slot]);

  function abrir() {
    medir(ad.id, slot, "click");
    try {
      // Se guarda para atribuir la venta si el pedido se confirma después
      sessionStorage.setItem("abraham.ultimoAd", JSON.stringify({ id: ad.id, slot }));
    } catch {
      // sin sessionStorage simplemente no se atribuye
    }
    const destino = destinoDe(ad);
    if (destino.startsWith("http")) window.open(destino, "_blank", "noopener,noreferrer");
    else router.push(destino);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={abrir}
        className={`relative w-full overflow-hidden rounded-2xl bg-tinta text-left ${alto}`}
      >
        {ad.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.imagen}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 bg-gradient-to-br from-fuego to-fuego-oscuro" aria-hidden />
        )}
        {/* Velo para que el texto se lea sobre cualquier foto */}
        <span
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
          aria-hidden
        />
        <span className="relative flex h-full flex-col justify-end gap-1 p-4 text-white">
          {ad.tipo === "external" && (
            <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Publicidad
            </span>
          )}
          {ad.titulo && (
            <span className="text-xl font-black leading-tight text-balance">{ad.titulo}</span>
          )}
          {ad.subtitulo && <span className="text-sm text-white/85">{ad.subtitulo}</span>}
          {ad.cta && (
            <span className="mt-2 w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-tinta">
              {ad.cta}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/** Carrusel del hero: hasta 3 campañas, swipe horizontal, sin autoplay agresivo. */
export function CarruselPublicidad({
  publicidades,
  slot = "home_hero",
}: {
  publicidades: Publicidad[];
  slot?: SlotPublicidad;
}) {
  const [activo, setActivo] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);

  if (publicidades.length === 0) return null;

  return (
    <section aria-label="Promociones" className="px-4 pt-3">
      <div
        ref={contenedor}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActivo(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto sin-scrollbar"
      >
        {publicidades.map((ad) => (
          <div key={ad.id} className="w-full shrink-0 snap-center">
            <Banner ad={ad} slot={slot} alto="aspect-[16/7]" />
          </div>
        ))}
      </div>

      {/* Con una sola campaña no tiene sentido mostrar indicadores */}
      {publicidades.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {publicidades.map((ad, i) => (
            <span
              key={ad.id}
              className={`h-1.5 rounded-full transition-all ${
                i === activo ? "w-5 bg-fuego" : "w-1.5 bg-gray-300"
              }`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Banner suelto para los espacios chicos (medio, entre categorías, confirmación). */
export function BannerPublicidad({
  publicidad,
  slot,
  compacto,
}: {
  publicidad?: Publicidad;
  slot: SlotPublicidad;
  compacto?: boolean;
}) {
  if (!publicidad) return null;
  return (
    <section aria-label="Promoción" className="px-4 py-3">
      <Banner ad={publicidad} slot={slot} alto={compacto ? "aspect-[16/5]" : "aspect-[16/6]"} />
    </section>
  );
}

/**
 * Registro de conversión: se llama cuando el pedido se confirmó y atribuye la
 * venta a la última campaña que el cliente tocó en esta sesión.
 */
export function medirConversionAd(monto: number) {
  try {
    const guardado = sessionStorage.getItem("abraham.ultimoAd");
    if (!guardado) return;
    const { id, slot } = JSON.parse(guardado) as { id: string; slot: string };
    if (id && slot) medir(id, slot, "conversion", monto);
    sessionStorage.removeItem("abraham.ultimoAd");
  } catch {
    // una conversión sin registrar no rompe nada
  }
}
