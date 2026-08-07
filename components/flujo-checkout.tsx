"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Acompanamiento, PedidoEntrante, Producto, RespuestaApiPedidos } from "@/lib/tipos";
import type { HorariosSemana } from "@/lib/horarios";
import { formatearPrecio } from "@/lib/precio";
import { telefonoValido } from "@/lib/validacion";
import { costoEnvioDelivery, hayZonas } from "@/lib/envio";
import { useAbierto } from "@/lib/use-abierto";
import { guardarUltimoPedido } from "@/lib/ultimo-pedido";
import { registrarEvento } from "@/lib/analytics";
import { CLAVE_CLIENTE, useCarrito, type DatosCliente } from "@/components/carrito";
import { PasoAcompanamientos } from "@/components/paso-acompanamientos";
import { NEGOCIO } from "@/config/negocio";

type ConfigCheckout = {
  costoEnvio: number;
  pedidoMinimo: number;
  direccionLocal: string;
  avisoTransferencia: string;
};

type Paso = "carrito" | "acompanamientos" | "datos";

/** El monto en efectivo se escribe como sea ("50.000", "50000"): solo cuentan los dígitos */
function parsearMonto(texto: string): number {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? Number(digitos) : NaN;
}

/** Sugerencias de billetes: totales redondos con los que la gente suele pagar */
function sugerenciasDePago(total: number): number[] {
  const redondeos = [10_000, 20_000, 50_000].map((paso) => Math.ceil(total / paso) * paso);
  return Array.from(new Set(redondeos))
    .filter((monto) => monto > total)
    .slice(0, 3);
}

export function FlujoCheckout({
  acompanamientos,
  sugeridos,
  config,
  horarios,
  estadoInicial,
}: {
  acompanamientos: Acompanamiento[];
  sugeridos: Producto[];
  config: ConfigCheckout;
  horarios: HorariosSemana;
  estadoInicial: { abierto: boolean; proxima: string };
}) {
  const router = useRouter();
  const carrito = useCarrito();
  const { abierto, proxima, calculado } = useAbierto(estadoInicial, horarios);

  const [paso, setPaso] = useState<Paso>("carrito");
  const [cliente, setCliente] = useState<DatosCliente>({
    nombre: "",
    telefono: "",
    direccion: "",
    referencias: "",
  });
  const [zonaId, setZonaId] = useState("");
  const [envioServidor, setEnvioServidor] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [pagaCon, setPagaCon] = useState("");
  const [montoJusto, setMontoJusto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [error, setError] = useState("");
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
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
          direccion: typeof datos.direccion === "string" ? datos.direccion : previo.direccion,
          referencias:
            typeof datos.referencias === "string" ? datos.referencias : previo.referencias,
        }));
      }
    } catch {
      // sin datos guardados
    }
  }, []);

  const esDelivery = carrito.modoEntrega === "delivery";

  useEffect(() => {
    setEnvioServidor(null);
  }, [zonaId, carrito.modoEntrega]);

  const costoEnvio = esDelivery
    ? (envioServidor ?? costoEnvioDelivery(zonaId || undefined) ?? config.costoEnvio)
    : 0;
  const faltaZona = esDelivery && hayZonas() && !zonaId;

  const totalAcompanamientos =
    acompanamientos.reduce(
      (suma, a) =>
        suma +
        (a.tipo === "palitos"
          ? (carrito.acompanamientos.palitos ?? 0) * a.precio
          : (carrito.acompanamientos.cantidades[a.id] ?? 0) * a.precio),
      0
    );

  const subtotal = carrito.subtotal + totalAcompanamientos;
  const total = subtotal + costoEnvio;
  const faltaParaMinimo = esDelivery ? Math.max(0, config.pedidoMinimo - subtotal) : 0;

  function validarDatos(): boolean {
    const errores: Record<string, string> = {};
    if (!cliente.nombre.trim()) errores.nombre = "Necesitamos tu nombre.";
    if (!telefonoValido(cliente.telefono)) {
      errores.telefono = "Revisá el teléfono: usá el formato 11 2345 6789.";
    }
    if (esDelivery && !cliente.direccion.trim()) {
      errores.direccion = "Poné calle y número.";
    }
    if (esDelivery && cliente.direccion.trim() && !/\d/.test(cliente.direccion)) {
      errores.direccion = "Falta la altura (el número de la calle).";
    }
    if (faltaZona) errores.zona = "Elegí tu zona de entrega.";
    if (metodoPago === "efectivo" && !montoJusto) {
      const monto = parsearMonto(pagaCon);
      if (!Number.isFinite(monto)) {
        errores.pagaCon = "Decinos con cuánto pagás (o marcá monto justo).";
      } else if (monto < total) {
        errores.pagaCon = `Tiene que cubrir el total (${formatearPrecio(total)}).`;
      }
    }
    setErroresCampo(errores);
    return Object.keys(errores).length === 0;
  }

  async function confirmarPedido() {
    if (carrito.items.length === 0) {
      setError("El carrito está vacío.");
      return;
    }
    if (faltaParaMinimo > 0) {
      setError(
        `Te faltan ${formatearPrecio(faltaParaMinimo)} para llegar al mínimo de delivery.`
      );
      return;
    }
    if (!validarDatos()) return;

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
        modificadores: i.modificadores.map((m) => ({
          grupoId: m.grupoId,
          opcionIds: m.opcionIds,
        })),
      })),
      acompanamientos: carrito.acompanamientos,
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
          ? { metodo: "efectivo", pagaCon: montoJusto ? "justo" : parsearMonto(pagaCon) }
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
        if (datos.preciosActualizados?.length) {
          carrito.actualizarPrecios(datos.preciosActualizados);
        }
        if (typeof datos.costoEnvioActualizado === "number") {
          setEnvioServidor(datos.costoEnvioActualizado);
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
      registrarEvento("purchase", {
        numero: datos.pedido.numero,
        valor: datos.pedido.total,
        entrega: datos.pedido.modoEntrega,
      });
      setPedidoEnviado(true);
      carrito.vaciar();
      router.push("/confirmacion");
    } catch {
      // El carrito NO se toca: el cliente reintenta sin perder nada
      setError("No pudimos enviar el pedido. Tu carrito sigue guardado, probá de nuevo.");
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

  // ── Paso intermedio: salsas y palitos ──
  if (paso === "acompanamientos") {
    return (
      <PasoAcompanamientos
        acompanamientos={acompanamientos}
        onVolver={() => setPaso("carrito")}
        onContinuar={() => setPaso("datos")}
      />
    );
  }

  const estiloCampo = "mt-1 w-full rounded-xl border px-3 py-3 text-base";
  const claseCampo = (campo: string) =>
    `${estiloCampo} ${erroresCampo[campo] ? "border-fuego" : "border-gray-300"}`;
  const sugerencias = sugerenciasDePago(total);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-44 pt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (paso === "datos" ? setPaso("carrito") : router.push("/"))}
          aria-label="Volver"
          className="grid h-11 w-11 place-items-center rounded-full bg-marfil text-lg"
        >
          ←
        </button>
        <h1 className="text-xl font-black">{paso === "carrito" ? "Tu pedido" : "Entrega y pago"}</h1>
      </div>

      {/* Indicador de pasos */}
      <ol className="mt-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide">
        {(
          [
            ["carrito", "Pedido"],
            ...(acompanamientos.length > 0 ? [["acompanamientos", "Salsas"] as const] : []),
            ["datos", "Entrega"],
          ] as const
        ).map(([clave, etiqueta], i, todos) => {
          const indiceActual = todos.findIndex(([c]) => c === paso);
          const activo = i <= indiceActual;
          return (
            <li key={clave} className="flex flex-1 items-center gap-1.5">
              <span
                className={`h-1.5 flex-1 rounded-full ${activo ? "bg-fuego" : "bg-gray-200"}`}
              />
              <span className={activo ? "text-fuego" : "text-gray-400"}>{etiqueta}</span>
            </li>
          );
        })}
      </ol>

      {paso === "carrito" ? (
        <>
          {/* Modo de entrega */}
          <div
            role="radiogroup"
            aria-label="Modo de entrega"
            className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-marfil p-1"
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
                onClick={() => {
                  carrito.setModoEntrega(modo);
                  registrarEvento("select_delivery", { modo });
                }}
                className={`min-h-11 rounded-lg text-sm font-bold ${
                  carrito.modoEntrega === modo ? "bg-tinta text-white" : "text-tinta-suave"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {/* Ítems */}
          <ul className="mt-4 divide-y divide-gray-100">
            {carrito.items.map((item) => (
              <li key={item.lineaId} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold uppercase leading-snug">{item.nombre}</p>
                    {item.modificadores.length > 0 && (
                      <p className="text-xs text-tinta-suave">
                        {item.modificadores.map((m) => m.etiqueta).join(" · ")}
                      </p>
                    )}
                  </div>
                  <p className="font-black">{formatearPrecio(item.precio * item.cantidad)}</p>
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
                    onClick={() => {
                      registrarEvento("remove_from_cart", { id: item.productoId });
                      carrito.quitar(item.lineaId);
                    }}
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
              className={estiloCampo + " border-gray-300"}
            />
          </label>

          {/* Upsell discreto */}
          {sugeridos.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-black">¿Querés agregar algo más?</h2>
              <ul className="mt-2 flex gap-2 overflow-x-auto pb-2 sin-scrollbar">
                {sugeridos.map((p) => (
                  <li key={p.id} className="w-36 shrink-0 rounded-2xl border border-gray-200 p-2">
                    {p.imagen && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imagen}
                        alt=""
                        loading="lazy"
                        className="h-20 w-full rounded-xl object-cover"
                      />
                    )}
                    <p className="mt-1.5 line-clamp-2 text-xs font-black uppercase leading-tight">
                      {p.nombre}
                    </p>
                    <p className="text-sm font-black">{formatearPrecio(p.precio)}</p>
                    <button
                      onClick={() =>
                        carrito.agregar({
                          productoId: p.id,
                          nombre: p.nombre,
                          precio: p.precio,
                        })
                      }
                      className="mt-1 min-h-9 w-full rounded-lg bg-marfil text-xs font-black"
                    >
                      Agregar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <>
          {/* ── Datos del cliente ── */}
          <h2 className="mt-5 text-lg font-black">Tus datos</h2>
          <div className="mt-2 space-y-3">
            <label className="block">
              <span className="text-sm font-bold">Nombre</span>
              <input
                type="text"
                autoComplete="name"
                value={cliente.nombre}
                onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                className={claseCampo("nombre")}
              />
              {erroresCampo.nombre && (
                <span className="mt-1 block text-sm font-bold text-fuego">{erroresCampo.nombre}</span>
              )}
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
                className={claseCampo("telefono")}
              />
              {erroresCampo.telefono && (
                <span className="mt-1 block text-sm font-bold text-fuego">
                  {erroresCampo.telefono}
                </span>
              )}
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
                    className={claseCampo("direccion")}
                  />
                  {erroresCampo.direccion && (
                    <span className="mt-1 block text-sm font-bold text-fuego">
                      {erroresCampo.direccion}
                    </span>
                  )}
                </label>
                {hayZonas() && (
                  <label className="block">
                    <span className="text-sm font-bold">Zona de entrega</span>
                    <select
                      value={zonaId}
                      onChange={(e) => setZonaId(e.target.value)}
                      className={claseCampo("zona")}
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
                    className={estiloCampo + " border-gray-300"}
                  />
                </label>
              </>
            ) : (
              <p className="rounded-xl bg-marfil px-3 py-3 text-sm">
                🏪 Retirás por el local: {config.direccionLocal}
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
                  className={`${claseCampo("pagaCon")} disabled:opacity-50`}
                />
                {erroresCampo.pagaCon && (
                  <span className="mt-1 block text-sm font-bold text-fuego">
                    {erroresCampo.pagaCon}
                  </span>
                )}
              </label>
              {!montoJusto && sugerencias.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {sugerencias.map((monto) => (
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
              <p className="mt-2 font-black text-fuego">⚠️ {config.avisoTransferencia}.</p>
            </div>
          )}

          {/* ── Resumen final ── */}
          <section className="mt-6 rounded-2xl bg-marfil p-4 text-sm">
            <h2 className="font-black">Resumen</h2>
            <ul className="mt-2 space-y-1">
              {carrito.items.map((i) => (
                <li key={i.lineaId} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {i.cantidad}× {i.nombre}
                    {i.modificadores.length > 0 && (
                      <span className="text-tinta-suave">
                        {" "}
                        ({i.modificadores.map((m) => m.etiqueta).join(", ")})
                      </span>
                    )}
                  </span>
                  <span className="shrink-0">{formatearPrecio(i.precio * i.cantidad)}</span>
                </li>
              ))}
              {acompanamientos
                .filter(
                  (a) =>
                    (a.tipo === "palitos"
                      ? carrito.acompanamientos.palitos
                      : carrito.acompanamientos.cantidades[a.id]) ?? 0
                )
                .map((a) => {
                  const cantidad =
                    a.tipo === "palitos"
                      ? (carrito.acompanamientos.palitos ?? 0)
                      : (carrito.acompanamientos.cantidades[a.id] ?? 0);
                  if (cantidad === 0) return null;
                  return (
                    <li key={a.id} className="flex justify-between gap-3 text-tinta-suave">
                      <span>
                        {cantidad}× {a.nombre}
                      </span>
                      <span>{a.precio === 0 ? "sin cargo" : formatearPrecio(a.precio * cantidad)}</span>
                    </li>
                  );
                })}
            </ul>
            <div className="mt-3 space-y-0.5 border-t border-gray-300 pt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatearPrecio(subtotal)}</span>
              </div>
              {esDelivery && (
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>{faltaZona ? "según zona" : formatearPrecio(costoEnvio)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black">
                <span>Total</span>
                <span className="text-fuego">{formatearPrecio(total)}</span>
              </div>
            </div>
            <p className="mt-2 text-tinta-suave">
              {esDelivery ? `🛵 Delivery a ${cliente.direccion || "…"}` : "🏪 Retiro por el local"}
            </p>
          </section>
        </>
      )}

      {/* ── Barra fija inferior ── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <div className="flex justify-between text-sm text-tinta-suave">
            <span>{paso === "carrito" ? "Subtotal" : "Total"}</span>
            <span className="font-black text-tinta">
              {formatearPrecio(paso === "carrito" ? subtotal : total)}
            </span>
          </div>
          {faltaParaMinimo > 0 && (
            <p className="mt-1 text-sm font-bold text-fuego">
              Te faltan {formatearPrecio(faltaParaMinimo)} para el mínimo de delivery
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-1 rounded-lg bg-fuego-claro px-3 py-2 text-sm font-bold text-fuego"
            >
              {error}
            </p>
          )}

          {!calculado || abierto ? (
            paso === "carrito" ? (
              <button
                onClick={() => setPaso(acompanamientos.length > 0 ? "acompanamientos" : "datos")}
                disabled={!carrito.listo || carrito.items.length === 0}
                className="mt-2 min-h-14 w-full rounded-xl bg-fuego font-black text-white active:bg-fuego-oscuro disabled:opacity-60"
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={confirmarPedido}
                disabled={enviando || !carrito.listo || !calculado}
                className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-fuego px-5 font-black text-white active:bg-fuego-oscuro disabled:opacity-60"
              >
                {enviando ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Enviando…
                  </>
                ) : (
                  "Confirmar pedido"
                )}
              </button>
            )
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
