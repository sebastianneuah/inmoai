import { NextResponse } from "next/server";
import { NEGOCIO, datosPagoDesdeEntorno } from "@/config/negocio";
import { obtenerCatalogo } from "@/lib/catalogo";
import { costoEnvioDelivery, buscarZona, hayZonas } from "@/lib/envio";
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
 * Idempotencia: la clave se reserva ANTES de inyectar en Fudo, guardando la
 * promesa del pedido en curso. Dos POSTs concurrentes con la misma clave
 * (doble tap, reintento por corte de conexión) esperan la MISMA promesa:
 * jamás se inyecta dos veces. Cache en memoria del proceso: cubre los
 * reintentos inmediatos, que son el caso real de doble envío; entre
 * instancias serverless distintas, Fudo puede deduplicar además por el
 * externalReference que enviamos.
 */
const pedidosEnCurso = new Map<string, Promise<PedidoConfirmado>>();
const MAX_PEDIDOS_EN_MEMORIA = 200;

function reservarClave(clave: string, promesa: Promise<PedidoConfirmado>) {
  if (pedidosEnCurso.size >= MAX_PEDIDOS_EN_MEMORIA) {
    const primera = pedidosEnCurso.keys().next().value;
    if (primera) pedidosEnCurso.delete(primera);
  }
  pedidosEnCurso.set(clave, promesa);
}

/**
 * Número de pedido corto y único: letra que rota por día + segundos del día
 * (5 dígitos, 00000-86399). Dos pedidos en el mismo segundo se distinguen con
 * un sufijo secuencial (…A, …B). El reintento de un mismo pedido reutiliza el
 * número por idempotencia.
 */
let ultimoSegundo = -1;
let secuenciaEnSegundo = 0;

function generarNumeroPedido(): string {
  const ahora = Date.now();
  const letra = String.fromCharCode(65 + (Math.floor(ahora / 86_400_000) % 26));
  const segundosDelDia = Math.floor(ahora / 1000) % 86_400;
  if (segundosDelDia === ultimoSegundo) {
    secuenciaEnSegundo++;
  } else {
    ultimoSegundo = segundosDelDia;
    secuenciaEnSegundo = 0;
  }
  const sufijo =
    secuenciaEnSegundo === 0
      ? ""
      : String.fromCharCode(65 + ((secuenciaEnSegundo - 1) % 26));
  return `${letra}${String(segundosDelDia).padStart(5, "0")}${sufijo}`;
}

class ErrorDePedido extends Error {
  constructor(
    mensaje: string,
    public preciosActualizados?: { productoId: string; precio: number }[]
  ) {
    super(mensaje);
  }
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
  if (pedido.modoEntrega === "delivery" && hayZonas() && !buscarZona(pedido.zonaId)) {
    return "Elegí tu zona de entrega.";
  }
  const metodo = pedido.pago?.metodo;
  if (metodo !== "efectivo" && metodo !== "transferencia") {
    return "Elegí un método de pago.";
  }
  return null;
}

async function crearPedido(entrante: PedidoEntrante): Promise<PedidoConfirmado> {
  const errorValidacion = validar(entrante);
  if (errorValidacion) throw new ErrorDePedido(errorValidacion);

  // Precios y stock SIEMPRE del catálogo del servidor (nunca del navegador)
  const catalogo = obtenerCatalogo();
  const items: ItemConfirmado[] = [];
  for (const item of entrante.items) {
    const producto = catalogo.productos.find((p) => p.id === item.productoId);
    if (!producto) {
      throw new ErrorDePedido("Un producto del carrito ya no está disponible.");
    }
    if (producto.agotado) {
      throw new ErrorDePedido(`"${producto.nombre}" está agotado. Sacalo del carrito.`);
    }
    const cantidad = Math.floor(Number(item.cantidad));
    if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 99) {
      throw new ErrorDePedido("Hay una cantidad inválida en el carrito.");
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
  const zona = entrante.modoEntrega === "delivery" ? buscarZona(entrante.zonaId) : undefined;
  const costoEnvio =
    entrante.modoEntrega === "delivery"
      ? (costoEnvioDelivery(entrante.zonaId) ?? NEGOCIO.entrega.envio.costoUnico)
      : 0;
  const total = subtotal + costoEnvio;

  // Si el catálogo cambió desde que el cliente miró el menú, no cobramos un
  // total distinto sin avisar: devolvemos los precios nuevos y que confirme.
  if (Number.isFinite(entrante.totalEsperado) && entrante.totalEsperado !== total) {
    throw new ErrorDePedido(
      "Los precios se actualizaron mientras armabas el pedido. Revisá el total y volvé a confirmar.",
      items.map((i) => ({ productoId: i.productoId, precio: i.precioUnitario }))
    );
  }

  if (
    entrante.modoEntrega === "delivery" &&
    subtotal < NEGOCIO.entrega.pedidoMinimoDelivery
  ) {
    throw new ErrorDePedido(
      `El pedido mínimo para delivery es $${NEGOCIO.entrega.pedidoMinimoDelivery.toLocaleString("es-AR")}.`
    );
  }

  // Efectivo: validar el monto con el que paga (≥ total) y calcular vuelto.
  // El objeto `pago` se reconstruye con el valor ya validado: nada del
  // navegador se propaga crudo a Fudo ni a la confirmación.
  let pago: PedidoConfirmado["pago"];
  let vuelto = 0;
  if (entrante.pago.metodo === "efectivo") {
    if (entrante.pago.pagaCon === "justo") {
      pago = { metodo: "efectivo", pagaCon: "justo" };
    } else {
      const pagaCon = Math.floor(Number(entrante.pago.pagaCon));
      if (!Number.isFinite(pagaCon) || pagaCon < total) {
        throw new ErrorDePedido(
          "El monto con el que pagás tiene que cubrir el total del pedido."
        );
      }
      vuelto = pagaCon - total;
      pago = { metodo: "efectivo", pagaCon };
    }
  } else {
    pago = { metodo: "transferencia" };
  }

  const datosPago = datosPagoDesdeEntorno();
  if (entrante.pago.metodo === "transferencia" && !datosPago.aliasMp) {
    console.error(
      "[pedidos] ALIAS_MP no está configurado y entró un pedido por transferencia"
    );
  }

  const pedido: PedidoConfirmado = {
    numero: generarNumeroPedido(),
    modoEntrega: entrante.modoEntrega,
    zonaEnvio: zona?.nombre,
    items,
    aclaracionGeneral: entrante.aclaracionGeneral?.trim().slice(0, 500) || undefined,
    cliente: {
      nombre: entrante.cliente.nombre.trim().slice(0, 100),
      telefono: entrante.cliente.telefono.trim().slice(0, 30),
      direccion: entrante.cliente.direccion?.trim().slice(0, 200),
      referencias: entrante.cliente.referencias?.trim().slice(0, 200),
    },
    pago,
    subtotal,
    costoEnvio,
    total,
    vuelto,
    tiempoEstimado:
      entrante.modoEntrega === "delivery"
        ? NEGOCIO.entrega.tiempoEstimado.delivery
        : NEGOCIO.entrega.tiempoEstimado.retiro,
    falloInyeccion: false,
    datosPago,
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

  return pedido;
}

export async function POST(request: Request) {
  let entrante: PedidoEntrante;
  try {
    entrante = (await request.json()) as PedidoEntrante;
  } catch {
    return respuestaError("No pudimos leer el pedido. Probá de nuevo.");
  }

  try {
    let promesa = entrante.claveIdempotencia
      ? pedidosEnCurso.get(entrante.claveIdempotencia)
      : undefined;

    if (!promesa) {
      promesa = crearPedido(entrante);
      if (entrante.claveIdempotencia) {
        reservarClave(entrante.claveIdempotencia, promesa);
        // Un pedido rechazado libera la clave: el cliente corrige y reintenta
        promesa.catch(() => pedidosEnCurso.delete(entrante.claveIdempotencia));
      }
    }

    const pedido = await promesa;
    return NextResponse.json({ ok: true, pedido } satisfies RespuestaApiPedidos);
  } catch (error) {
    if (error instanceof ErrorDePedido) {
      return respuestaError(error.message, error.preciosActualizados);
    }
    console.error("[pedidos] Error inesperado:", error);
    return respuestaError("No pudimos procesar el pedido. Probá de nuevo en un minuto.");
  }
}

function respuestaError(
  error: string,
  preciosActualizados?: { productoId: string; precio: number }[]
) {
  return NextResponse.json(
    { ok: false, error, preciosActualizados } satisfies RespuestaApiPedidos,
    { status: 400 }
  );
}
