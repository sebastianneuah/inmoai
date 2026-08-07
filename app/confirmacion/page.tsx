"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NEGOCIO } from "@/config/negocio";
import { formatearPrecio } from "@/lib/precio";
import {
  linkWhatsApp,
  mensajeComprobante,
  mensajeRespaldoPedido,
} from "@/lib/whatsapp";
import { leerUltimoPedido } from "@/lib/ultimo-pedido";
import type { PedidoConfirmado } from "@/lib/tipos";

/**
 * Pantalla de confirmación: número de pedido, resumen, tiempo estimado e
 * instrucciones de pago. Si el pago es por transferencia, acá vive el bloque
 * del alias + botón de WhatsApp para el comprobante.
 */
export default function PaginaConfirmacion() {
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

  if (cargando) return null;

  if (!pedido) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-bold">No encontramos un pedido reciente</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-fuego px-6 py-3 font-black text-white"
        >
          Ir al menú
        </Link>
      </main>
    );
  }

  const esTransferencia = pedido.pago.metodo === "transferencia";
  const tieneWhatsApp = Boolean(pedido.datosPago.whatsappNumero);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          ✅
        </p>
        <h1 className="mt-2 text-2xl font-black">¡Pedido confirmado!</h1>
        <p className="mt-1 text-lg">
          Número: <b className="text-fuego">#{pedido.numero}</b>
        </p>
        <p className="mt-1 text-sm text-tinta-suave">
          {pedido.modoEntrega === "delivery" ? "🛵 Llega en" : "🏪 Lo retirás en"}{" "}
          <b>{pedido.tiempoEstimado}</b>
        </p>
      </div>

      {/* Aviso si la inyección a Fudo falló: el cliente reenvía el pedido al local */}
      {pedido.falloInyeccion && (
        <div className="mt-5 rounded-2xl border-2 border-fuego bg-fuego-claro p-4">
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
              className="mt-3 grid min-h-14 place-items-center rounded-xl bg-fuego px-4 text-center font-black text-white active:bg-fuego-oscuro"
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
        <div className="mt-5 rounded-2xl border-2 border-tinta p-4">
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
            ⚠️ {NEGOCIO.textos.avisoTransferencia}
          </p>
          {tieneWhatsApp && (
            <a
              href={linkWhatsApp(pedido.datosPago.whatsappNumero, mensajeComprobante(pedido))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 grid min-h-14 place-items-center rounded-xl bg-fuego px-4 text-center font-black text-white active:bg-fuego-oscuro"
            >
              📲 Enviar comprobante por WhatsApp
            </a>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border-2 border-tinta p-4">
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

      {/* Resumen */}
      <div className="mt-5 rounded-2xl bg-marfil p-4">
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
        <div className="mt-3 border-t border-gray-300 pt-2 text-sm">
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
            <>🏪 Retirás por: {NEGOCIO.entrega.direccionLocal}</>
          )}
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 block text-center text-sm font-bold text-tinta-suave underline"
      >
        Volver al menú
      </Link>
    </main>
  );
}
