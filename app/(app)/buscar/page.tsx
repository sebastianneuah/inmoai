import { obtenerCatalogo } from "@/lib/tienda/catalogo";
import { PantallaBuscar } from "@/components/app/pantalla-buscar";

export const dynamic = "force-dynamic";

export default async function Buscar() {
  const catalogo = await obtenerCatalogo();
  return <PantallaBuscar catalogo={catalogo} />;
}
