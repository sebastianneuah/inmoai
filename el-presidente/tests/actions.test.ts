// Acciones presidenciales del checklist de la primera versión.
import { describe, it, expect } from 'vitest';
import { newGame, advanceWeek } from '../src/engine/game';
import { rngOf } from '../src/engine/rng';
import { userClub, squad } from '../src/engine/queries';
import { buyPlayer, askingPrice, wageDemand, findBuyers, acceptOffer, renewContract } from '../src/engine/market';
import { freeCoaches, fireCoach, hireCoach, coachAskFor } from '../src/engine/coaches';
import { acceptSponsor, generateSponsorOffers } from '../src/engine/sponsors';
import { takeLoan, loanOffer, startProject } from '../src/engine/economy';
import { meetLeader } from '../src/engine/politics';
import { charsByRole } from '../src/engine/queries';

const mk = () => newGame({ name: 'Carla', surname: 'Gestión', nationality: 'ARG', age: 44, country: 'ARG', clubId: 'cl_cue', difficulty: 'facil', personality: 'millonario', mandateYears: 3, mode: 'normal', seed: 4040 });

describe('Acciones', () => {
  it('compra un jugador de otro club con negociación', () => {
    const s = mk();
    const rng = rngOf(s);
    const c = userClub(s)!;
    c.fin.cash = 50_000_000;
    const target = Object.values(s.players).filter((p) => p.clubId && s.clubs[p.clubId].country === 'ARG' && p.clubId !== c.id && s.clubs[p.clubId].division === 2).sort((a, b) => b.ovr - a.ovr)[0];
    const before = squad(s, c.id).length;
    let r = buyPlayer(s, rng, target.id, Math.round(askingPrice(s, target, c) * 1.05), Math.round(wageDemand(s, target, c) * 1.3), 3);
    for (let i = 0; i < 5 && !r.ok; i++) r = buyPlayer(s, rng, target.id, Math.round((r.counter ?? askingPrice(s, target, c)) * 1.1), Math.round(wageDemand(s, target, c) * 1.5), 3);
    expect(r.ok).toBe(true);
    expect(target.clubId).toBe(c.id);
    expect(squad(s, c.id).length).toBe(before + 1);
  });

  it('vende un jugador recibiendo ofertas', () => {
    const s = mk();
    const rng = rngOf(s);
    const c = userClub(s)!;
    const star = squad(s, c.id).sort((a, b) => b.ovr - a.ovr)[0];
    let got = false;
    for (let i = 0; i < 8 && !got; i++) {
      s.flags[`buyers_${star.id}`] = -99;
      findBuyers(s, rng, star.id);
      const o = s.offers.find((x) => x.playerId === star.id);
      if (o) {
        const cash0 = c.fin.cash;
        acceptOffer(s, o.id);
        expect(star.clubId).not.toBe(c.id);
        expect(c.fin.cash).toBeGreaterThan(cash0);
        got = true;
      }
    }
    expect(got).toBe(true);
  });

  it('renueva, despide y contrata entrenadores', () => {
    const s = mk();
    const rng = rngOf(s);
    const c = userClub(s)!;
    const p = squad(s, c.id)[3];
    let r = renewContract(s, rng, p.id, Math.round(wageDemand(s, p, c) * 1.4), 3);
    for (let i = 0; i < 4 && !r.ok; i++) r = renewContract(s, rng, p.id, Math.round((r.counter ?? p.wage) * 1.3), 3);
    expect(r.ok).toBe(true);
    const old = c.coachId;
    fireCoach(s, rng);
    expect(c.coachId).not.toBe(old);
    expect(s.coaches[c.coachId!].tags).toContain('interino');
    const cand = freeCoaches(s).find((x) => x.ability < 80)!;
    let h = hireCoach(s, cand.id, Math.round(coachAskFor(s, cand, c) * 1.3), 2, rng);
    for (let i = 0; i < 3 && !h.ok; i++) h = hireCoach(s, cand.id, Math.round(coachAskFor(s, cand, c) * 1.6), 2, rng);
    expect(h.ok).toBe(true);
    expect(c.coachId).toBe(cand.id);
  });

  it('firma patrocinadores, toma préstamos, inicia obras y hace política', () => {
    const s = mk();
    const rng = rngOf(s);
    const c = userClub(s)!;
    s.sponsors = s.sponsors.filter((x) => x.slot !== 'regional');
    s.sponsorOffers = [];
    generateSponsorOffers(s, rng, 4);
    const o = s.sponsorOffers[0];
    expect(o).toBeTruthy();
    acceptSponsor(s, o.id);
    expect(s.sponsors.some((x) => x.companyId === o.companyId)).toBe(true);
    const off = loanOffer(s)!;
    const nLoans = s.loans.length;
    if (off.max > 0) {
      takeLoan(s, Math.min(off.max, 500_000));
      expect(s.loans.length).toBe(nLoans + 1);
    }
    c.fin.cash += 5_000_000;
    expect(startProject(s, 'tienda', false)).toContain('Obra iniciada');
    for (let i = 0; i < 12; i++) advanceWeek(s), (s.inbox = []);
    expect(c.facilities.tienda).toBeGreaterThanOrEqual(2);
    const pres = charsByRole(s, 'presidente_club').find((x) => x.clubId !== c.id)!;
    const op0 = pres.opinion;
    s.president.politicalCapital = 5;
    meetLeader(s, rng, pres.id, 'reunion');
    expect(pres.opinion).toBeGreaterThan(op0);
  });
});
