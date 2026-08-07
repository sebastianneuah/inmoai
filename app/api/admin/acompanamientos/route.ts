import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardar, sinSesion, sinBase } from "@/lib/admin/guardia";
import { refrescarAcompanamientos } from "@/lib/tienda/acompanamientos";

export const dynamic = "force-dynamic";

export async function GET() {
  const bloqueo = sinSesion() ?? sinBase();
  if (bloqueo) return bloqueo;
  const { rows } = await db().query(
    `SELECT id, nombre, tipo, precio, maximo, activo, mostrar_en_checkout, imagen_url, orden
     FROM acompanamientos ORDER BY orden, id`
  );
  return NextResponse.json({ ok: true, acompanamientos: rows });
}

const TIPOS = ["salsa", "palitos", "otro"];

export async function POST(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;
  const datos = (await request.json()) as Record<string, unknown>;
  const nombre = String(datos.nombre ?? "").trim();
  const tipo = String(datos.tipo ?? "salsa");
  const precio = Number(datos.precio ?? 0);
  if (!nombre || !TIPOS.includes(tipo) || !Number.isInteger(precio) || precio < 0) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }
  const { rows } = await db().query(
    `INSERT INTO acompanamientos (nombre, tipo, precio, maximo, orden)
     VALUES ($1,$2,$3,$4, COALESCE((SELECT max(orden) + 1 FROM acompanamientos), 0))
     RETURNING id`,
    [nombre, tipo, precio, Math.max(1, Number(datos.maximo ?? 6))]
  );
  refrescarAcompanamientos();
  return NextResponse.json({ ok: true, id: rows[0].id });
}

export async function PATCH(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;
  const datos = (await request.json()) as Record<string, unknown>;
  const id = Number(datos.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: "Falta el id." }, { status: 400 });
  }

  const sets: string[] = [];
  const valores: unknown[] = [];
  const asignar = (campo: string, valor: unknown) => {
    valores.push(valor);
    sets.push(`${campo} = $${valores.length}`);
  };
  if (typeof datos.nombre === "string" && datos.nombre.trim()) asignar("nombre", datos.nombre.trim());
  if (TIPOS.includes(String(datos.tipo))) asignar("tipo", datos.tipo);
  if (Number.isInteger(Number(datos.precio)) && Number(datos.precio) >= 0) {
    asignar("precio", Number(datos.precio));
  }
  if (Number.isInteger(Number(datos.maximo)) && Number(datos.maximo) >= 1) {
    asignar("maximo", Number(datos.maximo));
  }
  if (typeof datos.activo === "boolean") asignar("activo", datos.activo);
  if (typeof datos.mostrar_en_checkout === "boolean") {
    asignar("mostrar_en_checkout", datos.mostrar_en_checkout);
  }
  if (Number.isInteger(Number(datos.orden))) asignar("orden", Number(datos.orden));

  if (sets.length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar." }, { status: 400 });
  }
  valores.push(id);
  await db().query(
    `UPDATE acompanamientos SET ${sets.join(", ")} WHERE id = $${valores.length}`,
    valores
  );
  refrescarAcompanamientos();
  return NextResponse.json({ ok: true });
}
