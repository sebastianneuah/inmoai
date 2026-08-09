import { obtenerCatalogo } from "@/lib/tienda/catalogo";
import { PantallaCuenta } from "@/components/app/pantalla-cuenta";

export const dynamic = "force-dynamic";

export default async function Cuenta() {
  const catalogo = await obtenerCatalogo();
  return <PantallaCuenta catalogo={catalogo} />;
}
