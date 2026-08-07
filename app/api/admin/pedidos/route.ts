import { NextResponse } from "next/server";
import { guardar, sinSesion, sinBase } from "@/lib/admin/guardia";
import { cambiarEstadoPedido, listarPedidos } from "@/lib/tienda/pedidos";
import type { EstadoPedido } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const ESTADOS: EstadoPedido[] = [
  "nuevo", "confirmado", "preparando", "listo", "enviado", "entregado", "cancelado",
];

export async function GET() {
  const bloqueo = sinSesion() ?? sinBase();
  if (bloqueo) return bloqueo;
  return NextResponse.json({ ok: true, pedidos: await listarPedidos(100) });
}

export async function PATCH(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;
  const datos = (await request.json()) as { id?: unknown; estado?: unknown };
  const id = String(datos.id ?? "");
  const estado = String(datos.estado ?? "") as EstadoPedido;
  if (!id || !ESTADOS.includes(estado)) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }
  await cambiarEstadoPedido(id, estado);
  return NextResponse.json({ ok: true });
}
