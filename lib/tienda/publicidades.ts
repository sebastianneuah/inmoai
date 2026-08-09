import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { NEGOCIO, type DiaSemana } from "@/config/negocio";
import { db, hayBaseDeDatos } from "@/lib/db";

/**
 * Sistema propio de publicidades. Abraham decide qué campaña aparece, en qué
 * espacio, qué días y a qué hora — todo en hora de Buenos Aires.
 *
 * Prioridad de espacios (así la publicidad nunca le come ventas al sushi):
 *   1. Promociones propias de Abraham   → tipo "internal"
 *   2. Cross-selling                     → slot "carrito"
 *   3. Beneficios / sponsors             → slot "beneficios"
 *   4. Publicidad externa                → tipo "external", siempre rotulada
 */

export type SlotPublicidad =
  | "home_hero"
  | "home_medio"
  | "entre_categorias"
  | "carrito"
  | "confirmacion"
  | "beneficios";

export type Publicidad = {
  id: string;
  titulo: string;
  subtitulo: string;
  imagen?: string;
  cta: string;
  tipo: "internal" | "external";
  anunciante: string;
  slot: SlotPublicidad;
  productoId?: string;
  categoriaId?: string;
  destinoUrl?: string;
};

export const TAG_PUBLICIDADES = "publicidades";

export function refrescarPublicidades() {
  revalidateTag(TAG_PUBLICIDADES);
  revalidatePath("/");
  revalidatePath("/beneficios");
  revalidatePath("/pedido");
}

/** Momento actual en la zona del local, para decidir qué campaña corre. */
function ahoraEnLocal(): { dia: DiaSemana; minutos: number; fecha: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEGOCIO.zonaHoraria,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const mapa: Record<string, string> = {};
  for (const p of partes) mapa[p.type] = p.value;
  const dias: Record<string, DiaSemana> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    dia: dias[mapa.weekday],
    minutos: (Number(mapa.hour) % 24) * 60 + Number(mapa.minute),
    fecha: `${mapa.year}-${mapa.month}-${mapa.day}`,
  };
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

type FilaPublicidad = {
  id: number;
  titulo: string;
  subtitulo: string;
  imagen_url: string | null;
  cta: string;
  tipo: "internal" | "external";
  anunciante: string;
  slot: SlotPublicidad;
  producto_id: number | null;
  categoria_id: number | null;
  destino_url: string | null;
  desde: Date | null;
  hasta: Date | null;
  dias: number[];
  hora_desde: string | null;
  hora_hasta: string | null;
  prioridad: number;
  orden: number;
};

/** ¿Esta campaña corre justo ahora? (fechas + días + franja horaria) */
export function estaVigente(
  fila: Pick<FilaPublicidad, "desde" | "hasta" | "dias" | "hora_desde" | "hora_hasta">,
  ahora = ahoraEnLocal()
): boolean {
  const soloFecha = (f: Date) => f.toISOString().slice(0, 10);
  if (fila.desde && soloFecha(fila.desde) > ahora.fecha) return false;
  if (fila.hasta && soloFecha(fila.hasta) < ahora.fecha) return false;
  if (fila.dias?.length > 0 && !fila.dias.includes(ahora.dia)) return false;
  if (fila.hora_desde && ahora.minutos < aMinutos(fila.hora_desde)) return false;
  if (fila.hora_hasta && ahora.minutos >= aMinutos(fila.hora_hasta)) return false;
  return true;
}

async function desdeDb(): Promise<FilaPublicidad[]> {
  const { rows } = await db().query(
    `SELECT id, titulo, subtitulo, imagen_url, cta, tipo, anunciante, slot,
            producto_id, categoria_id, destino_url, desde, hasta, dias,
            hora_desde, hora_hasta, prioridad, orden
     FROM publicidades
     WHERE activo
     ORDER BY prioridad DESC, orden, id`
  );
  return rows;
}

const cacheadas = unstable_cache(async () => desdeDb(), ["publicidades-v1"], {
  tags: [TAG_PUBLICIDADES],
  // TTL corto: las campañas se programan por franja horaria y tienen que
  // aparecer y desaparecer puntualmente
  revalidate: 60,
});

function adaptar(fila: FilaPublicidad): Publicidad {
  return {
    id: String(fila.id),
    titulo: fila.titulo,
    subtitulo: fila.subtitulo,
    imagen: fila.imagen_url ?? undefined,
    cta: fila.cta,
    tipo: fila.tipo,
    anunciante: fila.anunciante,
    slot: fila.slot,
    productoId: fila.producto_id ? String(fila.producto_id) : undefined,
    categoriaId: fila.categoria_id ? String(fila.categoria_id) : undefined,
    destinoUrl: fila.destino_url ?? undefined,
  };
}

/**
 * Campañas vigentes para un espacio. `limite` acota cuántas se muestran:
 * el hero admite hasta 3 en carrusel, el resto una sola — la app no se
 * convierte en un tablero de banners.
 */
export async function obtenerPublicidades(
  slot: SlotPublicidad,
  limite = 1
): Promise<Publicidad[]> {
  if (!hayBaseDeDatos()) return [];
  try {
    const todas = await cacheadas();
    const ahora = ahoraEnLocal();
    return todas
      .filter((p) => p.slot === slot && estaVigente(p, ahora))
      // Las propias de Abraham van primero ante igual prioridad
      .sort((a, b) =>
        b.prioridad - a.prioridad ||
        (a.tipo === b.tipo ? 0 : a.tipo === "internal" ? -1 : 1) ||
        a.orden - b.orden
      )
      .slice(0, limite)
      .map(adaptar);
  } catch (error) {
    console.error("[publicidades] DB no disponible:", error);
    return [];
  }
}

/** Registra impresión, clic o conversión. Nunca tira abajo la página. */
export async function registrarEventoAd(
  publicidadId: string,
  slot: string,
  evento: "impression" | "click" | "conversion",
  monto?: number
): Promise<void> {
  if (!hayBaseDeDatos()) return;
  try {
    await db().query(
      `INSERT INTO ad_eventos (publicidad_id, slot, evento, monto)
       VALUES ($1, $2, $3, $4)`,
      [Number(publicidadId), slot.slice(0, 40), evento, monto ?? null]
    );
  } catch (error) {
    console.error("[publicidades] No se pudo registrar el evento:", error);
  }
}
