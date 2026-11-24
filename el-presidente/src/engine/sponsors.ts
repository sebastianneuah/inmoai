// Patrocinadores: ofertas, negociación, contratos, bonificaciones y abandonos.
import type { GameState, SponsorSlot, SponsorOffer, SponsorCompany } from './types';
import type { RNG } from './rng';
import { clamp, money, newId, absWeek } from './util';
import { userClub } from './queries';
import { sponsorPotential } from './valuation';
import { book, hasPerk } from './economy';
import { changeInd } from './relations';
import { addNews } from './news';

export const SLOT_INFO: Record<SponsorSlot, { name: string; share: number; minDiv: number }> = {
  principal: { name: 'Patrocinador principal', share: 0.42, minDiv: 3 },
  indumentaria: { name: 'Indumentaria deportiva', share: 0.25, minDiv: 3 },
  estadio: { name: 'Publicidad en el estadio', share: 0.1, minDiv: 3 },
  naming: { name: 'Nombre comercial del estadio', share: 0.14, minDiv: 2 },
  regional: { name: 'Acuerdo regional', share: 0.06, minDiv: 3 },
  internacional: { name: 'Acuerdo internacional', share: 0.12, minDiv: 1 },
};

const INDUMENTARIA = ['Indumentaria'];

export function generateSponsorOffers(s: GameState, rng: RNG, count = 3) {
  const c = userClub(s);
  if (!c) return;
  const now = absWeek(s);
  const taken = new Set(s.sponsors.map((x) => x.slot));
  const slots = (Object.keys(SLOT_INFO) as SponsorSlot[]).filter((sl) => !taken.has(sl) && c.division <= SLOT_INFO[sl].minDiv && !s.sponsorOffers.some((o) => o.slot === sl));
  if (!slots.length) return;
  const potential = sponsorPotential(c) * (0.7 + s.ind.patrocinadores / 160) * (0.8 + s.ind.repNacional / 250);
  for (let i = 0; i < count && slots.length; i++) {
    const slot = rng.pick(slots);
    const pool = Object.values(s.companies).filter((co) => (slot === 'indumentaria' ? INDUMENTARIA.includes(co.sector) : !INDUMENTARIA.includes(co.sector)) && !s.sponsors.some((x) => x.companyId === co.id) && !s.sponsorOffers.some((o) => o.companyId === co.id));
    const eligible = pool.filter((co) => (co.capacity > 80 ? c.prestige > 60 || (slot === 'internacional' && s.ind.repInternacional > 40) : true) && (co.sensitivity < 70 || s.ind.integridad > 45));
    const co = rng.weighted(eligible, (x) => 1 + x.capacity / 30);
    if (!co) continue;
    let annual = potential * SLOT_INFO[slot].share * (0.6 + co.capacity / 100) * (1 + co.controversy / 200) * rng.float(0.85, 1.15);
    if (hasPerk(s, 'sponsor_plus')) annual *= 1.15;
    const offer: SponsorOffer = { id: newId(s, 'so'), companyId: co.id, slot, annual: Math.round(annual / 10_000) * 10_000, years: rng.int(1, 4), bonus: Math.round((annual * rng.float(0.1, 0.3)) / 10_000) * 10_000, penalty: Math.round((annual * rng.float(0.2, 0.5)) / 10_000) * 10_000, expires: now + rng.int(4, 8) };
    s.sponsorOffers.push(offer);
  }
}

/** Contratos heredados al asumir: principal e indumentaria. */
export function initialSponsors(s: GameState, rng: RNG) {
  const c = userClub(s);
  if (!c) return;
  const pot = sponsorPotential(c);
  for (const slot of ['principal', 'indumentaria', 'estadio'] as SponsorSlot[]) {
    if (s.sponsors.some((x) => x.slot === slot)) continue;
    const pool = Object.values(s.companies).filter((co) => (slot === 'indumentaria' ? INDUMENTARIA.includes(co.sector) : !INDUMENTARIA.includes(co.sector)) && co.controversy < 50 && !s.sponsors.some((x) => x.companyId === co.id) && (co.capacity <= 60 + c.prestige * 0.4));
    const co = rng.pick(pool);
    if (!co) continue;
    const annual = Math.round((pot * SLOT_INFO[slot].share * rng.float(0.85, 1.05)) / 10_000) * 10_000;
    s.sponsors.push({ id: newId(s, 'sc'), companyId: co.id, slot, annual, until: s.season + rng.int(0, 1), bonus: Math.round(annual * 0.15), penalty: Math.round(annual * 0.3), signedSeason: s.season - 1 });
  }
}

export function acceptSponsor(s: GameState, offerId: string): string {
  const o = s.sponsorOffers.find((x) => x.id === offerId);
  const c = userClub(s);
  if (!o || !c) return 'La oferta ya no está disponible.';
  if (s.sponsors.some((x) => x.slot === o.slot)) return 'Ese espacio ya está ocupado.';
  const co = s.companies[o.companyId];
  s.sponsors.push({ id: newId(s, 'sc'), companyId: o.companyId, slot: o.slot, annual: o.annual, until: s.season + o.years - 1, bonus: o.bonus, penalty: o.penalty, signedSeason: s.season });
  s.sponsorOffers = s.sponsorOffers.filter((x) => x.id !== offerId);
  changeInd(s, 'patrocinadores', 3);
  changeInd(s, 'estabilidad', 2);
  if (co.controversy >= 50) {
    changeInd(s, 'socios', -co.controversy / 12);
    changeInd(s, 'integridad', -co.controversy / 20);
    changeInd(s, 'periodistas', -2);
  }
  if (co.reputation >= 75) {
    changeInd(s, 'repNacional', 2);
    changeInd(s, 'integridad', 1);
  }
  if (o.slot === 'naming') changeInd(s, 'hinchas', -4);
  addNews(s, `${co.name} es el nuevo ${SLOT_INFO[o.slot].name.toLowerCase()} de ${c.name}`, co.controversy >= 50 ? 'neu' : 'pos', 'patrocinio', true);
  return `Contrato firmado con ${co.name}: ${money(o.annual)} anuales hasta ${s.season + o.years - 1}.${co.controversy >= 50 ? ' Parte de los socios rechaza el acuerdo.' : ''}`;
}

export function negotiateSponsor(s: GameState, rng: RNG, offerId: string): string {
  const o = s.sponsorOffers.find((x) => x.id === offerId);
  if (!o) return 'La oferta ya no está disponible.';
  if (o.negotiated) return 'Ya negociaste esta oferta: es la propuesta final.';
  const co = s.companies[o.companyId];
  o.negotiated = true;
  const p = 0.35 + s.ind.patrocinadores / 250 + (hasPerk(s, 'sponsor_plus') ? 0.15 : 0);
  if (rng.chance(p)) {
    const inc = rng.float(0.08, 0.22);
    o.annual = Math.round((o.annual * (1 + inc)) / 10_000) * 10_000;
    return `${co.name} mejora su propuesta: ahora ofrece ${money(o.annual)} anuales.`;
  }
  if (rng.chance(0.35)) {
    s.sponsorOffers = s.sponsorOffers.filter((x) => x.id !== offerId);
    changeInd(s, 'patrocinadores', -2);
    return `${co.name} se ofende por la contraoferta y retira su propuesta.`;
  }
  return `${co.name} mantiene su oferta original. Es tomarla o dejarla.`;
}

export function rejectSponsor(s: GameState, offerId: string): string {
  const o = s.sponsorOffers.find((x) => x.id === offerId);
  if (!o) return '';
  s.sponsorOffers = s.sponsorOffers.filter((x) => x.id !== offerId);
  const co = s.companies[o.companyId];
  if (co.controversy >= 50) changeInd(s, 'integridad', 1.5);
  return `Rechazaste la propuesta de ${co.name}.`;
}

export function terminateSponsor(s: GameState, contractId: string): string {
  const sc = s.sponsors.find((x) => x.id === contractId);
  if (!sc) return '';
  const co = s.companies[sc.companyId];
  book(s, 'multas', -sc.penalty);
  s.sponsors = s.sponsors.filter((x) => x.id !== contractId);
  changeInd(s, 'patrocinadores', -4);
  if (co.controversy >= 50) {
    changeInd(s, 'socios', 3);
    changeInd(s, 'integridad', 3);
  }
  return `Rescindiste el contrato con ${co.name}. Pagaste una penalidad de ${money(sc.penalty)}.`;
}

/** Evaluación semanal: los patrocinadores pueden abandonar ante crisis. */
export function weeklySponsors(s: GameState, rng: RNG) {
  const c = userClub(s);
  if (!c) return;
  const now = absWeek(s);
  s.sponsorOffers = s.sponsorOffers.filter((o) => o.expires > now);
  for (const sc of [...s.sponsors]) {
    const co = s.companies[sc.companyId];
    const crisis = (s.ind.patrocinadores < 30 ? 0.02 : 0) + (s.ind.integridad < 30 ? co.sensitivity / 3000 : 0) + (s.ind.estabilidad < 20 ? 0.01 : 0) + (s.ind.prestigio < 25 ? 0.008 : 0);
    if (crisis > 0 && rng.chance(crisis)) {
      s.sponsors = s.sponsors.filter((x) => x.id !== sc.id);
      book(s, 'patrocinio', sc.penalty * 0.5); // cobra parte de la penalidad
      changeInd(s, 'estabilidad', -3);
      changeInd(s, 'patrocinadores', -3);
      addNews(s, `${co.name} abandona a ${c.name}: "La imagen institucional no está a la altura"`, 'neg', 'patrocinio', true);
      s.flags.sponsorLeftAbs = now;
    }
  }
  if (s.week === 1 || (s.week % 6 === 0 && rng.chance(0.5))) generateSponsorOffers(s, rng, s.week === 1 ? 3 : 1);
}

export function seasonEndSponsors(s: GameState, titles: number) {
  for (const sc of s.sponsors) if (titles > 0) book(s, 'patrocinio', sc.bonus * titles);
  const expired = s.sponsors.filter((x) => x.until <= s.season);
  s.sponsors = s.sponsors.filter((x) => x.until > s.season);
  return expired.map((x) => s.companies[x.companyId]?.name).filter(Boolean) as string[];
}

export function companyLabel(co: SponsorCompany) {
  return `${co.name} · ${co.sector}`;
}

export function controversyText(co: SponsorCompany) {
  if (co.controversy >= 70) return 'Muy polémico';
  if (co.controversy >= 40) return 'Polémico';
  if (co.reputation >= 75) return 'Mejora la imagen';
  return 'Neutral';
}
void clamp;
