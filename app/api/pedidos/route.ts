import { NextResponse } from "next/server";
import { obtenerCatalogo } from "@/lib/tienda/catalogo";
import { obtenerAcompanamientos } from "@/lib/tienda/acompanamientos";
import { obtenerConfig } from "@/lib/tienda/configuracion";
import { guardarPedido } from "@/lib/tienda/pedidos";
import { costoEnvioDelivery, buscarZona, hayZonas } from "@/lib/envio";
import { estaAbierto } from "@/lib/horarios";
import { obtenerClienteFudo } from "@/lib/fudo";
import { telefonoValido } from "@/lib/validacion";
import type {
  AcompanamientoConfirmado,
  ItemConfirmado,
  PedidoConfirmado,
  PedidoEntrante,
  RespuestaApiPedidos,
} from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Creación de pedidos. Regla de oro: NADA de lo que manda el navegador se usa
 * como precio. El cliente envía productoId, cantidad, opcionIds y cantidades
 * de acompañamientos; el servidor recalcula todo contra el catálogo vigente.
 *
 * Idempotencia: la clave se reserva ANTES de inyectar en Fudo, guardando la
 * promesa del pedido en curso. Dos POSTs concurrentes con la misma clave
 * (doble tap, reintento por corte de conexión) esperan la MISMA promesa:
 * jamás se inyecta dos veces en el mismo proceso. Entre instancias
 * serverless distintas, el número de pedido (y por lo tanto el
 * externalReference enviado a Fudo) se deriva de la clave, así el reintento
 * produce el mismo número y Fudo puede deduplicar del otro lado.
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

/** Hash FNV-1a de 32 bits, suficiente para derivar números de pedido. */
function hashFnv(texto: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Número de pedido corto (2 letras + 4 dígitos, ej. "KD4821") derivado de la
 * clave de idempotencia: el reintento de un mismo pedido — incluso en otra
 * instancia serverless — produce el MISMO número, que además viaja a Fudo
 * como externalReference para deduplicar del otro lado.
 */
function generarNumeroPedido(claveIdempotencia?: string): string {
  const hash = hashFnv(claveIdempotencia || `${Date.now()}-${Math.random()}`);
  const letras =
    String.fromCharCode(65 + (hash % 26)) +
    String.fromCharCode(65 + (Math.floor(hash / 26) % 26));
  const digitos = String(Math.floor(hash / 676) % 10_000).padStart(4, "0");
  return `${letras}${digitos}`;
}

class ErrorDePedido extends Error {
  constructor(
    mensaje: string,
    public preciosActualizados?: { productoId: string; precio: number }[],
    public costoEnvioActualizado?: number
  ) {
    super(mensaje);
  }
}

async function crearPedido(entrante: PedidoEntrante): Promise<PedidoConfirmado> {
  const [catalogo, acompDisponibles, config] = await Promise.all([
    obtenerCatalogo(),
    obtenerAcompanamientos(),
    obtenerConfig(),
  ]);

  // ── Validaciones de negocio ──
  if (!estaAbierto(config.horarios)) {
    throw new ErrorDePedido("El local está cerrado en este momento.");
  }
  if (!entrante.items?.length) throw new ErrorDePedido("El carrito está vacío.");
  if (!entrante.cliente?.nombre?.trim()) throw new ErrorDePedido("Falta tu nombre.");
  if (!telefonoValido(entrante.cliente?.telefono ?? "")) {
    throw new ErrorDePedido("El teléfono no parece válido. Usá el formato 11 2345 6789.");
  }
  if (entrante.modoEntrega === "delivery" && !entrante.cliente.direccion?.trim()) {
    throw new ErrorDePedido("Falta la dirección de entrega.");
  }
  if (entrante.modoEntrega === "delivery" && hayZonas() && !buscarZona(entrante.zonaId)) {
    throw new ErrorDePedido("Elegí tu zona de entrega.");
  }
  const metodo = entrante.pago?.metodo;
  if (metodo !== "efectivo" && metodo !== "transferencia") {
    throw new ErrorDePedido("Elegí un método de pago.");
  }

  // ── Ítems: precios y stock SIEMPRE del catálogo del servidor ──
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

    // Modificadores: se resuelven contra los grupos vigentes del producto.
    // El precio extra sale del catálogo, nunca del navegador.
    const modificadores: { nombre: string; precioExtra: number }[] = [];
    let extras = 0;
    for (const grupo of producto.grupos) {
      const seleccion = item.modificadores?.find((m) => m.grupoId === grupo.id);
      const opcionIds = seleccion?.opcionIds ?? [];
      if (opcionIds.length < grupo.minimo) {
        throw new ErrorDePedido(
          `Falta elegir una opción de "${grupo.nombre}" en ${producto.nombre}.`
        );
      }
      if (opcionIds.length > grupo.maximo) {
        throw new ErrorDePedido(
          `Elegiste demasiadas opciones en "${grupo.nombre}" (máximo ${grupo.maximo}).`
        );
      }
      for (const opcionId of opcionIds) {
        const opcion = grupo.opciones.find((o) => o.id === opcionId);
        if (!opcion) {
          throw new ErrorDePedido(
            `Una opción de "${grupo.nombre}" ya no está disponible. Revisá el pedido.`
          );
        }
        modificadores.push({ nombre: opcion.nombre, precioExtra: opcion.precioExtra });
        extras += opcion.precioExtra;
      }
    }

    items.push({
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad,
      precioUnitario: producto.precio + extras,
      aclaracion: item.aclaracion?.trim().slice(0, 200) || undefined,
      modificadores,
    });
  }

  // ── Acompañamientos (salsas / palitos), también precificados server-side ──
  const acompanamientos: AcompanamientoConfirmado[] = [];
  const cantidades = entrante.acompanamientos?.cantidades ?? {};
  for (const [id, cantidadCruda] of Object.entries(cantidades)) {
    const acomp = acompDisponibles.find((a) => a.id === id && a.tipo !== "palitos");
    if (!acomp) continue; // desactivado desde el admin mientras pedía: se ignora
    const cantidad = Math.floor(Number(cantidadCruda));
    if (!Number.isFinite(cantidad) || cantidad < 1) continue;
    if (cantidad > acomp.maximo) {
      throw new ErrorDePedido(`El máximo de ${acomp.nombre} es ${acomp.maximo}.`);
    }
    acompanamientos.push({
      nombre: acomp.nombre,
      cantidad,
      precioUnitario: acomp.precio,
    });
  }

  // Los palitos son un acompañamiento más: se cobran con su precio vigente,
  // igual que las salsas, para que el total del cliente y el del servidor coincidan.
  const acompPalitos = acompDisponibles.find((a) => a.tipo === "palitos");
  const palitos = Math.max(
    0,
    Math.min(
      acompPalitos?.maximo ?? 20,
      Math.floor(Number(entrante.acompanamientos?.palitos ?? 0)) || 0
    )
  );
  if (acompPalitos && palitos > 0) {
    acompanamientos.push({
      nombre: acompPalitos.nombre,
      cantidad: palitos,
      precioUnitario: acompPalitos.precio,
    });
  }

  const subtotal =
    items.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0) +
    acompanamientos.reduce((suma, a) => suma + a.precioUnitario * a.cantidad, 0);

  const zona = entrante.modoEntrega === "delivery" ? buscarZona(entrante.zonaId) : undefined;
  const costoEnvio =
    entrante.modoEntrega === "delivery"
      ? (costoEnvioDelivery(entrante.zonaId) ?? config.costoEnvio)
      : 0;
  const total = subtotal + costoEnvio;

  // Si el catálogo cambió desde que el cliente miró el menú, no cobramos un
  // total distinto sin avisar: devolvemos los precios nuevos y que confirme.
  if (Number.isFinite(entrante.totalEsperado) && entrante.totalEsperado !== total) {
    throw new ErrorDePedido(
      "Los precios se actualizaron mientras armabas el pedido. Revisá el total y volvé a confirmar.",
      items.map((i) => ({ productoId: i.productoId, precio: i.precioUnitario })),
      costoEnvio
    );
  }

  if (entrante.modoEntrega === "delivery" && subtotal < config.pedidoMinimo) {
    throw new ErrorDePedido(
      `El pedido mínimo para delivery es $${config.pedidoMinimo.toLocaleString("es-AR")}.`
    );
  }

  // ── Efectivo: validar el monto y calcular vuelto ──
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

  if (entrante.pago.metodo === "transferencia" && !config.aliasMp) {
    console.error(
      "[pedidos] ALIAS_MP no está configurado y entró un pedido por transferencia"
    );
  }

  const pedido: PedidoConfirmado = {
    numero: generarNumeroPedido(entrante.claveIdempotencia),
    modoEntrega: entrante.modoEntrega,
    zonaEnvio: zona?.nombre,
    items,
    acompanamientos,
    palitos,
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
      entrante.modoEntrega === "delivery" ? config.tiempoDelivery : config.tiempoRetiro,
    falloInyeccion: false,
    datosPago: { aliasMp: config.aliasMp, whatsappNumero: config.whatsappNumero },
    creadoEn: new Date().toISOString(),
  };

  // Inyección en Fudo. Si falla, el pedido NO se pierde: se loguea, se guarda
  // en la base y el cliente ve un botón para reenviar el detalle al local.
  const resultado = await obtenerClienteFudo().crearPedido(pedido);
  if (!resultado.ok) {
    console.error(
      `[pedidos] Falló la inyección a Fudo del pedido #${pedido.numero}: ${resultado.error}`,
      JSON.stringify(pedido)
    );
    pedido.falloInyeccion = true;
  }

  await guardarPedido(pedido);
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
      return respuestaError(
        error.message,
        error.preciosActualizados,
        error.costoEnvioActualizado
      );
    }
    console.error("[pedidos] Error inesperado:", error);
    return respuestaError("No pudimos procesar el pedido. Probá de nuevo en un minuto.");
  }
}

function respuestaError(
  error: string,
  preciosActualizados?: { productoId: string; precio: number }[],
  costoEnvioActualizado?: number
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      preciosActualizados,
      costoEnvioActualizado,
    } satisfies RespuestaApiPedidos,
    { status: 400 }
  );
}
