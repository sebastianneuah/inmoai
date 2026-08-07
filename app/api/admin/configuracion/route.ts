import { NextResponse } from "next/server";
import { guardar, sinSesion } from "@/lib/admin/guardia";
import { guardarConfig, obtenerConfig } from "@/lib/tienda/configuracion";
import type { RangoHorario } from "@/config/negocio";

export const dynamic = "force-dynamic";

export async function GET() {
  const bloqueo = sinSesion();
  if (bloqueo) return bloqueo;
  return NextResponse.json({ ok: true, config: await obtenerConfig() });
}

/**
 * Guarda claves de configuración editables. Solo acepta claves conocidas —
 * los secretos (credenciales de Fudo, sesión) viven en variables de entorno
 * y NO pasan por acá.
 */
export async function PUT(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;

  const datos = (await request.json()) as Record<string, unknown>;
  const errores: string[] = [];

  const validadores: Record<string, (v: unknown) => boolean> = {
    costo_envio: (v) => Number.isInteger(v) && (v as number) >= 0,
    pedido_minimo: (v) => Number.isInteger(v) && (v as number) >= 0,
    tiempo_delivery: (v) => typeof v === "string" && v.length < 100,
    tiempo_retiro: (v) => typeof v === "string" && v.length < 100,
    direccion_local: (v) => typeof v === "string" && v.length < 300,
    alias_mp: (v) => typeof v === "string" && v.length < 100,
    whatsapp_numero: (v) => typeof v === "string" && /^\d{0,15}$/.test(v as string),
    upsell_activo: (v) => typeof v === "boolean",
    paso_acompanamientos_activo: (v) => typeof v === "boolean",
    horarios: validarHorarios,
  };

  for (const [clave, valor] of Object.entries(datos)) {
    const validador = validadores[clave];
    if (!validador) {
      errores.push(`Clave desconocida: ${clave}`);
      continue;
    }
    if (!validador(valor)) {
      errores.push(`Valor inválido para ${clave}`);
      continue;
    }
    await guardarConfig(clave, valor);
  }

  if (errores.length > 0) {
    return NextResponse.json({ ok: false, error: errores.join(" · ") }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

function validarHorarios(v: unknown): boolean {
  if (typeof v !== "object" || v === null) return false;
  for (let dia = 0; dia <= 6; dia++) {
    const rangos = (v as Record<string, unknown>)[String(dia)];
    if (!Array.isArray(rangos)) return false;
    for (const rango of rangos) {
      const r = rango as RangoHorario;
      if (!/^\d{1,2}:\d{2}$/.test(r?.desde ?? "") || !/^\d{1,2}:\d{2}$/.test(r?.hasta ?? "")) {
        return false;
      }
    }
  }
  return true;
}
