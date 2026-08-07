import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardar, sinSesion, sinBase } from "@/lib/admin/guardia";
import { refrescarCatalogo } from "@/lib/tienda/catalogo";

export const dynamic = "force-dynamic";

export async function GET() {
  const bloqueo = sinSesion() ?? sinBase();
  if (bloqueo) return bloqueo;
  const { rows } = await db().query(
    `SELECT c.id, c.nombre, c.activa, c.orden,
            count(p.id)::int AS productos
     FROM categorias c
     LEFT JOIN productos p ON p.categoria_id = c.id
     GROUP BY c.id ORDER BY c.orden, c.id`
  );
  return NextResponse.json({ ok: true, categorias: rows });
}

export async function POST(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;
  const datos = (await request.json()) as { nombre?: string };
  const nombre = String(datos.nombre ?? "").trim();
  if (!nombre) {
    return NextResponse.json({ ok: false, error: "Falta el nombre." }, { status: 400 });
  }
  const slug =
    nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + `-${Date.now() % 100000}`;
  const { rows } = await db().query(
    `INSERT INTO categorias (nombre, slug, orden)
     VALUES ($1, $2, COALESCE((SELECT max(orden) + 1 FROM categorias), 0))
     RETURNING id`,
    [nombre, slug]
  );
  refrescarCatalogo();
  return NextResponse.json({ ok: true, id: rows[0].id });
}

/** { id, nombre?, activa?, orden? } — o { ordenes: [{id, orden}] } para reordenar */
export async function PATCH(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;
  const datos = (await request.json()) as Record<string, unknown>;

  if (Array.isArray(datos.ordenes)) {
    for (const fila of datos.ordenes as { id: number; orden: number }[]) {
      await db().query("UPDATE categorias SET orden = $1 WHERE id = $2", [
        Number(fila.orden),
        Number(fila.id),
      ]);
    }
    refrescarCatalogo();
    return NextResponse.json({ ok: true });
  }

  const id = Number(datos.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: "Falta el id." }, { status: 400 });
  }
  const sets: string[] = [];
  const valores: unknown[] = [];
  if (typeof datos.nombre === "string" && datos.nombre.trim()) {
    valores.push(datos.nombre.trim());
    sets.push(`nombre = $${valores.length}`);
  }
  if (typeof datos.activa === "boolean") {
    valores.push(datos.activa);
    sets.push(`activa = $${valores.length}`);
  }
  if (Number.isInteger(Number(datos.orden))) {
    valores.push(Number(datos.orden));
    sets.push(`orden = $${valores.length}`);
  }
  if (sets.length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar." }, { status: 400 });
  }
  valores.push(id);
  await db().query(
    `UPDATE categorias SET ${sets.join(", ")}, actualizada_en = now() WHERE id = $${valores.length}`,
    valores
  );
  refrescarCatalogo();
  return NextResponse.json({ ok: true });
}
