"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NEGOCIO } from "@/config/negocio";
import { formatearPrecio } from "@/lib/precio";
import { telefonoValido } from "@/lib/validacion";
import { costoEnvioDelivery, hayZonas } from "@/lib/envio";
import { useAbierto } from "@/lib/use-abierto";
import { guardarUltimoPedido } from "@/lib/ultimo-pedido";
import { CLAVE_CLIENTE, useCarrito, type DatosCliente } from "@/components/carrito";
import type { PedidoEntrante, RespuestaApiPedidos } from "@/lib/tipos";

/** El monto en efectivo se escribe como sea ("50.000", "50000"): solo cuentan los dígitos */
function parsearMonto(texto: string): number {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? Number(digitos) : NaN;
}

/** Sugerencias de billetes: totales redondos con los que la gente suele pagar */
function sugerenciasDePago(total: number): number[] {
  const redondeos = [10_000, 20_000, 50_000].map(
    (paso) => Math.ceil(total / paso) * paso
  );
  return Array.from(new Set(redondeos))
    .filter((monto) => monto > total)
    .slice(0, 3);
}

/** Checkout en una sola pantalla: pedido → datos → pago → confirmar. */
export default function PaginaCheckout() {
  const router = useRouter();
  const carrito = useCarrito();
  const { abierto, proxima, calculado } = useAbierto({ abierto: true, proxima: "" });

  const [cliente, setCliente] = useState<DatosCliente>({
    nombre: "",
    telefono: "",
    direccion: "",
    referencias: "",
  });
  const [zonaId, setZonaId] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [pagaCon, setPagaCon] = useState("");
  const [montoJusto, setMontoJusto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [error, setError] = useState("");
  const [claveIdempotencia] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  // Datos recordados de pedidos anteriores
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_CLIENTE);
      if (guardado) {
        const datos = JSON.parse(guardado) as Partial<DatosCliente>;
        setCliente((previo) => ({
          nombre: typeof datos.nombre === "string" ? datos.nombre : previo.nombre,
          telefono: typeof datos.telefono === "string" ? datos.telefono : previo.telefono,
          direccion:
            typeof datos.direccion === "string" ? datos.direccion : previo.direccion,
          referencias:
            typeof datos.referencias === "string" ? datos.referencias : previo.referencias,
        }));
      }
    } catch {
      // sin datos guardados
    }
  }, []);

  const esDelivery = carrito.modoEntrega === "delivery";
  const costoEnvio = esDelivery ? (costoEnvioDelivery(zonaId || undefined) ?? 0) : 0;
  const faltaZona = esDelivery && hayZonas() && !zonaId;
  const total = carrito.subtotal + costoEnvio;
  const faltaParaMinimo = esDelivery
    ? Math.max(0, NEGOCIO.entrega.pedidoMinimoDelivery - carrito.subtotal)
    : 0;

  function validarLocalmente(): string {
    if (carrito.items.length === 0) return "El carrito está vacío.";
    if (!cliente.nombre.trim()) return "Contanos tu nombre.";
    if (!telefonoValido(cliente.telefono)) {
      return "Revisá el teléfono: usá el formato 11 2345 6789.";
    }
    if (esDelivery && !cliente.direccion.trim()) return "Falta la dirección de entrega.";
    if (faltaZona) return "Elegí tu zona de entrega.";
    if (faltaParaMinimo > 0) {
      return `Te faltan ${formatearPrecio(faltaParaMinimo)} para llegar al mínimo de delivery.`;
    }
    if (metodoPago === "efectivo" && !montoJusto) {
      const monto = parsearMonto(pagaCon);
      if (!Number.isFinite(monto)) {
        return "Decinos con cuánto pagás así preparamos el vuelto (o marcá monto justo).";
      }
      if (monto < total) {
        return `El monto tiene que cubrir el total (${formatearPrecio(total)}).`;
      }
    }
    return "";
  }

  async function confirmarPedido() {
    const errorLocal = validarLocalmente();
    if (errorLocal) {
      setError(errorLocal);
      return;
    }
    setError("");
    setEnviando(true);

    const pedido: PedidoEntrante = {
      claveIdempotencia,
      modoEntrega: carrito.modoEntrega,
      zonaId: esDelivery && zonaId ? zonaId : undefined,
      items: carrito.items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        aclaracion: i.aclaracion,
      })),
      aclaracionGeneral: carrito.aclaracionGeneral || undefined,
      totalEsperado: total,
      cliente: {
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: esDelivery ? cliente.direccion : undefined,
        referencias: esDelivery ? cliente.referencias : undefined,
      },
      pago:
        metodoPago === "efectivo"
          ? {
              metodo: "efectivo",
              pagaCon: montoJusto ? "justo" : parsearMonto(pagaCon),
            }
          : { metodo: "transferencia" },
    };

    try {
      const respuesta = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });
      const datos = (await respuesta.json()) as RespuestaApiPedidos;
      if (!datos.ok) {
        // Si cambiaron los precios, sincronizamos el carrito con los nuevos
        if (datos.preciosActualizados?.length) {
          carrito.actualizarPrecios(datos.preciosActualizados);
        }
        setError(datos.error);
        setEnviando(false);
        return;
      }
      guardarUltimoPedido(datos.pedido);
      try {
        localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(cliente));
      } catch {
        // si localStorage falla, la confirmación igual se muestra
      }
      setPedidoEnviado(true);
      carrito.vaciar();
      router.push("/confirmacion");
    } catch {
      setError("No pudimos enviar el pedido. Revisá tu conexión y probá de nuevo.");
      setEnviando(false);
    }
  }

  if (carrito.listo && carrito.items.length === 0 && !pedidoEnviado) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-bold">Tu carrito está vacío</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-fuego px-6 py-3 font-black text-white"
        >
          Ver el menú
        </Link>
      </main>
    );
  }

  const estiloCampo =
    "mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-44 pt-4">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Volver al menú"
          className="grid h-11 w-11 place-items-center rounded-full bg-marfil text-lg"
        >
          ←
        </Link>
        <h1 className="text-xl font-black">Tu pedido</h1>
      </div>

      {/* ── Modo de entrega ── */}
      <div
        role="radiogroup"
        aria-label="Modo de entrega"
        className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-marfil p-1"
      >
        {(
          [
            ["delivery", "🛵 Delivery"],
            ["retiro", "🏪 Retiro"],
          ] as const
        ).map(([modo, etiqueta]) => (
          <button
            key={modo}
            role="radio"
            aria-checked={carrito.modoEntrega === modo}
            onClick={() => carrito.setModoEntrega(modo)}
            className={`min-h-11 rounded-lg text-sm font-bold ${
              carrito.modoEntrega === modo ? "bg-tinta text-white" : "text-tinta-suave"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {/* ── Ítems ── */}
      <ul className="mt-4 divide-y divide-gray-100">
        {carrito.items.map((item) => (
          <li key={item.lineaId} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 font-bold leading-snug">{item.nombre}</p>
              <p className="font-black text-fuego">
                {formatearPrecio(item.precio * item.cantidad)}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-gray-300">
                <button
                  onClick={() => carrito.cambiarCantidad(item.lineaId, item.cantidad - 1)}
                  aria-label={`Restar ${item.nombre}`}
                  className="h-11 w-11 text-lg font-black"
                >
                  −
                </button>
                <span className="w-7 text-center font-black">{item.cantidad}</span>
                <button
                  onClick={() => carrito.cambiarCantidad(item.lineaId, item.cantidad + 1)}
                  aria-label={`Sumar ${item.nombre}`}
                  className="h-11 w-11 text-lg font-black"
                >
                  ＋
                </button>
              </div>
              <button
                onClick={() => carrito.quitar(item.lineaId)}
                className="min-h-11 rounded-xl px-3 text-sm font-bold text-tinta-suave"
              >
                Borrar
              </button>
            </div>
            <input
              type="text"
              value={item.aclaracion ?? ""}
              onChange={(e) => carrito.cambiarAclaracion(item.lineaId, e.target.value)}
              placeholder='Aclaración: "sin verdeo"…'
              maxLength={200}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-marfil px-3 py-2.5 text-sm"
            />
          </li>
        ))}
      </ul>

      <label className="mt-2 block">
        <span className="text-sm font-bold">Aclaración general del pedido</span>
        <input
          type="text"
          value={carrito.aclaracionGeneral}
          onChange={(e) => carrito.setAclaracionGeneral(e.target.value)}
          placeholder="Ej.: tocá timbre, es un regalo…"
          maxLength={500}
          className={estiloCampo}
        />
      </label>

      {/* ── Datos del cliente ── */}
      <h2 className="mt-6 text-lg font-black">Tus datos</h2>
      <div className="mt-2 space-y-3">
        <label className="block">
          <span className="text-sm font-bold">Nombre</span>
          <input
            type="text"
            autoComplete="name"
            value={cliente.nombre}
            onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
            className={estiloCampo}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Teléfono (WhatsApp)</span>
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="11 2345 6789"
            value={cliente.telefono}
            onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
            className={estiloCampo}
          />
        </label>
        {esDelivery ? (
          <>
            <label className="block">
              <span className="text-sm font-bold">Dirección de entrega</span>
              <input
                type="text"
                autoComplete="street-address"
                placeholder="Calle y número, piso/depto"
                value={cliente.direccion}
                onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
                className={estiloCampo}
              />
            </label>
            {hayZonas() && (
              <label className="block">
                <span className="text-sm font-bold">Zona de entrega</span>
                <select
                  value={zonaId}
                  onChange={(e) => setZonaId(e.target.value)}
                  className={estiloCampo}
                >
                  <option value="">Elegí tu zona…</option>
                  {NEGOCIO.entrega.envio.zonas.map((zona) => (
                    <option key={zona.id} value={zona.id}>
                      {zona.nombre} — envío {formatearPrecio(zona.costo)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-sm font-bold">Referencias (opcional)</span>
              <input
                type="text"
                placeholder="Ej.: portón negro, timbre B"
                value={cliente.referencias}
                onChange={(e) => setCliente({ ...cliente, referencias: e.target.value })}
                className={estiloCampo}
              />
            </label>
          </>
        ) : (
          <p className="rounded-xl bg-marfil px-3 py-3 text-sm">
            🏪 Retirás por el local: {NEGOCIO.entrega.direccionLocal}
          </p>
        )}
      </div>

      {/* ── Pago ── */}
      <h2 className="mt-6 text-lg font-black">¿Cómo pagás?</h2>
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de pago">
        {(
          [
            ["efectivo", "💵 Efectivo"],
            ["transferencia", "📲 Transferencia"],
          ] as const
        ).map(([metodo, etiqueta]) => (
          <button
            key={metodo}
            role="radio"
            aria-checked={metodoPago === metodo}
            onClick={() => setMetodoPago(metodo)}
            className={`min-h-12 rounded-xl border-2 px-3 font-bold ${
              metodoPago === metodo
                ? "border-fuego bg-fuego-claro text-fuego"
                : "border-gray-200 text-tinta-suave"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {metodoPago === "efectivo" ? (
        <div className="mt-3 rounded-xl bg-marfil p-3">
          <label className="block">
            <span className="text-sm font-bold">¿Con cuánto pagás?</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej.: 50.000"
              value={montoJusto ? "" : pagaCon}
              disabled={montoJusto}
              onChange={(e) => setPagaCon(e.target.value)}
              className={`${estiloCampo} disabled:opacity-50`}
            />
          </label>
          {!montoJusto && sugerenciasDePago(total).length > 0 && (
            <div className="mt-2 flex gap-2">
              {sugerenciasDePago(total).map((monto) => (
                <button
                  key={monto}
                  onClick={() => setPagaCon(String(monto))}
                  className={`min-h-11 rounded-full border px-4 text-sm font-bold ${
                    parsearMonto(pagaCon) === monto
                      ? "border-fuego bg-fuego-claro text-fuego"
                      : "border-gray-300 bg-white text-tinta-suave"
                  }`}
                >
                  {formatearPrecio(monto)}
                </button>
              ))}
            </div>
          )}
          <label className="mt-2 flex min-h-11 items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={montoJusto}
              onChange={(e) => setMontoJusto(e.target.checked)}
              className="h-5 w-5 accent-fuego"
            />
            Pago con monto justo
          </label>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-fuego-claro p-3 text-sm">
          <p>
            Al confirmar te mostramos el <b>alias de Mercado Pago</b> y el monto exacto
            para transferir, con un botón para mandar el comprobante por WhatsApp.
          </p>
          <p className="mt-2 font-black text-fuego">
            ⚠️ {NEGOCIO.textos.avisoTransferencia}.
          </p>
        </div>
      )}

      {/* ── Total + confirmar (barra fija) ── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <div className="flex justify-between text-sm text-tinta-suave">
            <span>Subtotal</span>
            <span>{formatearPrecio(carrito.subtotal)}</span>
          </div>
          {esDelivery && (
            <div className="flex justify-between text-sm text-tinta-suave">
              <span>Envío</span>
              <span>{faltaZona ? "según zona" : formatearPrecio(costoEnvio)}</span>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-1 rounded-lg bg-fuego-claro px-3 py-2 text-sm font-bold text-fuego">
              {error}
            </p>
          )}
          {!calculado || abierto ? (
            <button
              onClick={confirmarPedido}
              disabled={enviando || !carrito.listo || !calculado}
              className="mt-2 flex min-h-14 w-full items-center justify-between rounded-xl bg-fuego px-5 font-black text-white active:bg-fuego-oscuro disabled:opacity-60"
            >
              <span>{enviando ? "Enviando…" : "Confirmar pedido"}</span>
              <span>{formatearPrecio(total)}</span>
            </button>
          ) : (
            <div className="mt-2 grid min-h-14 place-items-center rounded-xl bg-gray-200 px-5 text-center font-black text-tinta-suave">
              Cerrado ahora — abrimos {proxima}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
