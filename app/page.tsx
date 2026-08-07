import { obtenerCatalogo } from "@/lib/tienda/catalogo";
import { obtenerConfig } from "@/lib/tienda/configuracion";
import { estaAbierto, proximaApertura } from "@/lib/horarios";
import { PaginaPrincipal } from "@/components/pagina-principal";

/**
 * La página se arma en cada visita, pero los datos vienen de un cache con tag
 * (5 minutos de TTL) que el admin invalida al instante cuando toca un
 * producto. Así la carta nunca queda pegada a una versión vieja del build y
 * el costo por visita sigue siendo mínimo.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [catalogo, config] = await Promise.all([obtenerCatalogo(), obtenerConfig()]);

  return (
    <PaginaPrincipal
      catalogo={catalogo}
      horarios={config.horarios}
      estadoInicial={{
        abierto: estaAbierto(config.horarios),
        proxima: proximaApertura(config.horarios),
      }}
    />
  );
}
