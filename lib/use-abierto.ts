"use client";

import { useEffect, useState } from "react";
import { estaAbierto, proximaApertura } from "@/lib/horarios";

/**
 * Estado Abierto/Cerrado calculado en el navegador (misma lógica y zona
 * horaria que el servidor) y refrescado cada 30 segundos, así el cartel
 * cambia solo si el local cierra mientras el cliente mira el menú.
 * Antes de la hidratación devuelve el valor que calculó el servidor.
 */
export function useAbierto(inicial: { abierto: boolean; proxima: string }) {
  const [estado, setEstado] = useState({ ...inicial, calculado: false });

  useEffect(() => {
    const actualizar = () =>
      setEstado({ abierto: estaAbierto(), proxima: proximaApertura(), calculado: true });
    actualizar();
    const intervalo = setInterval(actualizar, 30_000);
    return () => clearInterval(intervalo);
  }, []);

  return estado;
}
