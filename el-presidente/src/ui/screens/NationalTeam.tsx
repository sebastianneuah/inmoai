// Gestión de la selección nacional (presidente de la AAF).
import React, { useState } from 'react';
import { useGame } from '../store';
import { Card, KPI, Empty, NationFlag, POS_LABEL, OpinionChip } from '../components';
import { ntRating, ntCallUps, hireNTCoach, fireNTCoach, ntCandidates, organizeFriendly, setNTBonus, setYouthInvestment, upgradeNTFacilities } from '../../engine/nationalteam';
import { teamName } from '../../engine/queries';
import { money } from '../../engine/util';
import { rngOf } from '../../engine/rng';

export function NationalTeam() {
  const { s, act, push } = useGame();
  const co = s.nt.coachId ? s.coaches[s.nt.coachId] : null;
  const xi = ntCallUps(s);
  const [opp, setOpp] = useState('BRA');
  const next = s.fixtures.filter((f) => !f.played && (f.home === 'ARG' || f.away === 'ARG')).sort((a, b) => a.week - b.week).slice(0, 5);
  return (
    <>
      <div className="page-h"><div className="row"><NationFlag code="ARG" size={40} /><div><h1>Selección Argentina</h1><div className="sub">Objetivo: {s.nt.objective}</div></div></div></div>
      <div className="grid g4 mb">
        <KPI label="Nivel del equipo" value={ntRating(s)} />
        <KPI label="Moral" value={Math.round(s.nt.morale)} />
        <KPI label="Seleccionador" value={co ? co.name : 'Vacante'} sub={co ? `Capacidad ${co.ability}` : 'Contratá uno'} />
        <KPI label="Presupuesto AAF" value={money(s.assoc.budget)} />
      </div>
      <div className="grid g2 stack">
        <Card title="Cuerpo técnico">
          {co ? (
            <div className="list-row wrap"><div className="grow"><b>{co.name}</b><div className="small muted">{co.age} años · {co.personality} · contrato hasta {co.contractEnd} · {money(co.wage)}/mes</div></div><OpinionChip v={co.opinion} /><button className="btn sm danger" onClick={() => push({ type: 'confirm', title: 'Despedir al seleccionador', body: 'Pagarás una indemnización y la prensa analizará la decisión.', ok: 'Despedir', danger: true, onOk: () => act((g) => fireNTCoach(g), { toast: true }) })}>Despedir</button></div>
          ) : <div className="neg small">La selección no tiene entrenador.</div>}
          <div className="tiny muted upper mt">Candidatos disponibles</div>
          {ntCandidates(s).map((c) => <div key={c.id} className="list-row small"><span className="grow">{c.name} <span className="muted">· cap. {c.ability} · exp. {c.experience}</span></span><button className="btn sm" onClick={() => act((g) => hireNTCoach(g, c.id), { toast: true })}>Contratar</button></div>)}
          {ntCandidates(s).length === 0 && <Empty>No hay candidatos libres de jerarquía.</Empty>}
        </Card>
        <Card title="Convocados (once probable)">
          {xi.map((p) => <div key={p.id} className="list-row small"><span className="chip" style={{ minWidth: 44, justifyContent: 'center' }}>{POS_LABEL[p.pos]}</span><span className="grow">{p.name}</span><span className="muted">{s.clubs[p.clubId!]?.short}</span><b>{p.ovr}</b></div>)}
        </Card>
        <Card title="Próximos partidos">
          {next.length === 0 && <Empty>No hay partidos oficiales programados esta temporada.</Empty>}
          {next.map((f) => <div key={f.id} className="list-row small"><span className="chip">S{f.week}</span><span className="grow">{teamName(s, f.home)} vs {teamName(s, f.away)}</span><span className="muted">{s.comps[f.comp]?.short}</span></div>)}
          <div className="tiny muted upper mt">Organizar amistoso</div>
          <div className="row wrap mt-s">
            <select className="input" style={{ maxWidth: 240 }} value={opp} onChange={(e) => setOpp(e.target.value)}>{Object.values(s.nations).filter((n) => n.code !== 'ARG').sort((a, b) => b.strength - a.strength).map((n) => <option key={n.code} value={n.code}>{n.name} ({n.strength})</option>)}</select>
            <button className="btn sm gold" onClick={() => act((g) => organizeFriendly(g, rngOf(g), opp), { toast: true })}>Jugar amistoso</button>
          </div>
        </Card>
        <Card title="Gestión">
          <div className="tiny muted upper">Premios al plantel</div>
          <div className="row wrap mt-s">{[0, 1, 2, 3].map((l) => <button key={l} className={`btn sm ${s.nt.bonus === l ? 'gold' : ''}`} onClick={() => act((g) => setNTBonus(g, l), { toast: true })}>{l === 0 ? 'Sin premios' : `Nivel ${l}`}</button>)}</div>
          <div className="tiny muted upper mt">Inversión en selecciones juveniles</div>
          <div className="row wrap mt-s">{[0, 1, 2, 3].map((l) => <button key={l} className={`btn sm ${s.nt.youthInvest === l ? 'gold' : ''}`} onClick={() => act((g) => setYouthInvestment(g, l), { toast: true })}>{l === 0 ? 'Mínima' : `Nivel ${l}`}</button>)}</div>
          <div className="list-row mt"><div className="grow"><b>Predio de la selección</b><div className="small muted">Nivel {s.nt.facilities}/5 · mejora: {money(4_000_000 * s.nt.facilities)}</div></div><button className="btn sm" disabled={s.nt.facilities >= 5} onClick={() => act((g) => upgradeNTFacilities(g), { toast: true })}>Mejorar</button></div>
          <div className="tiny muted upper mt">Resultados recientes</div>
          {s.nt.results.slice(0, 6).map((r, i) => <div key={i} className="small">{r.season} · {r.comp}: {r.text}</div>)}
        </Card>
      </div>
    </>
  );
}
