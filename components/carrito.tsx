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
 *
 * Cada línea tiene su propio `lineaId`: el mismo producto con aclaraciones
 * distintas ("sin verdeo" / sin nada) son líneas separadas, así ninguna
 * aclaración se pisa ni se pierde.
 */

export type ItemEnCarrito = {
  lineaId: string;
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
  agregar: (
    item: Omit<ItemEnCarrito, "cantidad" | "lineaId">,
    cantidad?: number
  ) => void;
  cambiarCantidad: (lineaId: string, cantidad: number) => void;
  cambiarAclaracion: (lineaId: string, aclaracion: string) => void;
  quitar: (lineaId: string) => void;
  vaciar: () => void;
  setModoEntrega: (modo: ModoEntrega) => void;
  setAclaracionGeneral: (texto: string) => void;
  /** Sincroniza precios cuando el servidor avisa que el catálogo cambió */
  actualizarPrecios: (precios: { productoId: string; precio: number }[]) => void;
  listo: boolean;
};

const CLAVE_CARRITO = "abraham.carrito.v2";
export const CLAVE_CLIENTE = "abraham.cliente.v1";

const estadoInicial: EstadoCarrito = {
  items: [],
  modoEntrega: "delivery",
  aclaracionGeneral: "",
};

function nuevoLineaId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

/**
 * Valida la forma de lo que haya en localStorage: si algo no cierra (versión
 * vieja, corrupción parcial), se descarta esa parte y la app arranca limpia
 * en vez de romperse en el render.
 */
function validarEstadoGuardado(crudo: unknown): EstadoCarrito {
  const estado = { ...estadoInicial };
  if (typeof crudo !== "object" || crudo === null) return estado;
  const objeto = crudo as Record<string, unknown>;

  if (Array.isArray(objeto.items)) {
    estado.items = objeto.items
      .filter(
        (i): i is Record<string, unknown> => typeof i === "object" && i !== null
      )
      .filter(
        (i) =>
          typeof i.productoId === "string" &&
          typeof i.nombre === "string" &&
          typeof i.precio === "number" &&
          Number.isFinite(i.precio) &&
          typeof i.cantidad === "number" &&
          i.cantidad >= 1
      )
      .map((i) => ({
        lineaId: typeof i.lineaId === "string" ? i.lineaId : nuevoLineaId(),
        productoId: i.productoId as string,
        nombre: i.nombre as string,
        precio: i.precio as number,
        cantidad: Math.min(99, Math.floor(i.cantidad as number)),
        aclaracion: typeof i.aclaracion === "string" ? i.aclaracion : undefined,
      }));
  }
  if (objeto.modoEntrega === "delivery" || objeto.modoEntrega === "retiro") {
    estado.modoEntrega = objeto.modoEntrega;
  }
  if (typeof objeto.aclaracionGeneral === "string") {
    estado.aclaracionGeneral = objeto.aclaracionGeneral;
  }
  return estado;
}

const Contexto = createContext<ContextoCarrito | null>(null);

export function ProveedorCarrito({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoCarrito>(estadoInicial);
  // Evita parpadeo/errores de hidratación: recién leemos localStorage en el cliente
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_CARRITO);
      if (guardado) setEstado(validarEstadoGuardado(JSON.parse(guardado)));
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
    (item: Omit<ItemEnCarrito, "cantidad" | "lineaId">, cantidad = 1) => {
      setEstado((previo) => {
        // Solo se fusionan líneas idénticas: mismo producto y misma aclaración
        const existente = previo.items.find(
          (i) =>
            i.productoId === item.productoId &&
            (i.aclaracion ?? "") === (item.aclaracion ?? "")
        );
        if (existente) {
          return {
            ...previo,
            items: previo.items.map((i) =>
              i.lineaId === existente.lineaId
                ? { ...i, cantidad: Math.min(99, i.cantidad + cantidad) }
                : i
            ),
          };
        }
        return {
          ...previo,
          items: [...previo.items, { ...item, cantidad, lineaId: nuevoLineaId() }],
        };
      });
    },
    []
  );

  const cambiarCantidad = useCallback((lineaId: string, cantidad: number) => {
    setEstado((previo) => ({
      ...previo,
      items:
        cantidad < 1
          ? previo.items.filter((i) => i.lineaId !== lineaId)
          : previo.items.map((i) =>
              i.lineaId === lineaId ? { ...i, cantidad: Math.min(99, cantidad) } : i
            ),
    }));
  }, []);

  const cambiarAclaracion = useCallback((lineaId: string, aclaracion: string) => {
    setEstado((previo) => ({
      ...previo,
      items: previo.items.map((i) =>
        i.lineaId === lineaId ? { ...i, aclaracion } : i
      ),
    }));
  }, []);

  const quitar = useCallback((lineaId: string) => {
    setEstado((previo) => ({
      ...previo,
      items: previo.items.filter((i) => i.lineaId !== lineaId),
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

  const actualizarPrecios = useCallback(
    (precios: { productoId: string; precio: number }[]) => {
      setEstado((previo) => ({
        ...previo,
        items: previo.items.map((i) => {
          const nuevo = precios.find((p) => p.productoId === i.productoId);
          return nuevo ? { ...i, precio: nuevo.precio } : i;
        }),
      }));
    },
    []
  );

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
      actualizarPrecios,
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
    actualizarPrecios,
  ]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): ContextoCarrito {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de ProveedorCarrito");
  return contexto;
}
