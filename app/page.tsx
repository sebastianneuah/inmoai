import { obtenerCatalogo } from "@/lib/catalogo";
import { estaAbierto, proximaApertura } from "@/lib/horarios";
import { PaginaPrincipal } from "@/components/pagina-principal";

// El catálogo se regenera cada 15 minutos (cuando venga de la API de Fudo,
// precios y stock quedan al día sin pegarle a la API en cada visita).
export const revalidate = 900;

export default function Home() {
  const catalogo = obtenerCatalogo();
  return (
    <PaginaPrincipal
      catalogo={catalogo}
      estadoInicial={{ abierto: estaAbierto(), proxima: proximaApertura() }}
    />
  );
}
