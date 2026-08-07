import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardar, sinSesion, sinBase } from "@/lib/admin/guardia";
import { refrescarCatalogo } from "@/lib/tienda/catalogo";

export const dynamic = "force-dynamic";

/** Listado completo para el admin (incluye inactivos y agotados). */
export async function GET() {
  const bloqueo = sinSesion() ?? sinBase();
  if (bloqueo) return bloqueo;

  const { rows } = await db().query(
    `SELECT p.id, p.nombre, p.precio, p.activo, p.disponible, p.destacado,
            p.orden, p.imagen_url, p.descripcion_corta, p.descripcion_larga,
            p.etiquetas, p.categoria_id, c.nombre AS categoria_nombre,
            COALESCE(array_agg(pm.grupo_id) FILTER (WHERE pm.grupo_id IS NOT NULL), '{}') AS grupo_ids
     FROM productos p
     JOIN categorias c ON c.id = p.categoria_id
     LEFT JOIN producto_modificadores pm ON pm.producto_id = p.id
     GROUP BY p.id, c.nombre
     ORDER BY p.orden, p.id`
  );
  return NextResponse.json({ ok: true, productos: rows });
}

function slugDe(nombre: string, sufijo: string): string {
  return (
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + `-${sufijo}`
  );
}

const CAMPOS_EDITABLES = [
  "nombre",
  "precio",
  "activo",
  "disponible",
  "destacado",
  "orden",
  "imagen_url",
  "descripcion_corta",
  "descripcion_larga",
  "etiquetas",
  "categoria_id",
] as const;

function validarCampos(datos: Record<string, unknown>): string | null {
  if ("nombre" in datos && !String(datos.nombre ?? "").trim()) {
    return "El nombre no puede estar vacío.";
  }
  if ("precio" in datos) {
    const precio = Number(datos.precio);
    if (!Number.isInteger(precio) || precio < 0 || precio > 10_000_000) {
      return "El precio tiene que ser un entero en pesos (sin centavos).";
    }
  }
  if ("etiquetas" in datos && !Array.isArray(datos.etiquetas)) {
    return "Etiquetas inválidas.";
  }
  return null;
}

/** Crear producto. */
export async function POST(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;

  const datos = (await request.json()) as Record<string, unknown>;
  const error = validarCampos(datos);
  if (error || !datos.nombre || datos.precio === undefined || !datos.categoria_id) {
    return NextResponse.json(
      { ok: false, error: error ?? "Faltan nombre, precio o categoría." },
      { status: 400 }
    );
  }

  const { rows } = await db().query(
    `INSERT INTO productos
       (categoria_id, nombre, slug, descripcion_corta, descripcion_larga, precio,
        imagen_url, activo, disponible, destacado, orden, etiquetas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      Number(datos.categoria_id),
      String(datos.nombre).trim(),
      slugDe(String(datos.nombre), String(Date.now() % 100000)),
      String(datos.descripcion_corta ?? "").trim(),
      String(datos.descripcion_larga ?? datos.descripcion_corta ?? "").trim(),
      Number(datos.precio),
      datos.imagen_url ? String(datos.imagen_url) : null,
      datos.activo !== false,
      datos.disponible !== false,
      datos.destacado === true,
      Number(datos.orden ?? 0),
      Array.isArray(datos.etiquetas) ? datos.etiquetas.map(String) : [],
    ]
  );

  const productoId = rows[0].id;
  if (Array.isArray(datos.grupo_ids)) {
    for (const grupoId of datos.grupo_ids) {
      await db().query(
        `INSERT INTO producto_modificadores (producto_id, grupo_id)
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [productoId, Number(grupoId)]
      );
    }
  }

  refrescarCatalogo();
  return NextResponse.json({ ok: true, id: productoId });
}

/** Edición (parcial) de un producto: /api/admin/productos con { id, ...campos } */
export async function PATCH(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;

  const datos = (await request.json()) as Record<string, unknown>;
  const id = Number(datos.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: "Falta el id." }, { status: 400 });
  }
  const error = validarCampos(datos);
  if (error) return NextResponse.json({ ok: false, error }, { status: 400 });

  const sets: string[] = [];
  const valores: unknown[] = [];
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in datos) {
      valores.push(
        campo === "etiquetas"
          ? (datos[campo] as unknown[]).map(String)
          : datos[campo]
      );
      sets.push(`${campo} = $${valores.length}`);
    }
  }
  if (sets.length > 0) {
    valores.push(id);
    await db().query(
      `UPDATE productos SET ${sets.join(", ")}, actualizado_en = now()
       WHERE id = $${valores.length}`,
      valores
    );
  }

  // Reasignación de grupos de modificadores si vinieron
  if (Array.isArray(datos.grupo_ids)) {
    await db().query("DELETE FROM producto_modificadores WHERE producto_id = $1", [id]);
    for (const grupoId of datos.grupo_ids) {
      await db().query(
        `INSERT INTO producto_modificadores (producto_id, grupo_id)
         VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, Number(grupoId)]
      );
    }
  }

  refrescarCatalogo();
  return NextResponse.json({ ok: true });
}
