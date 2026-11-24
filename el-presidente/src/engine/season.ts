// Cierre y apertura de temporada: títulos, premios, ascensos/descensos, evolución
// de jugadores, juveniles, contratos, prestigio de clubes y objetivos.
import type { GameState, Objective, SeasonSummary, Position } from './types';
import type { RNG } from './rng';
import { clamp, money, newId } from './util';
import { userClub, squad, positionOf, sortTable, leagueOf, teamName } from './queries';
import { applyPromotionRelegation, setupSeasonCompetitions } from './competitions';
import { makePlayer, makeCoach } from './worldgen';
import { refreshValue, fillSquads } from './market';
import { wageFor, coachWage, estimateRevenue } from './valuation';
import { book, addPrize } from './economy';
import { seasonEndSponsors, generateSponsorOffers } from './sponsors';
import { changeInd } from './relations';
import { addNews } from './news';

export function leaguePrize(division: number, pos: number, of: number): number {
  const top = division === 1 ? 2_400_000 : division === 2 ? 500_000 : 120_000;
  return Math.round((top * (of - pos + 1)) / of);
}

export function generateObjectives(s: GameState): Objective[] {
  const c = userClub(s);
  if (!c) return [];
  const o: Objective[] = [];
  const mk = (text: string, key: string, target: number, importance: Objective['importance']) => o.push({ id: newId(s, 'ob'), text, key, target, importance, done: null });
  if (c.division === 1) {
    if (c.prestige >= 85) {
      mk('Terminar entre los 3 primeros', 'pos', 3, 'esperado');
      mk('Ganar un título', 'titulo', 1, 'ideal');
      mk('No quedar fuera del top 6', 'pos', 6, 'minimo');
    } else if (c.prestige >= 70) {
      mk('Clasificar a la Copa Continental (top 4)', 'pos', 4, 'esperado');
      mk('Pelear el campeonato (top 2)', 'pos', 2, 'ideal');
      mk('Terminar en la mitad superior', 'pos', 9, 'minimo');
    } else {
      mk('Mantener la categoría con tranquilidad', 'pos', 13, 'esperado');
      mk('Terminar en la mitad superior', 'pos', 9, 'ideal');
      mk('No descender', 'pos', 16, 'minimo');
    }
  } else if (c.division === 2) {
    mk('Lograr el ascenso (top 2)', 'pos', 2, c.prestige >= 52 ? 'esperado' : 'ideal');
    mk('Terminar entre los 6 primeros', 'pos', 6, c.prestige >= 52 ? 'minimo' : 'esperado');
    mk('No descender', 'pos', 16, 'minimo');
  } else {
    mk('Ascender a la Primera Nacional (top 2)', 'pos', 2, 'ideal');
    mk('Terminar entre los 6 primeros', 'pos', 6, 'esperado');
    mk('Terminar en la mitad superior', 'pos', 8, 'minimo');
  }
  mk('Cerrar la temporada sin atrasos salariales', 'sueldos', 0, 'esperado');
  return o;
}

function evaluateObjectives(s: GameState, notes: string[]) {
  const c = userClub(s);
  if (!c) return;
  const { pos } = positionOf(s, c.id);
  let score = 0;
  for (const o of s.objectives) {
    if (o.key === 'pos') o.done = pos > 0 && pos <= o.target;
    else if (o.key === 'titulo') o.done = !!s.flags[`titleWon_${s.season}`];
    else if (o.key === 'sueldos') o.done = c.fin.wageArrears === 0;
    const w = o.importance === 'minimo' ? 3 : o.importance === 'esperado' ? 2 : 1;
    if (o.done) score += o.importance === 'ideal' ? 2 : 1;
    else score -= w;
  }
  changeInd(s, 'comision', score * 2);
  changeInd(s, 'socios', score * 1.5);
  notes.push(`Objetivos de temporada: balance ${score >= 0 ? 'positivo' : 'negativo'} (${s.objectives.filter((o) => o.done).length}/${s.objectives.length} cumplidos).`);
}

function developPlayers(s: GameState, rng: RNG) {
  for (const p of Object.values(s.players)) {
    if (p.retired) continue;
    p.age++;
    const club = p.clubId ? s.clubs[p.clubId] : null;
    const coach = club?.coachId ? s.coaches[club.coachId] : null;
    const train = club ? club.facilities.entrenamiento : 2;
    const play = Math.min(1, p.season.apps / 20);
    let d = 0;
    if (p.age <= 23) d = (p.pot - p.ovr) * (0.18 + play * 0.2 + (train - 3) * 0.03 + (coach ? (coach.youthDev - 50) / 500 : 0)) + rng.normal(0, 1.5);
    else if (p.age <= 28) d = rng.normal(0.3 + play * 0.5, 1.5);
    else if (p.age <= 31) d = rng.normal(-0.8, 1.3);
    else d = rng.normal(-2.4 - (p.age - 32) * 0.6, 1.5);
    p.ovr = clamp(Math.round(p.ovr + d), 30, 96);
    if (p.ovr > p.pot) p.pot = p.ovr;
    if (p.age > 27) p.pot = Math.max(p.ovr, p.pot - 1);
    p.popularity = clamp(Math.round(p.popularity * 0.9 + (p.season.goals * 1.5 + p.season.apps * 0.4)));
    if (p.season.apps > 0) p.history.push(`${s.season}: ${club?.short ?? 'Libre'} — ${p.season.apps} PJ, ${p.season.goals} goles`);
    if (p.history.length > 12) p.history.splice(0, p.history.length - 12);
    p.season = { apps: 0, goals: 0, assists: 0, cards: 0, rating: 0 };
    p.fitness = 100;
    p.injury = Math.max(0, p.injury - 6);
    // retiros
    const retireP = p.age >= 39 ? 1 : p.age >= 36 ? 0.45 : p.age >= 34 ? 0.15 : 0;
    if (rng.chance(retireP) || p.tags?.includes('retiro')) {
      p.retired = true;
      if (p.clubId === s.president.clubId && p.popularity >= 60) addNews(s, `Se retira ${p.name}, un emblema de ${club?.name}`, 'neu', 'jugadores', true);
      p.clubId = null;
      continue;
    }
    // préstamos que vuelven
    if (p.loanFrom && (p.loanUntil ?? 0) <= s.season) {
      p.clubId = p.loanFrom;
      p.loanFrom = null;
    }
    refreshValue(s, p);
  }
  // purgar retirados antiguos para mantener el guardado liviano
  for (const [id, p] of Object.entries(s.players)) if (p.retired && !p.tags?.includes('idolo') && p.age > 41) delete s.players[id];
}

function handleContracts(s: GameState, rng: RNG, notes: string[]) {
  const uid = s.president.clubId;
  for (const p of Object.values(s.players)) {
    if (p.retired || !p.clubId || p.contractEnd > s.season) continue;
    const club = s.clubs[p.clubId];
    if (!club) continue;
    if (club.id === uid && s.president.pos === 'club') {
      p.history.push(`${s.season}: queda libre de ${club.short}`);
      notes.push(`${p.name} terminó su contrato y se fue libre.`);
      p.clubId = null;
      continue;
    }
    if (rng.chance(p.age >= 33 ? 0.4 : 0.7)) {
      p.contractEnd = s.season + rng.int(1, 3);
      p.wage = wageFor(p, club);
    } else {
      p.clubId = null;
      p.history.push(`${s.season}: queda libre de ${club.short}`);
    }
  }
  for (const co of Object.values(s.coaches)) {
    co.age++;
    if (co.age >= 99 || (co.age >= 74 && !co.clubId)) {
      if (co.memory.length === 0 && !co.clubId && !co.nationalTeam) delete s.coaches[co.id];
      continue;
    }
    if (co.clubId && co.contractEnd <= s.season) {
      const club = s.clubs[co.clubId];
      if (club && club.id === uid && s.president.pos === 'club') {
        notes.push(`El contrato de ${co.name} terminó. Debés renovarlo o buscar entrenador.`);
        co.contractEnd = s.season + 1; // prórroga automática de un año a cobrar lo mismo
        co.opinion = clamp(co.opinion - 5, -100, 100);
      } else {
        co.contractEnd = s.season + rng.int(1, 2);
        co.wage = coachWage(co);
      }
    }
    co.wageDemand = coachWage(co);
  }
  for (const ch of Object.values(s.chars)) {
    ch.age++;
    if (ch.age >= 85) ch.active = false;
  }
}

function youthIntake(s: GameState, rng: RNG) {
  for (const c of Object.values(s.clubs)) {
    if (c.country !== 'ARG') continue;
    const n = rng.int(2, 3) + (c.facilities.juveniles >= 4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const base = 38 + c.prestige * 0.22 + c.facilities.juveniles * 2.5;
      const p = makePlayer(s, rng, { nat: 'ARG', pos: rng.pick(['POR', 'DEF', 'DEF', 'MED', 'MED', 'DEL', 'DEL'] as Position[]), ovr: rng.normal(base, 4), age: rng.int(17, 18), club: c, contractYears: 3, youth: true });
      p.pot = clamp(p.ovr + rng.int(5, 18) + c.facilities.juveniles * 2 + (rng.chance(0.04) ? 12 : 0), p.ovr, 95);
      p.popularity = 15;
      refreshValue(s, p);
    }
  }
}

function clubEvolution(s: GameState, rng: RNG, promoted: Set<string>, relegated: Set<string>) {
  for (const c of Object.values(s.clubs)) {
    if (c.division === 0) {
      c.strength = clamp(Math.round((c.strength ?? 70) + rng.normal(0, 1.2)), 60, 93);
      continue;
    }
    const lg = Object.values(s.comps).find((x) => x.type === 'league' && x.scope === 'club' && x.participants.includes(c.id) && x.season === s.season);
    const t = lg ? sortTable(lg.table) : [];
    const pos = t.findIndex((r) => r.id === c.id) + 1;
    const of = t.length || 18;
    const div = lg?.division ?? c.division;
    let dp = 0;
    if (div === 1) dp = pos === 1 ? 3 : pos <= 4 ? 1 : pos > of - 3 ? -1 : 0;
    else dp = pos <= 2 ? 2 : 0;
    if (promoted.has(c.id)) dp += 3;
    if (relegated.has(c.id)) dp -= 5;
    dp += c.titles.filter((x) => x.season === s.season).length * 2;
    c.prestige = clamp(Math.round(c.prestige + dp + rng.normal(0, 0.6)), 25, 96);
    c.members = Math.max(1, Math.round(c.members * (1 + dp * 0.015 + (c.id === s.president.clubId ? (s.ind.socios - 50) / 1500 : 0))));
    c.fanBase = Math.max(5, Math.round(c.fanBase * (1 + dp * 0.01)));
    c.history.push({ season: s.season, division: div, pos, titles: c.titles.filter((x) => x.season === s.season).map((x) => x.comp) });
    if (c.history.length > 30) c.history.shift();
    // IA: presupuesto de fichajes
    if (c.id !== s.president.clubId) c.aiBudget = Math.max(0, Math.round(c.fin.cash * 0.5));
    // las deudas de la IA se reestructuran
    if (c.fin.cash < -estimateRevenue(s, c) * 0.4 && c.id !== s.president.clubId) {
      c.fin.debt += -c.fin.cash * 0.5;
      c.fin.cash *= 0.5;
    }
  }
  for (const n of Object.values(s.nations)) if (n.code !== 'ARG') n.strength = clamp(Math.round(n.strength + rng.normal(0, 1)), 55, 92);
}

/** Cierra la temporada y devuelve el resumen. */
export function endSeason(s: GameState, rng: RNG): SeasonSummary {
  const notes: string[] = [];
  const c = userClub(s);
  const summary: SeasonSummary = { season: s.season, champions: {}, promoted: [], relegated: [], notes };
  // campeones
  for (const comp of Object.values(s.comps)) {
    if (comp.season !== s.season && !comp.persistent) continue;
    if (comp.winner && comp.stage === 'done') summary.champions[comp.name] = teamName(s, comp.winner);
  }
  // goleador
  const top = Object.values(s.players).filter((p) => p.clubId && s.clubs[p.clubId]?.country === 'ARG').sort((a, b) => b.season.goals - a.season.goals)[0];
  if (top) summary.topScorer = `${top.name} (${s.clubs[top.clubId!]?.short}) — ${top.season.goals} goles`;
  // premios por posición
  for (const d of [1, 2, 3]) {
    const lg = leagueOf(s, d);
    if (!lg) continue;
    const t = sortTable(lg.table);
    t.forEach((r, i) => addPrize(s, r.id, leaguePrize(d, i + 1, t.length), 'liga'));
  }
  if (c) {
    const { pos } = positionOf(s, c.id);
    summary.userClub = c.name;
    summary.userPos = pos;
    summary.userDivision = c.division;
    evaluateObjectives(s, notes);
    const titlesThisSeason = c.titles.filter((t) => t.season === s.season).length;
    const expired = seasonEndSponsors(s, titlesThisSeason);
    if (expired.length) notes.push(`Vencieron los contratos de: ${expired.join(', ')}. Buscá nuevos patrocinadores en Finanzas.`);
    const inc = Object.entries(s.ledger).filter(([, v]) => (v ?? 0) > 0).reduce((a, [, v]) => a + (v ?? 0), 0);
    const exp = Object.entries(s.ledger).filter(([, v]) => (v ?? 0) < 0).reduce((a, [, v]) => a + (v ?? 0), 0);
    summary.finances = { income: inc, expense: exp, cashEnd: c.fin.cash, debtEnd: s.loans.reduce((a, l) => a + l.balance, 0) };
  }
  // ascensos y descensos
  const pr = applyPromotionRelegation(s);
  summary.promoted = pr.promoted.map((x) => x.name);
  summary.relegated = pr.relegated.map((x) => x.name);
  if (c) {
    if (pr.promoted.some((x) => x.id === c.id)) {
      s.career.promotions++;
      changeInd(s, 'socios', 10);
      changeInd(s, 'hinchas', 12);
      changeInd(s, 'repNacional', 6);
      s.career.milestones.push({ season: s.season, week: s.week, text: `¡Ascenso con ${c.name}!` });
      addNews(s, `¡ASCENSO! ${c.name} consigue subir de categoría`, 'pos', 'resultados', true);
      notes.push('¡Lograste el ascenso!');
    }
    if (pr.relegated.some((x) => x.id === c.id)) {
      s.career.relegations++;
      s.flags[`relegated_${s.season}`] = true;
      changeInd(s, 'socios', -15);
      changeInd(s, 'hinchas', -15);
      changeInd(s, 'repNacional', -8);
      changeInd(s, 'comision', -10);
      s.career.milestones.push({ season: s.season, week: s.week, text: `Descenso con ${c.name}` });
      s.career.crises++;
      addNews(s, `Drama: ${c.name} perdió la categoría`, 'neg', 'resultados', true);
      notes.push('El club descendió de categoría.');
    }
  }
  const promotedSet = new Set(pr.promoted.map((x) => x.id));
  const relegatedSet = new Set(pr.relegated.map((x) => x.id));
  clubEvolution(s, rng, promotedSet, relegatedSet);
  developPlayers(s, rng);
  handleContracts(s, rng, notes);
  // finanzas
  s.ledgerHistory.push({ season: s.season, data: { ...s.ledger } });
  if (s.ledgerHistory.length > 12) s.ledgerHistory.shift();
  s.ledger = {};
  s.seasons.push(summary);
  s.president.age++;
  if (s.president.health < 100) s.president.health = clamp(s.president.health + 5);
  if (s.economy.emergency && s.economy.emergencyAbs !== undefined && s.economy.emergencyAbs !== null) {
    s.economy.emergency = false;
    notes.push('Finalizó la emergencia económica.');
  }
  s.flags.coachesFiredSeason = 0;
  s.flags.premioPartido = 0;
  s.flags.premioTitulo = false;
  s.flags.huelgaJugadores = false;
  return summary;
}

export function startNewSeason(s: GameState, rng: RNG) {
  s.season++;
  s.week = 1;
  s.fixtures = [];
  for (const id of Object.keys(s.comps)) if (!(id.startsWith('elim_') && Number(id.split('_')[1]) >= s.season)) delete s.comps[id];
  youthIntake(s, rng);
  fillSquads(s, rng);
  setupSeasonCompetitions(s, rng);
  s.objectives = generateObjectives(s);
  s.promises = s.promises.filter((p) => p.kept === null || p.deadlineAbs > (s.season - s.startSeason) * 40 - 120);
  if (s.president.pos === 'club') generateSponsorOffers(s, rng, 3);
  // coach interinos sobrantes
  for (const co of Object.values(s.coaches)) if (co.tags.includes('interino') && !co.clubId) delete s.coaches[co.id];
  // reponer entrenadores libres
  const free = Object.values(s.coaches).filter((c) => !c.clubId && !c.nationalTeam).length;
  for (let i = free; i < 14; i++) makeCoach(s, rng, rng.int(45, 80), null);
  // selección: si no hay seleccionador y no es el usuario, la AAF elige uno
  if (!s.nt.coachId && s.president.pos !== 'asociacion') {
    const best = Object.values(s.coaches).filter((c) => !c.clubId && !c.nationalTeam).sort((a, b) => b.ability - a.ability)[0];
    if (best) {
      best.nationalTeam = 'ARG';
      s.nt.coachId = best.id;
    }
  }
  addNews(s, `Arranca la temporada ${s.season}`, 'neu', 'temporada');
  void book; void money; void squad;
}
