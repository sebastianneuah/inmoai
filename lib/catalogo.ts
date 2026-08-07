import catalogoLocal from "@/data/catalogo.json";
import type { Catalogo, Categoria, Producto } from "@/lib/tipos";

/**
 * Capa de catálogo. Hoy lee el JSON local (data/catalogo.json) que replica la
 * estructura JSON:API de Fudo. Cuando la API de Fudo esté habilitada, acá se
 * reemplaza la fuente por un fetch a la API (con revalidación cada 15 min)
 * sin tocar el resto de la aplicación: el adaptador es el mismo.
 */

type RecursoFudo = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: {
    productCategory?: { data: { id: string } };
  };
};

function adaptarCategorias(data: RecursoFudo[]): Categoria[] {
  return data
    .map((c) => ({
      id: c.id,
      nombre: String(c.attributes.name ?? ""),
      orden: Number(c.attributes.position ?? 0),
    }))
    .sort((a, b) => a.orden - b.orden);
}

function adaptarProductos(data: RecursoFudo[]): Producto[] {
  return (
    data
      // enabled=false en Fudo significa que el producto no se vende online: no se muestra
      .filter((p) => p.attributes.enabled !== false)
      .map((p) => ({
        id: p.id,
        nombre: String(p.attributes.name ?? ""),
        descripcion: String(p.attributes.description ?? ""),
        precio: Number(p.attributes.price ?? 0),
        categoriaId: p.relationships?.productCategory?.data.id ?? "",
        // active=false en Fudo = sin stock: se muestra como "Agotado"
        agotado: p.attributes.active === false,
        imagen: typeof p.attributes.imageUrl === "string" ? p.attributes.imageUrl : undefined,
      }))
  );
}

export function obtenerCatalogo(): Catalogo {
  const categorias = adaptarCategorias(catalogoLocal.categorias.data as RecursoFudo[]);
  const productos = adaptarProductos(catalogoLocal.productos.data as RecursoFudo[]);
  // Solo categorías que tienen al menos un producto visible
  const conProductos = categorias.filter((c) =>
    productos.some((p) => p.categoriaId === c.id)
  );
  return { categorias: conProductos, productos };
}

export function buscarProducto(id: string): Producto | undefined {
  return obtenerCatalogo().productos.find((p) => p.id === id);
}
