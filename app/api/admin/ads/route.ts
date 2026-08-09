import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardar, sinSesion, sinBase } from "@/lib/admin/guardia";
import { refrescarPublicidades, estaVigente } from "@/lib/tienda/publicidades";

export const dynamic = "force-dynamic";

const SLOTS = [
  "home_hero", "home_medio", "entre_categorias", "carrito", "confirmacion", "beneficios",
];

/** Listado con métricas agregadas para el panel. */
export async function GET() {
  const bloqueo = sinSesion() ?? sinBase();
  if (bloqueo) return bloqueo;

  const { rows } = await db().query(
    `SELECT p.*,
            count(*) FILTER (WHERE e.evento = 'impression')::int AS impresiones,
            count(*) FILTER (WHERE e.evento = 'click')::int      AS clicks,
            count(*) FILTER (WHERE e.evento = 'conversion')::int AS conversiones,
            COALESCE(sum(e.monto) FILTER (WHERE e.evento = 'conversion'), 0)::int AS ventas
     FROM publicidades p
     LEFT JOIN ad_eventos e ON e.publicidad_id = p.id
     GROUP BY p.id
     ORDER BY p.prioridad DESC, p.orden, p.id`
  );

  const publicidades = rows.map((p) => ({
    ...p,
    desde: p.desde ? p.desde.toISOString().slice(0, 10) : null,
    hasta: p.hasta ? p.hasta.toISOString().slice(0, 10) : null,
    // "activa" = encendida Y corriendo ahora; "programada" = encendida pero fuera de ventana
    estado: !p.activo ? "pausada" : estaVigente(p) ? "activa" : "programada",
    ctr: p.impresiones > 0 ? Math.round((p.clicks / p.impresiones) * 1000) / 10 : 0,
  }));
  return NextResponse.json({ ok: true, publicidades });
}

const CAMPOS = [
  "nombre", "titulo", "subtitulo", "imagen_url", "cta", "tipo", "anunciante",
  "slot", "producto_id", "categoria_id", "destino_url", "desde", "hasta",
  "dias", "hora_desde", "hora_hasta", "activo", "prioridad", "orden",
] as const;

function validar(datos: Record<string, unknown>, exigirObligatorios: boolean): string | null {
  if (exigirObligatorios) {
    if (!String(datos.nombre ?? "").trim()) return "Poné un nombre interno para la campaña.";
    if (!SLOTS.includes(String(datos.slot))) return "Elegí dónde se muestra.";
  }
  if ("slot" in datos && !SLOTS.includes(String(datos.slot))) return "Espacio inválido.";
  if ("tipo" in datos && !["internal", "external"].includes(String(datos.tipo))) {
    return "Tipo inválido.";
  }
  for (const campo of ["hora_desde", "hora_hasta"]) {
    const valor = datos[campo];
    if (valor && !/^\d{1,2}:\d{2}$/.test(String(valor))) {
      return "Las horas van en formato HH:MM.";
    }
  }
  for (const campo of ["desde", "hasta"]) {
    const valor = datos[campo];
    if (valor && !/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
      return "Las fechas van en formato AAAA-MM-DD.";
    }
  }
  if ("dias" in datos && !Array.isArray(datos.dias)) return "Días inválidos.";
  return null;
}

function normalizar(datos: Record<string, unknown>, campo: string): unknown {
  const valor = datos[campo];
  if (campo === "dias") return (valor as unknown[]).map(Number).filter((d) => d >= 0 && d <= 6);
  if (["desde", "hasta", "hora_desde", "hora_hasta", "imagen_url", "destino_url"].includes(campo)) {
    return valor === "" || valor === undefined ? null : valor;
  }
  if (["producto_id", "categoria_id"].includes(campo)) {
    return valor === "" || valor === null || valor === undefined ? null : Number(valor);
  }
  return valor;
}

export async function POST(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;

  const datos = (await request.json()) as Record<string, unknown>;
  const error = validar(datos, true);
  if (error) return NextResponse.json({ ok: false, error }, { status: 400 });

  const columnas: string[] = [];
  const valores: unknown[] = [];
  for (const campo of CAMPOS) {
    if (campo in datos) {
      columnas.push(campo);
      valores.push(normalizar(datos, campo));
    }
  }
  const marcadores = valores.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await db().query(
    `INSERT INTO publicidades (${columnas.join(", ")}) VALUES (${marcadores}) RETURNING id`,
    valores
  );
  refrescarPublicidades();
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
  const error = validar(datos, false);
  if (error) return NextResponse.json({ ok: false, error }, { status: 400 });

  const sets: string[] = [];
  const valores: unknown[] = [];
  for (const campo of CAMPOS) {
    if (campo in datos) {
      valores.push(normalizar(datos, campo));
      sets.push(`${campo} = $${valores.length}`);
    }
  }
  if (sets.length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar." }, { status: 400 });
  }
  valores.push(id);
  await db().query(
    `UPDATE publicidades SET ${sets.join(", ")}, actualizada_en = now()
     WHERE id = $${valores.length}`,
    valores
  );
  refrescarPublicidades();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const bloqueo = guardar();
  if (bloqueo) return bloqueo;
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: "Falta el id." }, { status: 400 });
  }
  await db().query("DELETE FROM publicidades WHERE id = $1", [id]);
  refrescarPublicidades();
  return NextResponse.json({ ok: true });
}
