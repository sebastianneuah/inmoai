"use client";

import type { Catalogo } from "@/lib/tipos";
import type { HorariosSemana } from "@/lib/horarios";
import { useAbierto } from "@/lib/use-abierto";
import { Encabezado } from "@/components/encabezado";
import { CatalogoUI } from "@/components/catalogo-ui";
import { BarraCarrito } from "@/components/barra-carrito";

/** Home completa: barra superior + catálogo + barra de carrito. */
export function PaginaPrincipal({
  catalogo,
  horarios,
  estadoInicial,
}: {
  catalogo: Catalogo;
  horarios: HorariosSemana;
  estadoInicial: { abierto: boolean; proxima: string };
}) {
  const { abierto, proxima } = useAbierto(estadoInicial, horarios);

  return (
    <main className="min-h-screen bg-fuego pb-28">
      <Encabezado abierto={abierto} proxima={proxima} />
      <CatalogoUI catalogo={catalogo} />
      <BarraCarrito />
    </main>
  );
}
