import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { NEGOCIO, type DiaSemana, type RangoHorario } from "@/config/negocio";
import { db, hayBaseDeDatos } from "@/lib/db";

/**
 * Configuración del negocio V2: los valores editables viven en la tabla
 * `configuracion` (administrable desde /admin); config/negocio.ts queda como
 * valores por defecto/fallback. Lo sensible (credenciales Fudo) sigue en
 * variables de entorno, siempre.
 */

export type HorariosSemana = Record<DiaSemana, RangoHorario[]>;

export type ConfigNegocio = {
  costoEnvio: number;
  pedidoMinimo: number;
  tiempoDelivery: string;
  tiempoRetiro: string;
  direccionLocal: string;
  upsellActivo: boolean;
  pasoAcompanamientosActivo: boolean;
  horarios: HorariosSemana;
  /** Alias y WhatsApp: DB si el admin los cargó, si no variables de entorno */
  aliasMp: string;
  whatsappNumero: string;
};

export const TAG_CONFIG = "configuracion";

export function refrescarConfiguracion() {
  revalidateTag(TAG_CONFIG);
  revalidatePath("/");
  revalidatePath("/checkout");
}

function configPorDefecto(): ConfigNegocio {
  return {
    costoEnvio: NEGOCIO.entrega.envio.costoUnico,
    pedidoMinimo: NEGOCIO.entrega.pedidoMinimoDelivery,
    tiempoDelivery: NEGOCIO.entrega.tiempoEstimado.delivery,
    tiempoRetiro: NEGOCIO.entrega.tiempoEstimado.retiro,
    direccionLocal: NEGOCIO.entrega.direccionLocal,
    upsellActivo: true,
    pasoAcompanamientosActivo: true,
    horarios: NEGOCIO.horarios,
    aliasMp: process.env.ALIAS_MP ?? "",
    whatsappNumero: process.env.WHATSAPP_NUMERO ?? "",
  };
}

async function configDesdeDb(): Promise<ConfigNegocio> {
  const base = configPorDefecto();
  const { rows } = await db().query("SELECT clave, valor FROM configuracion");
  const mapa: Record<string, unknown> = {};
  for (const fila of rows) mapa[fila.clave] = fila.valor;

  return {
    costoEnvio: numero(mapa.costo_envio, base.costoEnvio),
    pedidoMinimo: numero(mapa.pedido_minimo, base.pedidoMinimo),
    tiempoDelivery: texto(mapa.tiempo_delivery, base.tiempoDelivery),
    tiempoRetiro: texto(mapa.tiempo_retiro, base.tiempoRetiro),
    direccionLocal: texto(mapa.direccion_local, base.direccionLocal),
    upsellActivo: booleano(mapa.upsell_activo, base.upsellActivo),
    pasoAcompanamientosActivo: booleano(
      mapa.paso_acompanamientos_activo,
      base.pasoAcompanamientosActivo
    ),
    horarios: horariosValidos(mapa.horarios) ?? base.horarios,
    aliasMp: texto(mapa.alias_mp, "") || base.aliasMp,
    whatsappNumero: texto(mapa.whatsapp_numero, "") || base.whatsappNumero,
  };
}

function numero(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function texto(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function booleano(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function horariosValidos(v: unknown): HorariosSemana | null {
  if (typeof v !== "object" || v === null) return null;
  const objeto = v as Record<string, unknown>;
  const resultado = {} as HorariosSemana;
  for (let dia = 0; dia <= 6; dia++) {
    const rangos = objeto[String(dia)];
    if (!Array.isArray(rangos)) return null;
    for (const r of rangos) {
      if (
        typeof r !== "object" || r === null ||
        !/^\d{1,2}:\d{2}$/.test((r as RangoHorario).desde ?? "") ||
        !/^\d{1,2}:\d{2}$/.test((r as RangoHorario).hasta ?? "")
      ) {
        return null;
      }
    }
    resultado[dia as DiaSemana] = rangos as RangoHorario[];
  }
  return resultado;
}

const configCacheada = unstable_cache(async () => configDesdeDb(), ["config-v2"], {
  tags: [TAG_CONFIG],
  revalidate: 300,
});

export async function obtenerConfig(): Promise<ConfigNegocio> {
  if (!hayBaseDeDatos()) return configPorDefecto();
  try {
    return await configCacheada();
  } catch (error) {
    console.error("[config] DB no disponible, usando valores por defecto:", error);
    return configPorDefecto();
  }
}

export async function guardarConfig(clave: string, valor: unknown) {
  await db().query(
    `INSERT INTO configuracion (clave, valor) VALUES ($1, $2)
     ON CONFLICT (clave) DO UPDATE SET valor = $2, actualizada_en = now()`,
    [clave, JSON.stringify(valor)]
  );
  refrescarConfiguracion();
}
