import { obtenerPublicidades } from "@/lib/tienda/publicidades";
import { PantallaConfirmacion } from "@/components/app/pantalla-confirmacion";

export const dynamic = "force-dynamic";

export default async function Confirmacion() {
  // Buen lugar para una campaña: el pedido ya está hecho, no interfiere con la venta
  const ads = await obtenerPublicidades("confirmacion", 1);
  return <PantallaConfirmacion ad={ads[0]} />;
}
