import { obtenerCatalogo } from "@/lib/tienda/catalogo";
import { obtenerPublicidades } from "@/lib/tienda/publicidades";
import { HomeApp } from "@/components/app/home-app";

/**
 * La pantalla se arma en cada visita, pero los datos vienen de un cache con
 * tag que el admin invalida al instante. Así la carta y las campañas nunca
 * quedan pegadas a una versión vieja, y el costo por visita sigue mínimo.
 */
export const dynamic = "force-dynamic";

export default async function Inicio() {
  const [catalogo, hero, medio, entreCategorias] = await Promise.all([
    obtenerCatalogo(),
    obtenerPublicidades("home_hero", 3),
    obtenerPublicidades("home_medio", 1),
    obtenerPublicidades("entre_categorias", 1),
  ]);

  return (
    <HomeApp
      catalogo={catalogo}
      hero={hero}
      medio={medio[0]}
      entreCategorias={entreCategorias[0]}
    />
  );
}
