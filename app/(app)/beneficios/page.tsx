import { obtenerPublicidades } from "@/lib/tienda/publicidades";
import { PantallaBeneficios } from "@/components/app/pantalla-beneficios";

export const dynamic = "force-dynamic";

export default async function Beneficios() {
  // El espacio de beneficios se llena desde el módulo de publicidades:
  // promociones propias, cupones, marcas asociadas y sponsors.
  const beneficios = await obtenerPublicidades("beneficios", 12);
  return <PantallaBeneficios beneficios={beneficios} />;
}
