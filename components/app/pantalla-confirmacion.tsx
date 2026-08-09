"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Publicidad } from "@/lib/tienda/publicidades";
import type { PedidoConfirmado } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { linkWhatsApp, mensajeComprobante, mensajeRespaldoPedido } from "@/lib/whatsapp";
import { leerUltimoPedido } from "@/lib/ultimo-pedido";
import { BannerPublicidad } from "@/components/app/publicidad";

/**
 * Confirmación del pedido: número, estado, instrucciones de pago y — recién
 * después de todo eso — un espacio promocional. Nunca antes de confirmar.
 */
export function PantallaConfirmacion({ ad }: { ad?: Publicidad }) {
  const [pedido, setPedido] = useState<PedidoConfirmado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aliasCopiado, setAliasCopiado] = useState(false);

  useEffect(() => {
    setPedido(leerUltimoPedido());
    setCargando(false);
  }, []);

  async function copiarAlias(alias: string) {
    try {
      await navigator.clipboard.writeText(alias);
      setAliasCopiado(true);
      setTimeout(() => setAliasCopiado(false), 2500);
    } catch {
      // el alias queda visible para copiar a mano
    }
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-8">
        <div className="h-32 animate-pulse rounded-2xl bg-white" />
      </main>
    );
  }

  if (!pedido) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-black">No encontramos un pedido reciente</p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl bg-fuego px-6 py-3.5 font-black text-white"
        >
          Ir al menú
        </Link>
      </main>
    );
  }

  const esTransferencia = pedido.pago.metodo === "transferencia";
  const tieneWhatsApp = Boolean(pedido.datosPago.whatsappNumero);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-8 pt-6">
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl">
          ✓
        </span>
        <h1 className="mt-3 text-2xl font-black">¡Pedido confirmado!</h1>
        <p className="mt-1 text-lg">
          Número: <b className="text-fuego">#{pedido.numero}</b>
        </p>
        <p className="mt-1 text-sm text-tinta-suave">
          {pedido.modoEntrega === "delivery" ? "🛵 Llega en" : "🏪 Lo retirás en"}{" "}
          <b>{pedido.tiempoEstimado}</b>
        </p>
      </div>

      {/* Si la inyección a Fudo falló, el cliente reenvía el pedido al local */}
      {pedido.falloInyeccion && (
        <div className="mt-4 rounded-2xl border-2 border-fuego bg-fuego-claro p-4">
          <p className="font-black text-fuego">📢 Un paso más para asegurar tu pedido</p>
          <p className="mt-1 text-sm">
            Tuvimos un problema técnico para pasar el pedido a cocina. Tocá el botón y
            mandanos el detalle por WhatsApp (ya va escrito): así lo cargamos al toque.
          </p>
          {tieneWhatsApp ? (
            <a
              href={linkWhatsApp(pedido.datosPago.whatsappNumero, mensajeRespaldoPedido(pedido))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 grid min-h-13 place-items-center rounded-xl bg-fuego px-4 py-3.5 text-center font-black text-white active:bg-fuego-oscuro"
            >
              📲 Enviar mi pedido por WhatsApp
            </a>
          ) : (
            <p className="mt-3 text-sm font-bold">
              Llamá o escribí al local con tu número de pedido #{pedido.numero}.
            </p>
          )}
        </div>
      )}

      {/* Instrucciones de pago */}
      {esTransferencia ? (
        <div className="mt-4 rounded-2xl border-2 border-tinta bg-white p-4">
          <h2 className="text-lg font-black">Transferí {formatearPrecio(pedido.total)}</h2>
          {pedido.datosPago.aliasMp ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-marfil p-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-tinta-suave">Alias</p>
                <p className="break-all text-lg font-black">{pedido.datosPago.aliasMp}</p>
              </div>
              <button
                onClick={() => copiarAlias(pedido.datosPago.aliasMp)}
                className="min-h-11 shrink-0 rounded-xl bg-tinta px-4 text-sm font-black text-white"
              >
                {aliasCopiado ? "¡Copiado!" : "Copiar alias"}
              </button>
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-marfil p-3 text-sm font-bold">
              Escribinos por WhatsApp y te pasamos el alias para transferir.
            </p>
          )}
          <p className="mt-3 rounded-xl bg-fuego-claro px-3 py-2 text-center text-sm font-black text-fuego">
            ⚠️ Tu pedido se prepara cuando recibimos el comprobante
          </p>
          {tieneWhatsApp && (
            <a
              href={linkWhatsApp(pedido.datosPago.whatsappNumero, mensajeComprobante(pedido))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 grid min-h-13 place-items-center rounded-xl bg-fuego px-4 py-3.5 text-center font-black text-white active:bg-fuego-oscuro"
            >
              📲 Enviar comprobante por WhatsApp
            </a>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border-2 border-tinta bg-white p-4">
          <h2 className="text-lg font-black">Pagás en efectivo</h2>
          <p className="mt-1 text-sm">
            {pedido.pago.metodo === "efectivo" && pedido.pago.pagaCon === "justo" ? (
              <>Pagás {formatearPrecio(pedido.total)} con monto justo. ¡Gracias!</>
            ) : (
              <>
                Pagás con{" "}
                {pedido.pago.metodo === "efectivo" &&
                  formatearPrecio(Number(pedido.pago.pagaCon))}{" "}
                — te preparamos {formatearPrecio(pedido.vuelto)} de vuelto.
              </>
            )}
          </p>
        </div>
      )}

      {/* Espacio promocional: recién acá, con la venta ya cerrada */}
      <div className="-mx-4">
        <BannerPublicidad publicidad={ad} slot="confirmacion" compacto />
      </div>

      {/* Resumen */}
      <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black">Resumen</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {pedido.items.map((item, indice) => (
            <li key={indice} className="flex justify-between gap-3">
              <span>
                {item.cantidad}× {item.nombre}
                {item.modificadores?.length > 0 && (
                  <span className="text-tinta-suave">
                    {" "}
                    ({item.modificadores.map((m) => m.nombre).join(", ")})
                  </span>
                )}
                {item.aclaracion && (
                  <span className="text-tinta-suave"> ({item.aclaracion})</span>
                )}
              </span>
              <span className="shrink-0">
                {formatearPrecio(item.precioUnitario * item.cantidad)}
              </span>
            </li>
          ))}
          {pedido.acompanamientos?.map((a, indice) => (
            <li key={`acomp-${indice}`} className="flex justify-between gap-3 text-tinta-suave">
              <span>
                {a.cantidad}× {a.nombre}
              </span>
              <span className="shrink-0">
                {a.precioUnitario === 0
                  ? "sin cargo"
                  : formatearPrecio(a.precioUnitario * a.cantidad)}
              </span>
            </li>
          ))}
        </ul>
        {pedido.aclaracionGeneral && (
          <p className="mt-2 text-sm text-tinta-suave">Nota: {pedido.aclaracionGeneral}</p>
        )}
        <div className="mt-3 border-t border-gray-200 pt-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatearPrecio(pedido.subtotal)}</span>
          </div>
          {pedido.costoEnvio > 0 && (
            <div className="flex justify-between">
              <span>Envío</span>
              <span>{formatearPrecio(pedido.costoEnvio)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-base font-black">
            <span>Total</span>
            <span className="text-fuego">{formatearPrecio(pedido.total)}</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-tinta-suave">
          {pedido.modoEntrega === "delivery" ? (
            <>
              🛵 Va a: {pedido.cliente.direccion}
              {pedido.cliente.referencias && <> ({pedido.cliente.referencias})</>}
              {pedido.zonaEnvio && <> — Zona: {pedido.zonaEnvio}</>}
            </>
          ) : (
            <>🏪 Retirás por el local</>
          )}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href="/"
          className="grid min-h-12 flex-1 place-items-center rounded-xl bg-white font-black shadow-sm"
        >
          Volver al menú
        </Link>
        <Link
          href="/cuenta"
          className="grid min-h-12 flex-1 place-items-center rounded-xl bg-tinta font-black text-white"
        >
          Mis pedidos
        </Link>
      </div>
    </main>
  );
}
