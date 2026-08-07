import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardar } from "@/lib/admin/guardia";
import { refrescarCatalogo } from "@/lib/tienda/catalogo";

export const dynamic = "force-dynamic";

type CuerpoAumento = {
  alcance: "todo" | "categoria" | "seleccion";
  categoriaId?: number;
  productoIds?: number[];
  tipo: "porcentaje" | "monto";
  valor: number;
  /** false o ausente = solo preview; true = aplicar de verdad */
  confirmar?: boolean;
  /** Redondear el resultado a la centena más cercana */
  redondear?: boolean;
};

function precioNuevo(actual: number, cuerpo: CuerpoAumento): number {
  let nuevo =
    cuerpo.tipo === "porcentaje"
      ? actual * (1 + cuerpo.valor / 100)
      : actual + cuerpo.valor;
  if (cuerpo.redondear !== false) nuevo = Math.round(nuevo / 100) * 100;
  return Math.max(0, Math.round(nuevo));
}

/**
 * Cambios masivos de precio con preview obligatorio: la primera llamada (sin
 * `confirmar`) devuelve la lista antes/después; solo con `confirmar: true`
 * se aplica de verdad.
 */
export async function POST(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;

  const cuerpo = (await request.json()) as CuerpoAumento;
  if (
    !["todo", "categoria", "seleccion"].includes(cuerpo.alcance) ||
    !["porcentaje", "monto"].includes(cuerpo.tipo) ||
    !Number.isFinite(cuerpo.valor)
  ) {
    return NextResponse.json({ ok: false, error: "Parámetros inválidos." }, { status: 400 });
  }
  if (cuerpo.tipo === "porcentaje" && (cuerpo.valor < -90 || cuerpo.valor > 500)) {
    return NextResponse.json(
      { ok: false, error: "El porcentaje tiene que estar entre -90 y 500." },
      { status: 400 }
    );
  }

  let filtro = "";
  const valores: unknown[] = [];
  if (cuerpo.alcance === "categoria") {
    if (!Number.isInteger(cuerpo.categoriaId)) {
      return NextResponse.json({ ok: false, error: "Falta la categoría." }, { status: 400 });
    }
    valores.push(cuerpo.categoriaId);
    filtro = `WHERE categoria_id = $1`;
  } else if (cuerpo.alcance === "seleccion") {
    if (!Array.isArray(cuerpo.productoIds) || cuerpo.productoIds.length === 0) {
      return NextResponse.json({ ok: false, error: "No hay productos seleccionados." }, { status: 400 });
    }
    valores.push(cuerpo.productoIds.map(Number));
    filtro = `WHERE id = ANY($1)`;
  }

  const { rows } = await db().query(
    `SELECT id, nombre, precio FROM productos ${filtro} ORDER BY nombre`,
    valores
  );

  const cambios = rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    antes: p.precio,
    despues: precioNuevo(p.precio, cuerpo),
  }));

  if (!cuerpo.confirmar) {
    return NextResponse.json({ ok: true, preview: true, cambios });
  }

  for (const cambio of cambios) {
    await db().query(
      "UPDATE productos SET precio = $1, actualizado_en = now() WHERE id = $2",
      [cambio.despues, cambio.id]
    );
  }
  refrescarCatalogo();
  return NextResponse.json({ ok: true, preview: false, aplicados: cambios.length });
}
