import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { db, hayBaseDeDatos } from "@/lib/db";
import type { Acompanamiento } from "@/lib/tipos";

/**
 * Salsas, palitos y otros acompañamientos del paso
 * "¿Con qué acompañamos tu pedido?" del checkout. Administrables desde /admin.
 * Sin base de datos: el paso simplemente no se muestra.
 */

export const TAG_ACOMPANAMIENTOS = "acompanamientos";

export function refrescarAcompanamientos() {
  revalidateTag(TAG_ACOMPANAMIENTOS);
  revalidatePath("/checkout");
}

async function desdeDb(): Promise<Acompanamiento[]> {
  const { rows } = await db().query(
    `SELECT id, nombre, tipo, precio, maximo, imagen_url
     FROM acompanamientos
     WHERE activo AND mostrar_en_checkout
     ORDER BY orden, id`
  );
  return rows.map((a) => ({
    id: String(a.id),
    nombre: a.nombre,
    tipo: a.tipo,
    precio: a.precio,
    maximo: a.maximo,
    imagen: a.imagen_url ?? undefined,
  }));
}

const cacheados = unstable_cache(async () => desdeDb(), ["acompanamientos-v2"], {
  tags: [TAG_ACOMPANAMIENTOS],
  revalidate: 300,
});

export async function obtenerAcompanamientos(): Promise<Acompanamiento[]> {
  if (!hayBaseDeDatos()) return [];
  try {
    return await cacheados();
  } catch (error) {
    console.error("[acompanamientos] DB no disponible:", error);
    return [];
  }
}
