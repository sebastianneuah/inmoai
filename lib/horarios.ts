import { NEGOCIO, type DiaSemana, type RangoHorario } from "@/config/negocio";

/**
 * Lógica de Abierto/Cerrado. Todo se calcula en la zona horaria del local
 * (config), así el resultado es el mismo en el servidor y en el navegador
 * del cliente aunque estén en otra zona.
 */

type MomentoLocal = {
  dia: DiaSemana;
  /** Minutos desde las 00:00 */
  minutos: number;
};

function ahoraEnLocal(fecha: Date = new Date()): MomentoLocal {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: NEGOCIO.zonaHoraria,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(fecha);

  const mapa: Record<string, string> = {};
  for (const p of partes) mapa[p.type] = p.value;

  const dias: Record<string, DiaSemana> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  // Intl puede devolver "24" para medianoche según el runtime
  const hora = Number(mapa.hour) % 24;
  return {
    dia: dias[mapa.weekday],
    minutos: hora * 60 + Number(mapa.minute),
  };
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * ¿Está `minutos` dentro del rango, mirando solo el tramo que pertenece a HOY?
 * Un rango que cruza medianoche (ej. 21:00 a 01:00) cubre hoy solo desde
 * `desde` hasta las 24:00; el tramo de madrugada lo aporta el chequeo del
 * día anterior en `estaAbierto`. Para cerrar a medianoche usar "24:00".
 */
function dentroDelRango(minutos: number, rango: RangoHorario): boolean {
  const desde = aMinutos(rango.desde);
  const hasta = aMinutos(rango.hasta);
  if (hasta >= desde) return minutos >= desde && minutos < hasta;
  return minutos >= desde;
}

export function estaAbierto(fecha: Date = new Date()): boolean {
  const ahora = ahoraEnLocal(fecha);
  const rangosHoy = NEGOCIO.horarios[ahora.dia] ?? [];
  if (rangosHoy.some((r) => dentroDelRango(ahora.minutos, r))) return true;

  // Un rango de ayer que cruza medianoche también puede tenernos abiertos
  const ayer = ((ahora.dia + 6) % 7) as DiaSemana;
  const rangosAyer = NEGOCIO.horarios[ayer] ?? [];
  return rangosAyer.some(
    (r) => aMinutos(r.hasta) < aMinutos(r.desde) && ahora.minutos < aMinutos(r.hasta)
  );
}

/** Texto tipo "hoy a las 19:00" o "el sábado a las 21:30" para el botón de cerrado */
export function proximaApertura(fecha: Date = new Date()): string {
  const ahora = ahoraEnLocal(fecha);

  for (let salto = 0; salto < 8; salto++) {
    const dia = ((ahora.dia + salto) % 7) as DiaSemana;
    const rangos = (NEGOCIO.horarios[dia] ?? [])
      .slice()
      .sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde));

    for (const rango of rangos) {
      if (salto === 0 && aMinutos(rango.desde) <= ahora.minutos) continue;
      const cuando =
        salto === 0
          ? "hoy"
          : salto === 1
            ? "mañana"
            : `el ${NEGOCIO.nombresDias[dia]}`;
      return `${cuando} a las ${rango.desde}`;
    }
  }
  return "próximamente";
}
