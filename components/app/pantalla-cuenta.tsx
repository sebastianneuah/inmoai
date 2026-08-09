"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Catalogo, Producto } from "@/lib/tipos";
import { formatearPrecio } from "@/lib/precio";
import { CLAVE_CLIENTE, useCarrito, type DatosCliente } from "@/components/carrito";
import { useFavoritos } from "@/lib/favoritos";
import { fechaAmable, leerHistorial, type PedidoHistorial } from "@/lib/historial";
import { CardProducto } from "@/components/app/card-producto";
import { HojaProducto } from "@/components/app/hoja-producto";
import { BarraPedido } from "@/components/app/barra-pedido";

/**
 * Mi cuenta sin obligar a registrarse: los datos, las direcciones, los
 * favoritos y el historial viven en el celular del cliente. Se puede comprar
 * como invitado toda la vida.
 */
export function PantallaCuenta({ catalogo }: { catalogo: Catalogo }) {
  const router = useRouter();
  const carrito = useCarrito();
  const { favoritos } = useFavoritos();
  const [cliente, setCliente] = useState<DatosCliente>({
    nombre: "",
    telefono: "",
    direccion: "",
    referencias: "",
  });
  const [historial, setHistorial] = useState<PedidoHistorial[]>([]);
  const [productoAbierto, setProductoAbierto] = useState<Producto | null>(null);
  const [repitiendo, setRepitiendo] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    setHistorial(leerHistorial());
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
      // primera visita
    }
  }, []);

  function guardarDatos(nuevos: DatosCliente) {
    setCliente(nuevos);
    try {
      localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(nuevos));
    } catch {
      // sin espacio: se piden de nuevo en el checkout
    }
  }

  /** Repetir pedido: siempre revalidado contra el catálogo de hoy. */
  async function repetir(pedido: PedidoHistorial) {
    setRepitiendo(pedido.numero);
    setAviso("");
    try {
      const respuesta = await fetch("/api/pedidos/revalidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pedido.items }),
      });
      const datos = (await respuesta.json()) as {
        ok: boolean;
        disponibles: {
          productoId: string;
          nombre: string;
          precio: number;
          cantidad: number;
          aclaracion?: string;
          requiereEleccion: boolean;
        }[];
        noDisponibles: string[];
      };
      if (!datos.ok) throw new Error();

      // Los productos con opciones obligatorias se eligen a mano: no adivinamos
      const directos = datos.disponibles.filter((p) => !p.requiereEleccion);
      for (const item of directos) {
        carrito.agregar(
          {
            productoId: item.productoId,
            nombre: item.nombre,
            precio: item.precio,
            aclaracion: item.aclaracion,
          },
          item.cantidad
        );
      }
      const conOpciones = datos.disponibles.length - directos.length;
      const partes: string[] = [];
      if (directos.length > 0) partes.push(`${directos.length} agregados`);
      if (conOpciones > 0) partes.push(`${conOpciones} necesitan que elijas opciones`);
      if (datos.noDisponibles.length > 0) {
        partes.push(`${datos.noDisponibles.length} ya no están disponibles`);
      }
      setAviso(partes.join(" · "));
      if (directos.length > 0) setTimeout(() => router.push("/pedido"), 900);
    } catch {
      setAviso("No pudimos repetir el pedido. Probá de nuevo.");
    }
    setRepitiendo(null);
  }

  const guardados = catalogo.productos.filter((p) => favoritos.includes(p.id));
  const campo = "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base";

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4">
      <h1 className="text-2xl font-black">Mi cuenta</h1>
      <p className="mt-0.5 text-sm text-tinta-suave">
        Guardamos todo en este celular: no hace falta crear una cuenta para pedir.
      </p>

      {/* Datos */}
      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black">Tus datos</h2>
        <label className="mt-2 block text-sm font-bold">
          Nombre
          <input
            type="text"
            autoComplete="name"
            value={cliente.nombre}
            onChange={(e) => guardarDatos({ ...cliente, nombre: e.target.value })}
            className={campo}
          />
        </label>
        <label className="mt-2 block text-sm font-bold">
          Teléfono
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="11 2345 6789"
            value={cliente.telefono}
            onChange={(e) => guardarDatos({ ...cliente, telefono: e.target.value })}
            className={campo}
          />
        </label>
      </section>

      {/* Direcciones */}
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-black">Dirección de entrega</h2>
        <label className="mt-2 block text-sm font-bold">
          Calle y número
          <input
            type="text"
            autoComplete="street-address"
            placeholder="Av. Santa Fe 3253, 2°B"
            value={cliente.direccion}
            onChange={(e) => guardarDatos({ ...cliente, direccion: e.target.value })}
            className={campo}
          />
        </label>
        <label className="mt-2 block text-sm font-bold">
          Referencias
          <input
            type="text"
            placeholder="Portón negro, timbre B"
            value={cliente.referencias}
            onChange={(e) => guardarDatos({ ...cliente, referencias: e.target.value })}
            className={campo}
          />
        </label>
      </section>

      {/* Pedidos anteriores */}
      <section className="mt-6">
        <h2 className="text-lg font-black">Pedidos anteriores</h2>
        {aviso && (
          <p className="mt-2 rounded-xl bg-fuego-claro px-3 py-2 text-sm font-bold text-fuego">
            {aviso}
          </p>
        )}
        {historial.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-4 text-sm text-tinta-suave shadow-sm">
            Todavía no hiciste ningún pedido.{" "}
            <Link href="/" className="font-bold text-fuego underline">
              Mirá el menú
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {historial.map((pedido) => (
              <li key={pedido.numero} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold capitalize">{fechaAmable(pedido.creadoEn)}</p>
                    <p className="text-xs text-tinta-suave">
                      #{pedido.numero} ·{" "}
                      {pedido.modoEntrega === "delivery" ? "Delivery" : "Retiro"}
                    </p>
                  </div>
                  <p className="shrink-0 font-black">{formatearPrecio(pedido.total)}</p>
                </div>
                <ul className="mt-2 text-sm text-tinta-suave">
                  {pedido.items.map((item, i) => (
                    <li key={i}>
                      {item.cantidad}× {item.nombre}
                    </li>
                  ))}
                  {pedido.acompanamientos.map((a, i) => (
                    <li key={`a-${i}`}>
                      {a.cantidad}× {a.nombre}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => repetir(pedido)}
                  disabled={repitiendo === pedido.numero}
                  className="mt-3 min-h-11 w-full rounded-xl bg-tinta font-black text-white disabled:opacity-60"
                >
                  {repitiendo === pedido.numero ? "Revisando precios…" : "Repetir pedido"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Favoritos */}
      <section className="mt-6">
        <h2 className="text-lg font-black">♡ Favoritos</h2>
        {guardados.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-4 text-sm text-tinta-suave shadow-sm">
            Tocá el corazón de un producto para tenerlo siempre a mano.
          </p>
        ) : (
          <ul className="mt-2 space-y-2.5">
            {guardados.map((producto) => (
              <CardProducto
                key={producto.id}
                producto={producto}
                onAbrir={() => setProductoAbierto(producto)}
              />
            ))}
          </ul>
        )}
      </section>

      {productoAbierto && (
        <HojaProducto producto={productoAbierto} onCerrar={() => setProductoAbierto(null)} />
      )}
      <BarraPedido />
    </main>
  );
}
