import { NextResponse } from "next/server";
import { NEGOCIO, datosPagoDesdeEntorno } from "@/config/negocio";
import { obtenerCatalogo } from "@/lib/catalogo";
import { estaAbierto } from "@/lib/horarios";
import { obtenerClienteFudo } from "@/lib/fudo";
import { telefonoValido } from "@/lib/validacion";
import type {
  ItemConfirmado,
  PedidoConfirmado,
  PedidoEntrante,
  RespuestaApiPedidos,
} from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Idempotencia básica: si el mismo navegador reintenta con la misma clave
 * (doble tap, reintento por corte de conexión), devolvemos el pedido ya
 * creado en vez de duplicarlo. Cache en memoria del proceso: cubre los
 * reintentos inmediatos, que son el caso real de doble envío.
 */
const pedidosRecientes = new Map<string, PedidoConfirmado>();
const MAX_PEDIDOS_EN_MEMORIA = 200;

function recordarPedido(clave: string, pedido: PedidoConfirmado) {
  if (pedidosRecientes.size >= MAX_PEDIDOS_EN_MEMORIA) {
    const primera = pedidosRecientes.keys().next().value;
    if (primera) pedidosRecientes.delete(primera);
  }
  pedidosRecientes.set(clave, pedido);
}

/** Número corto y único: letra + 4 dígitos que rotan por tiempo (ej. B4821) */
function generarNumeroPedido(): string {
  const ahora = Date.now();
  const letra = String.fromCharCode(65 + (Math.floor(ahora / 86400000) % 26));
  const digitos = String(Math.floor(ahora / 10) % 10000).padStart(4, "0");
  return `${letra}${digitos}`;
}

function validar(pedido: PedidoEntrante): string | null {
  if (!estaAbierto()) return "El local está cerrado en este momento.";
  if (!pedido.items?.length) return "El carrito está vacío.";
  if (!pedido.cliente?.nombre?.trim()) return "Falta tu nombre.";
  if (!telefonoValido(pedido.cliente?.telefono ?? "")) {
    return "El teléfono no parece válido. Usá el formato 11 2345 6789.";
  }
  if (pedido.modoEntrega === "delivery" && !pedido.cliente.direccion?.trim()) {
    return "Falta la dirección de entrega.";
  }
  if (pedido.pago.metodo !== "efectivo" && pedido.pago.metodo !== "transferencia") {
    return "Elegí un método de pago.";
  }
  return null;
}

export async function POST(request: Request) {
  let entrante: PedidoEntrante;
  try {
    entrante = (await request.json()) as PedidoEntrante;
  } catch {
    return respuestaError("No pudimos leer el pedido. Probá de nuevo.");
  }

  // Reintento del mismo pedido → devolvemos el ya confirmado, sin duplicar
  const yaCreado = entrante.claveIdempotencia
    ? pedidosRecientes.get(entrante.claveIdempotencia)
    : undefined;
  if (yaCreado) {
    return NextResponse.json({ ok: true, pedido: yaCreado } satisfies RespuestaApiPedidos);
  }

  const errorValidacion = validar(entrante);
  if (errorValidacion) return respuestaError(errorValidacion);

  // Precios y stock SIEMPRE del catálogo del servidor (nunca del navegador)
  const catalogo = obtenerCatalogo();
  const items: ItemConfirmado[] = [];
  for (const item of entrante.items) {
    const producto = catalogo.productos.find((p) => p.id === item.productoId);
    if (!producto) return respuestaError("Un producto del carrito ya no está disponible.");
    if (producto.agotado) {
      return respuestaError(`"${producto.nombre}" está agotado. Sacalo del carrito.`);
    }
    const cantidad = Math.floor(Number(item.cantidad));
    if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 99) {
      return respuestaError("Hay una cantidad inválida en el carrito.");
    }
    items.push({
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad,
      precioUnitario: producto.precio,
      aclaracion: item.aclaracion?.trim().slice(0, 200) || undefined,
    });
  }

  const subtotal = items.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0);
  const costoEnvio =
    entrante.modoEntrega === "delivery" ? NEGOCIO.entrega.envio.costoUnico : 0;
  const total = subtotal + costoEnvio;

  if (
    entrante.modoEntrega === "delivery" &&
    subtotal < NEGOCIO.entrega.pedidoMinimoDelivery
  ) {
    return respuestaError(
      `El pedido mínimo para delivery es $${NEGOCIO.entrega.pedidoMinimoDelivery.toLocaleString("es-AR")}.`
    );
  }

  // Efectivo: validar el monto con el que paga (≥ total) y calcular vuelto
  let vuelto = 0;
  if (entrante.pago.metodo === "efectivo" && entrante.pago.pagaCon !== "justo") {
    const pagaCon = Number(entrante.pago.pagaCon);
    if (!Number.isFinite(pagaCon) || pagaCon < total) {
      return respuestaError(
        "El monto con el que pagás tiene que cubrir el total del pedido."
      );
    }
    vuelto = pagaCon - total;
  }

  const pedido: PedidoConfirmado = {
    numero: generarNumeroPedido(),
    modoEntrega: entrante.modoEntrega,
    items,
    aclaracionGeneral: entrante.aclaracionGeneral?.trim().slice(0, 500) || undefined,
    cliente: {
      nombre: entrante.cliente.nombre.trim().slice(0, 100),
      telefono: entrante.cliente.telefono.trim().slice(0, 30),
      direccion: entrante.cliente.direccion?.trim().slice(0, 200),
      referencias: entrante.cliente.referencias?.trim().slice(0, 200),
    },
    pago: entrante.pago,
    subtotal,
    costoEnvio,
    total,
    vuelto,
    tiempoEstimado:
      entrante.modoEntrega === "delivery"
        ? NEGOCIO.entrega.tiempoEstimado.delivery
        : NEGOCIO.entrega.tiempoEstimado.retiro,
    falloInyeccion: false,
    datosPago: {
      aliasMp: datosPagoDesdeEntorno().aliasMp,
      whatsappNumero: datosPagoDesdeEntorno().whatsappNumero,
    },
    creadoEn: new Date().toISOString(),
  };

  // Inyección en Fudo. Si falla, el pedido NO se pierde: se loguea y el
  // cliente ve un botón para reenviar el detalle completo al local por WhatsApp.
  const resultado = await obtenerClienteFudo().crearPedido(pedido);
  if (!resultado.ok) {
    console.error(
      `[pedidos] Falló la inyección a Fudo del pedido #${pedido.numero}: ${resultado.error}`,
      JSON.stringify(pedido)
    );
    pedido.falloInyeccion = true;
  }

  if (entrante.claveIdempotencia) recordarPedido(entrante.claveIdempotencia, pedido);

  return NextResponse.json({ ok: true, pedido } satisfies RespuestaApiPedidos);
}

function respuestaError(error: string) {
  return NextResponse.json({ ok: false, error } satisfies RespuestaApiPedidos, {
    status: 400,
  });
}
