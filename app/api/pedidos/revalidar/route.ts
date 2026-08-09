import { NextResponse } from "next/server";
import { obtenerCatalogo } from "@/lib/tienda/catalogo";

export const dynamic = "force-dynamic";

/**
 * "Repetir pedido": el navegador manda los productos de un pedido viejo y el
 * servidor los revalida contra el catálogo vigente — precios de hoy,
 * disponibilidad de hoy y modificadores de hoy. Nunca se confía en los datos
 * guardados en el celular del cliente.
 */
export async function POST(request: Request) {
  let entrada: { items?: { productoId: string; cantidad: number; aclaracion?: string }[] };
  try {
    entrada = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const catalogo = await obtenerCatalogo();
  const disponibles: {
    productoId: string;
    nombre: string;
    precio: number;
    cantidad: number;
    aclaracion?: string;
    /** Si tiene modificadores obligatorios hay que abrir el detalle */
    requiereEleccion: boolean;
  }[] = [];
  const noDisponibles: string[] = [];

  for (const item of entrada.items ?? []) {
    const producto = catalogo.productos.find((p) => p.id === item.productoId);
    if (!producto || producto.agotado) {
      noDisponibles.push(producto?.nombre ?? "Un producto");
      continue;
    }
    const cantidad = Math.max(1, Math.min(99, Math.floor(Number(item.cantidad) || 1)));
    disponibles.push({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad,
      aclaracion: item.aclaracion?.slice(0, 200),
      requiereEleccion: producto.grupos.some((g) => g.minimo > 0),
    });
  }

  return NextResponse.json({ ok: true, disponibles, noDisponibles });
}
