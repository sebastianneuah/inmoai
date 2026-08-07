import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardar, sinSesion, sinBase } from "@/lib/admin/guardia";
import { refrescarCatalogo } from "@/lib/tienda/catalogo";

export const dynamic = "force-dynamic";

/** Grupos de modificadores con sus opciones, para el admin. */
export async function GET() {
  const bloqueo = sinSesion() ?? sinBase();
  if (bloqueo) return bloqueo;
  const [grupos, opciones] = await Promise.all([
    db().query(
      `SELECT g.id, g.nombre, g.minimo, g.maximo, g.activo, g.orden,
              count(pm.producto_id)::int AS productos
       FROM grupos_modificadores g
       LEFT JOIN producto_modificadores pm ON pm.grupo_id = g.id
       GROUP BY g.id ORDER BY g.orden, g.id`
    ),
    db().query(
      `SELECT id, grupo_id, nombre, precio_extra, activa, orden
       FROM opciones_modificador ORDER BY orden, id`
    ),
  ]);
  return NextResponse.json({ ok: true, grupos: grupos.rows, opciones: opciones.rows });
}

/**
 * Crear/editar grupos y opciones en una sola ruta:
 *  { accion: "crear_grupo", nombre, minimo, maximo }
 *  { accion: "editar_grupo", id, ...campos }
 *  { accion: "crear_opcion", grupoId, nombre, precioExtra }
 *  { accion: "editar_opcion", id, ...campos }
 */
export async function POST(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;
  const datos = (await request.json()) as Record<string, unknown>;

  switch (datos.accion) {
    case "crear_grupo": {
      const nombre = String(datos.nombre ?? "").trim();
      if (!nombre) return NextResponse.json({ ok: false, error: "Falta el nombre." }, { status: 400 });
      const { rows } = await db().query(
        `INSERT INTO grupos_modificadores (nombre, minimo, maximo)
         VALUES ($1,$2,$3) RETURNING id`,
        [nombre, Math.max(0, Number(datos.minimo ?? 0)), Math.max(1, Number(datos.maximo ?? 1))]
      );
      refrescarCatalogo();
      return NextResponse.json({ ok: true, id: rows[0].id });
    }
    case "editar_grupo": {
      const id = Number(datos.id);
      if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "Falta el id." }, { status: 400 });
      await db().query(
        `UPDATE grupos_modificadores SET
           nombre = COALESCE($1, nombre),
           minimo = COALESCE($2, minimo),
           maximo = COALESCE($3, maximo),
           activo = COALESCE($4, activo)
         WHERE id = $5`,
        [
          typeof datos.nombre === "string" && datos.nombre.trim() ? datos.nombre.trim() : null,
          Number.isInteger(Number(datos.minimo)) ? Number(datos.minimo) : null,
          Number.isInteger(Number(datos.maximo)) ? Number(datos.maximo) : null,
          typeof datos.activo === "boolean" ? datos.activo : null,
          id,
        ]
      );
      refrescarCatalogo();
      return NextResponse.json({ ok: true });
    }
    case "crear_opcion": {
      const grupoId = Number(datos.grupoId);
      const nombre = String(datos.nombre ?? "").trim();
      if (!Number.isInteger(grupoId) || !nombre) {
        return NextResponse.json({ ok: false, error: "Faltan datos." }, { status: 400 });
      }
      const { rows } = await db().query(
        `INSERT INTO opciones_modificador (grupo_id, nombre, precio_extra)
         VALUES ($1,$2,$3) RETURNING id`,
        [grupoId, nombre, Math.max(0, Number(datos.precioExtra ?? 0))]
      );
      refrescarCatalogo();
      return NextResponse.json({ ok: true, id: rows[0].id });
    }
    case "editar_opcion": {
      const id = Number(datos.id);
      if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "Falta el id." }, { status: 400 });
      await db().query(
        `UPDATE opciones_modificador SET
           nombre = COALESCE($1, nombre),
           precio_extra = COALESCE($2, precio_extra),
           activa = COALESCE($3, activa)
         WHERE id = $4`,
        [
          typeof datos.nombre === "string" && datos.nombre.trim() ? datos.nombre.trim() : null,
          Number.isInteger(Number(datos.precioExtra)) ? Number(datos.precioExtra) : null,
          typeof datos.activa === "boolean" ? datos.activa : null,
          id,
        ]
      );
      refrescarCatalogo();
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "Acción desconocida." }, { status: 400 });
  }
}
