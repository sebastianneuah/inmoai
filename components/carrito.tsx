"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ModoEntrega } from "@/lib/tipos";

/**
 * Estado del carrito, persistido en localStorage para que sobreviva
 * recargas y visitas futuras. Guarda un snapshot de nombre/precio para
 * mostrar en la UI; el servidor recalcula todo al confirmar.
 */

export type ItemEnCarrito = {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  aclaracion?: string;
};

export type DatosCliente = {
  nombre: string;
  telefono: string;
  direccion: string;
  referencias: string;
};

type EstadoCarrito = {
  items: ItemEnCarrito[];
  modoEntrega: ModoEntrega;
  aclaracionGeneral: string;
};

type ContextoCarrito = EstadoCarrito & {
  cantidadTotal: number;
  subtotal: number;
  agregar: (item: Omit<ItemEnCarrito, "cantidad">, cantidad?: number) => void;
  cambiarCantidad: (productoId: string, cantidad: number) => void;
  cambiarAclaracion: (productoId: string, aclaracion: string) => void;
  quitar: (productoId: string) => void;
  vaciar: () => void;
  setModoEntrega: (modo: ModoEntrega) => void;
  setAclaracionGeneral: (texto: string) => void;
  listo: boolean;
};

const CLAVE_CARRITO = "abraham.carrito.v1";
export const CLAVE_CLIENTE = "abraham.cliente.v1";
export const CLAVE_ULTIMO_PEDIDO = "abraham.ultimoPedido.v1";

const estadoInicial: EstadoCarrito = {
  items: [],
  modoEntrega: "delivery",
  aclaracionGeneral: "",
};

const Contexto = createContext<ContextoCarrito | null>(null);

export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoCarrito>(estadoInicial);
  // Evita parpadeo/errores de hidratación: recién leemos localStorage en el cliente
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_CARRITO);
      if (guardado) setEstado({ ...estadoInicial, ...JSON.parse(guardado) });
    } catch {
      // localStorage corrupto o bloqueado: arrancamos con carrito vacío
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(estado));
    } catch {
      // sin espacio o bloqueado: el carrito sigue funcionando en memoria
    }
  }, [estado, listo]);

  const agregar = useCallback(
    (item: Omit<ItemEnCarrito, "cantidad">, cantidad = 1) => {
      setEstado((previo) => {
        const existente = previo.items.find((i) => i.productoId === item.productoId);
        if (existente) {
          return {
            ...previo,
            items: previo.items.map((i) =>
              i.productoId === item.productoId
                ? { ...i, cantidad: Math.min(99, i.cantidad + cantidad) }
                : i
            ),
          };
        }
        return { ...previo, items: [...previo.items, { ...item, cantidad }] };
      });
    },
    []
  );

  const cambiarCantidad = useCallback((productoId: string, cantidad: number) => {
    setEstado((previo) => ({
      ...previo,
      items:
        cantidad < 1
          ? previo.items.filter((i) => i.productoId !== productoId)
          : previo.items.map((i) =>
              i.productoId === productoId ? { ...i, cantidad: Math.min(99, cantidad) } : i
            ),
    }));
  }, []);

  const cambiarAclaracion = useCallback((productoId: string, aclaracion: string) => {
    setEstado((previo) => ({
      ...previo,
      items: previo.items.map((i) =>
        i.productoId === productoId ? { ...i, aclaracion } : i
      ),
    }));
  }, []);

  const quitar = useCallback((productoId: string) => {
    setEstado((previo) => ({
      ...previo,
      items: previo.items.filter((i) => i.productoId !== productoId),
    }));
  }, []);

  const vaciar = useCallback(() => {
    setEstado((previo) => ({ ...estadoInicial, modoEntrega: previo.modoEntrega }));
  }, []);

  const setModoEntrega = useCallback((modo: ModoEntrega) => {
    setEstado((previo) => ({ ...previo, modoEntrega: modo }));
  }, []);

  const setAclaracionGeneral = useCallback((texto: string) => {
    setEstado((previo) => ({ ...previo, aclaracionGeneral: texto }));
  }, []);

  const valor = useMemo<ContextoCarrito>(() => {
    const cantidadTotal = estado.items.reduce((s, i) => s + i.cantidad, 0);
    const subtotal = estado.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    return {
      ...estado,
      cantidadTotal,
      subtotal,
      agregar,
      cambiarCantidad,
      cambiarAclaracion,
      quitar,
      vaciar,
      setModoEntrega,
      setAclaracionGeneral,
      listo,
    };
  }, [
    estado,
    listo,
    agregar,
    cambiarCantidad,
    cambiarAclaracion,
    quitar,
    vaciar,
    setModoEntrega,
    setAclaracionGeneral,
  ]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): ContextoCarrito {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de ProveedorCarrito");
  return contexto;
}
