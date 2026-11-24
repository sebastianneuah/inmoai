// Acontecimientos deportivos: mercado de pases, jugadores, entrenadores y resultados.
import { registerEvents, schedule, scaleMoney as sm, type Ctx, type EventDef } from './engine';
import { sellPlayer, transferPlayer, wageDemand, refreshValue, MAX_SQUAD } from '../market';
import { isWindowOpen } from '../competitions';
import { fireCoach } from '../coaches';
import { clamp, money } from '../util';
import { squad, bestXI } from '../queries';
import { changeInd, changeOpinion } from '../relations';
import { addNews } from '../news';
import { makePlayer } from '../worldgen';
import { wageFor } from '../valuation';

const win = (c: Ctx) => isWindowOpen(c.s.week);
const avgXI = (c: Ctx) => {
  const xi = bestXI(c.sq);
  return xi.reduce((a, p) => a + p.ovr, 0) / Math.max(1, xi.length);
};
const sell = (c: Ctx) => (c.player && c.other ? sellPlayer(c.s, c.player.id, c.other.id, c.amount) : '');
const lossStreak = (c: Ctx, n: number) => !!c.club && c.club.form.slice(-n).length === n && c.club.form.slice(-n).every((x) => x === 'P');
const winStreak = (c: Ctx, n: number) => !!c.club && c.club.form.slice(-n).length === n && c.club.form.slice(-n).every((x) => x === 'G');
const badRun = (c: Ctx) => !!c.club && c.club.form.slice(-5).filter((x) => x === 'P').length >= 3;

const MERCADO: EventDef[] = [
  {
    id: 'mer_oferta_exterior', cat: 'mercado', title: 'Oferta del exterior por {player}', urg: 'urgente', sev: 4, cd: 6,
    text: '{other} ({othercountry}) ofrece {amount} por {player}, tu {pos} de {age} años. El jugador ya habló con su entorno y quiere irse. {agent} presiona para cerrar antes del cierre del libro de pases.',
    bind: { player: (c) => c.rng.pick(c.sq.filter((p) => !p.loanFrom && (p.ovr >= Math.max(68, avgXI(c)) || (p.age <= 21 && p.pot >= 78)))), other: 'foreign_rich' },
    amount: (c) => c.player!.value * c.rng.float(1.15, 1.7),
    when: (c) => win(c) && c.sq.length > 19, w: 3,
    opts: [
      { label: 'Aceptar la oferta', out: 'Operación cerrada. {player} se despide del club.', fx: { fn: sell, ind: { estabilidad: 3 }, op: { agent: 6 }, later: [{ w: [20, 60], fx: 'soldStarShines', p: 0.35 }] } },
      { label: 'Pedir más dinero (+25%)', detail: 'Riesgo: pueden retirarse.', out: 'Respondiste con una contraoferta.', fx: { fn: (c) => { if (c.rng.chance(0.55)) { schedule(c, { w: [0, 0], ev: 'mer_contraoferta' }); return '{other} analiza tu contraoferta: espera una respuesta la semana próxima.'.replace('{other}', c.other!.name); } c.player!.morale = clamp(c.player!.morale - 20); changeInd(c.s, 'jugadores', -2); changeOpinion(c.s, c.player!.agentId, -6); return `${c.other!.name} se retira de la negociación. ${c.player!.name} queda molesto.`; } } },
      { label: 'Rechazar: es intransferible', out: 'Rechazaste la oferta. Los hinchas celebran, el jugador no tanto.', fx: { pmorale: -18, ind: { hinchas: 4, socios: 2, jugadores: -2 }, op: { agent: -8 }, mem: 'Le bloqueaste la venta al exterior', later: [{ w: [3, 10], ev: 'jug_quiere_irse', p: 0.5 }] } },
      { label: 'Delegar en el director deportivo', auto: true, out: 'El director deportivo negoció y cerró la venta en condiciones razonables.', fx: { fn: (c) => { c.b.amount = Math.round(c.amount * 0.92); c.amount = c.b.amount; return sell(c); }, op: { dd: 3 } } },
    ],
  },
  {
    id: 'mer_contraoferta', cat: 'mercado', title: '{other} vuelve a la carga por {player}', chain: true, urg: 'urgente', sev: 4,
    text: 'Tras tu contraoferta, {other} mejora su propuesta: {amount} por {player}. Dicen que es su última oferta.',
    amount: (c) => (c.b.amount ?? c.player!.value) * 1.22,
    when: (c) => !!c.player && c.player.clubId === c.club?.id,
    opts: [
      { label: 'Aceptar', out: 'Venta cerrada en condiciones excelentes.', fx: { fn: sell, ind: { estabilidad: 4, repInternacional: 1 } } },
      { label: 'Rechazar definitivamente', auto: true, out: 'El jugador se queda, pero el vínculo quedó dañado.', fx: { pmorale: -15, ind: { hinchas: 2 }, op: { agent: -5 } } },
      { label: 'Aceptar con cláusula de reventa del 20%', out: 'Cerraste la venta con un porcentaje de una futura transferencia.', fx: { fn: (c) => { c.b.amount = Math.round(c.amount * 0.9); c.amount = c.b.amount; c.s.flags[`sellOn_${c.player!.id}`] = 0.2; return sell(c); }, ind: { estabilidad: 2 } } },
    ],
  },
  {
    id: 'mer_oferta_local', cat: 'mercado', title: '{other} quiere a {player}', urg: 'importante', sev: 3, cd: 8,
    text: '{other} ofrece {amount} por {player}. Es un club con más poder económico y el jugador ve la oportunidad con buenos ojos. Su presidente, que conocés de las asambleas, espera una respuesta.',
    bind: { player: (c) => c.rng.pick(c.sq.filter((p) => !p.loanFrom && p.ovr >= avgXI(c) - 2 && p.age <= 30)), other: 'arg_big' },
    amount: (c) => c.player!.value * c.rng.float(0.95, 1.35),
    when: (c) => win(c) && (c.club?.prestige ?? 99) < (c.other?.prestige ?? 0) && c.sq.length > 19, w: 2.5,
    opts: [
      { label: 'Vender', out: 'Venta concretada.', fx: { fn: sell, op: { other: 6 }, mem: 'Le vendiste a {player}' } },
      { label: 'Pedir un jugador a cambio + dinero', out: 'Propusiste un intercambio.', fx: { fn: (c) => { const theirs = squad(c.s, c.other!.id).filter((p) => p.ovr < c.player!.ovr && p.ovr >= c.player!.ovr - 6 && !p.loanFrom).sort((a, b) => b.ovr - a.ovr)[0]; if (!theirs || !c.club || squad(c.s, c.club.id).length >= MAX_SQUAD) return 'No encontraron un jugador para el intercambio y la negociación se enfrió.'; c.b.amount = Math.round(c.amount * 0.55); c.amount = c.b.amount; const r = sell(c); transferPlayer(c.s, theirs, c.club, 2, theirs.wage, 0); return `${r} Además llega ${theirs.name} como parte de pago.`; }, op: { other: 4 } } },
      { label: 'Rechazar', auto: true, out: 'Rechazaste la oferta.', fx: { pmorale: -10, op: { other: -4 }, ind: { hinchas: 2 } } },
    ],
  },
  {
    id: 'mer_juvenil_millonario', cat: 'mercado', title: 'Oferta millonaria por un juvenil', urg: 'urgente', sev: 4, cd: 12,
    text: '{other} ofrece {amount} por {player}, juvenil de {age} años que todavía no se consolidó en primera. Los formadores del club piden paciencia: creen que puede valer el triple en dos años.',
    bind: { player: 'young', other: 'foreign_rich' },
    amount: (c) => c.player!.value * c.rng.float(1.3, 2.2),
    when: (c) => win(c) && c.player!.pot >= 74, w: 2,
    opts: [
      { label: 'Vender ya: el dinero hoy', out: 'Vendiste al juvenil.', fx: { fn: sell, ind: { estabilidad: 3, socios: -2 }, op: { dd: -3 } } },
      { label: 'Renovarle y blindarlo', out: 'Le ofreciste un contrato largo con una cláusula alta. Su entorno aceptó con un aumento importante.', fx: { fn: (c) => { const p = c.player!; p.wage = Math.round(p.wage * 2.2); p.contractEnd = c.s.season + 4; p.morale = clamp(p.morale + 10); refreshValue(c.s, p); }, ind: { socios: 3, jugadores: 1 }, later: [{ w: [15, 40], fx: 'playerGrowth', p: 0.55, params: { min: 3, max: 7 } }] } },
      { label: 'Rechazar sin más', auto: true, out: 'Rechazaste la oferta. El juvenil siente que no lo valoran.', fx: { pmorale: -12, op: { agent: -6 }, later: [{ w: [8, 20], ev: 'jug_quiere_irse', p: 0.4 }] } },
    ],
  },
  {
    id: 'mer_representante_promesa', cat: 'mercado', title: '{char} ofrece una promesa', urg: 'informativo', sev: 2, cd: 10,
    text: '{char} te acerca a un juvenil de 18 años "con condiciones de crack" que juega en una liga regional. Pide {amount} por los derechos y un contrato de formación.',
    bind: { char: 'representante' }, amount: (c) => sm(c, 180_000),
    when: (c) => win(c) && c.sq.length < MAX_SQUAD, w: 2,
    opts: [
      { label: 'Ficharlo', out: 'El juvenil se suma a la reserva.', req: (c) => c.cash > c.amount, reqText: 'Caja insuficiente', fx: { cash: (c) => -c.amount, cat: 'fichajes', op: { char: 8 }, fn: (c) => { const lvl = 40 + (c.club?.prestige ?? 50) * 0.3; const p = makePlayer(c.s, c.rng, { nat: 'ARG', pos: c.rng.pick(['DEF', 'MED', 'DEL'] as const), ovr: c.rng.normal(lvl - 4, 4), age: 18, club: c.club!, contractYears: 3, youth: true }); p.pot = clamp(p.ovr + c.rng.int(4, 24), p.ovr, 92); p.agentId = c.char!.id; p.signedFee = c.amount; p.signedSeason = c.s.season; refreshValue(c.s, p); return `Se trata de ${p.name} (${p.pos}).`; } } },
      { label: 'Pedir una prueba de dos semanas', out: 'El representante acepta a regañadientes.', fx: { op: { char: -2 }, later: [{ w: [2, 3], fx: 'apply', params: { note: 'Los técnicos de inferiores no quedaron convencidos con el juvenil a prueba.' } }] } },
      { label: 'No interesa', auto: true, out: 'Le agradeciste y declinaste.', fx: { op: { char: -3 } } },
    ],
  },
  {
    id: 'mer_historico_vuelve', cat: 'mercado', title: 'Un ídolo quiere volver', urg: 'importante', sev: 3, cd: 40,
    text: '{player}, histórico del club que hoy juega en {other}, dice en una entrevista que "sueña con retirarse en casa". Tiene 33 años y pide un último contrato de dos temporadas.',
    bind: { other: 'foreign_sa' },
    when: (c) => win(c) && c.sq.length < MAX_SQUAD && !!c.club, w: 1.2,
    opts: [
      { label: 'Repatriarlo con un gran contrato', out: 'La vuelta del ídolo genera euforia.', fx: { fn: (c) => { const lvl = 45 + (c.club?.prestige ?? 50) * 0.35; const p = makePlayer(c.s, c.rng, { nat: 'ARG', pos: c.rng.pick(['MED', 'DEL'] as const), ovr: lvl + 2, age: 33, club: c.club!, contractYears: 2 }); p.popularity = 95; p.wage = Math.round(wageFor(p, c.club!) * 1.4); p.career.clubs.unshift(c.club!.short); p.tags = ['idolo']; return `${p.name} vuelve al club.`; }, ind: { hinchas: 8, socios: 5, jugadores: 2, estabilidad: -2 }, news: 'Vuelve el ídolo: el regreso más esperado en {club}', tone: 'pos' } },
      { label: 'Ofrecerle un rol en el cuerpo técnico a futuro', out: 'Aceptó la idea, pero sigue jugando afuera por ahora.', fx: { ind: { hinchas: 2 } } },
      { label: 'No es el momento', auto: true, out: 'Los hinchas no entienden la decisión.', fx: { ind: { hinchas: -5, socios: -2, periodistas: -2 } } },
    ],
  },
  {
    id: 'mer_dt_pide_refuerzo', cat: 'mercado', title: '{coach} pide un refuerzo', urg: 'importante', sev: 3, cd: 10,
    text: '{coach} te pide un {pos} de jerarquía. Asegura que sin ese refuerzo "no se puede pelear arriba". El director deportivo estima un costo de {amount}.',
    bind: { coach: 'own', player: 'any' }, amount: (c) => sm(c, 2_000_000),
    when: (c) => win(c), w: 2,
    opts: [
      { label: 'Autorizar la compra', out: 'Autorizaste el presupuesto. El director deportivo cerró la incorporación.', req: (c) => c.cash > c.amount * 0.6, reqText: 'Caja insuficiente', fx: { cash: (c) => -c.amount, cat: 'fichajes', op: { coach: 10, dd: 3 }, ind: { dt: 5, hinchas: 2 }, mem: 'Le diste el refuerzo que pidió', fn: (c) => { if (!c.club || c.sq.length >= MAX_SQUAD) return; const lvl = avgXI(c) + 3; const p = makePlayer(c.s, c.rng, { nat: c.rng.chance(0.7) ? 'ARG' : c.rng.pick(['URU', 'COL', 'PAR']), pos: c.player!.pos, ovr: lvl, age: c.rng.int(24, 29), club: c.club, contractYears: 3 }); p.signedFee = c.amount; p.signedSeason = c.s.season; c.s.flags.lastSigningAbs = c.abs; return `Llega ${p.name}.`; } } },
      { label: 'Ofrecer una opción más barata o un préstamo', out: 'Conseguiste un préstamo por un año. El DT acepta, sin entusiasmo.', fx: { cash: (c) => -c.amount * 0.2, cat: 'fichajes', op: { coach: 2 }, fn: (c) => { if (!c.club || c.sq.length >= MAX_SQUAD) return; const p = makePlayer(c.s, c.rng, { nat: 'ARG', pos: c.player!.pos, ovr: avgXI(c), age: c.rng.int(23, 28), club: c.club, contractYears: 1 }); return `Llega ${p.name} a préstamo.`; } } },
      { label: 'Negarlo: hay que ajustar', auto: true, out: 'El entrenador se siente desautorizado.', fx: { op: { coach: -10 }, ind: { dt: -6, estabilidad: 1 }, mem: 'Le negaste el refuerzo' } },
      { label: 'Pedirle que pruebe con juveniles', out: 'El DT acepta probar pibes del club.', fx: { op: { coach: -3 }, ind: { socios: 2 }, later: [{ w: [6, 16], ev: 'jug_juvenil_brilla', p: 0.5 }] } },
    ],
  },
  {
    id: 'mer_libre_renombre', cat: 'mercado', title: 'Un jugador de renombre quedó libre', urg: 'informativo', sev: 2, cd: 14,
    text: 'Un {pos} de 30 años con pasado en Europa quedó libre y su representante, {char}, lo ofrece. Pide {amount} mensuales y un premio por firma.',
    bind: { char: 'representante', player: 'any' }, amount: (c) => wageFor({ ovr: avgXI(c) + 4, age: 30, popularity: 70 }, c.club!) * 1.3,
    when: (c) => !!c.club && c.sq.length < MAX_SQUAD, w: 1.5,
    opts: [
      { label: 'Ficharlo', out: 'El jugador firma por dos temporadas.', fx: { cash: (c) => -c.amount * 2, cat: 'comisiones', op: { char: 6 }, ind: { hinchas: 3 }, fn: (c) => { const p = makePlayer(c.s, c.rng, { nat: 'ARG', pos: c.player!.pos, ovr: avgXI(c) + 4, age: 30, club: c.club!, contractYears: 2 }); p.wage = c.amount; p.popularity = 72; c.s.flags.lastSigningAbs = c.abs; return `Firma ${p.name}.`; } } },
      { label: 'Ofrecer contrato por productividad', out: 'Le ofreciste un contrato por productividad.', fx: { op: { char: 2 }, fn: (c) => { if (c.rng.chance(0.4)) return 'Finalmente firmó con otro club.'; const p = makePlayer(c.s, c.rng, { nat: 'ARG', pos: c.player!.pos, ovr: avgXI(c) + 3, age: 30, club: c.club!, contractYears: 1 }); p.wage = Math.round(c.amount * 0.7); return `Firma ${p.name} por una temporada.`; } } },
      { label: 'Pasar', auto: true, out: 'No avanzaste.', fx: {} },
    ],
  },
  {
    id: 'mer_fichaje_fallido', cat: 'mercado', title: 'El fichaje de {player} no funciona', urg: 'importante', sev: 3, cd: 20,
    text: '{player} costó {amount} y no rinde. La prensa habla de "la peor compra de la década" y en la tribuna lo silban. Su representante, {agent}, dice que el problema es el sistema del entrenador.',
    bind: { player: 'flop' }, amount: (c) => c.player!.signedFee ?? c.player!.value, w: 2,
    opts: [
      { label: 'Respaldarlo públicamente', out: 'Le diste confianza.', fx: { pmorale: 15, ind: { periodistas: -2, hinchas: -2 }, later: [{ w: [6, 18], fx: 'playerGrowth', p: 0.4, params: { min: 2, max: 5 } }] } },
      { label: 'Venderlo aunque se pierda dinero', out: 'Lo transferiste a pérdida.', fx: { fn: (c) => { const buyer = Object.values(c.s.clubs).find((x) => x.country === 'ARG' && x.id !== c.club!.id && x.division >= (c.club?.division ?? 1) && x.fin.cash > 0); if (!buyer) return 'No apareció comprador.'; c.b.clubId = buyer.id; c.other = buyer; c.b.amount = Math.round(c.player!.value * 0.6); c.amount = c.b.amount; return sell(c); }, ind: { periodistas: 2, estabilidad: 1 } } },
      { label: 'Mandarlo a préstamo', auto: true, out: 'Será cedido hasta fin de temporada.', fx: { fn: (c) => { const dest = Object.values(c.s.clubs).find((x) => x.country === 'ARG' && x.id !== c.club!.id && x.division >= 2); if (!dest) return; c.player!.loanFrom = c.club!.id; c.player!.clubId = dest.id; c.player!.loanUntil = c.s.season; return `Se va a ${dest.name}.`; } } },
      { label: 'Culpar al director deportivo', out: 'El director deportivo queda expuesto.', fx: { op: { dd: -15 }, ind: { comision: 1, periodistas: 1 }, mem: 'Lo culpaste públicamente por el fichaje' } },
    ],
  },
  {
    id: 'mer_intercambio', cat: 'mercado', title: '{char} propone un intercambio', urg: 'informativo', sev: 2, cd: 12,
    text: '{char} te propone cambiar a {player} por un jugador de su plantel de nivel similar, más joven. "Nos sirve a los dos", asegura. Aceptar mejoraría la relación.',
    bind: { char: 'presidente_club', player: 'bench' },
    when: (c) => win(c), w: 1.5,
    opts: [
      { label: 'Aceptar el intercambio', out: 'Intercambio realizado.', fx: { op: { char: 10 }, ind: { presidentes: 1 }, fn: (c) => { const other = c.s.clubs[c.char!.clubId!]; if (!other || !c.club) return; const theirs = squad(c.s, other.id).filter((p) => p.pos === c.player!.pos && Math.abs(p.ovr - c.player!.ovr) <= 4 && p.age < c.player!.age).sort((a, b) => b.pot - a.pot)[0]; if (!theirs) return 'Al final no tenían un jugador adecuado.'; transferPlayer(c.s, c.player!, other, 2, c.player!.wage, 0); transferPlayer(c.s, theirs, c.club, 2, theirs.wage, 0); return `Llega ${theirs.name} (${theirs.age} años).`; } } },
      { label: 'Pedir dinero extra', out: 'Pediste una compensación.', fx: { op: { char: -2 } }, risk: { p: 0.5, text: 'Aceptaron pagar {amount} extra.', fx: { cash: (c) => sm(c, 200_000), cat: 'ventas' } } },
      { label: 'Rechazar', auto: true, out: 'Rechazaste la propuesta.', fx: { op: { char: -4 } } },
    ],
  },
  {
    id: 'mer_robo_juvenil', cat: 'mercado', title: '{other} quiere llevarse a un juvenil sin contrato', urg: 'importante', sev: 3, cd: 20,
    text: '{other} le ofreció contrato profesional a {player}, juvenil del club que todavía no firmó su primer vínculo. Si se va, el club cobraría apenas un resarcimiento por formación.',
    bind: { player: 'young', other: 'arg_big' },
    w: 1.4,
    opts: [
      { label: 'Igualar la oferta con contrato profesional', out: 'El juvenil firmó su primer contrato con el club.', fx: { fn: (c) => { c.player!.wage = Math.round(c.player!.wage * 1.8); c.player!.contractEnd = c.s.season + 3; c.player!.morale = clamp(c.player!.morale + 10); }, ind: { socios: 2 } } },
      { label: 'Denunciarlo ante la asociación', out: 'Presentaste una denuncia formal.', fx: { op: { other: -12 }, ind: { asociacion: -1, socios: 2 } }, risk: { p: 0.5, text: 'La asociación falló a tu favor: el juvenil se queda.', fx: { ind: { influencia: 2 } } } },
      { label: 'Dejarlo ir y cobrar formación', auto: true, out: 'El juvenil se fue.', fx: { cash: (c) => sm(c, 120_000), cat: 'ventas', ind: { socios: -3 }, fn: (c) => { transferPlayer(c.s, c.player!, c.other!, 3, wageFor(c.player!, c.other!), 0); } } },
    ],
  },
];

const JUGADORES: EventDef[] = [
  {
    id: 'jug_capitan_amenaza', cat: 'jugadores', title: 'El capitán amenaza con irse', urg: 'urgente', sev: 4, cd: 30,
    text: '{player}, tu capitán, está molesto: siente que el club no reconoce su trayectoria. Su representante, {agent}, exige una reunión urgente y deja trascender que hay clubes interesados.',
    bind: { player: 'captain' }, when: (c) => c.player!.age >= 25, w: 1.5,
    opts: [
      { label: 'Aceptar un aumento salarial (+40%)', out: 'El capitán se queda feliz. Otros jugadores ya preguntan por sus contratos.', req: (c) => !c.s.economy.emergency, reqText: 'Emergencia económica vigente', fx: { fn: (c) => { c.player!.wage = Math.round(c.player!.wage * 1.4); c.player!.contractEnd = Math.max(c.player!.contractEnd, c.s.season + 2); }, pmorale: 25, ind: { jugadores: 4, estabilidad: -2 }, op: { agent: 6 }, later: [{ w: [4, 12], ev: 'jug_reclamo_salarial', p: 0.4 }] } },
      { label: 'Renovación con premios por objetivos', out: 'Acordaron una renovación con variables por títulos y partidos.', fx: { fn: (c) => { c.player!.wage = Math.round(c.player!.wage * 1.15); c.player!.contractEnd = Math.max(c.player!.contractEnd, c.s.season + 2); }, pmorale: 12, ind: { jugadores: 2 } }, risk: { p: 0.25, text: 'Su entorno lo considera poco y la relación sigue tensa.', fx: { pmorale: -10 } } },
      { label: 'Rechazar sus exigencias', out: 'Te mantuviste firme. El vestuario toma nota.', fx: { pmorale: -25, ind: { jugadores: -6, comision: 2 }, op: { agent: -10 }, mem: 'Rechazaste los reclamos del capitán', later: [{ w: [2, 8], ev: 'jug_quiere_irse', p: 0.6 }] } },
      { label: 'Autorizar su transferencia', out: 'Lo declaraste transferible.', fx: { fn: (c) => { c.player!.listed = true; }, ind: { hinchas: -4, jugadores: -3 } } },
      { label: 'Delegar al director deportivo', auto: true, out: 'El director deportivo cerró un acuerdo intermedio.', fx: { fn: (c) => { c.player!.wage = Math.round(c.player!.wage * 1.2); }, pmorale: 8, op: { dd: 2 } } },
    ],
  },
  {
    id: 'jug_goleador_duplica', cat: 'jugadores', title: '{player} exige duplicar su salario', urg: 'importante', sev: 3, cd: 20,
    text: '{player} lleva {n} goles en la temporada y su representante, {agent}, pide duplicarle el sueldo: "Hay ofertas de afuera y él merece estar entre los mejores pagos".',
    bind: { player: 'scorer' }, when: (c) => { c.b.n = c.player!.season.goals; return c.player!.season.goals >= 5; }, w: 2,
    opts: [
      { label: 'Duplicarle el salario', out: 'Aceptaste. El goleador está feliz.', req: (c) => !c.s.economy.emergency, reqText: 'Emergencia económica', fx: { fn: (c) => { c.player!.wage *= 2; c.player!.contractEnd = Math.max(c.player!.contractEnd, c.s.season + 2); }, pmorale: 25, ind: { estabilidad: -3, hinchas: 2 }, later: [{ w: [4, 10], ev: 'jug_reclamo_salarial', p: 0.5 }] } },
      { label: 'Ofrecer +40% y extensión', out: 'Negociaron un punto medio.', fx: { fn: (c) => { c.player!.wage = Math.round(c.player!.wage * 1.4); c.player!.contractEnd = Math.max(c.player!.contractEnd, c.s.season + 3); }, pmorale: 10 }, risk: { p: 0.35, text: 'El jugador lo vive como una falta de respeto y baja su rendimiento.', fx: { pmorale: -15, later: [{ w: [2, 6], fx: 'playerDecline', params: { min: 1, max: 3 } }] } } },
      { label: 'Negarse: hay contrato vigente', auto: true, out: 'El contrato se respeta, pero el clima se enrarece.', fx: { pmorale: -18, op: { agent: -8 }, ind: { comision: 1 } } },
    ],
  },
  {
    id: 'jug_reclamo_salarial', cat: 'jugadores', title: 'Efecto contagio en el vestuario', chain: true, urg: 'importante', sev: 3,
    text: 'Después de los últimos aumentos, un grupo de jugadores encabezado por {player} pide que se revisen sus contratos. "Si hay plata para algunos, que haya para todos".',
    bind: { player: 'veteran' },
    opts: [
      { label: 'Aumento general del 10%', out: 'El vestuario queda conforme. La masa salarial crece.', fx: { fn: (c) => { for (const p of squad(c.s, c.club!.id)) p.wage = Math.round(p.wage * 1.1); }, morale: 8, ind: { jugadores: 6, estabilidad: -5 } } },
      { label: 'Premios por objetivos colectivos', out: 'Se acordó un premio por puntos.', fx: { morale: 4, flag: { premioPartido: 1 }, ind: { jugadores: 3 } } },
      { label: 'Cerrar el tema', auto: true, out: 'El reclamo queda sin respuesta.', fx: { morale: -8, ind: { jugadores: -6 } } },
    ],
  },
  {
    id: 'jug_quiere_irse', cat: 'jugadores', title: '{player} pide irse del club', chain: true, urg: 'importante', sev: 3,
    text: '{player} pidió una reunión: quiere que lo dejen salir. Dice que su ciclo terminó. Su moral está por el piso y empieza a contagiar.',
    opts: [
      { label: 'Declararlo transferible', out: 'Se lo declaró transferible.', fx: { fn: (c) => { c.player!.listed = true; }, pmorale: 10 } },
      { label: 'Convencerlo personalmente', out: 'Te reuniste con él.', fx: {}, risk: { p: 0.5, text: 'Lo convenciste: se queda motivado.', fx: { pmorale: 30, ind: { jugadores: 2 } } } },
      { label: 'Apartarlo del plantel', auto: true, out: 'Fue apartado y entrena con la reserva.', fx: { pmorale: -20, ind: { jugadores: -4, comision: 1 }, fn: (c) => { c.player!.injury = Math.max(c.player!.injury, 4); } } },
    ],
  },
  {
    id: 'jug_indisciplina', cat: 'jugadores', title: 'Escándalo nocturno de {player}', urg: 'importante', sev: 3, cd: 14,
    text: 'Circulan videos de {player} en una fiesta a la madrugada, dos días antes del partido con {next}. Los periodistas preguntan qué hará la dirigencia.',
    bind: { player: 'any' }, w: 2,
    opts: [
      { label: 'Multarlo y separarlo un partido', out: 'Sanción ejemplar.', fx: { pmorale: -15, ind: { comision: 2, periodistas: 2, jugadores: -2 }, cash: (c) => Math.round(c.player!.wage * 0.3), cat: 'otros' } },
      { label: 'Resolverlo puertas adentro', auto: true, out: 'El tema queda en el vestuario.', fx: { ind: { periodistas: -2, jugadores: 1 } }, risk: { p: 0.3, text: 'Se repite el episodio y la prensa te acusa de permisivo.', fx: { ind: { periodistas: -4, socios: -2 } } } },
      { label: 'Rescindirle el contrato', out: 'Lo echaste del club.', fx: { fn: (c) => { c.player!.clubId = null; c.player!.history.push(`${c.s.season}: rescindido por indisciplina`); }, ind: { comision: 3, jugadores: -5, socios: 2 }, op: { agent: -12 } } },
    ],
  },
  {
    id: 'jug_juvenil_brilla', cat: 'jugadores', title: '{player} deslumbra en la reserva', urg: 'informativo', sev: 2, cd: 16,
    text: '{player}, de {age} años, es la sensación de la reserva. Los formadores piden subirlo a primera. Ya hay representantes rondando a su familia.',
    bind: { player: 'young' }, w: 2,
    opts: [
      { label: 'Subirlo a primera y firmarle contrato', out: 'El juvenil debuta y firma su primer contrato largo.', fx: { fn: (c) => { c.player!.contractEnd = c.s.season + 4; c.player!.wage = Math.round(c.player!.wage * 1.5); }, ind: { socios: 3, hinchas: 2 }, later: [{ w: [6, 20], fx: 'playerGrowth', p: 0.6, params: { min: 2, max: 6 } }] } },
      { label: 'Esperar: todavía no está listo', auto: true, out: 'Seguirá en reserva.', fx: { pmorale: -5 }, risk: { p: 0.25, text: 'Un representante convenció a la familia de buscar otro club.', fx: { pmorale: -15 } } },
      { label: 'Cederlo para que sume minutos', out: 'Se va a préstamo a un club del ascenso.', fx: { fn: (c) => { const dest = Object.values(c.s.clubs).find((x) => x.country === 'ARG' && x.division > (c.club?.division ?? 1)) ?? Object.values(c.s.clubs).find((x) => x.country === 'ARG' && x.id !== c.club?.id); if (!dest) return; c.player!.loanFrom = c.club!.id; c.player!.clubId = dest.id; c.player!.loanUntil = c.s.season; }, later: [{ w: [15, 30], fx: 'playerGrowth', p: 0.5, params: { min: 2, max: 5 } }] } },
    ],
  },
  {
    id: 'jug_declaraciones', cat: 'jugadores', title: '{player} apunta contra los hinchas', urg: 'importante', sev: 3, cd: 20,
    text: 'Después de los silbidos, {player} declaró: "El que no está conforme que no venga a la cancha". Las redes explotan y la barra pide su cabeza.',
    bind: { player: 'any' }, when: (c) => badRun(c), w: 2,
    opts: [
      { label: 'Exigirle una disculpa pública', out: 'Se disculpó. El tema se calma.', fx: { pmorale: -8, ind: { hinchas: 3, periodistas: 1 } } },
      { label: 'Defenderlo: "Está bajo presión"', out: 'Lo defendiste.', fx: { pmorale: 12, ind: { hinchas: -5, jugadores: 3 }, op: { barra: -6 } } },
      { label: 'Venderlo en el próximo mercado', auto: true, out: 'Lo declaraste transferible.', fx: { fn: (c) => { c.player!.listed = true; }, pmorale: -15, ind: { hinchas: 3, jugadores: -2 } } },
    ],
  },
  {
    id: 'jug_conflicto_vestuario', cat: 'jugadores', title: 'Pelea en el vestuario', urg: 'importante', sev: 3, cd: 18,
    text: 'Trascendió una pelea entre {player} y otros referentes tras la última derrota. El grupo está dividido y {coach} perdió parte del control.',
    bind: { player: 'veteran', coach: 'own' }, when: (c) => badRun(c), w: 2,
    opts: [
      { label: 'Reunirte con el plantel', out: 'Tu intervención ordena el vestuario.', fx: { morale: 6, ind: { jugadores: 4, dt: -2 } }, risk: { p: 0.3, text: 'El entrenador siente que lo desautorizaste.', fx: { op: { coach: -8 } } } },
      { label: 'Respaldar al entrenador y apartar a {player}', out: 'El DT recupera autoridad.', fx: { pmorale: -25, op: { coach: 8 }, ind: { dt: 5, jugadores: -3 } } },
      { label: 'Dejar que lo resuelvan ellos', auto: true, out: 'El conflicto sigue latente.', fx: { morale: -5, ind: { jugadores: -3, gobernabilidad: -1 } } },
    ],
  },
  {
    id: 'jug_veterano_retiro', cat: 'jugadores', title: '{player} evalúa retirarse', urg: 'informativo', sev: 2, cd: 30,
    text: '{player}, de {age} años, te confiesa que piensa retirarse a fin de temporada. Es muy querido por la gente y pide un partido despedida.',
    bind: { player: (c) => c.rng.pick(c.sq.filter((p) => p.age >= 33)) }, w: 1.5,
    opts: [
      { label: 'Organizarle un partido homenaje', out: 'Se anunció la despedida con un estadio lleno.', fx: { cash: (c) => sm(c, 250_000), cat: 'eventos', ind: { hinchas: 5, socios: 3 }, fn: (c) => { c.player!.tags = [...(c.player!.tags ?? []), 'retiro']; } } },
      { label: 'Ofrecerle un lugar en el club', out: 'Se sumará como embajador institucional.', fx: { ind: { socios: 3, jugadores: 2 }, cash: (c) => -sm(c, 60_000), cat: 'sueldos_empleados', fn: (c) => { c.player!.tags = [...(c.player!.tags ?? []), 'retiro']; } } },
      { label: 'Pedirle una temporada más', auto: true, out: 'Aceptó seguir un año más.', fx: { pmorale: 6, fn: (c) => { c.player!.contractEnd = c.s.season + 1; } } },
    ],
  },
  {
    id: 'jug_lesion_exterior', cat: 'jugadores', title: '{player} quiere operarse en Europa', urg: 'informativo', sev: 2, cd: 16,
    text: '{player} está lesionado y su entorno quiere que lo opere un especialista en Barcelona. Costaría {amount} y aceleraría la recuperación. El cuerpo médico del club se siente ninguneado.',
    bind: { player: 'injured' }, amount: (c) => sm(c, 90_000), w: 2,
    opts: [
      { label: 'Pagar la operación en el exterior', out: 'La recuperación será más rápida.', fx: { cash: (c) => -c.amount, cat: 'otros', fn: (c) => { c.player!.injury = Math.max(1, Math.round(c.player!.injury * 0.5)); }, pmorale: 10, ind: { empleados: -2, jugadores: 2 } } },
      { label: 'Confiar en el cuerpo médico del club', auto: true, out: 'Se operará en el país.', fx: { pmorale: -6, ind: { empleados: 2 } } },
      { label: 'Que lo pague el jugador', out: 'El jugador lo paga de su bolsillo.', fx: { pmorale: -15, op: { agent: -5 }, fn: (c) => { c.player!.injury = Math.max(1, Math.round(c.player!.injury * 0.6)); } } },
    ],
  },
  {
    id: 'jug_no_renueva', cat: 'jugadores', title: '{player} amenaza con no renovar', urg: 'importante', sev: 3, cd: 16,
    text: 'A {player} se le termina el contrato y {agent} avisa que no firmará "por menos de lo que vale". Si se va libre, el club no cobrará nada.',
    bind: { player: 'expiring' }, w: 2.5,
    opts: [
      { label: 'Ofrecer lo que pide', out: 'Renovó por tres temporadas.', fx: { fn: (c) => { const p = c.player!; p.wage = Math.max(p.wage, Math.round(wageDemand(c.s, p, c.club!) * 1.1)); p.contractEnd = c.s.season + 3; refreshValue(c.s, p); }, pmorale: 15, ind: { estabilidad: -1 } } },
      { label: 'Venderlo ahora para no perderlo gratis', out: 'Se lo puso en venta.', req: (c) => win(c), reqText: 'Libro de pases cerrado', fx: { fn: (c) => { const buyer = Object.values(c.s.clubs).filter((x) => x.country === 'ARG' && x.id !== c.club!.id && x.fin.cash > c.player!.value * 0.5).sort((a, b) => b.prestige - a.prestige)[0]; if (!buyer) return 'Nadie pagó lo pretendido.'; c.b.clubId = buyer.id; c.other = buyer; c.b.amount = Math.round(c.player!.value * 0.6); c.amount = c.b.amount; return sell(c); } } },
      { label: 'Esperar a fin de temporada', auto: true, out: 'La negociación queda abierta.', fx: { pmorale: -5 } },
    ],
  },
];

const ENTRENADORES: EventDef[] = [
  {
    id: 'dt_cabeza_pedida', cat: 'entrenadores', title: 'Piden la cabeza de {coach}', urg: 'urgente', sev: 4, cd: 8,
    text: 'Tras la mala racha, la tribuna cantó contra {coach}. Los medios dan por hecho su salida y la comisión directiva espera tu decisión. El equipo está {position} en {division}.',
    bind: { coach: 'own' }, when: (c) => badRun(c) && !c.coach!.tags.includes('interino'), w: 3,
    opts: [
      { label: 'Despedirlo', out: 'Decidiste un cambio de rumbo.', fx: { fn: (c) => fireCoach(c.s, c.rng, 'malos resultados'), ind: { hinchas: 3, comision: 2 } } },
      { label: 'Respaldarlo públicamente', out: 'Lo ratificaste. El DT valora el gesto.', fx: { op: { coach: 15 }, ind: { dt: 8, hinchas: -4 }, mem: 'Lo sostuviste cuando todos pedían su cabeza', fn: (c) => { c.coach!.confidence = clamp(c.coach!.confidence + 20); if (!c.coach!.tags.includes('respaldado')) c.coach!.tags.push('respaldado'); } } },
      { label: 'Darle un ultimátum de tres partidos', auto: true, out: 'El entrenador sabe que está bajo la lupa.', fx: { op: { coach: -5 }, ind: { comision: 1 }, later: [{ w: [3, 4], ev: 'dt_ultimatum', p: 1 }] } },
    ],
  },
  {
    id: 'dt_ultimatum', cat: 'entrenadores', title: 'Se cumplió el ultimátum a {coach}', chain: true, urg: 'urgente', sev: 3,
    text: 'Pasaron los partidos del ultimátum. Las últimas presentaciones del equipo fueron: {n} puntos de 9 posibles. Hay que decidir.',
    bind: { coach: 'own' },
    when: (c) => { const f = c.club!.form.slice(-3); c.b.n = f.filter((x) => x === 'G').length * 3 + f.filter((x) => x === 'E').length; return true; },
    opts: [
      { label: 'Continuidad', out: 'Sigue el entrenador.', fx: { op: { coach: 6 }, ind: { dt: 3 } } },
      { label: 'Despedirlo', out: 'Fin del ciclo.', fx: { fn: (c) => fireCoach(c.s, c.rng, 'ultimátum incumplido') } },
      { label: 'Postergar la decisión', auto: true, out: 'La incertidumbre se instala.', fx: { ind: { gobernabilidad: -2, jugadores: -2 } } },
    ],
  },
  {
    id: 'dt_oferta_otro', cat: 'entrenadores', title: '{other} tienta a {coach}', urg: 'importante', sev: 3, cd: 20,
    text: '{other} quiere contratar a {coach} y le ofrece duplicar su salario. El entrenador te dice que "le gustaría quedarse si el proyecto acompaña".',
    bind: { coach: 'own', other: 'arg_big' }, when: (c) => c.coach!.ability >= 60 && !c.coach!.tags.includes('interino') && (winStreak(c, 3) || c.pos <= 4), w: 2,
    opts: [
      { label: 'Mejorarle el contrato (+50%)', out: 'El DT se queda con un contrato mejor.', fx: { fn: (c) => { c.coach!.wage = Math.round(c.coach!.wage * 1.5); c.coach!.contractEnd = c.s.season + 2; }, op: { coach: 12 }, ind: { dt: 6, estabilidad: -2 } } },
      { label: 'Pedir una indemnización alta y dejarlo ir', out: 'Cobraste por su salida.', fx: { cash: (c) => c.coach!.wage * 12, cat: 'indemnizaciones', fn: (c) => { const co = c.coach!; const dest = c.other!; const prev = dest.coachId ? c.s.coaches[dest.coachId] : null; if (prev) prev.clubId = null; co.clubId = dest.id; dest.coachId = co.id; c.club!.coachId = null; return 'Ahora tenés que buscar entrenador (sección Plantel → Cuerpo técnico).'; }, op: { coach: 5, other: 5 } } },
      { label: 'Recordarle que tiene contrato', auto: true, out: 'Se queda, pero incómodo.', fx: { op: { coach: -8 }, ind: { dt: -4 } } },
    ],
  },
  {
    id: 'dt_choca_capitan', cat: 'entrenadores', title: '{coach} quiere sacar del equipo a {player}', urg: 'importante', sev: 3, cd: 20,
    text: '{coach} considera que {player} "no está comprometido" y quiere relegarlo al banco. {player} es un referente y la tribuna lo quiere.',
    bind: { coach: 'own', player: 'captain' }, w: 1.5,
    opts: [
      { label: 'Respaldar al entrenador', out: 'El DT tiene la última palabra.', fx: { op: { coach: 8 }, pmorale: -20, ind: { dt: 4, hinchas: -3 } } },
      { label: 'Respaldar al jugador', out: 'El referente sigue siendo titular.', fx: { op: { coach: -12 }, pmorale: 15, ind: { dt: -6, jugadores: 3 } } },
      { label: 'Mediar en una reunión a tres', auto: true, out: 'Se acordó una tregua.', fx: {} , risk: { p: 0.4, text: 'La tregua no dura y el conflicto se filtra a la prensa.', fx: { ind: { periodistas: -2, jugadores: -2 } } } },
    ],
  },
  {
    id: 'dt_critica_dirigencia', cat: 'entrenadores', title: '{coach} critica a la dirigencia', urg: 'importante', sev: 3, cd: 20,
    text: 'En conferencia de prensa, {coach} dijo: "Me prometieron refuerzos y no llegó nadie. Así es muy difícil". La frase abre todos los programas deportivos.',
    bind: { coach: 'own' }, when: (c) => c.coach!.opinion < 10 || c.coach!.personality === 'conflictivo', w: 2,
    opts: [
      { label: 'Responderle públicamente', out: 'Le contestaste en los medios.', fx: { op: { coach: -15 }, ind: { periodistas: 1, dt: -8, comision: 2 } } },
      { label: 'Reunirte en privado y calmar las aguas', auto: true, out: 'Limaron asperezas.', fx: { op: { coach: 6 }, ind: { dt: 3 } } },
      { label: 'Despedirlo por insubordinación', out: 'Lo echaste.', fx: { fn: (c) => fireCoach(c.s, c.rng, 'insubordinación'), ind: { comision: 3, hinchas: -1 } } },
    ],
  },
  {
    id: 'dt_juveniles', cat: 'entrenadores', title: '{coach} propone apostar por los juveniles', urg: 'informativo', sev: 2, cd: 25,
    text: '{coach} quiere que tres juveniles se entrenen con primera y pide invertir {amount} en el cuerpo técnico de inferiores.',
    bind: { coach: 'own' }, amount: (c) => sm(c, 150_000), when: (c) => c.coach!.youthDev >= 55, w: 1.5,
    opts: [
      { label: 'Aprobar la inversión', out: 'Se refuerza el proyecto formativo.', req: (c) => c.cash > c.amount, reqText: 'Caja insuficiente', fx: { cash: (c) => -c.amount, cat: 'obras', op: { coach: 8 }, ind: { socios: 2 }, fn: (c) => { for (const p of c.sq.filter((x) => x.age <= 21)) p.ovr = Math.min(p.pot, p.ovr + 1); } } },
      { label: 'Sólo integrarlos, sin inversión', auto: true, out: 'Los juveniles entrenan con primera.', fx: { op: { coach: 2 } } },
      { label: 'Priorizar resultados inmediatos', out: 'El DT se resigna.', fx: { op: { coach: -5 }, ind: { socios: -1 } } },
    ],
  },
];
ENTRENADORES.push({
  id: 'dt_respaldado_devuelve', cat: 'entrenadores', title: '{coach} te devuelve el gesto', urg: 'informativo', sev: 2, cd: 120, pos: ['any'],
  text: '{coach}, al que respaldaste cuando nadie confiaba en él, declaró: "{president} es de los pocos dirigentes que cumplen su palabra". Su opinión pesa en el ambiente del fútbol.',
  bind: { coach: 'former' },
  when: (c) => c.coach!.tags.includes('respaldado') && c.coach!.opinion >= 40 && c.coach!.clubId !== c.club?.id,
  w: 3,
  opts: [
    { label: 'Agradecerle públicamente', out: 'El intercambio de elogios suma reputación.', fx: { ind: { repNacional: 3, periodistas: 2 }, op: { coach: 5 } } },
    { label: 'Invitarlo a sumarse a tu proyecto político', out: 'Aceptó respaldarte en el futuro.', fx: { ind: { influencia: 3 }, op: { coach: 3 }, flag: { coachAlly: true } } },
    { label: 'Mantener perfil bajo', auto: true, out: 'Sin comentarios.', fx: { ind: { integridad: 1 } } },
  ],
});

const RESULTADOS: EventDef[] = [
  {
    id: 'res_racha_negativa', cat: 'resultados', title: 'Racha negativa: {club} no levanta', urg: 'importante', sev: 3, cd: 8,
    text: 'El equipo perdió los últimos partidos y está {position}. Los socios se impacientan y la oposición aprovecha para criticar. ¿Qué mensaje das?',
    when: (c) => lossStreak(c, 3), w: 3,
    opts: [
      { label: 'Concentrar al plantel y prometer un premio', out: 'Premio especial por el próximo triunfo.', fx: { cash: (c) => -sm(c, 120_000), cat: 'sueldos_jugadores', morale: 8, flag: { premioPartido: 1 }, ind: { jugadores: 3 } } },
      { label: 'Hablar con la prensa y asumir la responsabilidad', out: 'Pusiste la cara.', fx: { ind: { periodistas: 3, socios: 2, integridad: 1 } } },
      { label: 'Silencio institucional', auto: true, out: 'Nadie habla en el club.', fx: { ind: { periodistas: -3, socios: -2 } } },
      { label: 'Apuntar contra los árbitros', out: 'Denunciaste perjuicios arbitrales.', fx: { ind: { hinchas: 3, asociacion: -5, periodistas: -1 }, op: { assoc: -6 } } },
    ],
  },
  {
    id: 'res_racha_positiva', cat: 'resultados', title: '{club} vive un gran momento', urg: 'informativo', sev: 2, cd: 10,
    text: 'El equipo ganó sus últimos partidos y está {position} en {division}. Los hinchas sueñan y los patrocinadores llaman. ¿Cómo capitalizás el momento?',
    when: (c) => winStreak(c, 3), w: 3,
    opts: [
      { label: 'Lanzar campaña de socios', out: 'Se suman nuevos socios.', fx: { fn: (c) => { c.club!.members = Math.round(c.club!.members * 1.03 + 0.2); }, ind: { socios: 3 } } },
      { label: 'Renegociar patrocinios al alza', out: 'Los patrocinadores aceptan un plus.', fx: { cash: (c) => sm(c, 300_000), cat: 'patrocinio', ind: { patrocinadores: 3 } } },
      { label: 'Prudencia: "Recién empezamos"', auto: true, out: 'Mensaje de calma.', fx: { ind: { periodistas: 1, jugadores: 1 } } },
      { label: 'Prometer el título', out: 'Lo dijiste: "Vamos por el campeonato".', fx: { ind: { hinchas: 5, socios: 3 }, promise: { key: 'titulo', text: 'Ganar un título esta temporada', weeks: 0, weight: 1.5 }, fn: (c) => { const p = c.s.promises[c.s.promises.length - 1]; p.deadlineAbs = (c.s.season - c.s.startSeason) * 40 + 40; } } },
    ],
  },
  {
    id: 'res_clasico_ganado', cat: 'resultados', title: '¡Ganaste el clásico!', urg: 'informativo', sev: 2, cd: 15,
    text: '{club} venció a {derby} en el clásico. La ciudad es una fiesta. Los jugadores piden el premio prometido y los hinchas quieren festejar en el estadio.',
    when: (c) => { const f = c.s.fixtures.filter((x) => x.played && x.week === c.s.week - 1 && ((x.home === c.club?.id && x.away === c.club?.rivalId) || (x.away === c.club?.id && x.home === c.club?.rivalId))); return f.length > 0 && c.club!.form[c.club!.form.length - 1] === 'G'; }, w: 8,
    opts: [
      { label: 'Pagar premio doble', out: 'Plantel feliz.', fx: { cash: (c) => -sm(c, 200_000), cat: 'sueldos_jugadores', morale: 10, ind: { jugadores: 5 } } },
      { label: 'Abrir el estadio para un festejo', out: 'Miles de hinchas festejaron.', fx: { ind: { hinchas: 6, socios: 3 }, cash: (c) => -sm(c, 40_000), cat: 'seguridad' }, risk: { p: 0.15, text: 'Hubo incidentes menores en los alrededores.', fx: { ind: { integridad: -2 }, fn: (c) => { c.s.flags.lastIncidentAbs = c.abs; } } } },
      { label: 'Celebrar con mesura', auto: true, out: 'Festejo sobrio.', fx: { ind: { hinchas: 2 } } },
    ],
  },
  {
    id: 'res_clasico_perdido', cat: 'resultados', title: 'Derrota en el clásico', urg: 'importante', sev: 3, cd: 15,
    text: '{club} perdió con {derby}. La tribuna explotó contra el plantel y la dirigencia. La barra exige "explicaciones".',
    when: (c) => { const f = c.s.fixtures.filter((x) => x.played && x.week === c.s.week - 1 && ((x.home === c.club?.id && x.away === c.club?.rivalId) || (x.away === c.club?.id && x.home === c.club?.rivalId))); return f.length > 0 && c.club!.form[c.club!.form.length - 1] === 'P'; }, w: 8,
    opts: [
      { label: 'Reunirte con los referentes de la hinchada', out: 'Bajaste la tensión.', fx: { ind: { hinchas: 2, barra: 3 }, op: { barra: 5 } } },
      { label: 'Multar al plantel', out: 'Multa colectiva.', fx: { morale: -10, ind: { jugadores: -5, hinchas: 3 } } },
      { label: 'Dejar pasar', auto: true, out: 'Se diluye con los días.', fx: { ind: { hinchas: -4, socios: -2 } } },
    ],
  },
  {
    id: 'res_zona_descenso', cat: 'resultados', title: 'Alarma: {club} en zona de descenso', urg: 'urgente', sev: 5, cd: 10,
    text: 'Con la temporada avanzada, el equipo está {position} y peligra la categoría. Descender sería un golpe económico y político enorme.',
    when: (c) => c.of > 0 && c.pos > c.of - 3 && c.s.week >= 16 && (c.club?.division ?? 3) <= 2, w: 4,
    opts: [
      { label: 'Plan de emergencia deportiva (refuerzos libres + premios)', out: 'Se activa el plan de salvación.', fx: { cash: (c) => -sm(c, 600_000), cat: 'fichajes', morale: 10, flag: { premioPartido: 1 }, ind: { jugadores: 4, estabilidad: -3 } } },
      { label: 'Cambiar de entrenador', out: 'Un nuevo DT para el tramo final.', req: (c) => !!c.club?.coachId, fx: { fn: (c) => fireCoach(c.s, c.rng, 'zona de descenso') } },
      { label: 'Prometer a los socios que no se desciende', out: 'Comprometiste tu palabra.', fx: { ind: { socios: 3 }, promise: { key: 'no_descenso', text: 'No descender esta temporada', weeks: 0, weight: 2 }, fn: (c) => { c.s.promises[c.s.promises.length - 1].deadlineAbs = (c.s.season - c.s.startSeason) * 40 + 39; } } },
      { label: 'Confiar en el proceso', auto: true, out: 'Sin cambios.', fx: { ind: { socios: -3 } } },
    ],
  },
  {
    id: 'res_pelea_titulo', cat: 'resultados', title: '{club} pelea el campeonato', urg: 'importante', sev: 3, cd: 12,
    text: 'Faltan pocas fechas y {club} está {position}, en zona de pelea por el título. El vestuario pide un premio por campeonato y los patrocinadores ofrecen bonificaciones.',
    when: (c) => c.pos > 0 && c.pos <= 2 && c.s.week >= 26, w: 4,
    opts: [
      { label: 'Fijar un premio récord por el título', out: 'El plantel está enchufado.', fx: { morale: 12, ind: { jugadores: 5 }, flag: { premioTitulo: true, premioPartido: 1 } } },
      { label: 'Premio razonable', auto: true, out: 'Premio estándar acordado.', fx: { morale: 5, ind: { jugadores: 2 } } },
      { label: 'No hay premios: es la obligación', out: 'El plantel se molesta.', fx: { morale: -6, ind: { jugadores: -4, estabilidad: 1 } } },
    ],
  },
  {
    id: 'res_eliminacion_copa', cat: 'resultados', title: 'Eliminación dolorosa en la copa', urg: 'informativo', sev: 2, cd: 10,
    text: '{club} quedó eliminado de una copa frente a un rival de menor jerarquía. En el aeropuerto hubo insultos y el plantel pide protección.',
    when: (c) => c.s.fixtures.some((f) => f.played && f.week === c.s.week - 1 && (f.home === c.club?.id || f.away === c.club?.id) && !f.comp.startsWith('arg') && c.club!.form[c.club!.form.length - 1] === 'P'), w: 6,
    opts: [
      { label: 'Respaldar al plantel', out: 'Defendiste a los jugadores.', fx: { ind: { jugadores: 4, hinchas: -2 } } },
      { label: 'Exigir autocrítica pública', auto: true, out: 'Los referentes hablaron.', fx: { ind: { hinchas: 2, jugadores: -1 } } },
      { label: 'Reforzar seguridad del plantel', out: 'Seguridad privada para los jugadores.', fx: { cash: (c) => -sm(c, 50_000), cat: 'seguridad', ind: { jugadores: 2 } } },
    ],
  },
];

registerEvents([...MERCADO, ...JUGADORES, ...ENTRENADORES, ...RESULTADOS]);

export const SPORT_COUNT = MERCADO.length + JUGADORES.length + ENTRENADORES.length + RESULTADOS.length;
void changeInd; void changeOpinion; void addNews; void money;
