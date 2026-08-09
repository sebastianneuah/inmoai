"use client";

import { createContext, useContext } from "react";
import type { HorariosSemana } from "@/lib/horarios";
import { useAbierto } from "@/lib/use-abierto";

/**
 * Estado Abierto/Cerrado compartido por toda la app. Se calcula una sola vez
 * en el shell (con los horarios vigentes del servidor) y lo consumen el
 * header y el checkout, así nunca muestran cosas distintas.
 */

type Estado = { abierto: boolean; proxima: string; calculado: boolean };

const Contexto = createContext<Estado>({ abierto: true, proxima: "", calculado: false });

export function EstadoLocal({
  horarios,
  inicial,
  children,
}: {
  horarios: HorariosSemana;
  inicial: { abierto: boolean; proxima: string };
  children: React.ReactNode;
}) {
  const estado = useAbierto(inicial, horarios);
  return <Contexto.Provider value={estado}>{children}</Contexto.Provider>;
}

export function useEstadoLocal(): Estado {
  return useContext(Contexto);
}
