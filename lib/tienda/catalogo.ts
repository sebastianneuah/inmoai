import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import catalogoLocal from "@/data/catalogo.json";
import { db, hayBaseDeDatos } from "@/lib/db";
import type {
  Catalogo,
  Categoria,
  GrupoModificador,
  Producto,
} from "@/lib/tipos";

/**
 * Capa de catálogo V2.
 *
 * Fuente primaria: la base de datos (administrable desde /admin).
 * Fallback: el snapshot data/catalogo.json (el catálogo real importado de
 * Fudo) cuando DATABASE_URL no está configurada — producción nunca se rompe.
 *
 * Cache con tag "catalogo": cada mutación del admin llama a
 * refrescarCatalogo() y la carta pública se actualiza al instante.
 */

export const TAG_CATALOGO = "catalogo";

/**
 * Invalida el catálogo tras un cambio del admin: el tag limpia la consulta
 * cacheada y los paths regeneran las páginas ya renderizadas, así la carta
 * pública muestra el cambio en el próximo pedido, no en 5 minutos.
 */
export function refrescarCatalogo() {
  revalidateTag(TAG_CATALOGO);
  revalidatePath("/");
  revalidatePath("/checkout");
}

// ── Lectura desde la base ───────────────────────────────────────────────

async function catalogoDesdeDb(): Promise<Catalogo> {
  const [cats, prods, grupos] = await Promise.all([
    db().query(
      `SELECT id, nombre, orden FROM categorias WHERE activa ORDER BY orden, id`
    ),
    db().query(
      `SELECT id, categoria_id, nombre, descripcion_corta, descripcion_larga,
              precio, imagen_url, disponible, destacado, etiquetas, orden
       FROM productos WHERE activo ORDER BY orden, id`
    ),
    db().query(
      `SELECT pm.producto_id, g.id AS grupo_id, g.nombre AS grupo_nombre,
              g.minimo, g.maximo,
              o.id AS opcion_id, o.nombre AS opcion_nombre, o.precio_extra
       FROM producto_modificadores pm
       JOIN grupos_modificadores g ON g.id = pm.grupo_id AND g.activo
       JOIN opciones_modificador o ON o.grupo_id = g.id AND o.activa
       ORDER BY g.orden, g.id, o.orden, o.id`
    ),
  ]);

  // Armar grupos por producto
  const gruposPorProducto = new Map<string, Map<string, GrupoModificador>>();
  for (const fila of grupos.rows) {
    const productoId = String(fila.producto_id);
    if (!gruposPorProducto.has(productoId)) gruposPorProducto.set(productoId, new Map());
    const mapa = gruposPorProducto.get(productoId)!;
    const grupoId = String(fila.grupo_id);
    if (!mapa.has(grupoId)) {
      mapa.set(grupoId, {
        id: grupoId,
        nombre: fila.grupo_nombre,
        minimo: fila.minimo,
        maximo: fila.maximo,
        opciones: [],
      });
    }
    mapa.get(grupoId)!.opciones.push({
      id: String(fila.opcion_id),
      nombre: fila.opcion_nombre,
      precioExtra: fila.precio_extra,
    });
  }

  const categorias: Categoria[] = cats.rows.map((c) => ({
    id: String(c.id),
    nombre: c.nombre,
    orden: c.orden,
  }));
  // Una categoría desactivada esconde TODOS sus productos, también de los
  // destacados y del buscador: se filtran acá, no en cada componente.
  const idsActivas = new Set(categorias.map((c) => c.id));

  const productos: Producto[] = prods.rows
    .filter((p) => idsActivas.has(String(p.categoria_id)))
    .map((p) => ({
      id: String(p.id),
      nombre: p.nombre,
      descripcion: p.descripcion_corta,
      descripcionLarga: p.descripcion_larga || p.descripcion_corta,
      precio: p.precio,
      categoriaId: String(p.categoria_id),
      agotado: !p.disponible,
      imagen: p.imagen_url ?? undefined,
      destacado: p.destacado,
      etiquetas: p.etiquetas ?? [],
      grupos: Array.from(gruposPorProducto.get(String(p.id))?.values() ?? []),
    }));

  const conProductos = categorias.filter((c) =>
    productos.some((p) => p.categoriaId === c.id)
  );
  return { categorias: conProductos, productos };
}

// ── Fallback: snapshot JSON del catálogo real de Fudo ───────────────────

type RecursoFudo = {
  id: string;
  attributes: Record<string, unknown>;
  relationships?: { productCategory?: { data?: { id: string } } };
};

function catalogoDesdeJson(): Catalogo {
  const categorias = (catalogoLocal.categorias.data as RecursoFudo[])
    .map((c) => ({
      id: c.id,
      nombre: String(c.attributes.name ?? ""),
      orden: Number(c.attributes.position ?? 0),
    }))
    .sort((a, b) => a.orden - b.orden);

  const productos: Producto[] = (catalogoLocal.productos.data as RecursoFudo[])
    .filter((p) => p.attributes.enabled !== false)
    .map((p) => ({
      id: p.id,
      nombre: String(p.attributes.name ?? ""),
      descripcion: String(p.attributes.description ?? ""),
      descripcionLarga: String(p.attributes.description ?? ""),
      precio: Number(p.attributes.price ?? 0),
      categoriaId: p.relationships?.productCategory?.data?.id ?? "",
      agotado: p.attributes.active === false,
      imagen:
        typeof p.attributes.imageUrl === "string" ? p.attributes.imageUrl : undefined,
      destacado: false,
      etiquetas: [],
      grupos: [],
    }));

  const conProductos = categorias.filter((c) =>
    productos.some((p) => p.categoriaId === c.id)
  );
  return { categorias: conProductos, productos };
}

// ── API pública de la capa ──────────────────────────────────────────────

const catalogoCacheado = unstable_cache(
  async () => catalogoDesdeDb(),
  ["catalogo-v2"],
  { tags: [TAG_CATALOGO], revalidate: 300 }
);

export async function obtenerCatalogo(): Promise<Catalogo> {
  if (!hayBaseDeDatos()) return catalogoDesdeJson();
  try {
    return await catalogoCacheado();
  } catch (error) {
    // Si la base no responde, la carta no se cae: sirve el snapshot
    console.error("[catalogo] DB no disponible, sirviendo snapshot:", error);
    return catalogoDesdeJson();
  }
}

export async function buscarProducto(id: string): Promise<Producto | undefined> {
  return (await obtenerCatalogo()).productos.find((p) => p.id === id);
}
