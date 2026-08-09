import { NextResponse } from "next/server";
import { registrarEventoAd } from "@/lib/tienda/publicidades";

export const dynamic = "force-dynamic";

/**
 * Registro de métricas de publicidad desde el navegador (impresiones y clics).
 * Pública a propósito, pero sin datos personales: solo id de campaña, espacio
 * y tipo de evento. Devuelve 204 siempre para no frenar la interfaz.
 */
export async function POST(request: Request) {
  try {
    const { id, slot, evento, monto } = (await request.json()) as {
      id?: string;
      slot?: string;
      evento?: string;
      monto?: number;
    };
    if (
      id &&
      slot &&
      (evento === "impression" || evento === "click" || evento === "conversion")
    ) {
      await registrarEventoAd(
        String(id),
        String(slot),
        evento,
        typeof monto === "number" && monto >= 0 ? Math.round(monto) : undefined
      );
    }
  } catch {
    // una métrica perdida nunca debe romper la experiencia
  }
  return new NextResponse(null, { status: 204 });
}
