import { db, hayBaseDeDatos } from "@/lib/db";
import type { EstadoPedido, PedidoConfirmado } from "@/lib/tipos";

/**
 * Persistencia de pedidos: respaldo local de cada pedido confirmado y fuente
 * del panel /admin/pedidos. Sin base de datos, los pedidos siguen saliendo
 * (Fudo/mock + fallback WhatsApp) — solo no quedan listados en el admin.
 */

export async function guardarPedido(pedido: PedidoConfirmado): Promise<void> {
  if (!hayBaseDeDatos()) return;
  try {
    await db().query(
      `INSERT INTO pedidos
         (numero, modo_entrega, total, cliente_nombre, cliente_telefono, detalle, fallo_inyeccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (numero) DO NOTHING`,
      [
        pedido.numero,
        pedido.modoEntrega,
        pedido.total,
        pedido.cliente.nombre,
        pedido.cliente.telefono,
        JSON.stringify(pedido),
        pedido.falloInyeccion,
      ]
    );
  } catch (error) {
    // Guardar el respaldo nunca debe tirar abajo la confirmación del pedido
    console.error("[pedidos] No se pudo persistir el pedido:", error);
  }
}

export type PedidoListado = {
  id: string;
  numero: string;
  estado: EstadoPedido;
  modoEntrega: string;
  total: number;
  clienteNombre: string;
  clienteTelefono: string;
  falloInyeccion: boolean;
  creadoEn: string;
  detalle: PedidoConfirmado;
};

export async function listarPedidos(limite = 100): Promise<PedidoListado[]> {
  const { rows } = await db().query(
    `SELECT id, numero, estado, modo_entrega, total, cliente_nombre,
            cliente_telefono, fallo_inyeccion, creado_en, detalle
     FROM pedidos ORDER BY creado_en DESC LIMIT $1`,
    [limite]
  );
  return rows.map((p) => ({
    id: String(p.id),
    numero: p.numero,
    estado: p.estado,
    modoEntrega: p.modo_entrega,
    total: p.total,
    clienteNombre: p.cliente_nombre,
    clienteTelefono: p.cliente_telefono,
    falloInyeccion: p.fallo_inyeccion,
    creadoEn: p.creado_en.toISOString(),
    detalle: p.detalle,
  }));
}

export async function cambiarEstadoPedido(id: string, estado: EstadoPedido) {
  await db().query("UPDATE pedidos SET estado = $1 WHERE id = $2", [estado, id]);
}

export async function contarPedidosDeHoy(): Promise<number> {
  const { rows } = await db().query(
    `SELECT count(*)::int AS n FROM pedidos
     WHERE creado_en >= date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')
                       AT TIME ZONE 'America/Argentina/Buenos_Aires'`
  );
  return rows[0].n;
}
