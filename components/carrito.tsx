"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ModoEntrega, SeleccionAcompanamientos } from "@/lib/tipos";

/**
 * Estado del carrito, persistido en localStorage para que sobreviva
 * recargas y visitas futuras. Guarda un snapshot de nombre/precio para
 * mostrar en la UI; el servidor recalcula todo al confirmar.
 *
 * Cada línea tiene su propio `lineaId`: el mismo producto con aclaraciones o
 * modificadores distintos son líneas separadas, nada se pisa ni se pierde.
 *
 * Los acompañamientos (salsas/palitos) viven aparte de los ítems: se eligen
 * una sola vez en el checkout y NO se resetean si el cliente vuelve a tocar
 * el carrito.
 */

export type ModificadorElegido = {
  grupoId: string;
  opcionIds: string[];
  /** Snapshot para mostrar sin volver a consultar el catálogo */
  etiqueta: string;
  precioExtra: number;
};

export type ItemEnCarrito = {
  lineaId: string;
  productoId: string;
  nombre: string;
  /** Precio unitario CON modificadores incluidos (snapshot para la UI) */
  precio: number;
  cantidad: number;
  aclaracion?: string;
  modificadores: ModificadorElegido[];
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
  acompanamientos: SeleccionAcompanamientos;
};

type ContextoCarrito = EstadoCarrito & {
  cantidadTotal: number;
  subtotal: number;
  agregar: (
    item: Omit<ItemEnCarrito, "cantidad" | "lineaId" | "modificadores"> & {
      modificadores?: ModificadorElegido[];
    },
    cantidad?: number
  ) => void;
  cambiarCantidad: (lineaId: string, cantidad: number) => void;
  cambiarAclaracion: (lineaId: string, aclaracion: string) => void;
  quitar: (lineaId: string) => void;
  vaciar: () => void;
  setModoEntrega: (modo: ModoEntrega) => void;
  setAclaracionGeneral: (texto: string) => void;
  setAcompanamiento: (id: string, cantidad: number) => void;
  setPalitos: (pares: number | null) => void;
  /** Sincroniza precios cuando el servidor avisa que el catálogo cambió */
  actualizarPrecios: (precios: { productoId: string; precio: number }[]) => void;
  listo: boolean;
};

const CLAVE_CARRITO = "abraham.carrito.v3";
export const CLAVE_CLIENTE = "abraham.cliente.v1";

const acompanamientosVacios: SeleccionAcompanamientos = { cantidades: {}, palitos: null };

const estadoInicial: EstadoCarrito = {
  items: [],
  modoEntrega: "delivery",
  aclaracionGeneral: "",
  acompanamientos: acompanamientosVacios,
};

function nuevoLineaId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function mismosModificadores(a: ModificadorElegido[], b: ModificadorElegido[]): boolean {
  if (a.length !== b.length) return false;
  const clave = (m: ModificadorElegido) => `${m.grupoId}:${[...m.opcionIds].sort().join(",")}`;
  const setA = a.map(clave).sort().join("|");
  const setB = b.map(clave).sort().join("|");
  return setA === setB;
}

/**
 * Valida la forma de lo que haya en localStorage: si algo no cierra (versión
 * vieja, corrupción parcial), se descarta esa parte y la app arranca limpia
 * en vez de romperse en el render.
 */
function validarEstadoGuardado(crudo: unknown): EstadoCarrito {
  const estado = { ...estadoInicial, acompanamientos: { ...acompanamientosVacios } };
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
        modificadores: Array.isArray(i.modificadores)
          ? (i.modificadores as ModificadorElegido[]).filter(
              (m) =>
                typeof m === "object" && m !== null &&
                typeof m.grupoId === "string" && Array.isArray(m.opcionIds) &&
                typeof m.etiqueta === "string" && typeof m.precioExtra === "number"
            )
          : [],
      }));
  }
  if (objeto.modoEntrega === "delivery" || objeto.modoEntrega === "retiro") {
    estado.modoEntrega = objeto.modoEntrega;
  }
  if (typeof objeto.aclaracionGeneral === "string") {
    estado.aclaracionGeneral = objeto.aclaracionGeneral;
  }
  const acomp = objeto.acompanamientos as Record<string, unknown> | undefined;
  if (typeof acomp === "object" && acomp !== null) {
    if (typeof acomp.cantidades === "object" && acomp.cantidades !== null) {
      for (const [id, cantidad] of Object.entries(acomp.cantidades)) {
        if (typeof cantidad === "number" && cantidad >= 1 && cantidad <= 99) {
          estado.acompanamientos.cantidades[id] = Math.floor(cantidad);
        }
      }
    }
    if (
      acomp.palitos === null ||
      (typeof acomp.palitos === "number" && acomp.palitos >= 0 && acomp.palitos <= 20)
    ) {
      estado.acompanamientos.palitos = acomp.palitos as number | null;
    }
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
    (
      item: Omit<ItemEnCarrito, "cantidad" | "lineaId" | "modificadores"> & {
        modificadores?: ModificadorElegido[];
      },
      cantidad = 1
    ) => {
      const modificadores = item.modificadores ?? [];
      setEstado((previo) => {
        // Solo se fusionan líneas idénticas: mismo producto, aclaración y modificadores
        const existente = previo.items.find(
          (i) =>
            i.productoId === item.productoId &&
            (i.aclaracion ?? "") === (item.aclaracion ?? "") &&
            mismosModificadores(i.modificadores, modificadores)
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
          items: [
            ...previo.items,
            { ...item, modificadores, cantidad, lineaId: nuevoLineaId() },
          ],
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
    setEstado((previo) => ({
      ...estadoInicial,
      acompanamientos: { cantidades: {}, palitos: null },
      modoEntrega: previo.modoEntrega,
    }));
  }, []);

  const setModoEntrega = useCallback((modo: ModoEntrega) => {
    setEstado((previo) => ({ ...previo, modoEntrega: modo }));
  }, []);

  const setAclaracionGeneral = useCallback((texto: string) => {
    setEstado((previo) => ({ ...previo, aclaracionGeneral: texto }));
  }, []);

  const setAcompanamiento = useCallback((id: string, cantidad: number) => {
    setEstado((previo) => {
      const cantidades = { ...previo.acompanamientos.cantidades };
      if (cantidad <= 0) delete cantidades[id];
      else cantidades[id] = Math.min(99, Math.floor(cantidad));
      return { ...previo, acompanamientos: { ...previo.acompanamientos, cantidades } };
    });
  }, []);

  const setPalitos = useCallback((pares: number | null) => {
    setEstado((previo) => ({
      ...previo,
      acompanamientos: { ...previo.acompanamientos, palitos: pares },
    }));
  }, []);

  const actualizarPrecios = useCallback(
    (precios: { productoId: string; precio: number }[]) => {
      setEstado((previo) => ({
        ...previo,
        items: previo.items.map((i) => {
          const nuevo = precios.find((p) => p.productoId === i.productoId);
          if (!nuevo) return i;
          const extras = i.modificadores.reduce((s, m) => s + m.precioExtra, 0);
          return { ...i, precio: nuevo.precio + extras };
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
      setAcompanamiento,
      setPalitos,
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
    setAcompanamiento,
    setPalitos,
    actualizarPrecios,
  ]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito(): ContextoCarrito {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useCarrito debe usarse dentro de ProveedorCarrito");
  return contexto;
}
