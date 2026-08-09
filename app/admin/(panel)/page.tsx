import Link from "next/link";
import { db, hayBaseDeDatos } from "@/lib/db";
import { contarPedidosDeHoy } from "@/lib/tienda/pedidos";

export const dynamic = "force-dynamic";

async function resumen() {
  if (!hayBaseDeDatos()) return null;
  try {
    const [productos, pedidosHoy] = await Promise.all([
      db().query(
        `SELECT count(*) FILTER (WHERE activo)::int AS activos,
                count(*) FILTER (WHERE activo AND NOT disponible)::int AS agotados,
                (SELECT count(*)::int FROM categorias WHERE activa) AS categorias
         FROM productos`
      ),
      contarPedidosDeHoy(),
    ]);
    return { ...productos.rows[0], pedidosHoy };
  } catch {
    return null;
  }
}

export default async function DashboardAdmin() {
  const datos = await resumen();

  const cards = [
    ["Productos activos", datos?.activos, "/admin/productos"],
    ["Agotados hoy", datos?.agotados, "/admin/productos?filtro=agotados"],
    ["Categorías", datos?.categorias, "/admin/categorias"],
    ["Pedidos de hoy", datos?.pedidosHoy, "/admin/pedidos"],
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-black">Panel administrativo</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([nombre, valor, ruta]) => (
          <Link
            key={nombre}
            href={ruta}
            className="rounded-2xl bg-white p-4 shadow-sm active:bg-gray-50"
          >
            <p className="text-3xl font-black text-fuego">{valor ?? "—"}</p>
            <p className="text-sm font-bold text-tinta-suave">{nombre}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-black">Accesos rápidos</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(
          [
            ["/admin/productos", "🍣 Productos", "Precios, fotos, agotados, destacados"],
            ["/admin/categorias", "📂 Categorías", "Crear, ordenar, activar"],
            ["/admin/acompanamientos", "🥢 Acompañamientos", "Salsas, palitos y máximos del checkout"],
            ["/admin/ads", "📣 Publicidades", "Promos del inicio, cross-selling y beneficios"],
            ["/admin/pedidos", "🧾 Pedidos", "Los pedidos del día y sus estados"],
            ["/admin/configuracion", "⚙️ Configuración", "Horarios, envío, alias, WhatsApp"],
          ] as const
        ).map(([ruta, titulo, detalle]) => (
          <Link key={ruta} href={ruta} className="rounded-2xl bg-white p-4 shadow-sm active:bg-gray-50">
            <p className="font-black">{titulo}</p>
            <p className="text-sm text-tinta-suave">{detalle}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
