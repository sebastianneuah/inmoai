"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Favoritos del cliente. Como se puede pedir sin crear cuenta, se guardan en
 * el navegador; el día que haya cuentas, esta misma interfaz pasa a leer del
 * servidor sin tocar los componentes.
 */

const CLAVE = "abraham.favoritos.v1";

function leer(): string[] {
  try {
    const guardado = localStorage.getItem(CLAVE);
    const datos = guardado ? JSON.parse(guardado) : [];
    return Array.isArray(datos) ? datos.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Aviso a todos los componentes montados cuando cambian los favoritos. */
const EVENTO = "abraham:favoritos";

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<string[]>([]);

  useEffect(() => {
    setFavoritos(leer());
    const actualizar = () => setFavoritos(leer());
    window.addEventListener(EVENTO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  const alternar = useCallback((productoId: string) => {
    const actuales = leer();
    const nuevos = actuales.includes(productoId)
      ? actuales.filter((id) => id !== productoId)
      : [...actuales, productoId];
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevos));
    } catch {
      // sin espacio: los favoritos quedan solo en esta pantalla
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  const esFavorito = useCallback(
    (productoId: string) => favoritos.includes(productoId),
    [favoritos]
  );

  return { favoritos, esFavorito, alternar };
}
