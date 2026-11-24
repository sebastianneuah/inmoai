// Acontecimientos exclusivos del presidente de la asociación nacional y de los organismos internacionales.
import { registerEvents, type EventDef } from './engine';
import { changeOpinion } from '../relations';
import { charsByRole } from '../queries';
import { clamp } from '../util';

const FED: EventDef[] = [
  {
    id: 'fed_tv_licitacion', cat: 'asociacion', title: 'Licitación de los derechos de TV', urg: 'urgente', sev: 5, cd: 80, pos: ['asociacion'],
    text: 'Vence el contrato de TV del fútbol argentino. Una cadena tradicional ofrece estabilidad; una plataforma de streaming ofrece un 40% más pero con partidos detrás de un muro de pago. Los clubes chicos temen perder visibilidad.',
    w: 4,
    opts: [
      { label: 'Plataforma de streaming (+40%)', out: 'Nuevo contrato récord.', fx: { fn: (c) => { c.s.assoc.tvPool = Math.round(c.s.assoc.tvPool * 1.4); }, ind: { presidentes: 4, hinchas: -6, repNacional: 2 } } },
      { label: 'Cadena tradicional (+10%)', auto: true, out: 'Contrato renovado con la cadena de siempre.', fx: { fn: (c) => { c.s.assoc.tvPool = Math.round(c.s.assoc.tvPool * 1.1); }, ind: { hinchas: 2 } } },
      { label: 'Producción propia de la AAF', out: 'La AAF producirá y venderá sus partidos.', fx: { fn: (c) => { c.s.assoc.tvPool = Math.round(c.s.assoc.tvPool * (c.rng.chance(0.5) ? 1.6 : 0.85)); }, ind: { influencia: 5, riesgo: 3 } } },
    ],
  },
  {
    id: 'fed_rescate_club', cat: 'asociacion', title: '{char} pide un salvataje', urg: 'importante', sev: 3, cd: 20, pos: ['asociacion'],
    text: '{char} te pide un adelanto de fondos para pagar sueldos: si no, su club no podrá presentarse a jugar. Ayudarlo sienta precedente.',
    bind: { char: 'presidente_club' }, w: 2,
    opts: [
      { label: 'Otorgar el adelanto', out: 'La AAF adelanta fondos.', fx: { cash: -2_000_000, cat: 'otros', op: { char: 20 }, ind: { presidentes: 2, estabilidad: -2 }, mem: 'Lo salvó de la quiebra' } },
      { label: 'Condicionar a un plan de saneamiento', auto: true, out: 'Fondos atados a un plan de ajuste.', fx: { cash: -1_000_000, cat: 'otros', op: { char: 5 }, ind: { integridad: 2 } } },
      { label: 'Negarse', out: 'Que se arreglen solos.', fx: { op: { char: -25 }, ind: { presidentes: -2 } } },
    ],
  },
  {
    id: 'fed_arbitros_paro', cat: 'asociacion', title: 'Paro de árbitros', urg: 'urgente', sev: 4, cd: 60, pos: ['asociacion'],
    text: 'Los árbitros anuncian un paro por agresiones y salarios. Sin ellos no hay fecha. Los clubes exigen soluciones inmediatas.',
    w: 1.2,
    opts: [
      { label: 'Aumento salarial y seguridad', out: 'Acuerdo con los árbitros.', fx: { cash: -3_000_000, cat: 'sueldos_empleados', ind: { empleados: 6, presidentes: 2 } } },
      { label: 'Traer árbitros del exterior', out: 'Árbitros extranjeros por una fecha.', fx: { cash: -1_000_000, cat: 'servicios', ind: { empleados: -6, repInternacional: 1 } } },
      { label: 'Suspender la fecha', auto: true, out: 'Se suspende la fecha.', fx: { ind: { presidentes: -3, hinchas: -2 } } },
    ],
  },
  {
    id: 'fed_violencia_nacional', cat: 'seguridad', title: 'Ola de violencia en las canchas', urg: 'urgente', sev: 4, cd: 40, pos: ['asociacion'],
    text: 'Una serie de incidentes graves obliga al gobierno a exigir medidas. El Ministro de Seguridad quiere prohibir el público visitante por tiempo indeterminado.',
    w: 1.2,
    opts: [
      { label: 'Programa nacional de seguridad y registro de hinchas', out: 'Se lanza un plan integral.', fx: { cash: -5_000_000, cat: 'seguridad', ind: { integridad: 5, repNacional: 3, presidentes: -1 } } },
      { label: 'Aceptar la prohibición de visitantes', auto: true, out: 'Sin público visitante.', fx: { fn: (c) => { c.s.assoc.rules.visitantes = false; }, ind: { hinchas: -4 } } },
      { label: 'Defender el fútbol con público', out: 'Te enfrentaste al ministro.', fx: { ind: { hinchas: 3, influencia: -3 } } },
    ],
  },
  {
    id: 'fed_calendario', cat: 'asociacion', title: 'Choque de calendario con la confederación', urg: 'importante', sev: 3, cd: 40, pos: ['asociacion'],
    text: 'La confederación programó partidos de copa en fechas del torneo local. Los clubes grandes piden priorizar la copa; los chicos, la liga.',
    w: 1.5,
    opts: [
      { label: 'Priorizar a los clubes en copas', out: 'Se reprograma la liga.', fx: { ind: { presidentes: -2, repInternacional: 2 }, fn: (c) => { for (const p of charsByRole(c.s, 'presidente_club')) { const cl = p.clubId ? c.s.clubs[p.clubId] : null; if (cl && cl.prestige >= 72) changeOpinion(c.s, p.id, 5); } } } },
      { label: 'Priorizar la liga local', out: 'La liga no se toca.', fx: { ind: { presidentes: 2, repInternacional: -2 } } },
      { label: 'Negociar con la confederación', auto: true, out: 'Se logró mover algunas fechas.', fx: { ind: { influencia: 2 } } },
    ],
  },
  {
    id: 'fed_var', cat: 'asociacion', title: 'Polémica por el VAR', urg: 'informativo', sev: 2, cd: 40, pos: ['asociacion'],
    text: 'Una serie de errores del VAR enciende a todos los clubes. Algunos proponen eliminarlo; otros, profesionalizarlo con una inversión importante.',
    w: 1.5,
    opts: [
      { label: 'Invertir en profesionalizar el VAR', out: 'Nueva tecnología y capacitación.', fx: { cash: -2_500_000, cat: 'obras', ind: { integridad: 3, presidentes: 2 } } },
      { label: 'Publicar los audios de cada jugada', auto: true, out: 'Transparencia total en el VAR.', fx: { ind: { integridad: 4, periodistas: 3 } } },
      { label: 'Respaldar a los árbitros sin cambios', out: 'Sin cambios.', fx: { ind: { presidentes: -3 } } },
    ],
  },
  {
    id: 'fed_vicepresidente_conspira', cat: 'politica', title: 'Conspiración en el comité ejecutivo', urg: 'importante', sev: 4, cd: 60, pos: ['asociacion', 'confederacion', 'fifa'],
    text: '{char}, uno de tus vicepresidentes, estaría reuniendo apoyos para desplazarte en la próxima asamblea. Tus aliados te piden actuar.',
    bind: { char: 'dirigente_asociacion' }, when: (c) => c.ind.gobernabilidad < 55, w: 2,
    opts: [
      { label: 'Desplazarlo del comité', out: 'Lo removiste.', fx: { op: { char: -40 }, ind: { gobernabilidad: 2, influencia: 2, integridad: -1 }, fn: (c) => { c.char!.active = false; } } },
      { label: 'Ofrecerle más poder', out: 'Le diste un área clave.', fx: { op: { char: 20 }, ind: { gobernabilidad: 4, influencia: -2 } } },
      { label: 'Esperar a ver sus movimientos', auto: true, out: 'Lo vigilás de cerca.', fx: { ind: { gobernabilidad: -2 } } },
    ],
  },
  {
    id: 'fed_juveniles_exito', cat: 'selecciones', title: 'La selección juvenil brilla', urg: 'informativo', sev: 2, cd: 40, pos: ['asociacion'],
    text: 'La selección sub-20 llegó a la final del Mundial juvenil. Los clubes piden que la inversión en juveniles se mantenga y algunos jugadores ya despiertan interés en Europa.',
    when: (c) => c.s.nt.youthInvest >= 2, w: 2,
    opts: [
      { label: 'Aumentar la inversión', out: 'Más fondos para juveniles.', fx: { fn: (c) => { c.s.nt.youthInvest = Math.min(3, c.s.nt.youthInvest + 1); }, ind: { repNacional: 3, presidentes: 2 } } },
      { label: 'Capitalizar con un amistoso internacional', auto: true, out: 'Gira del sub-20.', fx: { cash: 1_500_000, cat: 'eventos', ind: { repInternacional: 2 } } },
      { label: 'Premio para el cuerpo técnico juvenil', out: 'Reconocimiento al cuerpo técnico.', fx: { cash: -400_000, cat: 'premios', ind: { empleados: 4 }, fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale + 3); } } },
    ],
  },
];

registerEvents(FED);
export const FED_COUNT = FED.length;
