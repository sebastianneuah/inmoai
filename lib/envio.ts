import { NEGOCIO } from "@/config/negocio";

/**
 * Costo de envío según la config: si hay zonas cargadas, el costo sale de la
 * zona elegida (y elegirla es obligatorio); si no, se usa el costo único.
 */

export function hayZonas(): boolean {
  return NEGOCIO.entrega.envio.zonas.length > 0;
}

export function buscarZona(zonaId?: string) {
  return NEGOCIO.entrega.envio.zonas.find((z) => z.id === zonaId);
}

/** Devuelve el costo de envío para delivery, o null si falta elegir zona. */
export function costoEnvioDelivery(zonaId?: string): number | null {
  if (!hayZonas()) return NEGOCIO.entrega.envio.costoUnico;
  const zona = buscarZona(zonaId);
  return zona ? zona.costo : null;
}
