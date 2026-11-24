// Acontecimientos de poder: política institucional, elecciones, asociación nacional, escándalos,
// relaciones internacionales, selecciones, confederación, FIF y progresión de carrera.
import { registerEvents, scaleMoney as sm, type Ctx, type EventDef } from './engine';
import { clamp, absWeek } from '../util';
import { joinCommittee, startClubElection, assumeClub, leaveClub, spendCapital } from '../politics';
import { book } from '../economy';
import { addNews } from '../news';
import { changeInd, changeOpinion } from '../relations';
import { fireNTCoach } from '../nationalteam';
import { estimateRevenue } from '../valuation';

const rev = (c: Ctx) => (c.club ? estimateRevenue(c.s, c.club) : 5_000_000);
const camp = (c: Ctx, n: number) => {
  const e = c.s.election;
  if (e && !e.done) c.s.flags[`campaign_${e.id}`] = Number(c.s.flags[`campaign_${e.id}`] ?? 0) + n;
};
const mandateYear = (c: Ctx) => c.s.president.pos === 'club' && c.s.season >= c.s.president.mandateEnd;

const POLITICA: EventDef[] = [
  {
    id: 'pol_vice_ambicioso', cat: 'politica', title: 'Tu vicepresidente arma su propio espacio', urg: 'importante', sev: 4, cd: 60,
    text: '{char}, tu vicepresidente, se reúne en secreto con dirigentes y periodistas. Todo indica que prepara una candidatura propia para las próximas elecciones.',
    bind: { char: 'vicepresidente' }, when: (c) => c.char!.ambition >= 60 && c.char!.opinion < 30 && !!c.club && c.club.nextElection - c.s.season <= 1, w: 3,
    opts: [
      { label: 'Confrontarlo y pedirle lealtad', out: 'Lo enfrentaste cara a cara.', fx: {}, risk: { p: (c) => 0.4 + c.char!.loyalty / 200, text: '{char} se disculpa y promete lealtad.', fx: { op: { char: 10 }, flag: { viceBetrayal: false } } } },
      { label: 'Ofrecerle ser tu sucesor', out: 'Le ofreciste la sucesión para el próximo mandato.', fx: { op: { char: 20 }, ind: { comision: 3 }, mem: 'Le prometiste la sucesión', promise: { key: 'siempre', text: 'Dejar a {char} como sucesor', weeks: 60, weight: 0.5 } } },
      { label: 'Desplazarlo de sus funciones', out: 'Le quitaste las áreas a cargo.', fx: { op: { char: -30 }, ind: { comision: -4, gobernabilidad: -3 }, flag: { viceBetrayal: true }, mem: 'Lo desplazaste' } },
      { label: 'Ignorar los rumores', auto: true, out: 'Dejaste correr el tema.', fx: {}, risk: { p: 0.6, text: '{char} confirmó que será candidato.', fx: { flag: { viceBetrayal: true }, op: { char: -10 } } } },
    ],
  },
  {
    id: 'pol_tesorero_renuncia', cat: 'politica', title: '{char} presenta su renuncia', urg: 'importante', sev: 3, cd: 60,
    text: 'El tesorero {char} renuncia en desacuerdo con el manejo de los fondos. Advierte que "si se sigue gastando así, el club va a la quiebra". La carta llega a la prensa.',
    bind: { char: 'tesorero' }, when: (c) => c.ind.estabilidad < 40 && c.char!.opinion < 20, w: 3,
    opts: [
      { label: 'Aceptarla y nombrar a alguien de confianza', out: 'Nuevo tesorero alineado con vos.', fx: { ind: { comision: -3, estabilidad: -2, periodistas: -2 }, fn: (c) => { c.char!.active = false; c.char!.tags.push('renunciante'); } } },
      { label: 'Rechazarla y darle más control del gasto', out: 'El tesorero se queda con poder de veto.', fx: { op: { char: 20 }, ind: { estabilidad: 3, comision: 3 }, flag: { treasurerVeto: true } } },
      { label: 'Pedirle que no la haga pública a cambio de un ajuste', auto: true, out: 'Acordaron un ajuste moderado.', fx: { op: { char: 6 }, ind: { estabilidad: 2 } } },
    ],
  },
  {
    id: 'pol_destitucion', cat: 'politica', title: 'Moción de censura en la comisión directiva', urg: 'urgente', sev: 5, cd: 30,
    text: 'Un grupo de vocales encabezado por {char} presentó una moción para destituirte por "mal desempeño". Si prospera, tu mandato termina hoy.',
    bind: { char: 'vocal' }, when: (c) => c.ind.comision < 25 && c.ind.gobernabilidad < 40, w: 6,
    opts: [
      { label: 'Negociar votos uno por uno', out: 'Hiciste política de pasillo.', req: (c) => c.s.president.politicalCapital >= 2, reqText: 'Capital político insuficiente (2)', fx: { fn: (c) => { spendCapital(c.s, 2); if (c.rng.chance(0.65 + c.ind.socios / 300)) { changeInd(c.s, 'comision', 8); return 'La moción fue rechazada por estrecho margen.'; } leaveClub(c.s, c.rng, null); return 'La moción prosperó: fuiste destituido.'; } } },
      { label: 'Llamar a los socios a movilizarse', out: 'Convocaste a los socios.', fx: { fn: (c) => { if (c.ind.socios >= 50 && c.rng.chance(0.75)) { changeInd(c.s, 'comision', 6); changeInd(c.s, 'socios', 3); return 'La movilización frenó la moción.'; } leaveClub(c.s, c.rng, null); return 'Los socios no respondieron y fuiste destituido.'; } } },
      { label: 'Renunciar con dignidad', out: 'Presentaste tu renuncia.', fx: { ind: { integridad: 3 }, fn: (c) => { leaveClub(c.s, c.rng, null); return 'Dejaste la presidencia.'; } } },
      { label: 'Dejar que se vote', auto: true, out: 'Se votó la moción.', fx: { fn: (c) => { if (c.rng.chance(0.35 + c.ind.comision / 100)) { changeInd(c.s, 'comision', 4); return 'La moción no alcanzó los votos.'; } leaveClub(c.s, c.rng, null); return 'Fuiste destituido.'; } } },
    ],
  },
  {
    id: 'pol_intendente', cat: 'politica', title: 'El intendente ofrece apoyo', urg: 'informativo', sev: 2, cd: 40,
    text: '{char} ofrece al club un terreno municipal para un nuevo predio de entrenamiento. A cambio, espera que el club lo acompañe en actos de campaña.',
    bind: { char: 'politico' }, w: 1.4,
    opts: [
      { label: 'Aceptar el acuerdo', out: 'El club recibe el terreno.', fx: { fn: (c) => { c.club!.facilities.entrenamiento = Math.min(5, c.club!.facilities.entrenamiento + 1); }, ind: { influencia: 4, integridad: -3, socios: -2 }, op: { char: 12 } } },
      { label: 'Aceptar sin compromisos políticos', out: 'Lo planteaste así.', fx: {}, risk: { p: 0.5, text: 'Aceptó igual: el club recibe el terreno sin condicionamientos.', fx: { fn: (c) => { c.club!.facilities.entrenamiento = Math.min(5, c.club!.facilities.entrenamiento + 1); }, op: { char: 3 } } } },
      { label: 'Rechazar', auto: true, out: 'El club se mantiene neutral.', fx: { ind: { integridad: 2 }, op: { char: -6 } } },
    ],
  },
  {
    id: 'pol_favor_cobrado', cat: 'politica', title: '{char} viene a cobrar un favor', chain: true, urg: 'importante', sev: 3, pos: ['any'],
    text: '{char} te recuerda el favor que te hizo y pide reciprocidad: que el club le compre un jugador a un precio inflado o que apoyes a un candidato suyo en la asociación.',
    opts: [
      { label: 'Cumplir con lo pactado', out: 'Devolviste el favor.', fx: { cash: (c) => -sm(c, 400_000), cat: 'fichajes', op: { char: 15 }, ind: { integridad: -3, riesgo: 4 }, mem: 'Le devolviste el favor' } },
      { label: 'Ofrecer otra cosa a cambio', out: 'Negociaste una compensación menor.', fx: { op: { char: -3 }, ind: { influencia: -1 } } },
      { label: 'Negarte', auto: true, out: 'No le devolviste el favor.', fx: { op: { char: -30 }, ind: { presidentes: -3 }, mem: 'No le devolvió el favor', later: [{ w: [4, 15], fx: 'revenge', params: { news: '{char} acusa a {president} de traicionar acuerdos', ind: { presidentes: -3, influencia: -2 } } }] } },
    ],
  },
  {
    id: 'pol_presupuesto_rechazado', cat: 'politica', title: 'La comisión rechaza el presupuesto', urg: 'importante', sev: 3, cd: 40,
    text: 'La comisión directiva no aprobó el presupuesto anual. {char} lidera a los críticos que piden recortar gastos en fútbol profesional.',
    bind: { char: 'vocal' }, when: (c) => c.s.week <= 8 && c.ind.comision < 50, w: 2.5,
    opts: [
      { label: 'Aceptar un recorte del 10%', out: 'Presupuesto aprobado con recorte.', fx: { ind: { comision: 6, jugadores: -2 }, fn: (c) => { c.s.economy.transferBudget = Math.round(c.s.economy.transferBudget * 0.6); } } },
      { label: 'Negociar con vocales individualmente', out: 'Conseguiste los votos.', req: (c) => c.s.president.politicalCapital >= 1, reqText: 'Capital político insuficiente', fx: { fn: (c) => { spendCapital(c.s, 1); }, ind: { comision: 3 }, op: { char: -4 } } },
      { label: 'Gobernar por decreto', auto: true, out: 'Aprobaste el presupuesto sin la comisión.', fx: { ind: { comision: -8, gobernabilidad: -5, integridad: -2 } } },
    ],
  },
];

const ELECCIONES: EventDef[] = [
  {
    id: 'ele_oposicion_lanza', cat: 'elecciones', title: '{char} lanza su candidatura', urg: 'informativo', sev: 3, cd: 80,
    text: '{char}, líder de la oposición, lanzó su candidatura con un acto multitudinario. Su eslogan: "Recuperemos {club}". Las encuestas lo muestran competitivo.',
    bind: { char: 'opositor' }, when: (c) => mandateYear(c) && c.s.week >= 10 && c.s.week < 24, w: 4,
    opts: [
      { label: 'Ignorarlo y gestionar', auto: true, out: 'Te enfocás en la gestión.', fx: { ind: { integridad: 1 } } },
      { label: 'Contraatacar en los medios', out: 'Fuiste a los programas a defender tu gestión.', fx: { ind: { periodistas: -1, socios: 1 }, op: { char: -10 } } },
      { label: 'Ofrecerle un lugar en tu lista', out: 'Le ofreciste sumarse.', fx: {}, risk: { p: (c) => (c.char!.personality === 'oportunista' ? 0.6 : 0.2), text: '{char} aceptó: la oposición queda descabezada.', fx: { op: { char: 30 }, ind: { socios: 4, comision: 3 } } } },
    ],
  },
  {
    id: 'ele_encuesta_negativa', cat: 'elecciones', title: 'Una encuesta te da perdedor', urg: 'importante', sev: 3, cd: 6,
    text: 'Una encuesta publicada hoy te ubica varios puntos detrás de la oposición. Tus asesores proponen un golpe de efecto.',
    when: (c) => !!c.s.election && !c.s.election.done && c.s.election.userRunning && (c.s.election.candidates.find((x) => x.isUser)?.support ?? 50) < 48, w: 4, pos: ['club', 'asociacion', 'confederacion', 'fifa', 'sin_cargo'],
    opts: [
      { label: 'Anunciar un refuerzo estrella', out: 'Anunciaste negociaciones por un refuerzo de jerarquía.', req: (c) => c.s.president.pos === 'club', reqText: 'Sólo como presidente de club', fx: { ind: { hinchas: 4 }, fn: (c) => { camp(c, 5); }, promise: { key: 'refuerzo', text: 'Traer un refuerzo de jerarquía', weeks: 12, weight: 1.2 } } },
      { label: 'Bajar el precio de la cuota', out: 'Rebaja de cuotas anunciada.', req: (c) => c.s.president.pos === 'club', reqText: 'Sólo como presidente de club', fx: { fn: (c) => { c.s.economy.feeMult = Math.max(0.6, Math.round(c.s.economy.feeMult * 0.9 * 100) / 100); camp(c, 4); }, ind: { socios: 3, estabilidad: -2 } } },
      { label: 'Campaña sucia contra el rival', out: 'Filtraste información del rival.', fx: { ind: { integridad: -5, periodistas: -2 }, fn: (c) => { camp(c, (c.rng.chance(0.5) ? 6 : -4)); } } },
      { label: 'Mantener el rumbo', auto: true, out: 'Seguís con tu plan.', fx: {} },
    ],
  },
  {
    id: 'ele_adelantar', cat: 'elecciones', title: 'Piden adelantar las elecciones', urg: 'importante', sev: 4, cd: 40,
    text: 'Con la crisis institucional, la oposición y {char} exigen adelantar las elecciones. Los socios están divididos.',
    bind: { char: 'opositor' }, when: (c) => c.ind.socios < 35 && c.ind.gobernabilidad < 45 && !c.s.election && !!c.club && c.s.week < 30, w: 3,
    opts: [
      { label: 'Aceptar el desafío: elecciones en 8 semanas', out: 'Convocaste a elecciones anticipadas.', fx: { ind: { integridad: 4, gobernabilidad: 3 }, fn: (c) => { startClubElection(c.s, c.rng, c.club!.id, true, 8); } } },
      { label: 'Rechazar: el mandato se cumple', auto: true, out: 'Te negaste.', fx: { ind: { socios: -4, gobernabilidad: -3 }, op: { char: -10 } } },
      { label: 'Ofrecer un gabinete de unidad', out: 'Sumaste opositores a la gestión.', fx: { ind: { gobernabilidad: 6, comision: 4, influencia: -2 }, op: { char: 15 } } },
    ],
  },
];

const ASOCIACION: EventDef[] = [
  {
    id: 'aso_invitacion_comite', cat: 'asociacion', title: 'Te invitan al Comité Ejecutivo', urg: 'importante', sev: 4, cd: 30,
    text: '{assocpres}, presidente de la {assoc}, te ofrece un lugar en el Comité Ejecutivo. "Necesitamos dirigentes como vos". Todos saben que nada es gratis en la asociación.',
    when: (c) => c.s.president.pos === 'club' && !c.s.president.committee && c.ind.influencia >= 45 && c.ind.repNacional >= 50 && (c.ind.asociacion >= 50 || c.ind.presidentes >= 55) && (c.club?.division ?? 3) <= 2 && (c.s.season > c.s.startSeason || c.s.week > 25), w: 5,
    opts: [
      { label: 'Aceptar y alinearte con el oficialismo', out: 'Te sumás al Comité Ejecutivo.', fx: { fn: (c) => joinCommittee(c.s), op: { assoc: 10 }, ind: { asociacion: 5 } } },
      { label: 'Aceptar con independencia', out: 'Asumís sin compromisos.', fx: { fn: (c) => joinCommittee(c.s), op: { assoc: -2 }, ind: { integridad: 2 } } },
      { label: 'Rechazar por ahora', auto: true, out: 'Preferís enfocarte en el club.', fx: { op: { assoc: -5 }, ind: { socios: 1 } } },
    ],
  },
  {
    id: 'aso_pide_apoyo', cat: 'asociacion', title: '{assocpres} pide tu apoyo', urg: 'importante', sev: 3, cd: 25,
    text: '{assocpres} necesita votos para aprobar un nuevo reglamento. Te lo pide personalmente: "No me olvido de los que me acompañan".',
    when: (c) => c.s.president.pos === 'club' && !!c.s.assoc.presidentId, w: 2,
    opts: [
      { label: 'Darle tu apoyo', out: 'Votaste con el oficialismo.', fx: { op: { assoc: 12 }, ind: { asociacion: 4, influencia: 1, presidentes: -1 }, mem: 'Lo acompañó en una votación clave' } },
      { label: 'Pedir algo a cambio', out: 'Negociaste tu voto.', fx: { op: { assoc: 3 }, ind: { influencia: 3, integridad: -1 } }, risk: { p: 0.5, text: 'Conseguiste mejores horarios de TV para tu club.', fx: { cash: (c) => sm(c, 250_000), cat: 'tv' } } },
      { label: 'Votar en contra', auto: true, out: 'Te opusiste.', fx: { op: { assoc: -12 }, ind: { asociacion: -5, presidentes: 2 }, mem: 'Votó en contra de su reglamento' } },
    ],
  },
  {
    id: 'aso_arbitraje', cat: 'asociacion', title: 'Acusaciones de favoritismo arbitral', urg: 'importante', sev: 3, cd: 20,
    text: 'Tras un fallo polémico a favor de {other}, los hinchas acusan a la asociación de favorecer a los clubes "amigos". {char}, presidente de un club perjudicado, te propone un frente común.',
    bind: { other: 'arg_big', char: 'presidente_club' }, w: 1.8,
    opts: [
      { label: 'Sumarte al reclamo', out: 'Firmaste el reclamo conjunto.', fx: { op: { char: 10, assoc: -8, other: -6 }, ind: { hinchas: 3, asociacion: -4, presidentes: 2 } } },
      { label: 'Pedir el audio del VAR en privado', auto: true, out: 'Lo pediste por canales institucionales.', fx: { ind: { integridad: 1 } } },
      { label: 'Defender a los árbitros', out: 'Respaldaste el arbitraje.', fx: { op: { assoc: 8, char: -8 }, ind: { asociacion: 4, hinchas: -3 } } },
    ],
  },
  {
    id: 'aso_formato', cat: 'asociacion', title: 'La AAF evalúa un nuevo formato', urg: 'informativo', sev: 2, cd: 40,
    text: 'La asociación analiza llevar la Liga Profesional a 28 equipos para "federalizar" el fútbol. Los clubes chicos lo apoyan; los grandes temen que baje el nivel y el valor de la TV.',
    when: (c) => c.s.president.pos === 'club' || c.s.president.pos === 'asociacion', w: 1, pos: ['club', 'asociacion'],
    opts: [
      { label: 'Apoyar la ampliación', out: 'Te pronunciaste a favor.', fx: { ind: { presidentes: 3, repNacional: -1 }, op: { assoc: 4 } } },
      { label: 'Oponerte', out: 'Te pronunciaste en contra.', fx: { ind: { presidentes: -2, influencia: 1 } } },
      { label: 'Proponer un torneo con zonas', auto: true, out: 'Propusiste un punto intermedio.', fx: { ind: { influencia: 2 } } },
    ],
  },
  {
    id: 'aso_sancion_incidentes', cat: 'asociacion', title: 'El tribunal de disciplina te cita', urg: 'importante', sev: 3, cd: 20,
    text: 'El tribunal de disciplina de la {assoc} analiza sancionar al club por los últimos incidentes. Podrían quitar puntos o clausurar el estadio.',
    when: (c) => Number(c.s.flags.lastIncidentAbs ?? -99) >= c.abs - 4, w: 6,
    opts: [
      { label: 'Aceptar una multa negociada', out: 'Multa pagada, sin quita de puntos.', fx: { cash: (c) => -sm(c, 200_000), cat: 'multas', ind: { asociacion: 1 } } },
      { label: 'Usar tus contactos en la asociación', out: 'Hiciste llamados.', fx: { ind: { riesgo: 3 } }, risk: { p: (c) => 1 - c.ind.asociacion / 100, text: 'No alcanzó: quita de tres puntos.', fx: { fn: (c) => { if (!c.club) return; const lg = Object.values(c.s.comps).find((x) => x.type === 'league' && x.division === c.club!.division && x.season === c.s.season); const r = lg?.table.find((t) => t.id === c.club!.id); if (r) r.pts = Math.max(0, r.pts - 3); }, ind: { hinchas: -3 } } } },
      { label: 'Apelar', auto: true, out: 'Apelaste la sanción.', fx: {}, risk: { p: 0.5, text: 'La apelación fracasó: partido a puertas cerradas.', fx: { cash: (c) => -sm(c, 250_000), cat: 'entradas' } } },
    ],
  },
  {
    id: 'aso_tv_conflicto', cat: 'asociacion', title: 'Pelea por los derechos de TV', urg: 'importante', sev: 3, cd: 40,
    text: 'Una nueva señal de streaming ofrece duplicar el contrato de TV si los clubes rompen con la cadena actual. {char} encabeza a los rebeldes y te pide que te sumes.',
    bind: { char: 'presidente_club' }, w: 1, pos: ['club'],
    opts: [
      { label: 'Sumarte a la rebelión', out: 'Te alineaste con los rebeldes.', fx: { op: { char: 12, assoc: -12 }, ind: { asociacion: -6, influencia: 3 }, later: [{ w: [6, 14], fx: 'apply', p: 0.5, params: { cash: 0, news: 'La AAF firma un nuevo contrato de TV más alto tras la presión de los clubes', tone: 'pos', ind: { influencia: 3 } } }] } },
      { label: 'Defender a la asociación', out: 'Respaldaste el contrato vigente.', fx: { op: { assoc: 10, char: -10 }, ind: { asociacion: 5 } } },
      { label: 'Mediar entre ambas partes', auto: true, out: 'Propusiste una mesa de diálogo.', fx: { ind: { influencia: 2, repNacional: 1 } } },
    ],
  },
  {
    id: 'aso_presidentes_cumbre', cat: 'asociacion', title: 'Cumbre secreta de presidentes', urg: 'informativo', sev: 3, cd: 30,
    text: '{char} te invita a una cena reservada con otros presidentes para "pensar el futuro de la asociación". Es la primera piedra de un bloque opositor.',
    bind: { char: 'presidente_club' }, when: (c) => c.s.president.pos === 'club' && c.ind.influencia >= 30, w: 1.5,
    opts: [
      { label: 'Ir y liderar el bloque', out: 'Te convertiste en referente del bloque.', fx: { ind: { influencia: 6, asociacion: -6 }, op: { char: 12, assoc: -10 }, fn: (c) => { c.char!.tags.push('aliado_usuario'); } } },
      { label: 'Ir como observador', auto: true, out: 'Escuchaste sin comprometerte.', fx: { op: { char: 4 }, ind: { influencia: 2 } } },
      { label: 'Avisarle al presidente de la asociación', out: 'Lo informaste en reserva.', fx: { op: { assoc: 15, char: -25 }, ind: { asociacion: 6, presidentes: -4, integridad: -2 }, mem: 'Te traicionó ante la asociación' } },
    ],
  },
];

const ESCANDALOS: EventDef[] = [
  {
    id: 'esc_arreglo_partido', cat: 'escandalos', title: 'Una propuesta indecente', urg: 'urgente', sev: 5, cd: 50, pos: ['club'],
    text: 'Un intermediario vinculado a apuestas ilegales te contacta: ofrece {amount} para tu patrimonio personal si el club "no se esfuerza" en un partido intrascendente. Nadie se enteraría, asegura.',
    amount: (c) => sm(c, 300_000) + 100_000, w: 0.8,
    opts: [
      { label: 'Rechazar y denunciar ante la Justicia', out: 'Denunciaste el intento de soborno.', fx: { ind: { integridad: 10, repNacional: 4, periodistas: 4, riesgo: -5 }, news: '{president} denunció un intento de arreglo de partidos', tone: 'pos' } },
      { label: 'Rechazar en silencio', auto: true, out: 'Cortaste la conversación.', fx: { ind: { integridad: 1 } } },
      { label: 'Aceptar', out: 'Aceptaste el dinero.', fx: { wealth: (c) => c.amount, ind: { integridad: -15, riesgo: 25 }, flag: { matchFixing: true }, later: [{ w: [8, 50], fx: 'investigationCheck', params: { reason: 'arreglo de partidos', extra: 0.35 } }] } },
      { label: 'Simular interés y avisar a la Policía', out: 'Colaboraste con una investigación encubierta.', fx: { ind: { riesgo: 4 } }, risk: { p: 0.6, text: 'La investigación desbarató una red de apuestas: sos noticia nacional.', fx: { ind: { integridad: 12, repNacional: 8, repInternacional: 4, influencia: 3 } } } },
    ],
  },
  {
    id: 'esc_comision_representante', cat: 'escandalos', title: 'Una comisión "para vos"', urg: 'importante', sev: 4, cd: 30,
    text: '{char} te ofrece {amount} para tu bolsillo si el club compra a uno de sus jugadores a un precio inflado. "Así funciona el mercado", te dice con una sonrisa.',
    bind: { char: 'representante' }, amount: (c) => sm(c, 200_000) + 50_000, w: 1.3,
    opts: [
      { label: 'Aceptar la operación', out: 'Cerraste la operación con sobreprecio.', fx: { wealth: (c) => c.amount, cash: (c) => -c.amount * 3, cat: 'fichajes', ind: { integridad: -10, riesgo: 16, representantes: 6 }, op: { char: 15 }, later: [{ w: [10, 60], fx: 'investigationCheck', params: { reason: 'sobreprecios en transferencias', extra: 0.2 } }] } },
      { label: 'Rechazar con firmeza', auto: true, out: 'Rechazaste la propuesta.', fx: { ind: { integridad: 3, representantes: -2 }, op: { char: -8 } } },
      { label: 'Exigir que el sobreprecio vaya al club', out: 'El representante acepta un descuento para el club.', fx: { cash: (c) => sm(c, 100_000), cat: 'fichajes', ind: { representantes: -1 }, op: { char: -2 } } },
    ],
  },
  {
    id: 'esc_auditoria', cat: 'escandalos', title: 'Una auditoría detecta inconsistencias', urg: 'urgente', sev: 4, cd: 30,
    text: 'La auditoría externa encontró pagos sin respaldo por {amount} durante tu gestión. El informe todavía no es público. {char} te sugiere "corregir" algunos papeles.',
    bind: { char: 'tesorero' }, amount: (c) => sm(c, 500_000), when: (c) => c.ind.riesgo > 45, w: 3,
    opts: [
      { label: 'Publicar el informe y explicar', out: 'Asumiste los errores públicamente.', fx: { ind: { integridad: 6, socios: -4, periodistas: 3, riesgo: -10 } } },
      { label: 'Corregir los papeles', out: 'Los papeles quedaron "prolijos".', fx: { ind: { integridad: -10, riesgo: 12 }, op: { char: 5 }, later: [{ w: [10, 40], fx: 'investigationCheck', params: { reason: 'falsificación de documentación contable', extra: 0.25 } }] } },
      { label: 'Echar al tesorero como responsable', out: 'El tesorero fue señalado.', fx: { ind: { integridad: -2, comision: -4, riesgo: -4 }, op: { char: -40 }, fn: (c) => { c.char!.active = false; }, later: [{ w: [5, 20], fx: 'revenge', params: { news: 'El extesorero {char} declara contra {president}', ind: { riesgo: 8, integridad: -4 } } }] } },
      { label: 'Encargar una auditoría independiente más amplia', auto: true, out: 'Se amplía la auditoría.', fx: { cash: (c) => -sm(c, 60_000), cat: 'servicios', ind: { integridad: 3, riesgo: -3 } } },
    ],
  },
  {
    id: 'esc_investigacion_abierta', cat: 'escandalos', title: 'La Justicia abre una investigación', chain: true, urg: 'urgente', sev: 5, pos: ['any'],
    text: 'Un fiscal abrió una causa por presuntas irregularidades en tu gestión. Los allanamientos son tapa de todos los diarios. Tu continuidad está en duda.',
    opts: [
      { label: 'Contratar a los mejores abogados', out: 'Armaste una defensa sólida.', fx: { wealth: -400_000, ind: { riesgo: -6, periodistas: -2 } }, risk: { p: (c) => c.ind.riesgo / 140 + (c.s.flags.matchFixing ? 0.3 : 0), text: 'La causa avanza: el tribunal dicta una inhabilitación preventiva.', fx: { fn: (c) => suspend(c, 40) } } },
      { label: 'Pedir licencia y colaborar', out: 'Pediste licencia mientras dure la investigación.', fx: { ind: { integridad: 5, gobernabilidad: -5 } }, risk: { p: (c) => c.ind.riesgo / 200, text: 'La investigación confirmó irregularidades: sanción y alejamiento del cargo.', fx: { fn: (c) => suspend(c, 30) } } },
      { label: 'Denunciar persecución política', auto: true, out: 'Denunciaste una "operación".', fx: { ind: { periodistas: -6, integridad: -3, hinchas: 2 } }, risk: { p: (c) => c.ind.riesgo / 110, text: 'El fiscal pidió tu procesamiento: quedás suspendido.', fx: { fn: (c) => suspend(c, 50) } } },
      { label: 'Renunciar a tu cargo', out: 'Renunciaste para defenderte.', fx: { ind: { integridad: 2 }, fn: (c) => suspend(c, 10) } },
    ],
  },
  {
    id: 'esc_dirigente_denunciado', cat: 'escandalos', title: '{char} es denunciado', urg: 'importante', sev: 3, cd: 30,
    text: 'Una denuncia periodística acusa a {char}, miembro de tu comisión directiva, de cobrar comisiones en contratos del club. Te piden que tomes posición.',
    bind: { char: 'vocal' }, w: 1.5,
    opts: [
      { label: 'Separarlo preventivamente', out: 'Fue apartado de su cargo.', fx: { ind: { integridad: 5, comision: -3 }, op: { char: -25 }, fn: (c) => { c.char!.active = false; } } },
      { label: 'Respaldarlo', out: 'Lo defendiste públicamente.', fx: { ind: { integridad: -5, riesgo: 5 }, op: { char: 20 } }, risk: { p: 0.4, text: 'Aparecieron nuevas pruebas en su contra: tu respaldo te salpica.', fx: { ind: { integridad: -5, periodistas: -4, riesgo: 6 } } } },
      { label: 'Ordenar una investigación interna', auto: true, out: 'Investigación interna en curso.', fx: { ind: { integridad: 2 } } },
    ],
  },
  {
    id: 'esc_voto_por_favor', cat: 'escandalos', title: 'Votos a cambio de un favor', urg: 'importante', sev: 4, cd: 40, pos: ['club', 'asociacion'],
    text: '{char} te ofrece su apoyo y el de tres clubes aliados en la asociación a cambio de que lo ayudes a evitar una sanción por deudas.',
    bind: { char: 'presidente_club' }, when: (c) => c.ind.influencia >= 25, w: 1.5,
    opts: [
      { label: 'Aceptar el trato', out: 'Sellaste el pacto.', fx: { ind: { influencia: 8, integridad: -6, riesgo: 8 }, op: { char: 20 }, fn: (c) => { c.s.flags[`favor_${c.char!.id}`] = true; c.char!.tags.push('aliado_usuario'); } } },
      { label: 'Rechazar', auto: true, out: 'Rechazaste.', fx: { op: { char: -10 }, ind: { integridad: 2 } } },
      { label: 'Exponer la propuesta', out: 'Denunciaste la oferta.', fx: { op: { char: -40 }, ind: { integridad: 8, presidentes: -5, periodistas: 3 }, mem: 'Lo expuso públicamente' } },
    ],
  },
  {
    id: 'esc_documentos_juvenil', cat: 'escandalos', title: 'Juvenil con documentación adulterada', urg: 'importante', sev: 3, cd: 50,
    text: 'Se descubrió que un juvenil de las inferiores tendría la edad adulterada. El director deportivo {char} sugiere "no hacer olas".',
    bind: { char: 'director_deportivo' }, w: 0.8,
    opts: [
      { label: 'Denunciarlo ante la asociación', out: 'Informaste el caso.', fx: { ind: { integridad: 6, asociacion: 2 }, op: { char: -10 } } },
      { label: 'Resolverlo en silencio', auto: true, out: 'El juvenil deja el club sin explicación.', fx: { ind: { riesgo: 5 }, later: [{ w: [10, 40], fx: 'sanction', p: 0.3, params: { fine: 150000, reason: 'encubrimiento de documentación adulterada' } }] } },
      { label: 'Echar al director deportivo', out: 'El DD fue despedido.', fx: { ind: { integridad: 3, comision: -1 }, op: { char: -40 }, fn: (c) => { c.char!.active = false; } } },
    ],
  },
  {
    id: 'esc_barra_sobres', cat: 'escandalos', title: 'Video de un dirigente con la barra', urg: 'urgente', sev: 4, cd: 40,
    text: 'Se viralizó un video de {char} entregando un sobre al jefe de la barra. La Justicia pide explicaciones y los patrocinadores llaman preocupados.',
    bind: { char: 'vicepresidente' }, when: (c) => c.ind.barra > 60 || c.ind.riesgo > 40, w: 2,
    opts: [
      { label: 'Pedirle la renuncia', out: '{char} dejó su cargo.', fx: { ind: { integridad: 5, barra: -8, comision: -3 }, op: { char: -30, barra: -10 }, fn: (c) => { c.char!.active = false; } } },
      { label: 'Negar todo', auto: true, out: 'El club niega cualquier vínculo.', fx: { ind: { integridad: -6, patrocinadores: -5, riesgo: 6 } } },
      { label: 'Romper públicamente con la barra', out: 'Anunciaste tolerancia cero.', fx: { ind: { integridad: 8, barra: -20, periodistas: 4, patrocinadores: 2 }, op: { barra: -30 }, later: [{ w: [1, 4], ev: 'seg_incidentes', p: 0.5 }] } },
    ],
  },
];

function suspend(c: Ctx, weeks: number) {
  const s = c.s;
  s.president.suspendedUntil = absWeek(s) + weeks;
  s.career.sanctions.push(`${s.season}: Inhabilitación por ${weeks} semanas`);
  changeInd(s, 'repNacional', -10);
  changeInd(s, 'repInternacional', -6);
  changeInd(s, 'integridad', -10);
  if (s.president.pos === 'club') leaveClub(s, c.rng, null);
  else if (s.president.pos === 'asociacion' || s.president.pos === 'confederacion' || s.president.pos === 'fifa') {
    const body = s.president.pos === 'asociacion' ? s.assoc : s.president.pos === 'confederacion' ? s.confed : s.fifa;
    const interim = Object.values(s.chars).find((x) => x.active && (x.role === 'dirigente_asociacion' || x.role === 'presidente_federacion' || x.role === 'presidente_confederacion'));
    body.presidentId = interim?.id ?? null;
    s.career.positions.forEach((p) => (p.to === null || p.to === undefined) && (p.to = s.season));
    s.president.pos = 'sin_cargo';
  }
  addNews(s, `${s.president.name} ${s.president.surname} queda inhabilitado por ${weeks} semanas`, 'neg', 'escandalos', true);
}

const INTERNACIONAL: EventDef[] = [
  {
    id: 'int_convenio', cat: 'internacional', title: '{other} propone un convenio', urg: 'informativo', sev: 2, cd: 40,
    text: '{other} ({othercountry}) ofrece un convenio de intercambio de juveniles y amistosos de pretemporada. Aportaría prestigio y {amount} por año.',
    bind: { other: 'foreign_rich' }, amount: (c) => sm(c, 150_000), w: 1.2,
    opts: [
      { label: 'Firmar el convenio', out: 'Convenio firmado.', fx: { cash: (c) => c.amount, cat: 'eventos', ind: { repInternacional: 4, socios: 1 } } },
      { label: 'Firmar con derecho preferencial sobre juveniles', out: 'Firmaste con cláusulas favorables al club.', fx: { cash: (c) => c.amount * 1.5, cat: 'eventos', ind: { repInternacional: 3, socios: -2 } } },
      { label: 'Rechazar', auto: true, out: 'No avanzaste.', fx: {} },
    ],
  },
  {
    id: 'int_gira', cat: 'internacional', title: 'Invitación a una gira por {othercountry}', urg: 'informativo', sev: 2, cd: 40,
    text: 'Un organizador ofrece {amount} por una gira de dos amistosos en {othercountry} durante la pretemporada. El entrenador se queja del desgaste.',
    bind: { other: 'foreign_rich', coach: 'own' }, amount: (c) => sm(c, 500_000), when: (c) => c.s.week <= 3 || (c.s.week >= 18 && c.s.week <= 20), w: 2,
    opts: [
      { label: 'Aceptar la gira', out: 'El equipo viaja.', fx: { cash: (c) => c.amount, cat: 'eventos', ind: { repInternacional: 4, patrocinadores: 3 }, op: { coach: -5 }, fn: (c) => { for (const p of c.sq) p.fitness = clamp(p.fitness - 8); } } },
      { label: 'Gira corta de un partido', out: 'Un solo amistoso.', fx: { cash: (c) => c.amount * 0.45, cat: 'eventos', ind: { repInternacional: 2 } } },
      { label: 'Priorizar la preparación', auto: true, out: 'No hay gira.', fx: { op: { coach: 4 } } },
    ],
  },
  {
    id: 'int_federacion_extranjera', cat: 'internacional', title: 'La federación de {nation} pide un favor', urg: 'informativo', sev: 2, cd: 40, pos: ['asociacion', 'confederacion', 'fifa'],
    text: 'El presidente de la federación de {nation} te pide apoyo para organizar un torneo juvenil y ofrece su voto en futuras elecciones.',
    bind: { nation: 'any' }, w: 1.5,
    opts: [
      { label: 'Apoyar con fondos', out: 'Aportaste fondos al torneo.', fx: { cash: -500_000, cat: 'premios', ind: { repInternacional: 4, influencia: 2 }, fn: (c) => { const n = c.s.nations[c.b.nation!]; if (n?.presidentId) changeOpinion(c.s, n.presidentId, 15, 'Lo apoyó con su torneo juvenil'); } } },
      { label: 'Apoyo institucional sin fondos', auto: true, out: 'Respaldo simbólico.', fx: { ind: { repInternacional: 1 }, fn: (c) => { const n = c.s.nations[c.b.nation!]; if (n?.presidentId) changeOpinion(c.s, n.presidentId, 4); } } },
      { label: 'Declinar', out: 'No es prioridad.', fx: { fn: (c) => { const n = c.s.nations[c.b.nation!]; if (n?.presidentId) changeOpinion(c.s, n.presidentId, -6); } } },
    ],
  },
];

const SELECCION: EventDef[] = [
  {
    id: 'sel_crisis_eliminacion', cat: 'selecciones', title: 'Crisis tras el fracaso de la selección', urg: 'urgente', sev: 5, cd: 20, pos: ['asociacion'],
    text: 'La eliminación de Argentina desató una tormenta política. Los presidentes de clubes piden cambios y la prensa habla de "la peor gestión de la historia". El seleccionador {coach} espera tu decisión.',
    bind: { coach: 'nt' }, when: (c) => Number(c.s.flags.ntFailureAbs ?? -99) >= c.abs - 2, w: 20,
    opts: [
      { label: 'Despedir al seleccionador', out: 'El seleccionador fue despedido.', fx: { fn: (c) => fireNTCoach(c.s), ind: { presidentes: 3, periodistas: 2 } } },
      { label: 'Ratificarlo y asumir la responsabilidad', out: 'Respaldaste al cuerpo técnico.', fx: { op: { coach: 15 }, ind: { presidentes: -4, integridad: 2 }, fn: (c) => { if (!c.coach!.tags.includes('respaldado')) c.coach!.tags.push('respaldado'); } } },
      { label: 'Anunciar una refundación integral del fútbol juvenil', auto: true, out: 'Lanzaste un plan de largo plazo.', fx: { ind: { repNacional: 2, presidentes: -1 }, fn: (c) => { c.s.nt.youthInvest = Math.min(3, c.s.nt.youthInvest + 1); } } },
      { label: 'Llamar a elecciones anticipadas en la AAF', out: 'Pusiste tu cargo a disposición.', fx: { ind: { integridad: 6 }, fn: (c) => { c.s.assoc.nextElection = c.s.season; } } },
    ],
  },
  {
    id: 'sel_conflicto_clubes', cat: 'selecciones', title: 'Los clubes no quieren ceder jugadores', urg: 'importante', sev: 3, cd: 20, pos: ['asociacion'],
    text: '{char} se niega a ceder a sus jugadores para la fecha FIFA porque coincide con un partido decisivo de su club. Otros presidentes podrían sumarse.',
    bind: { char: 'presidente_club' }, w: 2,
    opts: [
      { label: 'Exigir la cesión según el reglamento', out: 'Se cumplió el reglamento.', fx: { op: { char: -12 }, ind: { presidentes: -2, repInternacional: 1 }, fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale + 3); } } },
      { label: 'Reprogramar el partido del club', auto: true, out: 'Se reprogramó la fecha del torneo local.', fx: { op: { char: 8 }, ind: { presidentes: 2 } } },
      { label: 'Compensar económicamente a los clubes', out: 'Pagaste una compensación.', fx: { cash: -1_200_000, cat: 'otros', ind: { presidentes: 4 } } },
    ],
  },
  {
    id: 'sel_figura_renuncia', cat: 'selecciones', title: 'Una figura renuncia a la selección', urg: 'importante', sev: 3, cd: 50, pos: ['asociacion'],
    text: 'El capitán de la selección anunció que no jugará más para Argentina por diferencias con la conducción de la AAF. Los hinchas te apuntan a vos.',
    w: 0.8,
    opts: [
      { label: 'Reunirte con él personalmente', out: 'Fuiste a verlo.', fx: {}, risk: { p: 0.55, text: 'Lo convenciste: vuelve a la selección.', fx: { ind: { repNacional: 4 }, fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale + 8); } } } },
      { label: 'Respetar su decisión', auto: true, out: 'La selección sigue sin él.', fx: { ind: { repNacional: -3 }, fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale - 5); } } },
      { label: 'Criticarlo públicamente', out: 'Lo acusaste de egoísta.', fx: { ind: { repNacional: -5, periodistas: -3 } } },
    ],
  },
  {
    id: 'sel_premios_plantel', cat: 'selecciones', title: 'El plantel pide premios por la clasificación', urg: 'importante', sev: 3, cd: 40, pos: ['asociacion'],
    text: 'Los referentes de la selección piden un premio récord por clasificar al Mundial. Amenazan con no hacer la gira de amistosos si no hay acuerdo.',
    w: 1.2,
    opts: [
      { label: 'Aceptar el premio récord', out: 'Acuerdo cerrado.', fx: { cash: -3_000_000, cat: 'premios', fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale + 10); c.s.nt.bonus = 3; } } },
      { label: 'Ofrecer premios escalonados', auto: true, out: 'Premios según resultados.', fx: { fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale + 4); c.s.nt.bonus = 2; } } },
      { label: 'Negarse', out: 'Te plantaste.', fx: { fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale - 10); }, ind: { estabilidad: 2 } } },
    ],
  },
  {
    id: 'sel_sede_amistoso', cat: 'selecciones', title: 'Ofrecen un amistoso millonario en Medio Oriente', urg: 'informativo', sev: 2, cd: 40, pos: ['asociacion'],
    text: 'Un fondo saudí ofrece {amount} por un amistoso de la selección en Riad. El seleccionador se opone por el viaje.',
    amount: () => 6_000_000, w: 1.2,
    opts: [
      { label: 'Aceptar', out: 'La selección jugará en Riad.', fx: { cash: (c) => c.amount, cat: 'eventos', ind: { repInternacional: 2 }, op: { coach: -6 }, fn: (c) => { c.s.nt.morale = clamp(c.s.nt.morale - 3); } } },
      { label: 'Negociar que se juegue en Argentina', out: 'Contraoferta enviada.', fx: {}, risk: { p: 0.4, text: 'Aceptaron jugar en Buenos Aires por menos dinero.', fx: { cash: (c) => c.amount * 0.5, cat: 'eventos', ind: { repNacional: 2 } } } },
      { label: 'Rechazar', auto: true, out: 'No hay amistoso.', fx: { op: { coach: 3 } } },
    ],
  },
];

const CONFED: EventDef[] = [
  {
    id: 'con_sede_final', cat: 'confederacion', title: 'Disputa por la sede de la final', urg: 'importante', sev: 3, cd: 30, pos: ['confederacion'],
    text: 'Dos federaciones pelean por organizar la final de la Copa Continental. La de {nation} ofrece más dinero; la otra promete estadio lleno y seguridad.',
    bind: { nation: 'csf' }, w: 2,
    opts: [
      { label: 'Elegir la oferta económica', out: 'La final se jugará donde más pagaron.', fx: { cash: 8_000_000, cat: 'eventos', ind: { integridad: -2, repInternacional: 1 }, fn: (c) => { const n = c.s.nations[c.b.nation!]; if (n?.presidentId) changeOpinion(c.s, n.presidentId, 15); } } },
      { label: 'Elegir la sede más segura', auto: true, out: 'Prioridad a la seguridad.', fx: { ind: { integridad: 3, repInternacional: 2 } } },
      { label: 'Final en sede neutral fuera del continente', out: 'Final en Miami.', fx: { cash: 15_000_000, cat: 'eventos', ind: { hinchas: -5, repInternacional: 3, presidentes: -3 } } },
    ],
  },
  {
    id: 'con_premios_clubes', cat: 'confederacion', title: 'Los clubes exigen más premios', urg: 'importante', sev: 3, cd: 30, pos: ['confederacion'],
    text: 'Los clubes de la Copa Continental exigen aumentar 40% los premios. Si no hay acuerdo, amenazan con una liga paralela.',
    w: 2,
    opts: [
      { label: 'Aceptar el aumento', out: 'Premios aumentados.', fx: { cash: -25_000_000, cat: 'premios', ind: { presidentes: 6, repInternacional: 2 } } },
      { label: 'Aumento del 15% atado a nuevos sponsors', auto: true, out: 'Acuerdo intermedio.', fx: { cash: -8_000_000, cat: 'premios', ind: { presidentes: 2 } } },
      { label: 'Rechazar y amenazar con sanciones', out: 'Te plantaste.', fx: { ind: { presidentes: -6, influencia: 2 } } },
    ],
  },
  {
    id: 'con_federacion_crisis', cat: 'confederacion', title: 'Intervención en la federación de {nation}', urg: 'importante', sev: 4, cd: 40, pos: ['confederacion', 'fifa'],
    text: 'El gobierno de {nation} intervino su federación de fútbol. La FIF amenaza con desafiliarla. Te piden que intercedas.',
    bind: { nation: 'csf' }, w: 1.2,
    opts: [
      { label: 'Defender la autonomía de la federación', out: 'Respaldaste a los dirigentes desplazados.', fx: { ind: { repInternacional: 3, influencia: 2 }, fn: (c) => { const n = c.s.nations[c.b.nation!]; if (n?.presidentId) changeOpinion(c.s, n.presidentId, 20, 'Lo defendió de la intervención'); } } },
      { label: 'Negociar con el gobierno', auto: true, out: 'Abriste un canal de diálogo.', fx: { ind: { influencia: 3 } } },
      { label: 'Pedir la suspensión de la federación', out: 'Solicitaste la suspensión.', fx: { ind: { integridad: 3, repInternacional: -2 }, fn: (c) => { const n = c.s.nations[c.b.nation!]; if (n?.presidentId) changeOpinion(c.s, n.presidentId, -30); } } },
    ],
  },
];

const FIFA: EventDef[] = [
  {
    id: 'fif_sede_mundial', cat: 'fifa', title: 'Elección de la sede del Mundial', urg: 'urgente', sev: 5, cd: 120, pos: ['fifa'],
    text: 'Hay que definir la sede del Mundial dentro de ocho años. Candidatas: una candidatura conjunta sudamericana (emotiva, menos rentable), un país del Golfo (fondos ilimitados, polémica) y una candidatura europea (segura).',
    w: 6,
    opts: [
      { label: 'Candidatura sudamericana', out: 'El Mundial vuelve a Sudamérica.', fx: { ind: { repInternacional: 4, presidentes: 3 }, fn: (c) => { c.s.fifa.hostDecided = { ...(c.s.fifa.hostDecided ?? {}), [c.s.season + 8 - ((c.s.season + 8) % 4) + 2]: 'ARG' }; } } },
      { label: 'Candidatura del Golfo', out: 'El Golfo organizará el Mundial.', fx: { cash: 500_000_000, cat: 'patrocinio', ind: { integridad: -8, riesgo: 6, repInternacional: -2 }, fn: (c) => { c.s.fifa.hostDecided = { ...(c.s.fifa.hostDecided ?? {}), [c.s.season + 8 - ((c.s.season + 8) % 4) + 2]: 'KSA' }; } } },
      { label: 'Candidatura europea', auto: true, out: 'Se eligió la opción segura.', fx: { ind: { repInternacional: 2 }, fn: (c) => { c.s.fifa.hostDecided = { ...(c.s.fifa.hostDecided ?? {}), [c.s.season + 8 - ((c.s.season + 8) % 4) + 2]: 'ESP' }; } } },
    ],
  },
  {
    id: 'fif_formato', cat: 'fifa', title: 'Ampliar el Mundial a 64 selecciones', urg: 'importante', sev: 4, cd: 80, pos: ['fifa'],
    text: 'Las federaciones pequeñas presionan para ampliar el Mundial a 64 selecciones. Las grandes ligas europeas amenazan con no ceder jugadores.',
    w: 2,
    opts: [
      { label: 'Aprobar la ampliación', out: 'Mundial de 64 selecciones.', fx: { cash: 300_000_000, cat: 'tv', ind: { influencia: 6, repInternacional: -2, presidentes: 4 } } },
      { label: 'Rechazarla', out: 'El formato se mantiene.', fx: { ind: { influencia: -4, repInternacional: 2 } } },
      { label: 'Postergar con un estudio', auto: true, out: 'Comisión de estudio creada.', fx: { ind: { influencia: -1 } } },
    ],
  },
  {
    id: 'fif_distribucion', cat: 'fifa', title: 'Distribución de los ingresos globales', urg: 'importante', sev: 4, cd: 60, pos: ['fifa'],
    text: 'Hay que definir el programa de desarrollo: repartir más dinero entre las federaciones pequeñas o reforzar los premios del Mundial para las potencias.',
    w: 2,
    opts: [
      { label: 'Priorizar el desarrollo', out: 'Más fondos para las federaciones pequeñas.', fx: { flag: { fifaDevelopment: 1.3 }, ind: { influencia: 6, repInternacional: 3 } } },
      { label: 'Priorizar a las potencias', out: 'Más premios para los grandes.', fx: { flag: { fifaDevelopment: 0.8 }, ind: { influencia: -3, patrocinadores: 5 } } },
      { label: 'Mantener el esquema', auto: true, out: 'Sin cambios.', fx: {} },
    ],
  },
  {
    id: 'fif_escandalo_global', cat: 'fifa', title: 'Escándalo de sobornos en la FIF', urg: 'urgente', sev: 5, cd: 80, pos: ['fifa', 'confederacion'],
    text: 'Una investigación internacional revela sobornos en la adjudicación de derechos de TV de la gestión anterior. Te exigen reformas inmediatas.',
    w: 1,
    opts: [
      { label: 'Reforma total y auditoría externa', out: 'Iniciaste una limpieza profunda.', fx: { cash: -80_000_000, cat: 'servicios', ind: { integridad: 10, repInternacional: 6, influencia: -4 } } },
      { label: 'Sanciones selectivas', auto: true, out: 'Algunos dirigentes fueron suspendidos.', fx: { ind: { integridad: 3, influencia: 1 } } },
      { label: 'Minimizar el caso', out: 'Hablaste de "casos aislados".', fx: { ind: { integridad: -8, riesgo: 10, repInternacional: -5 } } },
    ],
  },
];

const CARRERA: EventDef[] = [
  {
    id: 'car_oferta_club_grande', cat: 'politica', title: 'Te proponen presidir {other}', urg: 'importante', sev: 4, cd: 60, pos: ['club', 'sin_cargo'],
    text: 'Una agrupación de {other} te propone encabezar su lista en las próximas elecciones. "Necesitamos a alguien con tu trayectoria". Aceptar implica dejar tu cargo actual al final de la temporada.',
    bind: { other: 'arg_big' }, when: (c) => c.ind.repNacional >= 55 && (c.s.president.pos === 'sin_cargo' || (c.club?.prestige ?? 99) + 8 < c.other!.prestige) && !c.s.election, w: 2,
    opts: [
      { label: 'Aceptar y presentarte', out: 'Sos candidato en {other}.', fx: { fn: (c) => { if (c.s.president.pos === 'club') { changeInd(c.s, 'socios', -6); leaveClub(c.s, c.rng, null); } startClubElection(c.s, c.rng, c.other!.id, true, 6); return 'La votación será en seis semanas.'; } } },
      { label: 'Agradecer y declinar', auto: true, out: 'Te quedás donde estás.', fx: { ind: { socios: 2, repNacional: 1 } } },
      { label: 'Pedir tiempo para pensarlo', out: 'La propuesta queda en suspenso.', fx: { later: [{ w: [20, 40], ev: 'car_oferta_club_grande', p: 0.4 }] } },
    ],
  },
  {
    id: 'car_normalizador', cat: 'politica', title: '{other} necesita un normalizador', urg: 'importante', sev: 4, cd: 30, pos: ['sin_cargo'],
    text: '{other} está acéfalo tras la renuncia de su comisión directiva. La asamblea de socios te ofrece asumir como presidente normalizador por dos temporadas.',
    bind: { other: 'arg_any' }, when: (c) => c.s.president.pos === 'sin_cargo' && !(c.s.president.suspendedUntil && c.s.president.suspendedUntil > c.abs), w: 4,
    opts: [
      { label: 'Aceptar', out: 'Asumís en {other}.', fx: { fn: (c) => { assumeClub(c.s, c.rng, c.other!, 2); } } },
      { label: 'Rechazar y esperar una propuesta mejor', auto: true, out: 'Seguís sin cargo.', fx: {} },
      { label: 'Aceptar sólo si te garantizan fondos', out: 'Pusiste condiciones.', fx: {}, risk: { p: 0.5, text: 'Aceptaron: asumís con un aporte inicial de socios.', fx: { fn: (c) => { assumeClub(c.s, c.rng, c.other!, 2); book(c.s, 'aportes', Math.max(100_000, estimateRevenue(c.s, c.other!) * 0.05)); } } } },
    ],
  },
  {
    id: 'car_retiro_sugerido', cat: 'personal', title: '¿Llegó la hora del retiro?', urg: 'informativo', sev: 2, cd: 80, pos: ['any'],
    text: 'A los {n} años, tu familia y tus amigos te sugieren dar un paso al costado y disfrutar. Tu legado ya está escrito... o no.',
    when: (c) => { c.b.n = c.s.president.age; return c.s.president.age >= 72; }, w: 2,
    opts: [
      { label: 'Seguir: el fútbol es mi vida', auto: true, out: 'Seguís adelante.', fx: {} },
      { label: 'Preparar una sucesión ordenada', out: 'Empezaste a formar un sucesor.', fx: { ind: { gobernabilidad: 3, integridad: 2 } } },
      { label: 'Anunciar el retiro a fin de temporada', out: 'Anunciaste tu retiro.', fx: { flag: { retireAtSeasonEnd: true } } },
    ],
  },
];

registerEvents([...POLITICA, ...ELECCIONES, ...ASOCIACION, ...ESCANDALOS, ...INTERNACIONAL, ...SELECCION, ...CONFED, ...FIFA, ...CARRERA]);
export const POWER_COUNT = POLITICA.length + ELECCIONES.length + ASOCIACION.length + ESCANDALOS.length + INTERNACIONAL.length + SELECCION.length + CONFED.length + FIFA.length + CARRERA.length;
void addNews; void rev;
