"use client";

import { useEffect, useState } from "react";
import { estaAbierto, proximaApertura, type HorariosSemana } from "@/lib/horarios";

/**
 * Estado Abierto/Cerrado calculado en el navegador (misma lógica y zona
 * horaria que el servidor) y refrescado cada 30 segundos, así el cartel
 * cambia solo si el local cierra mientras el cliente mira el menú.
 * Los horarios vigentes vienen del servidor (configurables desde el admin);
 * antes de la hidratación se usa el estado que calculó el servidor.
 */
export function useAbierto(
  inicial: { abierto: boolean; proxima: string },
  horarios?: HorariosSemana
) {
  const [estado, setEstado] = useState({ ...inicial, calculado: false });

  useEffect(() => {
    const actualizar = () =>
      setEstado({
        abierto: estaAbierto(horarios),
        proxima: proximaApertura(horarios),
        calculado: true,
      });
    actualizar();
    const intervalo = setInterval(actualizar, 30_000);
    return () => clearInterval(intervalo);
    // horarios llega serializado del servidor y no cambia durante la sesión
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return estado;
}
