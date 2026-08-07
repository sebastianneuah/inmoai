"use client";

import { useEffect, useState } from "react";
import { apiAdmin } from "@/components/admin/api";
import { formatearPrecio } from "@/lib/precio";
import type { EstadoPedido, PedidoConfirmado } from "@/lib/tipos";

type PedidoAdmin = {
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

const ESTADOS: EstadoPedido[] = [
  "nuevo", "confirmado", "preparando", "listo", "enviado", "entregado", "cancelado",
];

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  nuevo: "bg-fuego-claro text-fuego",
  confirmado: "bg-blue-100 text-blue-700",
  preparando: "bg-amber-100 text-amber-700",
  listo: "bg-green-100 text-green-700",
  enviado: "bg-indigo-100 text-indigo-700",
  entregado: "bg-gray-100 text-gray-600",
  cancelado: "bg-gray-200 text-gray-500",
};

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState<string | null>(null);

  async function cargar() {
    const r = await apiAdmin<{ pedidos: PedidoAdmin[] }>("/api/admin/pedidos");
    if (r.ok) setPedidos(r.pedidos);
    setCargando(false);
  }
  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 30_000);
    return () => clearInterval(intervalo);
  }, []);

  async function cambiarEstado(id: string, estado: EstadoPedido) {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
    await apiAdmin("/api/admin/pedidos", { metodo: "PATCH", cuerpo: { id, estado } });
  }

  function hora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Pedidos</h1>
        <button onClick={cargar} className="min-h-10 rounded-full bg-white px-4 text-sm font-black shadow-sm">
          ↻ Actualizar
        </button>
      </div>

      {cargando ? (
        <p className="mt-8 text-center text-tinta-suave">Cargando…</p>
      ) : pedidos.length === 0 ? (
        <p className="mt-8 text-center text-tinta-suave">Todavía no hay pedidos.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {pedidos.map((p) => (
            <li key={p.id} className="rounded-2xl bg-white p-3 shadow-sm">
              <button
                onClick={() => setAbierto(abierto === p.id ? null : p.id)}
                className="flex w-full flex-wrap items-center gap-2 text-left"
              >
                <span className="font-black text-fuego">#{p.numero}</span>
                <span className="text-sm text-tinta-suave">{hora(p.creadoEn)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {p.clienteNombre}
                </span>
                <span className="text-sm">{p.modoEntrega === "delivery" ? "🛵" : "🏪"}</span>
                <span className="font-black">{formatearPrecio(p.total)}</span>
                {p.falloInyeccion && (
                  <span title="No entró a Fudo: cargar a mano" className="text-sm">⚠️</span>
                )}
                <select
                  value={p.estado}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => cambiarEstado(p.id, e.target.value as EstadoPedido)}
                  className={`rounded-full px-2 py-1.5 text-xs font-black ${COLOR_ESTADO[p.estado]}`}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado[0].toUpperCase() + estado.slice(1)}
                    </option>
                  ))}
                </select>
              </button>

              {abierto === p.id && (
                <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
                  <ul className="space-y-0.5">
                    {p.detalle.items?.map((item, i) => (
                      <li key={i}>
                        {item.cantidad}× <b>{item.nombre}</b>
                        {item.modificadores?.map((m) => ` · ${m.nombre}`)}
                        {item.aclaracion && (
                          <span className="text-tinta-suave"> ({item.aclaracion})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {(p.detalle.acompanamientos?.length > 0 || p.detalle.palitos > 0) && (
                    <p className="mt-2">
                      <b>Acompañamientos:</b>{" "}
                      {p.detalle.acompanamientos
                        ?.map((a) => `${a.cantidad}× ${a.nombre}`)
                        .join(", ")}
                      {p.detalle.palitos > 0 && ` · ${p.detalle.palitos} pares de palitos`}
                    </p>
                  )}
                  {p.detalle.aclaracionGeneral && (
                    <p className="mt-1 text-tinta-suave">Nota: {p.detalle.aclaracionGeneral}</p>
                  )}
                  <p className="mt-2 text-tinta-suave">
                    📞 {p.clienteTelefono}
                    {p.detalle.cliente?.direccion && <> · 📍 {p.detalle.cliente.direccion}</>}
                  </p>
                  <p className="mt-1">
                    {p.detalle.pago?.metodo === "transferencia"
                      ? "📲 Transferencia — esperar comprobante"
                      : `💵 Efectivo${p.detalle.vuelto > 0 ? ` (vuelto ${formatearPrecio(p.detalle.vuelto)})` : ""}`}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
