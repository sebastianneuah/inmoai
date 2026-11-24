// Mercado de pases: compras, ventas, renovaciones, préstamos, libres y operaciones de la IA.
import type { GameState, Player, Club, ID, Position } from './types';
import type { RNG } from './rng';
import { clamp, money, avg } from './util';
import { squad, userClub, bestXI, staffChar } from './queries';
import { playerValue, wageFor, estimateRevenue } from './valuation';
import { book, hasPerk } from './economy';
import { addNews } from './news';
import { changeInd, changeOpinion, remember } from './relations';
import { isWindowOpen } from './competitions';
import { makePlayer } from './worldgen';

export const MAX_SQUAD = 32;
export const MIN_SQUAD = 18;

export function contractYearsLeft(s: GameState, p: Player) {
  return p.contractEnd - s.season;
}

export function refreshValue(s: GameState, p: Player) {
  p.value = playerValue(p, contractYearsLeft(s, p));
}

/** Precio que pide un club por un jugador. */
export function askingPrice(s: GameState, p: Player, buyer?: Club | null, sellerSquad?: Player[]): number {
  if (!p.clubId) return 0;
  const seller = s.clubs[p.clubId];
  const sq = sellerSquad ?? squad(s, p.clubId);
  const xi = bestXI(sq);
  let f = 1.15;
  if (xi.includes(p)) f += 0.25;
  if (p.listed) f -= 0.3;
  if (p.morale < 40) f -= 0.12;
  if (contractYearsLeft(s, p) <= 0) f -= 0.4;
  if (seller.division === 0) f += 0.35;
  if (seller.fin.cash < 0) f -= 0.15;
  if (buyer && buyer.id === s.president.clubId) {
    const pres = seller.presidentId ? s.chars[seller.presidentId] : null;
    if (pres) f -= pres.opinion / 400;
    if (hasPerk(s, 'market_plus')) f -= 0.1;
    f += (50 - s.ind.representantes) / 300;
    if (seller.rivalId === buyer.id) f += 0.35; // nadie le vende barato al clásico rival
  }
  return Math.max(20_000, Math.round((p.value * clamp(f, 0.55, 2.2)) / 10_000) * 10_000);
}

/** Salario que pretende un jugador para firmar con un club. */
export function wageDemand(s: GameState, p: Player, c: Club): number {
  let w = wageFor(p, c);
  const prestigeGap = (p.ovr - (40 + c.prestige * 0.4)) / 40;
  w *= 1 + clamp(prestigeGap, -0.2, 0.5);
  if (p.clubId && s.clubs[p.clubId]?.division === 0) w *= 1.6; // viene del exterior
  if (s.assoc.rules.topeSalarial) w = Math.min(w, 120_000);
  if (c.id === s.president.clubId) {
    w *= 1 + (50 - s.ind.representantes) / 400;
    // los representantes saben cuándo un club tiene la caja llena
    if (c.fin.cash > estimateRevenue(s, c) * 0.8) w *= 1.15;
  }
  return Math.max(800, Math.round(w / 100) * 100);
}

export interface OfferResult { ok: boolean; msg: string; counter?: number; stage?: 'club' | 'jugador' }

export function canAct(s: GameState): string | null {
  if (s.president.pos !== 'club' || !userClub(s)) return 'Sólo podés operar en el mercado como presidente de un club.';
  if (s.flags.transferBan && Number(s.flags.transferBan) > s.season * 100 + s.week) return 'El club tiene una inhibición para incorporar jugadores.';
  return null;
}

export function buyPlayer(s: GameState, rng: RNG, playerId: ID, fee: number, wage: number, years: number): OfferResult {
  const err = canAct(s);
  if (err) return { ok: false, msg: err };
  const c = userClub(s)!;
  const p = s.players[playerId];
  if (!p || p.retired) return { ok: false, msg: 'Jugador inexistente.' };
  if (p.clubId === c.id) return { ok: false, msg: 'Ya es jugador del club.' };
  if (p.clubId && !isWindowOpen(s.week)) return { ok: false, msg: 'El libro de pases está cerrado. Sólo podés incorporar jugadores libres.' };
  if (squad(s, c.id).length >= MAX_SQUAD) return { ok: false, msg: `El plantel ya tiene ${MAX_SQUAD} jugadores.` };
  if (fee > c.fin.cash + 0.1 && p.clubId) return { ok: false, msg: 'No hay caja suficiente para afrontar el pago.' };
  if (s.economy.wageCap && wage > s.economy.wageCap) return { ok: false, msg: `El salario supera el tope fijado (${money(s.economy.wageCap)}/mes).` };
  if (p.clubId) {
    const ask = askingPrice(s, p, c);
    if (fee < ask * 0.85) {
      const pres = s.clubs[p.clubId].presidentId;
      changeOpinion(s, pres, -2);
      return { ok: false, stage: 'club', counter: ask, msg: `${s.clubs[p.clubId].name} rechaza la oferta. Pretenden ${money(ask)}.` };
    }
    if (fee < ask && !rng.chance((fee - ask * 0.85) / (ask * 0.15))) {
      return { ok: false, stage: 'club', counter: ask, msg: `${s.clubs[p.clubId].name} no acepta. Piden ${money(ask)} para cerrar.` };
    }
  }
  const demand = wageDemand(s, p, c);
  const agent = p.agentId ? s.chars[p.agentId] : null;
  let acceptP = clamp((wage / demand - 0.8) / 0.25, 0, 1);
  if (c.division === 3 && p.ovr > 62) acceptP *= 0.6;
  if (agent) acceptP *= 1 + agent.opinion / 300;
  if (agent && agent.opinion < -50) return { ok: false, stage: 'jugador', msg: `${agent.name}, su representante, se niega a negociar con vos.` };
  if (!rng.chance(acceptP)) return { ok: false, stage: 'jugador', counter: demand, msg: `${p.name} rechaza las condiciones personales. Pretende cerca de ${money(demand)} mensuales.` };
  // Operación cerrada
  const commission = p.clubId ? Math.round(fee * 0.08) : Math.round(demand * 3);
  if (p.clubId) {
    const seller = s.clubs[p.clubId];
    seller.fin.cash += fee;
    book(s, 'fichajes', -fee);
    changeOpinion(s, seller.presidentId, 4, `Le compraste a ${p.name}`);
  }
  book(s, 'comisiones', -commission);
  transferPlayer(s, p, c, years, wage, fee);
  changeOpinion(s, agent?.id, 4, `Fichaje de ${p.name}`);
  addNews(s, `${c.name} incorpora a ${p.name}${fee ? ` por ${money(fee)}` : ' con el pase en su poder'}`, 'pos', 'mercado', true);
  if (fee > 0) s.flags.lastSigningAbs = (s.season - s.startSeason) * 40 + s.week;
  s.flags.lastSigningOvr = p.ovr;
  s.career.signings.push(`${p.name} (${s.season}, ${fee ? money(fee) : 'libre'})`);
  const coach = c.coachId ? s.coaches[c.coachId] : null;
  if (coach && p.ovr >= avg(bestXI(squad(s, c.id)).map((x) => x.ovr))) changeOpinion(s, coach.id, 3);
  return { ok: true, msg: `¡Operación cerrada! ${p.name} firma por ${years} ${years === 1 ? 'temporada' : 'temporadas'} (${money(wage)}/mes). Comisión: ${money(commission)}.` };
}

export function transferPlayer(s: GameState, p: Player, to: Club, years: number, wage: number, fee: number) {
  const from = p.clubId ? s.clubs[p.clubId] : null;
  p.history.push(`${s.season}: ${from ? from.short : 'Libre'} → ${to.short}${fee ? ` (${money(fee)})` : ''}`);
  p.clubId = to.id;
  p.contractEnd = s.season + years;
  p.wage = wage;
  p.listed = false;
  p.loanFrom = null;
  p.signedFee = fee;
  p.signedSeason = s.season;
  p.morale = clamp(p.morale + 10);
  if (!p.career.clubs.includes(to.short)) p.career.clubs.push(to.short);
  refreshValue(s, p);
}

export function sellPlayer(s: GameState, playerId: ID, buyerId: ID, fee: number): string {
  const p = s.players[playerId];
  const c = userClub(s);
  const buyer = s.clubs[buyerId];
  if (!p || !c || !buyer || p.clubId !== c.id) return 'Operación inválida.';
  if (squad(s, c.id).length <= MIN_SQUAD - 2) return 'El plantel quedaría demasiado corto.';
  const years = buyer.division === 0 ? 4 : 3;
  transferPlayer(s, p, buyer, years, Math.round(wageFor(p, buyer)), fee);
  if (buyer.division > 0) buyer.fin.cash -= fee;
  book(s, 'ventas', fee);
  s.career.moneyGenerated += fee;
  // reacciones
  if (p.popularity > 70) {
    changeInd(s, 'hinchas', -4);
    changeInd(s, 'socios', -2);
  }
  if (fee >= p.value * 1.3) changeInd(s, 'estabilidad', 2);
  if (bestXI(squad(s, c.id)).length && p.ovr >= Math.max(...squad(s, c.id).map((x) => x.ovr)) - 3) s.flags.lastStarSaleAbs = (s.season - s.startSeason) * 40 + s.week;
  const coach = c.coachId ? s.coaches[c.coachId] : null;
  if (coach && p.ovr >= avg(bestXI(squad(s, c.id)).map((x) => x.ovr)) + 2) changeOpinion(s, coach.id, -6, `Vendiste a ${p.name} sin su aprobación`);
  addNews(s, `${c.name} vende a ${p.name} a ${buyer.name} por ${money(fee)}`, fee > 5_000_000 ? 'pos' : 'neu', 'mercado', true);
  s.offers = s.offers.filter((o) => o.playerId !== playerId);
  return `${p.name} fue transferido a ${buyer.name} por ${money(fee)}.`;
}

export function renewContract(s: GameState, rng: RNG, playerId: ID, wage: number, years: number): OfferResult {
  const p = s.players[playerId];
  const c = userClub(s);
  if (!p || !c || p.clubId !== c.id) return { ok: false, msg: 'Operación inválida.' };
  if (s.economy.wageCap && wage > s.economy.wageCap) return { ok: false, msg: `El salario supera el tope fijado (${money(s.economy.wageCap)}/mes).` };
  if (s.economy.emergency && wage > p.wage) return { ok: false, msg: 'Con la emergencia económica vigente no se pueden aumentar salarios.' };
  const demand = Math.max(p.wage, wageDemand(s, p, c) * (p.morale < 45 ? 1.15 : 1));
  const agent = p.agentId ? s.chars[p.agentId] : null;
  let pAcc = clamp((wage / demand - 0.85) / 0.2, 0, 1) * (0.7 + p.morale / 200) * (1 + (agent?.opinion ?? 0) / 300);
  if (p.age >= 32) pAcc = Math.min(1, pAcc * 1.3);
  if (!rng.chance(pAcc)) {
    p.morale = clamp(p.morale - 4);
    return { ok: false, counter: Math.round(demand / 100) * 100, msg: `${p.name} no acepta la propuesta. Su entorno pide alrededor de ${money(demand)} mensuales.` };
  }
  p.wage = wage;
  p.contractEnd = s.season + years;
  p.morale = clamp(p.morale + 12);
  refreshValue(s, p);
  changeOpinion(s, agent?.id, 2);
  if (p.popularity > 65) changeInd(s, 'hinchas', 1.5);
  return { ok: true, msg: `${p.name} renovó hasta ${p.contractEnd} por ${money(wage)} mensuales.` };
}

export function releasePlayer(s: GameState, playerId: ID): string {
  const p = s.players[playerId];
  const c = userClub(s);
  if (!p || !c || p.clubId !== c.id) return 'Operación inválida.';
  if (squad(s, c.id).length <= MIN_SQUAD - 2) return 'El plantel quedaría demasiado corto.';
  const years = Math.max(0, contractYearsLeft(s, p));
  const comp = Math.round(p.wage * 12 * years * 0.5);
  book(s, 'indemnizaciones', -comp);
  p.history.push(`${s.season}: rescinde con ${c.short}`);
  p.clubId = null;
  p.contractEnd = s.season;
  changeInd(s, 'jugadores', p.popularity > 60 ? -3 : -1);
  changeOpinion(s, p.agentId, -5, `Rescindiste el contrato de ${p.name}`);
  return `Contrato rescindido. Indemnización: ${money(comp)}.`;
}

export function loanOut(s: GameState, rng: RNG, playerId: ID): string {
  const p = s.players[playerId];
  const c = userClub(s);
  if (!p || !c || p.clubId !== c.id) return 'Operación inválida.';
  if (!isWindowOpen(s.week)) return 'El libro de pases está cerrado.';
  const candidates = Object.values(s.clubs).filter((x) => x.country === 'ARG' && x.id !== c.id && x.division >= c.division && squad(s, x.id).length < MAX_SQUAD);
  const dest = rng.pick(candidates);
  if (!dest) return 'Ningún club se interesó.';
  p.loanFrom = c.id;
  p.loanUntil = s.season;
  p.clubId = dest.id;
  p.history.push(`${s.season}: préstamo a ${dest.short}`);
  addNews(s, `${p.name} es cedido a préstamo a ${dest.name}`, 'neu', 'mercado', true);
  return `${p.name} cedido a ${dest.name} hasta fin de temporada. ${dest.name} se hace cargo del salario.`;
}

export function toggleListed(s: GameState, playerId: ID): string {
  const p = s.players[playerId];
  if (!p) return '';
  p.listed = !p.listed;
  if (p.listed) p.morale = clamp(p.morale - 8);
  return p.listed ? `${p.name} fue declarado transferible.` : `${p.name} ya no es transferible.`;
}

/** Jugadores disponibles en el mercado para el usuario. */
export function marketList(s: GameState, filter: { pos?: Position | ''; maxPrice?: number; scope?: 'todos' | 'libres' | 'arg' | 'ext'; q?: string }): Player[] {
  const c = userClub(s);
  const out: Player[] = [];
  for (const p of Object.values(s.players)) {
    if (p.retired || (c && p.clubId === c.id)) continue;
    if (p.loanFrom) continue;
    if (filter.pos && p.pos !== filter.pos) continue;
    const club = p.clubId ? s.clubs[p.clubId] : null;
    if (filter.scope === 'libres' && club) continue;
    if (filter.scope === 'arg' && (!club || club.country !== 'ARG')) continue;
    if (filter.scope === 'ext' && (!club || club.country === 'ARG')) continue;
    if (filter.q && !p.name.toLowerCase().includes(filter.q.toLowerCase())) continue;
    if (filter.maxPrice && p.value > filter.maxPrice) continue;
    out.push(p);
  }
  return out.sort((a, b) => b.ovr - a.ovr).slice(0, 120);
}

// ---------------------------------------------------------------------------
// IA: clubes que compran, venden, completan planteles y el exterior que se lleva talento.
// ---------------------------------------------------------------------------

function needPosition(sq: Player[]): Position | null {
  const count = { POR: 0, DEF: 0, MED: 0, DEL: 0 } as Record<Position, number>;
  for (const p of sq) count[p.pos]++;
  if (count.POR < 2) return 'POR';
  if (count.DEF < 7) return 'DEF';
  if (count.MED < 7) return 'MED';
  if (count.DEL < 4) return 'DEL';
  return null;
}

export function aiTransfers(s: GameState, rng: RNG) {
  if (!isWindowOpen(s.week)) return;
  const byClub = new Map<string, Player[]>();
  for (const p of Object.values(s.players)) {
    if (p.retired || !p.clubId) continue;
    const arr = byClub.get(p.clubId);
    if (arr) arr.push(p);
    else byClub.set(p.clubId, [p]);
  }
  const free = Object.values(s.players).filter((p) => !p.retired && !p.clubId);
  const argClubs = Object.values(s.clubs).filter((c) => c.country === 'ARG' && c.id !== s.president.clubId);
  for (const c of argClubs) {
    if (!rng.chance(0.18)) continue;
    const sq = byClub.get(c.id) ?? [];
    const budget = Math.max(0, c.fin.cash * 0.5);
    const need = needPosition(sq);
    const xi = bestXI(sq);
    const weakest = need ? null : xi.reduce((a, b) => (a && a.ovr < b.ovr ? a : b), xi[0]);
    const pos = need ?? weakest?.pos;
    if (!pos || sq.length >= MAX_SQUAD - 1) continue;
    const bar = need ? 0 : (weakest?.ovr ?? 0) + 1;
    // candidatos baratos de evaluar primero; el precio sólo se calcula para los mejores
    const pool: Player[] = [...free.filter((p) => p.pos === pos && p.ovr >= bar)];
    for (const [cid, players] of byClub) {
      const sc = s.clubs[cid];
      if (cid === c.id || cid === s.president.clubId || sc.country !== 'ARG' || sc.prestige >= c.prestige) continue;
      for (const p of players) if (p.pos === pos && p.ovr >= bar && !p.loanFrom) pool.push(p);
    }
    pool.sort((a, b) => b.ovr - a.ovr);
    const affordable: Player[] = [];
    for (const p of pool.slice(0, 18)) {
      if (!p.clubId || askingPrice(s, p, null, byClub.get(p.clubId)) <= budget) affordable.push(p);
      if (affordable.length >= 6) break;
    }
    const t = rng.pick(affordable);
    if (!t) continue;
    const fromId = t.clubId;
    const fee = fromId ? askingPrice(s, t, null, byClub.get(fromId)) : 0;
    if (fromId) s.clubs[fromId].fin.cash += fee;
    c.fin.cash -= fee;
    transferPlayer(s, t, c, rng.int(1, 3), wageFor(t, c), fee);
    if (fromId) byClub.set(fromId, (byClub.get(fromId) ?? []).filter((x) => x !== t));
    else free.splice(free.indexOf(t), 1);
    sq.push(t);
    byClub.set(c.id, sq);
    if (fee > 1_500_000) addNews(s, `${c.name} se refuerza con ${t.name} (${money(fee)})`, 'neu', 'mercado');
  }
  // El exterior compra estrellas argentinas
  if (rng.chance(0.35)) {
    const stars = Object.values(s.players).filter((p) => p.clubId && s.clubs[p.clubId]?.country === 'ARG' && p.clubId !== s.president.clubId && !p.loanFrom && (p.ovr >= 74 || (p.age <= 21 && p.pot >= 82)));
    const p = rng.pick(stars);
    if (p) {
      const buyers = Object.values(s.clubs).filter((c) => c.division === 0 && (c.strength ?? 70) >= p.ovr - 2);
      const b = rng.pick(buyers);
      if (b) {
        const from = s.clubs[p.clubId!];
        const fee = Math.round((p.value * rng.float(1.1, 1.6)) / 10_000) * 10_000;
        from.fin.cash += fee;
        transferPlayer(s, p, b, 4, wageFor(p, b), fee);
        addNews(s, `${from.name} vende a ${p.name} a ${b.name} (${s.clubs[b.id].country}) por ${money(fee)}`, 'neu', 'mercado');
        // reemplazo de la plantilla vendida en el club extranjero: el que sobre se retira del cupo
        const fsq = squad(s, b.id);
        if (fsq.length > 24) {
          const worst = fsq.sort((a, c2) => a.ovr - c2.ovr)[0];
          worst.clubId = null;
        }
      }
    }
  }
  // Clubes en crisis venden; planteles cortos se completan con libres o juveniles
  for (const c of argClubs) {
    const sq = squad(s, c.id);
    if (c.fin.cash < -estimateRevenue(s, c) * 0.1 && sq.length > 20 && rng.chance(0.25)) {
      const top = sq.sort((a, b) => b.value - a.value)[0];
      const buyer = Object.values(s.clubs).filter((x) => x.country === 'ARG' && x.id !== c.id && x.id !== s.president.clubId && x.prestige > c.prestige && x.fin.cash > top.value).sort(() => rng.next() - 0.5)[0];
      if (buyer) {
        const fee = Math.round(top.value * 0.85);
        buyer.fin.cash -= fee;
        c.fin.cash += fee;
        transferPlayer(s, top, buyer, 3, wageFor(top, buyer), fee);
        addNews(s, `Crisis en ${c.name}: vende a ${top.name} a ${buyer.name}`, 'neg', 'mercado');
      }
    }
  }
}

export function fillSquads(s: GameState, rng: RNG) {
  for (const c of Object.values(s.clubs)) {
    if (c.id === s.president.clubId && s.president.pos === 'club') continue;
    let sq = squad(s, c.id);
    let guard = 0;
    while (sq.length < MIN_SQUAD + (c.division === 0 ? 2 : 4) && guard++ < 12) {
      const need = needPosition(sq) ?? rng.pick(['DEF', 'MED', 'DEL'] as Position[]);
      const free = Object.values(s.players).filter((p) => !p.clubId && !p.retired && p.pos === need && p.age < 34).sort((a, b) => b.ovr - a.ovr);
      const lvl = c.division === 0 ? (c.strength ?? 70) - 6 : 40 + c.prestige * 0.36 - 6;
      const pick = free.find((p) => p.ovr <= lvl + 4);
      if (pick && c.division > 0) transferPlayer(s, pick, c, rng.int(1, 2), wageFor(pick, c), 0);
      else makePlayer(s, rng, { nat: c.country === 'ARG' ? 'ARG' : c.country, pos: need, ovr: rng.normal(lvl, 4), age: rng.int(18, 30), club: c });
      sq = squad(s, c.id);
    }
    if (sq.length > MAX_SQUAD) {
      const extra = sq.sort((a, b) => a.ovr - b.ovr).slice(0, sq.length - MAX_SQUAD);
      for (const p of extra) {
        p.clubId = null;
        p.history.push(`${s.season}: queda libre de ${c.short}`);
      }
    }
  }
  // regenerar mercado de libres
  const free = Object.values(s.players).filter((p) => !p.clubId && !p.retired);
  if (free.length < 40) for (let i = 0; i < 40 - free.length; i++) makePlayer(s, rng, { nat: rng.chance(0.75) ? 'ARG' : rng.pick(['URU', 'PAR', 'COL', 'CHI']), pos: rng.pick(['POR', 'DEF', 'DEF', 'MED', 'MED', 'DEL'] as Position[]), ovr: rng.normal(56, 8), age: rng.int(19, 33), club: null, contractYears: 0 });
}

/** El director deportivo opera cuando el usuario delega el mercado. */
export function delegatedMarket(s: GameState, rng: RNG): string | null {
  const c = userClub(s);
  if (!c || !s.settings.delegate.mercado || !isWindowOpen(s.week) || !rng.chance(0.3)) return null;
  const sq = squad(s, c.id);
  const dd = staffChar(s, 'director_deportivo');
  const need = needPosition(sq);
  const xi = bestXI(sq);
  const weakest = need ? null : xi.reduce((a, b) => (a.ovr < b.ovr ? a : b), xi[0]);
  const pos = need ?? weakest?.pos;
  if (!pos || sq.length >= MAX_SQUAD - 2) return null;
  const budget = Math.min(s.economy.transferBudget, c.fin.cash * 0.8);
  const targets = Object.values(s.players).filter((p) => !p.retired && p.pos === pos && p.clubId !== c.id && !p.loanFrom && p.ovr > (weakest?.ovr ?? 0) && (p.clubId ? s.clubs[p.clubId].country === 'ARG' || s.clubs[p.clubId].division === 0 : true) && (p.clubId ? askingPrice(s, p, c) <= budget : true) && wageDemand(s, p, c) <= (s.economy.wageCap || Infinity));
  const t = targets.sort((a, b) => b.ovr - a.ovr)[rng.int(0, Math.min(3, Math.max(0, targets.length - 1)))];
  if (!t) return null;
  const fee = t.clubId ? askingPrice(s, t, c) : 0;
  const res = buyPlayer(s, rng, t.id, fee, Math.round(wageDemand(s, t, c) * 1.05), rng.int(2, 3));
  if (res.ok) {
    s.economy.transferBudget = Math.max(0, s.economy.transferBudget - fee);
    if (dd) remember(s, dd, `Fichó a ${t.name} por delegación`, 2);
    return `El director deportivo ${dd?.name ?? ''} cerró la llegada de ${t.name} (${fee ? money(fee) : 'libre'}).`;
  }
  return null;
}

/** Sondeo de compradores para un jugador del club del usuario. */
export function findBuyers(s: GameState, rng: RNG, playerId: ID): { ok: boolean; msg: string } {
  const p = s.players[playerId];
  const c = userClub(s);
  if (!p || !c || p.clubId !== c.id) return { ok: false, msg: 'Operación inválida.' };
  if (!isWindowOpen(s.week)) return { ok: false, msg: 'El libro de pases está cerrado.' };
  const key = `buyers_${p.id}`;
  const abs = (s.season - s.startSeason) * 40 + s.week;
  if (Number(s.flags[key] ?? -99) > abs - 3) return { ok: false, msg: 'Ya sondeaste el mercado por este jugador hace poco.' };
  s.flags[key] = abs;
  s.offers = s.offers.filter((o) => o.playerId !== p.id);
  const pool = Object.values(s.clubs).filter((x) => x.id !== c.id && ((x.division === 0 && (x.strength ?? 70) >= p.ovr - 3) || (x.country === 'ARG' && x.prestige >= c.prestige - 10 && x.fin.cash > p.value * 0.6)));
  const n = p.ovr >= 70 || p.pot >= 80 ? rng.int(1, 3) : rng.int(0, 2);
  const buyers = rng.shuffle([...pool]).slice(0, n);
  for (const b of buyers) {
    const f = b.division === 0 ? rng.float(0.95, 1.45) : rng.float(0.7, 1.15);
    const amount = Math.round((p.value * f * (p.listed ? 0.9 : 1)) / 10_000) * 10_000;
    s.offers.push({ id: `of_${p.id}_${b.id}`, playerId: p.id, fromClub: b.id, amount, expiresAbs: abs + 2, kind: 'compra' });
  }
  return { ok: true, msg: buyers.length ? `Llegaron ${buyers.length} ${buyers.length === 1 ? 'oferta' : 'ofertas'} por ${p.name}.` : `Nadie ofertó por ${p.name} por ahora.` };
}

export function acceptOffer(s: GameState, offerId: string): string {
  const o = s.offers.find((x) => x.id === offerId);
  if (!o) return 'La oferta ya no está vigente.';
  const abs = (s.season - s.startSeason) * 40 + s.week;
  if (o.expiresAbs < abs) {
    s.offers = s.offers.filter((x) => x.id !== offerId);
    return 'La oferta venció.';
  }
  return sellPlayer(s, o.playerId, o.fromClub, o.amount);
}
