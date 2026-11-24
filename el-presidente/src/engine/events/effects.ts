// Efectos diferidos (consecuencias ocultas que aparecen semanas o temporadas después)
// y verificación de promesas.
import { registerLater, registerPromises, render, createPending, EVENTS, type Ctx } from './engine';
import { applyInd, changeInd, changeOpinion } from '../relations';
import { addNews } from '../news';
import { book } from '../economy';
import { clamp, money } from '../util';
import { positionOf, userClub } from '../queries';

registerLater({
  /** Efecto genérico: indicadores, caja y titular. */
  apply: (c: Ctx, p) => {
    if (p.ind) applyInd(c.s, p.ind);
    if (p.cash) book(c.s, p.cat ?? (p.cash > 0 ? 'aportes' : 'otros'), p.cash === 'amount' ? c.amount : p.cash === '-amount' ? -c.amount : p.cash);
    if (p.op && c.char) changeOpinion(c.s, c.char.id, p.op, p.mem ? render(p.mem, c) : undefined);
    if (p.news) addNews(c.s, render(p.news, c), p.tone ?? 'neu', p.tag, true);
    return p.note ? render(p.note, c) : undefined;
  },
  /** Un jugador al que se le dio confianza explota (o no). */
  playerGrowth: (c: Ctx, p) => {
    const pl = c.player;
    if (!pl || pl.retired) return;
    const d = c.rng.int(p.min ?? 2, p.max ?? 6);
    pl.ovr = clamp(pl.ovr + d, 30, Math.max(pl.pot, pl.ovr + d));
    pl.popularity = clamp(pl.popularity + d * 2);
    addNews(c.s, `${pl.name} da un salto de calidad y ya es figura`, 'pos', 'jugadores', true);
    return `${pl.name} mejoró notablemente (+${d}).`;
  },
  playerDecline: (c: Ctx, p) => {
    const pl = c.player;
    if (!pl || pl.retired) return;
    const d = c.rng.int(p.min ?? 2, p.max ?? 5);
    pl.ovr = clamp(pl.ovr - d, 30, 99);
    pl.morale = clamp(pl.morale - 10);
    return `${pl.name} perdió rendimiento (−${d}).`;
  },
  /** El riesgo acumulado puede derivar en una investigación. */
  investigationCheck: (c: Ctx, p) => {
    const s = c.s;
    const base = (s.ind.riesgo - 35) / 100 + (p.extra ?? 0);
    if (c.rng.chance(clamp(base, 0.05, 0.9))) {
      const def = EVENTS['esc_investigacion_abierta'];
      if (def && !s.inbox.some((e) => e.defId === def.id)) {
        c.b = { ...c.b, amount: c.b.amount ?? 0, text: p.reason ?? 'irregularidades' };
        createPending(s, def, c);
      }
      return;
    }
    changeInd(s, 'riesgo', 2);
  },
  /** Una sanción que llega tarde (multa / quita de puntos). */
  sanction: (c: Ctx, p) => {
    const s = c.s;
    const fine = p.fine ?? c.amount ?? 0;
    if (fine) book(s, 'multas', -fine);
    if (p.points && c.club) {
      const pos = positionOf(s, c.club.id);
      const row = pos.comp?.table.find((r) => r.id === c.club!.id);
      if (row) row.pts = Math.max(0, row.pts - p.points);
    }
    applyInd(s, { integridad: -4, repNacional: -3, ...(p.ind ?? {}) });
    s.career.sanctions.push(`${s.season}: ${p.reason ?? 'Sanción disciplinaria'}${fine ? ` (${money(fine)})` : ''}${p.points ? `, −${p.points} puntos` : ''}`);
    addNews(s, `Sanción para ${c.club?.name ?? 'la institución'}: ${p.reason ?? 'irregularidades'}${p.points ? ` y quita de ${p.points} puntos` : ''}`, 'neg', 'sanciones', true);
    return `Llegó una sanción: ${p.reason ?? 'irregularidades'}.`;
  },
  /** Un favor que alguien viene a cobrar. */
  favorCalled: (c: Ctx) => {
    const def = EVENTS['pol_favor_cobrado'];
    if (def && c.char && c.char.active) createPending(c.s, def, c);
  },
  /** Personaje que recuerda una traición y actúa. */
  revenge: (c: Ctx, p) => {
    if (!c.char || c.char.opinion > -20) return;
    applyInd(c.s, p.ind ?? { periodistas: -3, socios: -3 });
    addNews(c.s, render(p.news ?? '{char} lanza duras críticas contra la gestión de {president}', c), 'neg', 'politica', true);
  },
  /** Patrocinador que paga un bono por objetivos. */
  sponsorBonus: (c: Ctx, p) => {
    const s = c.s;
    const ok = c.club && positionOf(s, c.club.id).pos <= (p.pos ?? 4);
    if (ok) {
      book(s, 'patrocinio', c.amount);
      return `${c.company?.name ?? 'El patrocinador'} pagó el bono por objetivos (${money(c.amount)}).`;
    }
  },
  /** Revisión de inversión: un inversor exige retorno. */
  investorReturn: (c: Ctx) => {
    const def = EVENTS['fin_inversor_exige'];
    if (def) createPending(c.s, def, c);
  },
  /** El jugador vendido triunfa afuera: los hinchas lo recuerdan. */
  soldStarShines: (c: Ctx) => {
    if (!c.player) return;
    c.player.ovr = clamp(c.player.ovr + 3, 30, 96);
    addNews(c.s, `${c.player.name} la rompe en ${c.s.clubs[c.player.clubId ?? '']?.name ?? 'el exterior'}: los hinchas reclaman por su venta`, 'neg', 'mercado', true);
    changeInd(c.s, 'hinchas', -2);
  },
});

const absNow = (s: Parameters<typeof positionOf>[0]) => (s.season - s.startSeason) * 40 + s.week;

registerPromises({
  top_half: (s) => {
    const c = userClub(s);
    if (!c) return false;
    const { pos, of } = positionOf(s, c.id);
    return pos > 0 && pos <= Math.ceil(of / 2);
  },
  top4: (s) => {
    const c = userClub(s);
    return !!c && positionOf(s, c.id).pos <= 4 && positionOf(s, c.id).pos > 0;
  },
  titulo: (s) => !!s.flags[`titleWon_${s.season}`],
  ascenso: (s, p) => {
    const c = userClub(s);
    return !!c && c.division < (p.target ?? 9);
  },
  no_descenso: (s) => !s.flags[`relegated_${s.season}`],
  no_vender_figura: (s, p) => Number(s.flags.lastStarSaleAbs ?? -1) < p.madeAbs,
  obra: (s, p) => Number(s.flags.lastProjectAbs ?? -1) >= p.madeAbs || s.projects.some((x) => x.startedAbs >= p.madeAbs),
  cuota: (s, p) => s.economy.feeMult <= (p.target ?? 1) + 0.001,
  entradas: (s, p) => s.economy.ticketMult <= (p.target ?? 1) + 0.001,
  sueldos: (s) => (userClub(s)?.fin.wageArrears ?? 0) === 0,
  refuerzo: (s, p) => Number(s.flags.lastSigningAbs ?? -1) >= p.madeAbs,
  seguridad: (s, p) => Number(s.flags.lastIncidentAbs ?? -1) < p.madeAbs,
  transparencia: (s, p) => Number(s.flags.balancePublishedAbs ?? -1) >= p.madeAbs,
  dt_continuidad: (s, p) => Number(s.flags.lastCoachFiredAbs ?? -1) < p.madeAbs,
  juveniles: (s, p) => (userClub(s)?.facilities.juveniles ?? 0) > (p.target ?? 0) || s.projects.some((x) => x.facility === 'juveniles'),
  deuda: (s, p) => s.loans.reduce((a, l) => a + l.balance, 0) <= (p.target ?? 0),
  siempre: () => true,
});
void absNow;
