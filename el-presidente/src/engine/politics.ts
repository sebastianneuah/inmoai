// Motor político: elecciones de clubes y organismos, asambleas, propuestas, bloques,
// progresión profesional (club → asociación → confederación → FIF).
import type { GameState, Election, ElectionCandidate, Character, Proposal, Club } from './types';
import type { RNG } from './rng';
import { clamp, newId, absWeek, money, avg } from './util';
import { userClub, charsByRole, careerLevel, positionOf } from './queries';
import { changeInd, changeOpinion, remember } from './relations';
import { addNews } from './news';
import { makeChar, ensureClubStaff } from './worldgen';
import { CONFEDS } from './data/world';
import { book } from './economy';
import { initialSponsors } from './sponsors';

export const CLUB_ELECTION_WEEK = 38;
export const CAMPAIGN_START = 24;
export const ASSOC_ELECTION_WEEK = 37;

// ---------------------------------------------------------------------------
// Capital político
// ---------------------------------------------------------------------------
export function maxCapital(s: GameState) {
  return Math.round(3 + s.ind.influencia / 25 + (careerLevel(s) >= 3 ? 1 : 0));
}
export function weeklyCapital(s: GameState) {
  if (s.week % 2 === 0) s.president.politicalCapital = Math.min(maxCapital(s), s.president.politicalCapital + 1);
}
export function spendCapital(s: GameState, n: number): boolean {
  if (s.president.politicalCapital < n) return false;
  s.president.politicalCapital -= n;
  return true;
}

// ---------------------------------------------------------------------------
// Elecciones
// ---------------------------------------------------------------------------
function cand(name: string, charId: string | null, isUser = false, platform = ''): ElectionCandidate {
  return { id: isUser ? 'user' : charId ?? name, name, charId, isUser, support: 0, platform };
}

export function startClubElection(s: GameState, rng: RNG, clubId: string, userRunning: boolean, weeksToVote?: number): Election {
  const c = s.clubs[clubId];
  const isOwn = s.president.clubId === clubId;
  ensureClubStaff(s, rng, c);
  const candidates: ElectionCandidate[] = [];
  if (userRunning) candidates.push(cand(`${s.president.name} ${s.president.surname}`, null, true, isOwn ? 'Continuidad y gestión' : 'Renovación'));
  if (isOwn) {
    const opp = s.chars[c.staff!.opositor!];
    candidates.push(cand(opp.name, opp.id, false, 'Cambio y transparencia'));
    if (s.flags.viceBetrayal) {
      const vp = s.chars[c.staff!.vicepresidente!];
      candidates.push(cand(vp.name, vp.id, false, 'Una alternativa desde adentro'));
    }
  } else {
    const inc = c.presidentId ? s.chars[c.presidentId] : null;
    if (inc) candidates.push(cand(inc.name, inc.id, false, 'Oficialismo'));
    const opp = s.chars[c.staff!.opositor!];
    if (opp && rng.chance(0.5)) candidates.push(cand(opp.name, opp.id, false, 'Oposición tradicional'));
  }
  const weekAbs = weeksToVote !== undefined ? absWeek(s) + weeksToVote : absWeek(s, s.season, CLUB_ELECTION_WEEK);
  const e: Election = { id: newId(s, 'el'), kind: 'club', clubId, weekAbs, candidates, polls: [], userRunning, actionsUsed: [], campaignPoints: 3 };
  s.election = e;
  updatePolls(s, rng);
  addNews(s, `Arranca la campaña electoral en ${c.name}`, 'neu', 'elecciones', true);
  return e;
}

export function startBodyElection(s: GameState, rng: RNG, kind: 'asociacion' | 'confederacion' | 'fifa', userRunning: boolean): Election {
  const candidates: ElectionCandidate[] = [];
  if (userRunning) candidates.push(cand(`${s.president.name} ${s.president.surname}`, null, true, 'Renovación'));
  const body = kind === 'asociacion' ? s.assoc : kind === 'confederacion' ? s.confed : s.fifa;
  let inc = body.presidentId ? s.chars[body.presidentId] : null;
  if (inc && (inc.age >= 78 || !inc.active)) inc = null;
  if (inc) candidates.push(cand(inc.name, inc.id, false, 'Continuidad'));
  if (!inc || rng.chance(0.55)) {
    const role = kind === 'asociacion' ? 'presidente_club' : kind === 'confederacion' ? 'presidente_federacion' : 'presidente_confederacion';
    const pool = charsByRole(s, role).filter((x) => x.influence >= 55 && !candidates.some((c) => c.charId === x.id) && (kind !== 'confederacion' || x.confed === 'CSF'));
    const ch = pool.sort((a, b) => b.influence + b.ambition - (a.influence + a.ambition))[rng.int(0, Math.min(2, Math.max(0, pool.length - 1)))];
    if (ch) candidates.push(cand(ch.name, ch.id, false, 'Oposición'));
  }
  if (candidates.length < 2 && !userRunning) {
    const ch = makeChar(s, rng, kind === 'asociacion' ? 'dirigente_asociacion' : 'presidente_federacion', 'Candidato de consenso', { influence: 70 });
    candidates.push(cand(ch.name, ch.id, false, 'Consenso'));
  }
  const nominalWeek = kind === 'asociacion' ? ASSOC_ELECTION_WEEK : 36;
  const weekAbs = absWeek(s, s.season, Math.max(s.week + 4, nominalWeek));
  const e: Election = { id: newId(s, 'el'), kind, weekAbs, candidates, polls: [], userRunning, actionsUsed: [], campaignPoints: 3 };
  s.election = e;
  updatePolls(s, rng);
  addNews(s, `Se abre la campaña por la presidencia de ${body.short}`, 'neu', 'elecciones', true);
  return e;
}

/** Intención de voto. */
export function computeSupport(s: GameState, e: Election, rng?: RNG): Record<string, number> {
  const out: Record<string, number> = {};
  const active = e.candidates.filter((c) => !c.withdrawn);
  if (e.kind === 'club') {
    const isOwn = s.president.clubId === e.clubId;
    const ind = s.ind;
    const titles = s.career.titles.filter((t) => t.season >= s.president.mandateStart && t.club === s.clubs[e.clubId!]?.name).length;
    const broken = s.promises.filter((p) => p.kept === false && p.madeAbs >= absWeek(s) - 160).length;
    const kept = s.promises.filter((p) => p.kept === true && p.madeAbs >= absWeek(s) - 160).length;
    let user: number;
    if (isOwn) user = ind.socios * 0.45 + ind.hinchas * 0.12 + ind.prestigio * 0.12 + ind.estabilidad * 0.1 + ind.integridad * 0.08 + ind.comision * 0.08 + titles * 6 + kept * 2 - broken * 3 + (s.flags.padronInflado ? 6 : 0);
    else user = ind.repNacional * 0.5 + ind.integridad * 0.15 + ind.influencia * 0.15 + 12;
    user += e.campaignPoints * 0 + Number(s.flags[`campaign_${e.id}`] ?? 0);
    for (const c of active) {
      if (c.isUser) out[c.id] = Math.max(5, user);
      else {
        const ch = c.charId ? s.chars[c.charId] : null;
        const base = isOwn ? 100 - user * 0.9 + (ch ? (ch.influence - 50) * 0.3 : 0) : 55 + (ch ? (ch.influence - 50) * 0.4 : 0);
        out[c.id] = Math.max(5, base + (c.id.includes('vice') ? -10 : 0) - (c.withdrawn ? 999 : 0));
      }
    }
  } else {
    // Votos institucionales: cada elector decide según bloque, opinión y promesas
    const voters = electorsFor(s, e);
    for (const c of active) out[c.id] = 0;
    for (const v of voters) {
      let best = '';
      let bestScore = -Infinity;
      for (const c of active) {
        let score: number;
        if (c.isUser) {
          score = v.ch.opinion * 0.7 + s.ind.influencia * 0.35 + (e.kind === 'asociacion' ? s.ind.repNacional * 0.2 + s.ind.presidentes * 0.15 : s.ind.repInternacional * 0.35) + (s.flags[`favor_${v.ch.id}`] ? 18 : 0) + Number(s.flags[`campaign_${e.id}`] ?? 0) * 0.6;
          if (s.flags.coachAlly) score += 2;
        } else {
          const cc = c.charId ? s.chars[c.charId] : null;
          score = 35 + (cc ? cc.influence * 0.35 : 20) + (cc && cc.bloc && cc.bloc === v.ch.bloc ? 14 : 0) + (cc && cc.id === v.ch.id ? 100 : 0) + (cc && v.ch.tags.includes(`ally_${cc.id}`) ? 20 : 0);
        }
        score += rng ? rng.float(-8, 8) : 0;
        if (score > bestScore) {
          bestScore = score;
          best = c.id;
        }
      }
      if (best) out[best] += v.votes;
    }
  }
  return out;
}

export function electorsFor(s: GameState, e: Election): { ch: Character; votes: number }[] {
  if (e.kind === 'asociacion' || e.kind === 'comite') {
    return charsByRole(s, 'presidente_club').filter((ch) => ch.clubId && s.clubs[ch.clubId]?.country === 'ARG').map((ch) => ({ ch, votes: s.clubs[ch.clubId!].division === 1 ? 2 : 1 }));
  }
  if (e.kind === 'confederacion') return s.confed.members.map((id) => s.chars[id]).filter(Boolean).map((ch) => ({ ch, votes: 1 }));
  return s.fifa.members.map((id) => s.chars[id]).filter(Boolean).map((ch) => ({ ch, votes: CONFEDS[ch.confed ?? 'CSF']?.members ?? 10 }));
}

export function updatePolls(s: GameState, rng: RNG) {
  const e = s.election;
  if (!e || e.done) return;
  const sup = computeSupport(s, e, e.kind === 'club' ? undefined : rng);
  const total = Object.values(sup).reduce((a, b) => a + b, 0) || 1;
  const vals: Record<string, number> = {};
  for (const [k, v] of Object.entries(sup)) vals[k] = Math.round(((v / total) * 100 + (e.kind === 'club' ? rng.float(-3, 3) : 0)) * 10) / 10;
  e.polls.push({ abs: absWeek(s), values: vals });
  if (e.polls.length > 20) e.polls.shift();
  for (const c of e.candidates) c.support = vals[c.id] ?? 0;
}

export const CAMPAIGN_ACTIONS: { id: string; label: string; desc: string; kinds: Election['kind'][]; cost: number }[] = [
  { id: 'proyecto', label: 'Presentar un proyecto deportivo', desc: 'Suma si el equipo viene bien; resta si los resultados no acompañan.', kinds: ['club'], cost: 1 },
  { id: 'obras', label: 'Prometer obras', desc: 'Suma apoyo ahora, crea una promesa que deberás cumplir.', kinds: ['club'], cost: 1 },
  { id: 'balances', label: 'Presentar balances', desc: 'Premia la buena administración y castiga la mala.', kinds: ['club'], cost: 1 },
  { id: 'entrevistas', label: 'Dar entrevistas', desc: 'Depende de tu relación con los periodistas.', kinds: ['club', 'asociacion', 'confederacion', 'fifa'], cost: 1 },
  { id: 'apoyos', label: 'Buscar apoyos institucionales', desc: 'Personalidades del club y del fútbol te respaldan si te aprecian.', kinds: ['club'], cost: 1 },
  { id: 'lista', label: 'Formar una lista de unidad', desc: 'Sumar dirigentes de la directiva. Requiere buena relación con la comisión.', kinds: ['club'], cost: 2 },
  { id: 'alianza', label: 'Negociar una alianza', desc: 'Sumar a una agrupación a cambio de cargos.', kinds: ['club', 'asociacion', 'confederacion', 'fifa'], cost: 2 },
  { id: 'debate', label: 'Aceptar un debate', desc: 'Alto riesgo, alta recompensa.', kinds: ['club', 'asociacion'], cost: 1 },
  { id: 'reuniones', label: 'Ronda de reuniones con electores', desc: 'Mejora tu relación con los que votan.', kinds: ['asociacion', 'confederacion', 'fifa'], cost: 1 },
  { id: 'favores', label: 'Ofrecer favores a cambio de votos', desc: 'Votos seguros hoy, deudas mañana.', kinds: ['asociacion', 'confederacion', 'fifa'], cost: 1 },
  { id: 'plataforma', label: 'Presentar una plataforma de reformas', desc: 'Atrae a los electores según tu reputación.', kinds: ['asociacion', 'confederacion', 'fifa'], cost: 1 },
  { id: 'gira', label: 'Gira internacional de campaña', desc: 'Visitar federaciones en todo el mundo (costosa).', kinds: ['confederacion', 'fifa'], cost: 2 },
];

export function campaignAction(s: GameState, rng: RNG, action: string): string {
  const e = s.election;
  if (!e || e.done || !e.userRunning) return 'No hay una campaña activa.';
  if (e.actionsUsed.includes(action)) return 'Ya realizaste esa acción en esta campaña.';
  const def = CAMPAIGN_ACTIONS.find((a) => a.id === action);
  if (!def || !def.kinds.includes(e.kind)) return 'Acción no disponible.';
  if (e.campaignPoints < def.cost) return 'No te quedan puntos de campaña. Se recuperan con el paso de las semanas.';
  e.campaignPoints -= def.cost;
  e.actionsUsed.push(action);
  const key = `campaign_${e.id}`;
  const add = (n: number) => (s.flags[key] = Number(s.flags[key] ?? 0) + n);
  let msg = '';
  const c = userClub(s);
  switch (action) {
    case 'proyecto': {
      const pos = c ? positionOf(s, c.id) : { pos: 0, of: 1 };
      const good = pos.of && pos.pos <= pos.of / 2;
      add(good ? 6 : -1);
      changeInd(s, 'hinchas', good ? 2 : -1);
      msg = good ? 'El proyecto entusiasma: el equipo respalda tus palabras.' : 'El proyecto suena vacío con los resultados actuales.';
      break;
    }
    case 'obras':
      add(5);
      s.promises.push({ id: newId(s, 'pr'), text: 'Iniciar obras prometidas en campaña', key: 'obra', deadlineAbs: absWeek(s) + 40, madeAbs: absWeek(s), to: null, kept: null, weight: 1.5 });
      msg = 'Prometiste obras: los socios lo celebran. Ahora hay que cumplir en el próximo año.';
      break;
    case 'balances': {
      const good = s.ind.estabilidad >= 50;
      add(good ? 7 : -4);
      s.flags.balancePublishedAbs = absWeek(s);
      msg = good ? 'Los números ordenados son tu mejor carta.' : 'Los balances exponen los problemas financieros: la oposición los usa en tu contra.';
      break;
    }
    case 'entrevistas': {
      const d = (s.ind.periodistas - 45) / 6;
      add(Math.round(d));
      msg = d > 0 ? 'Las entrevistas te favorecen.' : 'La prensa te trata con dureza.';
      break;
    }
    case 'apoyos': {
      const allies = Object.values(s.chars).filter((x) => x.active && x.opinion >= 40).length + Object.values(s.coaches).filter((x) => x.opinion >= 50 && x.tags.includes('respaldado')).length * 2;
      add(Math.min(10, allies));
      msg = allies ? `Recibiste ${allies} respaldos públicos de figuras del fútbol y del club.` : 'Nadie de peso quiso mostrarse con vos.';
      break;
    }
    case 'lista': {
      if (s.ind.comision >= 50) {
        add(6);
        msg = 'La comisión directiva se encolumna detrás de tu lista.';
      } else {
        add(-2);
        msg = 'Varios dirigentes se negaron a integrar tu lista: la interna queda expuesta.';
      }
      break;
    }
    case 'alianza': {
      if (e.kind === 'club' && c?.staff?.lider_socios) {
        const ch = s.chars[c.staff.lider_socios];
        const ok = ch.opinion > 0 || rng.chance(0.4);
        add(ok ? 8 : 0);
        if (ok) remember(s, ch, 'Pacto electoral a cambio de cargos', 5);
        msg = ok ? `${ch.name} y su agrupación se suman a cambio de lugares en la comisión.` : 'La agrupación rechazó la alianza.';
      } else {
        const others = e.candidates.filter((x) => !x.isUser && !x.withdrawn);
        const weakest = others.sort((a, b) => a.support - b.support)[0];
        if (weakest && others.length > 1 && rng.chance(0.6)) {
          weakest.withdrawn = true;
          add(8);
          msg = `${weakest.name} retiró su candidatura y te apoya a cambio de una vicepresidencia.`;
        } else {
          add(2);
          msg = 'Lograste algunos apoyos sueltos, pero no una alianza de peso.';
        }
      }
      break;
    }
    case 'debate': {
      const skill = (s.ind.periodistas + s.ind.repNacional) / 2 + rng.int(-25, 25);
      e.debateDone = true;
      if (skill > 55) {
        add(9);
        msg = 'Ganaste el debate con claridad: tu candidatura despega.';
      } else if (skill > 40) {
        add(2);
        msg = 'Debate parejo: nadie sacó ventaja.';
      } else {
        add(-6);
        msg = 'Perdiste el debate: quedaste a la defensiva frente a las críticas.';
      }
      break;
    }
    case 'reuniones': {
      const voters = electorsFor(s, e).sort(() => rng.next() - 0.5).slice(0, 6);
      for (const v of voters) changeOpinion(s, v.ch.id, rng.int(3, 10), 'Reunión de campaña');
      msg = `Te reuniste con ${voters.length} electores. Mejoró la sintonía.`;
      break;
    }
    case 'favores': {
      const voters = electorsFor(s, e).filter((v) => v.ch.opinion < 30).sort((a, b) => b.votes - a.votes).slice(0, 3);
      for (const v of voters) {
        s.flags[`favor_${v.ch.id}`] = true;
        s.scheduled.push({ at: absWeek(s) + rng.int(20, 60), kind: 'effect', id: 'favorCalled', b: { charId: v.ch.id } });
      }
      changeInd(s, 'integridad', -4);
      changeInd(s, 'riesgo', 4);
      msg = `Aseguraste el voto de ${voters.map((v) => v.ch.name).join(', ')}. Algún día vendrán a cobrar.`;
      break;
    }
    case 'plataforma':
      add(Math.round((s.ind.repNacional + s.ind.repInternacional - 90) / 8));
      msg = 'Presentaste tu plataforma de reformas.';
      break;
    case 'gira': {
      const cost = e.kind === 'fifa' ? 2_000_000 : 500_000;
      if (s.president.wealth >= cost) s.president.wealth -= cost;
      else book(s, 'viajes', -cost);
      for (const v of electorsFor(s, e)) changeOpinion(s, v.ch.id, rng.int(4, 12), 'Visita de campaña');
      changeInd(s, 'repInternacional', 3);
      msg = `Recorriste federaciones en varios continentes (${money(cost)}).`;
      break;
    }
  }
  updatePolls(s, rng);
  return msg;
}

export function withdrawFromElection(s: GameState): string {
  const e = s.election;
  if (!e || !e.userRunning) return '';
  e.userRunning = false;
  const u = e.candidates.find((c) => c.isUser);
  if (u) u.withdrawn = true;
  changeInd(s, 'influencia', -3);
  if (e.kind === 'club') {
    changeInd(s, 'socios', -3);
    addNews(s, `${s.president.name} ${s.president.surname} anuncia que no buscará la reelección`, 'neu', 'elecciones', true);
  }
  return 'Retiraste tu candidatura.';
}

export function weeklyElection(s: GameState, rng: RNG): string[] {
  const notes: string[] = [];
  const e = s.election;
  if (e && !e.done) {
    if (s.week % 2 === 0) e.campaignPoints = Math.min(4, e.campaignPoints + 1);
    updatePolls(s, rng);
    if (absWeek(s) >= e.weekAbs) notes.push(...resolveElection(s, rng));
  }
  return notes;
}

export function resolveElection(s: GameState, rng: RNG): string[] {
  const e = s.election!;
  const notes: string[] = [];
  e.done = true;
  const active = e.candidates.filter((c) => !c.withdrawn);
  const sup = computeSupport(s, e, rng);
  let result: Record<string, number> = {};
  if (e.kind === 'club') {
    const total = Object.values(sup).reduce((a, b) => a + b, 0) || 1;
    for (const c of active) result[c.id] = Math.max(1, (sup[c.id] / total) * 100 + rng.normal(0, 4));
    const t = Object.values(result).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(result)) result[k] = Math.round((result[k] / t) * 1000) / 10;
  } else result = sup;
  e.result = result;
  const winner = active.sort((a, b) => (result[b.id] ?? 0) - (result[a.id] ?? 0))[0];
  e.winner = winner?.id;
  const userWon = !!winner?.isUser;
  const label = e.kind === 'club' ? s.clubs[e.clubId!]?.name : e.kind === 'asociacion' ? s.assoc.short : e.kind === 'confederacion' ? s.confed.short : s.fifa.short;
  if (e.userRunning) {
    if (userWon) s.career.electionsWon++;
    else s.career.electionsLost++;
  }
  s.career.milestones.push({ season: s.season, week: s.week, text: `Elecciones en ${label}: ganó ${winner?.name ?? '—'}` });
  addNews(s, `Elecciones en ${label}: ${winner?.name} es el nuevo presidente${e.userRunning ? (userWon ? ' — triunfo de ' + s.president.surname : ' — derrota de ' + s.president.surname) : ''}`, userWon ? 'pos' : e.userRunning ? 'neg' : 'neu', 'elecciones', e.userRunning);
  if (e.kind === 'club') {
    const club = s.clubs[e.clubId!];
    const isOwn = s.president.clubId === e.clubId;
    if (userWon) {
      if (isOwn) {
        s.president.mandateStart = s.season + 1;
        s.president.mandateEnd = s.season + s.president.mandateYears;
        club.nextElection = s.president.mandateEnd;
        changeInd(s, 'gobernabilidad', 8);
        changeInd(s, 'comision', 5);
        notes.push(`¡Reelecto en ${club.name}! Nuevo mandato hasta ${s.president.mandateEnd}.`);
      } else {
        assumeClub(s, rng, club, s.president.mandateYears);
        notes.push(`¡Ganaste las elecciones en ${club.name}! Asumís la presidencia.`);
      }
    } else {
      const w = winner?.charId ? s.chars[winner.charId] : null;
      if (isOwn) {
        if (e.userRunning) notes.push(`Perdiste las elecciones en ${club.name}. ${w?.name ?? 'La oposición'} asume la presidencia.`);
        else notes.push(`Terminó tu mandato en ${club.name}. ${w?.name ?? 'Tu sucesor'} asume la presidencia.`);
        leaveClub(s, rng, w);
      } else {
        club.nextElection = s.season + 3;
        if (w && w.id !== club.presidentId) {
          const prev = club.presidentId ? s.chars[club.presidentId] : null;
          if (prev) prev.active = false;
          w.role = 'presidente_club';
          w.title = `Presidente de ${club.name}`;
          club.presidentId = w.id;
        }
        if (e.userRunning) notes.push(`No alcanzaste los votos en ${club.name}.`);
      }
    }
  } else if (e.kind === 'asociacion') {
    if (userWon) {
      becomeBodyPresident(s, rng, 'asociacion');
      notes.push('¡Sos el nuevo presidente de la Asociación Argentina de Fútbol!');
    } else {
      const w = winner?.charId ? s.chars[winner.charId] : null;
      if (w && s.president.pos !== 'asociacion') setBodyPresident(s, 'asociacion', w);
      else if (s.president.pos === 'asociacion' && w) {
        setBodyPresident(s, 'asociacion', w);
        s.president.pos = 'sin_cargo';
        s.career.positions.forEach((p) => p.to === null && p.pos === 'asociacion' && (p.to = s.season));
        notes.push('Perdiste la presidencia de la AAF. Quedás sin cargo.');
      }
      if (e.userRunning) {
        changeInd(s, 'influencia', -6);
        if (w) changeOpinion(s, w.id, -10, 'Compitió contra él por la AAF');
        if (s.president.pos !== 'sin_cargo') notes.push('Perdiste la elección de la AAF.');
      }
    }
    s.assoc.nextElection = s.season + 4;
  } else if (e.kind === 'confederacion') {
    if (userWon) {
      becomeBodyPresident(s, rng, 'confederacion');
      notes.push('¡Sos el nuevo presidente de la Confederación Sudamericana!');
    } else {
      const w = winner?.charId ? s.chars[winner.charId] : null;
      if (w) setBodyPresident(s, 'confederacion', w);
      if (e.userRunning) {
        changeInd(s, 'repInternacional', -4);
        notes.push('Perdiste la elección continental.');
      }
    }
    s.confed.nextElection = s.season + 4;
  } else if (e.kind === 'fifa') {
    if (userWon) {
      becomeBodyPresident(s, rng, 'fifa');
      notes.push('¡Sos el presidente de la Federación Internacional de Fútbol!');
    } else {
      const w = winner?.charId ? s.chars[winner.charId] : null;
      if (w) setBodyPresident(s, 'fifa', w);
      if (e.userRunning) {
        changeInd(s, 'repInternacional', -5);
        notes.push('Perdiste la elección de la FIF.');
      }
    }
    s.fifa.nextElection = s.season + 4;
  }
  return notes;
}

function setBodyPresident(s: GameState, kind: 'asociacion' | 'confederacion' | 'fifa', ch: Character) {
  const body = kind === 'asociacion' ? s.assoc : kind === 'confederacion' ? s.confed : s.fifa;
  body.presidentId = ch.id;
  body.history.push(`${s.season}: ${ch.name} asume la presidencia.`);
  if (kind === 'asociacion') s.nations.ARG.presidentId = ch.id;
}

/** El usuario asume la presidencia de un club. */
export function assumeClub(s: GameState, rng: RNG, club: Club, years: number) {
  const prevPres = club.presidentId ? s.chars[club.presidentId] : null;
  if (prevPres) {
    prevPres.active = false;
    prevPres.tags.push('ex_presidente');
  }
  club.presidentId = null;
  ensureClubStaff(s, rng, club);
  s.president.pos = 'club';
  s.president.clubId = club.id;
  s.president.mandateStart = s.season + (s.week >= 38 ? 1 : 0);
  s.president.mandateYears = years;
  s.president.mandateEnd = s.president.mandateStart + years - 1;
  club.nextElection = s.president.mandateEnd;
  s.career.clubs.push({ clubId: club.id, name: club.name, from: s.president.mandateStart, to: null });
  s.career.positions.push({ pos: 'club', label: `Presidente de ${club.name}`, from: s.president.mandateStart, to: null });
  // reinicio de la economía del usuario sobre el nuevo club
  s.sponsors = [];
  s.sponsorOffers = [];
  initialSponsors(s, rng);
  s.loans = club.fin.debt > 0 ? [{ id: newId(s, 'ln'), lender: 'Deuda heredada', principal: club.fin.debt, balance: club.fin.debt, rate: 0.12, weeksLeft: 120, payment: (club.fin.debt * 1.25) / 120, takenSeason: s.season }] : [];
  club.fin.debt = 0;
  s.projects = [];
  s.economy = { ...s.economy, ticketMult: 1, feeMult: 1, emergency: false, transferBudget: Math.max(0, Math.round(club.fin.cash * 0.4)), wageCap: 0, staffCost: 1 };
  // los indicadores locales se recalibran a la nueva institución
  s.ind.socios = 58;
  s.ind.hinchas = 58;
  s.ind.comision = 60;
  s.ind.jugadores = 55;
  s.ind.dt = 55;
  s.ind.barra = 50;
  s.ind.empleados = 55;
  s.ind.gobernabilidad = 60;
  s.ind.patrocinadores = clamp(45 + s.ind.repNacional * 0.2);
  s.president.committee = s.president.committee && club.division >= 1;
  addNews(s, `${s.president.name} ${s.president.surname} asume como presidente de ${club.name}`, 'pos', 'carrera', true);
}

/** El usuario deja el club (derrota, renuncia o ascenso a la asociación). */
export function leaveClub(s: GameState, rng: RNG, successor?: Character | null) {
  const club = userClub(s);
  if (!club) return;
  let next = successor ?? (club.staff?.opositor ? s.chars[club.staff.opositor] : null);
  if (!next) next = makeChar(s, rng, 'presidente_club', `Presidente de ${club.name}`, { clubId: club.id });
  next.role = 'presidente_club';
  next.title = `Presidente de ${club.name}`;
  next.clubId = club.id;
  next.active = true;
  club.presidentId = next.id;
  club.nextElection = s.season + 3;
  // el staff opositor se renueva
  if (club.staff && club.staff.opositor === next.id) {
    club.staff.opositor = makeChar(s, rng, 'opositor', 'Líder de la agrupación opositora', { clubId: club.id, opinion: rng.int(-10, 20) }).id;
  }
  const rec = s.career.clubs.find((x) => x.clubId === club.id && (x.to === null || x.to === undefined));
  if (rec) rec.to = s.season;
  s.career.positions.forEach((p) => (p.to === null || p.to === undefined) && p.pos === 'club' && (p.to = s.season));
  // la deuda pendiente queda en el club
  club.fin.debt = s.loans.reduce((a, l) => a + l.balance, 0);
  s.loans = [];
  s.sponsors = [];
  s.sponsorOffers = [];
  s.projects = [];
  s.inbox = [];
  s.president.clubId = null;
  if (s.president.committee) {
    s.president.committee = false;
    s.assoc.userOnCommittee = false;
  }
  if (s.president.pos === 'club') s.president.pos = 'sin_cargo';
  s.flags.viceBetrayal = false;
}

export function becomeBodyPresident(s: GameState, rng: RNG, kind: 'asociacion' | 'confederacion' | 'fifa') {
  const body = kind === 'asociacion' ? s.assoc : kind === 'confederacion' ? s.confed : s.fifa;
  const prev = body.presidentId ? s.chars[body.presidentId] : null;
  if (prev) {
    prev.tags.push('ex_presidente_organismo');
    changeOpinion(s, prev.id, -15, 'Lo desplazó del poder');
  }
  if (kind === 'asociacion') {
    if (s.president.clubId) leaveClub(s, rng, null);
    s.nations.ARG.presidentId = undefined;
  } else if (kind === 'confederacion') {
    // la AAF queda en manos de un aliado
    const ally = charsByRole(s, 'dirigente_asociacion').sort((a, b) => b.opinion - a.opinion)[0] ?? makeChar(s, rng, 'dirigente_asociacion', 'Presidente de la AAF', { opinion: 50 });
    setBodyPresident(s, 'asociacion', ally);
    s.career.positions.forEach((p) => (p.to === null || p.to === undefined) && p.pos === 'asociacion' && (p.to = s.season));
  } else {
    const ally = charsByRole(s, 'presidente_federacion').filter((x) => x.confed === 'CSF').sort((a, b) => b.opinion - a.opinion)[0];
    if (ally) setBodyPresident(s, 'confederacion', ally);
    s.career.positions.forEach((p) => (p.to === null || p.to === undefined) && p.pos === 'confederacion' && (p.to = s.season));
  }
  body.presidentId = null;
  body.history.push(`${s.season}: ${s.president.name} ${s.president.surname} asume la presidencia.`);
  s.president.pos = kind;
  s.president.mandateStart = s.season + 1;
  s.president.mandateYears = 4;
  s.president.mandateEnd = s.season + 4;
  s.career.positions.push({ pos: kind, label: kind === 'asociacion' ? 'Presidente de la AAF' : kind === 'confederacion' ? 'Presidente de la CSF' : 'Presidente de la FIF', from: s.season + 1, to: null });
  s.career.peakLevel = Math.max(s.career.peakLevel, careerLevel(s));
  s.ledger = {};
  s.ind.gobernabilidad = 65;
  s.ind.comision = 60;
  s.ind.estabilidad = 60;
  addNews(s, `${s.president.name} ${s.president.surname} asume la presidencia de ${body.name}`, 'pos', 'carrera', true);
}

// ---------------------------------------------------------------------------
// Comité ejecutivo y asambleas
// ---------------------------------------------------------------------------
export function joinCommittee(s: GameState) {
  const c = userClub(s);
  if (!c) return;
  s.president.committee = true;
  s.assoc.userOnCommittee = true;
  const out = s.assoc.committee.map((id) => s.chars[id]).sort((a, b) => a.influence - b.influence)[0];
  if (out) s.assoc.committee = s.assoc.committee.filter((id) => id !== out.id);
  changeInd(s, 'influencia', 8);
  s.career.positions.push({ pos: 'comite', label: 'Miembro del Comité Ejecutivo de la AAF', from: s.season, to: null });
  s.career.peakLevel = Math.max(s.career.peakLevel, 3);
  s.career.milestones.push({ season: s.season, week: s.week, text: 'Ingresaste al Comité Ejecutivo de la AAF' });
  addNews(s, `${s.president.surname} se suma al Comité Ejecutivo de la AAF`, 'pos', 'carrera', true);
}

export const PROPOSALS: { key: string; title: string; text: string; bigFavor: number; apply: (s: GameState, passed: boolean) => void }[] = [
  { key: 'tv_merito', title: 'Reparto de TV por mérito', text: 'Distribuir los derechos de TV según audiencia y resultados (favorece a los grandes).', bigFavor: 1, apply: (s, p) => p && (s.assoc.tvModel = 'meritocratico') },
  { key: 'tv_equitativo', title: 'Reparto de TV equitativo', text: 'Dividir los derechos de TV en partes iguales entre los clubes de primera.', bigFavor: -1, apply: (s, p) => p && (s.assoc.tvModel = 'equitativo') },
  { key: 'tv_mixto', title: 'Reparto de TV mixto', text: 'Mitad igualitario, mitad por mérito.', bigFavor: 0, apply: (s, p) => p && (s.assoc.tvModel = 'mixto') },
  { key: 'tope_salarial', title: 'Tope salarial', text: 'Fijar un tope de salarios por jugador para todos los clubes.', bigFavor: -1, apply: (s, p) => (s.assoc.rules.topeSalarial = p ? true : s.assoc.rules.topeSalarial) },
  { key: 'extranjeros', title: 'Ampliar el cupo de extranjeros', text: 'Permitir más extranjeros por plantel.', bigFavor: 1, apply: (s, p) => p && (s.assoc.rules.extranjeros = Number(s.assoc.rules.extranjeros) + 1) },
  { key: 'descensos3', title: 'Tres descensos por temporada', text: 'Aumentar a tres los descensos de la Liga Profesional.', bigFavor: 1, apply: (s, p) => p && (s.assoc.rules.descensos = 3) },
  { key: 'descensos1', title: 'Un solo descenso', text: 'Reducir los descensos a uno por temporada.', bigFavor: -1, apply: (s, p) => p && (s.assoc.rules.descensos = 1) },
  { key: 'tv_aumento', title: 'Nuevo contrato de TV', text: 'Licitar los derechos de TV con una nueva cadena: más dinero, más horarios incómodos.', bigFavor: 0, apply: (s, p) => p && (s.assoc.tvPool = Math.round(s.assoc.tvPool * 1.15)) },
  { key: 'fairplay', title: 'Fair play financiero', text: 'Sancionar a los clubes que gasten más de lo que ingresan.', bigFavor: 0, apply: (s, p) => (s.assoc.rules.fairPlay = p ? true : s.assoc.rules.fairPlay) },
  { key: 'visitantes', title: 'Vuelta del público visitante', text: 'Permitir hinchas visitantes en todos los estadios.', bigFavor: 0, apply: (s, p) => (s.assoc.rules.visitantes = p ? true : s.assoc.rules.visitantes) },
];

export function weeklyAssembly(s: GameState, rng: RNG): string[] {
  const notes: string[] = [];
  const abs = absWeek(s);
  // Generar una propuesta cada ~8 semanas
  if (s.week % 8 === 3 && !s.assoc.proposals.some((p) => !p.result)) {
    const r = s.assoc.rules;
    const pending = PROPOSALS.filter((p) => {
      if (p.key === 'tv_merito') return s.assoc.tvModel !== 'meritocratico';
      if (p.key === 'tv_equitativo') return s.assoc.tvModel !== 'equitativo';
      if (p.key === 'tv_mixto') return s.assoc.tvModel !== 'mixto';
      if (p.key === 'tope_salarial') return !r.topeSalarial;
      if (p.key === 'fairplay') return !r.fairPlay;
      if (p.key === 'visitantes') return !r.visitantes;
      if (p.key === 'descensos3') return Number(r.descensos) < 3;
      if (p.key === 'descensos1') return Number(r.descensos) > 1;
      if (p.key === 'extranjeros') return Number(r.extranjeros) < 8;
      return true;
    });
    const def = rng.pick(pending);
    const proposer = rng.pick(charsByRole(s, 'presidente_club'));
    s.assoc.proposals.push({ id: newId(s, 'pp'), key: def.key, title: def.title, text: def.text, proposerId: proposer?.id ?? null, voteAbs: abs + 3, userVote: null });
    addNews(s, `Asamblea de la AAF: se votará "${def.title}"`, 'neu', 'asociacion');
  }
  for (const p of s.assoc.proposals) {
    if (p.result || p.voteAbs > abs) continue;
    notes.push(resolveProposal(s, rng, p));
  }
  s.assoc.proposals = s.assoc.proposals.filter((p) => !p.result || p.voteAbs > abs - 30);
  return notes;
}

export function resolveProposal(s: GameState, rng: RNG, p: Proposal): string {
  const def = PROPOSALS.find((x) => x.key === p.key)!;
  let si = 0, no = 0, abst = 0;
  const userInAssembly = s.president.pos === 'club' || s.president.pos === 'asociacion';
  const userPush = p.byUser ? s.ind.influencia / 4 : 0;
  for (const ch of charsByRole(s, 'presidente_club')) {
    const club = ch.clubId ? s.clubs[ch.clubId] : null;
    if (!club || club.country !== 'ARG') continue;
    const votes = club.division === 1 ? 2 : 1;
    let lean = def.bigFavor * (club.prestige - 60) * 0.8 + rng.float(-25, 25);
    if (p.proposerId) {
      const pr = s.chars[p.proposerId];
      if (pr && pr.bloc === ch.bloc) lean += 12;
    }
    if (p.byUser) lean += ch.opinion * 0.35 + userPush;
    else if (p.userVote === 'si') lean += ch.opinion * 0.15 + s.ind.influencia * 0.08;
    else if (p.userVote === 'no') lean -= ch.opinion * 0.15 + s.ind.influencia * 0.08;
    const ap = s.assoc.presidentId ? s.chars[s.assoc.presidentId] : null;
    if (ap && ch.bloc === 'oficialismo') lean += p.byUser ? -6 : 4;
    if (lean > 8) si += votes;
    else if (lean < -8) no += votes;
    else abst += votes;
  }
  if (userInAssembly && s.president.clubId) {
    const uv = s.clubs[s.president.clubId].division === 1 ? 2 : 1;
    if (p.userVote === 'si' || p.byUser) si += uv;
    else if (p.userVote === 'no') no += uv;
    else abst += uv;
  }
  if (s.president.pos === 'asociacion') {
    // el presidente de la asociación inclina la balanza
    if (p.userVote === 'si' || p.byUser) si += Math.round(s.ind.influencia / 8);
    else if (p.userVote === 'no') no += Math.round(s.ind.influencia / 8);
  }
  const passed = si > no;
  p.result = { si, no, abst, passed };
  def.apply(s, passed);
  if (p.userVote === 'si' || p.byUser) {
    changeInd(s, 'influencia', passed ? 3 : -2);
    if (p.byUser) changeInd(s, 'presidentes', passed ? 3 : -3);
  } else if (p.userVote === 'no') changeInd(s, 'influencia', passed ? -1 : 2);
  if (p.proposerId && p.userVote) changeOpinion(s, p.proposerId, p.userVote === 'si' ? 6 : p.userVote === 'no' ? -6 : 0, p.userVote === 'si' ? `Votó a favor de su propuesta "${p.title}"` : `Votó en contra de su propuesta "${p.title}"`);
  addNews(s, `La asamblea ${passed ? 'aprobó' : 'rechazó'} "${p.title}" (${si} a ${no})`, 'neu', 'asociacion', !!p.userVote || !!p.byUser);
  s.assoc.history.push(`${s.season}: ${passed ? 'Aprobada' : 'Rechazada'} — ${p.title} (${si}-${no})`);
  return `Asamblea AAF: "${p.title}" ${passed ? 'aprobada' : 'rechazada'} (${si}-${no}).`;
}

export function voteProposal(s: GameState, id: string, vote: 'si' | 'no' | 'abstencion') {
  const p = s.assoc.proposals.find((x) => x.id === id);
  if (p && !p.result) p.userVote = vote;
}

export function presentProposal(s: GameState, key: string): string {
  if (s.ind.influencia < 30) return 'Necesitás más influencia política (30) para presentar propuestas.';
  if (s.assoc.proposals.some((p) => p.byUser && !p.result)) return 'Ya tenés una propuesta en tratamiento.';
  if (!spendCapital(s, 2)) return 'No tenés capital político suficiente (2).';
  const def = PROPOSALS.find((p) => p.key === key);
  if (!def) return '';
  s.assoc.proposals.push({ id: newId(s, 'pp'), key, title: def.title, text: def.text, byUser: true, voteAbs: absWeek(s) + 2, userVote: 'si' });
  addNews(s, `${s.president.surname} presenta en la AAF el proyecto "${def.title}"`, 'neu', 'asociacion', true);
  return `Presentaste "${def.title}". Se votará en dos semanas.`;
}

/** Reunión política con un dirigente (cuesta capital político). */
export function meetLeader(s: GameState, rng: RNG, charId: string, mode: 'reunion' | 'alianza' | 'favor'): string {
  const ch = s.chars[charId];
  if (!ch) return '';
  const cost = mode === 'reunion' ? 1 : 2;
  if (!spendCapital(s, cost)) return `Necesitás ${cost} de capital político.`;
  if (mode === 'reunion') {
    const d = rng.int(2, 8) + Math.round(s.ind.influencia / 20);
    changeOpinion(s, ch.id, d, 'Reunión política');
    return `Te reuniste con ${ch.name}. La relación mejora (+${d}).`;
  }
  if (mode === 'alianza') {
    const ok = ch.opinion >= 25 || (ch.personality === 'oportunista' && rng.chance(0.6));
    if (!ok) {
      changeOpinion(s, ch.id, -3);
      return `${ch.name} rechazó formar una alianza: todavía no confía en vos.`;
    }
    if (!ch.tags.includes('aliado_usuario')) ch.tags.push('aliado_usuario');
    changeOpinion(s, ch.id, 10, 'Alianza política');
    changeInd(s, 'influencia', 2);
    // los de su bloque te miran mejor
    for (const o of charsByRole(s, 'presidente_club')) if (o.bloc === ch.bloc && o.id !== ch.id) changeOpinion(s, o.id, 2);
    return `Sellaste una alianza con ${ch.name}. Su bloque (${ch.bloc}) te ve con mejores ojos.`;
  }
  // favor
  s.flags[`favor_${ch.id}`] = true;
  changeOpinion(s, ch.id, 15, 'Le ofreciste un favor');
  changeInd(s, 'riesgo', 2);
  s.scheduled.push({ at: absWeek(s) + rng.int(15, 50), kind: 'effect', id: 'favorCalled', b: { charId: ch.id } });
  return `${ch.name} acepta tu favor. Te deberá su voto... y vos le debés algo a él.`;
}

/** Inicio de campañas en el calendario. */
export function seasonPolitics(s: GameState, rng: RNG): string[] {
  const notes: string[] = [];
  // Elección del club propio
  if (s.president.pos === 'club' && s.president.clubId && s.season >= s.president.mandateEnd && s.week === CAMPAIGN_START && !s.election) {
    startClubElection(s, rng, s.president.clubId, true);
    notes.push('Comenzó la campaña electoral en tu club. Revisá la sección Política.');
  }
  // AAF
  if (s.season === s.assoc.nextElection && s.week === 20 && !s.election) {
    const canRun = (s.president.pos === 'club' && (s.president.committee || s.ind.influencia >= 60)) || s.president.pos === 'asociacion';
    startBodyElection(s, rng, 'asociacion', s.president.pos === 'asociacion');
    if (canRun && s.president.pos !== 'asociacion') notes.push('Se abrió la elección de la AAF. Podés postularte desde Política.');
  }
  // CSF
  if (s.season === s.confed.nextElection && s.week === 18 && !s.election) {
    startBodyElection(s, rng, 'confederacion', s.president.pos === 'confederacion');
    if (s.president.pos === 'asociacion') notes.push('Se abrió la elección de la Confederación Sudamericana. Podés postularte desde Política.');
  }
  // FIF
  if (s.season === s.fifa.nextElection && s.week === 16 && !s.election) {
    startBodyElection(s, rng, 'fifa', s.president.pos === 'fifa');
    if (s.president.pos === 'confederacion') notes.push('Se abrió la elección de la FIF. Podés postularte desde Política.');
  }
  // Mandato vencido en organismo (si no hubo elección por solapamiento)
  if (s.week === 1 && s.election?.done) s.election = null;
  // Clubes IA: elecciones de presidentes
  if (s.week === 39) {
    for (const c of Object.values(s.clubs)) {
      if (c.country !== 'ARG' || c.id === s.president.clubId || c.nextElection > s.season) continue;
      c.nextElection = s.season + 3;
      const pres = c.presidentId ? s.chars[c.presidentId] : null;
      const lost = rng.chance(c.form.filter((x) => x === 'P').length > 5 ? 0.6 : 0.3);
      if (lost) {
        if (pres) pres.active = false;
        const n = makeChar(s, rng, 'presidente_club', `Presidente de ${c.name}`, { clubId: c.id, influence: clamp(Math.round(c.prestige * 0.7 + rng.int(-10, 15))), bloc: rng.pick(['oficialismo', 'oposicion', 'independiente'] as const) });
        c.presidentId = n.id;
        if (c.division === 1) addNews(s, `${n.name} gana las elecciones en ${c.name}`, 'neu', 'elecciones');
      }
    }
    // la asociación renueva comité
    if (!s.president.committee) {
      const pres = charsByRole(s, 'presidente_club').filter((x) => x.clubId && s.clubs[x.clubId].division === 1);
      s.assoc.committee = pres.sort((a, b) => b.influence - a.influence).slice(0, 8).map((x) => x.id);
    }
  }
  return notes;
}

export function canRunFor(s: GameState, kind: 'asociacion' | 'confederacion' | 'fifa'): { ok: boolean; why: string } {
  if (s.president.suspendedUntil && s.president.suspendedUntil > absWeek(s)) return { ok: false, why: 'Estás inhabilitado para ocupar cargos.' };
  if (kind === 'asociacion') {
    if (s.president.pos === 'asociacion') return { ok: true, why: 'Buscás la reelección.' };
    if (s.president.pos !== 'club') return { ok: false, why: 'Hay que ser presidente de un club afiliado.' };
    if (!s.president.committee && s.ind.influencia < 60) return { ok: false, why: 'Necesitás integrar el Comité Ejecutivo o tener 60 de influencia.' };
    return { ok: true, why: '' };
  }
  if (kind === 'confederacion') {
    if (s.president.pos === 'confederacion') return { ok: true, why: 'Buscás la reelección.' };
    if (s.president.pos !== 'asociacion') return { ok: false, why: 'Hay que presidir una asociación nacional.' };
    if (s.ind.repInternacional < 45) return { ok: false, why: 'Necesitás 45 de reputación internacional.' };
    return { ok: true, why: '' };
  }
  if (s.president.pos === 'fifa') return { ok: true, why: 'Buscás la reelección.' };
  if (s.president.pos !== 'confederacion') return { ok: false, why: 'Hay que presidir una confederación continental.' };
  if (s.ind.repInternacional < 60) return { ok: false, why: 'Necesitás 60 de reputación internacional.' };
  return { ok: true, why: '' };
}

export function joinBodyElection(s: GameState, rng: RNG): string {
  const e = s.election;
  if (!e || e.done || e.kind === 'club' || e.userRunning) return 'No hay una elección abierta para postularte.';
  const chk = canRunFor(s, e.kind as 'asociacion');
  if (!chk.ok) return chk.why;
  e.userRunning = true;
  e.candidates.unshift({ id: 'user', name: `${s.president.name} ${s.president.surname}`, charId: null, isUser: true, support: 0, platform: 'Renovación' });
  updatePolls(s, rng);
  addNews(s, `${s.president.name} ${s.president.surname} lanza su candidatura a la presidencia de ${e.kind === 'asociacion' ? s.assoc.short : e.kind === 'confederacion' ? s.confed.short : s.fifa.short}`, 'neu', 'elecciones', true);
  return 'Lanzaste tu candidatura.';
}

/** Postularse en un club cuando el usuario está sin cargo. */
export function clubsWithElections(s: GameState): Club[] {
  return Object.values(s.clubs).filter((c) => c.country === 'ARG' && c.id !== s.president.clubId && (c.nextElection <= s.season + 1)).sort((a, b) => b.prestige - a.prestige);
}

export function runForClub(s: GameState, rng: RNG, clubId: string): string {
  if (s.president.pos !== 'sin_cargo') return 'Sólo podés postularte en otro club si estás sin cargo.';
  if (s.election && !s.election.done) return 'Ya hay una campaña en curso.';
  if (s.president.suspendedUntil && s.president.suspendedUntil > absWeek(s)) return 'Estás inhabilitado.';
  const c = s.clubs[clubId];
  const weeks = Math.max(4, CLUB_ELECTION_WEEK - s.week);
  startClubElection(s, rng, clubId, true, s.week <= 34 ? weeks : 6);
  return `Lanzaste tu candidatura en ${c.name}. La votación será en ${s.week <= 34 ? weeks : 6} semanas.`;
}

export function avgOpinion(s: GameState, role: Parameters<typeof charsByRole>[1]) {
  return avg(charsByRole(s, role).map((c) => c.opinion));
}
