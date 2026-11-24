// Ventanas modales: decisiones, consecuencias, partidos, fin de temporada, jugadores, etc.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame, type ModalState } from '../store';
import { Modal, Icon, Crest, Money, Bar, OpinionChip, NationFlag, POS_LABEL, Toggle } from '../components';
import { EVENTS, CAT_LABEL, baseCtx, optionAvailable, resolveEvent, type Cat, type ResolveResult } from '../../engine/events';
import { rngOf } from '../../engine/rng';
import { IND_INFO, opinionLabel } from '../../engine/relations';
import { absWeek, money } from '../../engine/util';
import { teamName, userClub, positionOf, squad, bestXI } from '../../engine/queries';
import type { IndKey, Player } from '../../engine/types';
import { askingPrice, wageDemand, buyPlayer, renewContract, toggleListed, loanOut, releasePlayer, findBuyers, acceptOffer, contractYearsLeft } from '../../engine/market';
import { isWindowOpen } from '../../engine/competitions';
import { hireCoach, coachAskFor, willCoachJoin } from '../../engine/coaches';
import { exportSave, historyEntry, repo } from '../../engine/save';
import { computeLegacy } from '../../engine/legacy';
import { SettingsPanel } from './Menu';
import { useNav } from './GameShell';

export function ModalHost() {
  const { modals } = useGame();
  const m = modals[modals.length - 1];
  if (!m) return null;
  return <ModalSwitch key={modals.length + m.type} m={m} />;
}

function ModalSwitch({ m }: { m: ModalState }) {
  switch (m.type) {
    case 'decision': return <DecisionModal uid={m.uid} />;
    case 'outcome': return <OutcomeModal res={m.res} nextUid={m.nextUid} />;
    case 'match': return <MatchModal fixtureId={m.fixtureId} live={m.live} />;
    case 'season': return <SeasonModal summary={m.summary} />;
    case 'player': return <PlayerModal id={m.id} />;
    case 'buy': return <BuyModal id={m.id} />;
    case 'coach': return <CoachModal id={m.id} />;
    case 'confirm': return <ConfirmModal {...m} />;
    case 'info': return <InfoModal title={m.title} body={m.body} />;
    case 'gamemenu': return <GameMenuModal />;
    case 'more': return <MoreModal />;
    case 'report': return <ReportModal notes={m.notes} title={m.title} />;
    case 'bio': return <BioModal />;
  }
}

// ------------------------------------------------------------------ decisiones
function DecisionModal({ uid }: { uid: string }) {
  const { s, act, replace, pop } = useGame();
  const pe = s.inbox.find((e) => e.uid === uid);
  const def = pe ? EVENTS[pe.defId] : null;
  const ctx = useMemo(() => (pe ? baseCtx(s, rngOf(s), pe.b) : null), [pe, s]);
  if (!pe || !def || !ctx) {
    return <Modal title="Decisión no disponible" onClose={pop}><p className="muted">Este acontecimiento ya fue resuelto.</p></Modal>;
  }
  const left = pe.expiresAbs - absWeek(s);
  const choose = (i: number) => {
    const res = act((g) => resolveEvent(g, uid, i));
    if (!res) return pop();
    const next = s.inbox.find((e) => e.urgency === 'urgente') ?? s.inbox[0];
    replace({ type: 'outcome', res, nextUid: next?.uid ?? null });
  };
  const ch = ctx.char;
  const co = ctx.coach;
  const pl = ctx.player;
  const other = ctx.other;
  return (
    <Modal
      onClose={pe.urgency === 'urgente' ? undefined : pop}
      closable={pe.urgency !== 'urgente'}
      title={<span className="serif" style={{ fontSize: 22 }}>{pe.title}</span>}
      sub={<span className="row wrap gap-s"><span className={`chip ${pe.urgency === 'urgente' ? 'red' : pe.urgency === 'importante' ? 'amber' : 'blue'}`}>{pe.urgency.toUpperCase()}</span><span className="chip">{CAT_LABEL[def.cat as Cat]}</span><span className="chip">Gravedad {pe.severity}/5</span><span className="chip">{pe.urgency === 'urgente' ? 'Respuesta inmediata' : left <= 0 ? 'Vence esta semana' : `Tiempo: ${left} ${left === 1 ? 'semana' : 'semanas'}`}</span></span>}
    >
      <p style={{ lineHeight: 1.6, fontSize: 15 }}>{pe.text}</p>
      {(ch || co || pl || other) && (
        <div className="grid g2 stack mt" style={{ gap: 8 }}>
          {ch && (
            <div className="kpi">
              <div className="label">Personaje involucrado</div>
              <div style={{ fontWeight: 700 }} className="ellipsis">{ch.name}</div>
              <div className="small muted ellipsis">{ch.title}</div>
              <div className="row mt-s gap-s"><OpinionChip v={ch.opinion} /><span className="small muted">{opinionLabel(ch.opinion)} · {ch.personality}</span></div>
              {ch.memory.length > 0 && <div className="tiny muted mt-s ellipsis">Recuerda: “{ch.memory[ch.memory.length - 1].t}”</div>}
            </div>
          )}
          {co && (
            <div className="kpi">
              <div className="label">Entrenador</div>
              <div style={{ fontWeight: 700 }}>{co.name}</div>
              <div className="small muted">Capacidad {co.ability} · Liderazgo {co.leadership}</div>
              <div className="row mt-s gap-s"><OpinionChip v={co.opinion} /><span className="small muted">{opinionLabel(co.opinion)}</span></div>
            </div>
          )}
          {pl && (
            <div className="kpi">
              <div className="label">Jugador</div>
              <div style={{ fontWeight: 700 }}>{pl.name}</div>
              <div className="small muted">{POS_LABEL[pl.pos]} · {pl.age} años · Nivel {pl.ovr} (pot. {pl.pot})</div>
              <div className="small muted">Valor {money(pl.value)} · Sueldo {money(pl.wage)}/mes · Moral {Math.round(pl.morale)}</div>
            </div>
          )}
          {other && (
            <div className="kpi">
              <div className="label">Club</div>
              <div className="row gap-s"><Crest club={other} size={26} /><b className="ellipsis">{other.name}</b></div>
              <div className="small muted">{other.city}{other.division === 0 ? ' · Exterior' : ''}</div>
            </div>
          )}
        </div>
      )}
      {pe.b.amount ? <div className="small muted mt">Monto en juego: <b className="gold">{money(pe.b.amount)}</b> · Caja disponible: <Money v={ctx.cash} /></div> : null}
      <div className="col mt" style={{ gap: 8 }}>
        {def.opts.map((o, i) => {
          const ok = optionAvailable(ctx, o);
          return (
            <button key={i} className="decision-opt" disabled={!ok} onClick={() => choose(i)}>
              <span className="letter">{'ABCDE'[i]}</span>
              <span className="grow">
                <span style={{ fontWeight: 650 }}>{o.label.replace(/\{(\w+)\}/g, (_, k) => (k === 'char' ? ch?.name ?? '' : k === 'player' ? pl?.name ?? '' : k === 'coach' ? co?.name ?? '' : `{${k}}`))}</span>
                {o.detail && <span className="small muted" style={{ display: 'block' }}>{o.detail}</span>}
                {!ok && <span className="small neg" style={{ display: 'block' }}>{o.reqText ?? 'No disponible'}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function OutcomeModal({ res, nextUid }: { res: ResolveResult; nextUid?: string | null }) {
  const { s, replace, pop } = useGame();
  const next = nextUid && s.inbox.find((e) => e.uid === nextUid);
  const deltas = Object.entries(res.deltas) as [IndKey, number][];
  return (
    <Modal title={res.title} sub={<>Elegiste: <b className="gold">{res.choice}</b></>} onClose={pop} footer={
      <>
        {next ? <button className="btn gold" onClick={() => replace({ type: 'decision', uid: next.uid })}>Siguiente decisión ({s.inbox.length}) <Icon name="right" size={18} /></button> : null}
        <button className="btn" onClick={pop}>Continuar</button>
      </>
    }>
      <p style={{ lineHeight: 1.6 }}>{res.outcome}</p>
      {(deltas.length > 0 || res.cash || res.wealth) && (
        <>
          <div className="tiny muted upper mt">Consecuencias visibles</div>
          <div className="row wrap mt-s gap-s">
            {res.cash ? <span className="delta-chip">Caja <Money v={res.cash} sign /></span> : null}
            {res.wealth ? <span className="delta-chip">Patrimonio personal <Money v={res.wealth} sign /></span> : null}
            {deltas.map(([k, d]) => {
              const good = IND_INFO[k].inverse ? d < 0 : d > 0;
              return <span key={k} className="delta-chip">{IND_INFO[k].short} <b className={good ? 'pos' : 'neg'}>{d > 0 ? '+' : ''}{d}</b></span>;
            })}
          </div>
        </>
      )}
      <p className="tiny muted mt">Algunas consecuencias pueden aparecer más adelante.</p>
    </Modal>
  );
}

// ------------------------------------------------------------------ partido
function MatchModal({ fixtureId, live }: { fixtureId: string; live: boolean }) {
  const { s, pop } = useGame();
  const f = s.fixtures.find((x) => x.id === fixtureId);
  const [minute, setMinute] = useState(live ? 0 : 130);
  const [speed, setSpeed] = useState(s.settings.liveSpeed);
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (minute >= 130) return;
    const t = setTimeout(() => setMinute((m) => m + 1), 110 / speed);
    return () => clearTimeout(t);
  }, [minute, speed]);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [minute]);
  if (!f) return <Modal title="Partido" onClose={pop}><p>Partido no encontrado.</p></Modal>;
  const done = minute >= 96 + (f.pens ? 30 : 0) || minute >= 130;
  const shown = (f.events ?? []).filter((e) => e.min <= minute);
  const hg = (f.scorers ?? []).filter((x) => x.t === 'h' && x.m <= minute).length;
  const ag = (f.scorers ?? []).filter((x) => x.t === 'a' && x.m <= minute).length;
  const comp = s.comps[f.comp];
  const me = s.president.clubId ?? 'ARG';
  const teamBadge = (id: string) => (s.clubs[id] ? <Crest club={s.clubs[id]} size={48} /> : <NationFlag code={id} size={48} />);
  const st = f.stats;
  const mySide = f.home === me ? 'h' : 'a';
  const myGoals = mySide === 'h' ? f.hg! : f.ag!;
  const theirGoals = mySide === 'h' ? f.ag! : f.hg!;
  const result = myGoals > theirGoals || (f.pens && (mySide === 'h' ? f.pens[0] > f.pens[1] : f.pens[1] > f.pens[0])) ? 'Victoria' : myGoals < theirGoals || f.pens ? 'Derrota' : 'Empate';
  const c = userClub(s);
  const pos = c ? positionOf(s, c.id) : null;
  const nameOf = (p: string) => s.players[p]?.name ?? p;
  return (
    <Modal wide title={<span>{comp?.name ?? 'Partido'} · {f.round}</span>} sub={live && !done ? 'Simulación en vivo' : 'Resultado final'} onClose={pop} footer={
      !done ? (
        <>
          <button className="btn" onClick={() => setSpeed((x) => (x >= 8 ? 1 : x * 2))}><Icon name="ff" size={16} /> Velocidad x{speed}</button>
          <button className="btn gold" onClick={() => setMinute(130)}>Omitir narración</button>
        </>
      ) : <button className="btn gold" onClick={pop}>Continuar</button>
    }>
      <div className="scoreboard">
        <div className="team">{teamBadge(f.home)}<span className="ellipsis" style={{ maxWidth: '100%' }}>{teamName(s, f.home)}</span></div>
        <div>
          <div className="score">{done ? f.hg : hg} - {done ? f.ag : ag}</div>
          <div className="clock">{done ? (f.pens ? `Penales ${f.pens[0]}-${f.pens[1]}` : 'Final') : minute <= 45 ? `${minute}'` : minute <= 47 ? 'Entretiempo' : `${Math.min(minute, 95)}'`}</div>
        </div>
        <div className="team">{teamBadge(f.away)}<span className="ellipsis" style={{ maxWidth: '100%' }}>{teamName(s, f.away)}</span></div>
      </div>
      {!done && <div className="mt-s"><Bar value={(minute / 96) * 100} color="var(--gold)" /></div>}
      <div className="feed" ref={feedRef}>
        {(done ? f.events ?? [] : shown).map((e, i) => (
          <div key={i} className={`ev ${e.type === 'gol' || e.type === 'penal' ? 'gol' : ''} ${e.team === 'a' && f.home === me ? 'a' : e.team === 'h' && f.away === me ? 'a' : ''}`}>
            <span className="min">{e.min > 95 ? '' : `${e.min}'`}</span>
            <span>{e.type === 'gol' || e.type === 'penal' ? '⚽ ' : e.type === 'roja' ? '🟥 ' : e.type === 'amarilla' ? '🟨 ' : e.type === 'lesion' ? '✚ ' : ''}{e.text}</span>
          </div>
        ))}
      </div>
      {done && st && (
        <div className="grid g2 stack mt">
          <div className="card flat tight">
            <div className="tiny muted upper mb">Estadísticas</div>
            <div className="stat-line"><b className="num">{st.posH}%</b><span className="mid">Posesión</span><b className="num right">{100 - st.posH}%</b></div>
            <div className="stat-line"><b className="num">{st.shotsH}</b><span className="mid">Remates</span><b className="num right">{st.shotsA}</b></div>
            <div className="stat-line"><b className="num">{st.onH}</b><span className="mid">Al arco</span><b className="num right">{st.onA}</b></div>
            <div className="stat-line"><b className="num">{st.yH}/{st.rH}</b><span className="mid">Amarillas/Rojas</span><b className="num right">{st.yA}/{st.rA}</b></div>
            <div className="stat-line"><b className="num">{st.xgH}</b><span className="mid">Goles esperados</span><b className="num right">{st.xgA}</b></div>
          </div>
          <div className="card flat tight">
            <div className="tiny muted upper mb">Consecuencias</div>
            <div className="list-row small"><span className="grow">Resultado</span><b className={result === 'Victoria' ? 'pos' : result === 'Derrota' ? 'neg' : ''}>{result}</b></div>
            <div className="list-row small"><span className="grow">Asistencia</span><b className="num">{st.att.toLocaleString('es-AR')}</b></div>
            {f.home === me && st.gate > 0 && <div className="list-row small"><span className="grow">Recaudación</span><b className="pos num">{money(st.gate)}</b></div>}
            {pos && pos.pos > 0 && f.comp.startsWith('arg') && <div className="list-row small"><span className="grow">Posición en la tabla</span><b>{pos.pos}º de {pos.of}</b></div>}
            <div className="list-row small"><span className="grow">Goleadores</span><span className="right">{(f.scorers ?? []).map((x) => `${nameOf(String(x.p))} ${x.m}'`).join(', ') || '—'}</span></div>
            <div className="list-row small"><span className="grow">Apoyo de hinchas</span><b className="num">{Math.round(s.ind.hinchas)}</b></div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ fin de temporada
function SeasonModal({ summary }: { summary: import('../../engine/types').SeasonSummary }) {
  const { s, pop } = useGame();
  return (
    <Modal wide closable={false} title={<span className="serif" style={{ fontSize: 24 }}>Fin de la temporada {summary.season}</span>} footer={<button className="btn gold big" onClick={pop}>Comenzar temporada {s.season}</button>}>
      {summary.userClub && (
        <div className="card flat tight mb">
          <div className="tiny muted upper">Tu temporada</div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{summary.userClub}: {summary.userPos ? `${summary.userPos}º puesto` : '—'}</div>
          {summary.finances && <div className="small muted mt-s">Ingresos {money(summary.finances.income)} · Egresos {money(summary.finances.expense)} · Caja final {money(summary.finances.cashEnd)} · Deuda {money(summary.finances.debtEnd)}</div>}
        </div>
      )}
      <div className="grid g2 stack">
        <div>
          <div className="tiny muted upper mb">Campeones</div>
          {Object.entries(summary.champions).map(([k, v]) => <div key={k} className="list-row small"><Icon name="trophy" size={16} style={{ color: 'var(--gold)' }} /><span className="grow">{k}</span><b>{v}</b></div>)}
          {summary.topScorer && <div className="list-row small"><Icon name="ball" size={16} /><span className="grow">Goleador</span><b>{summary.topScorer}</b></div>}
        </div>
        <div>
          <div className="tiny muted upper mb">Ascensos</div>
          {summary.promoted.map((x) => <div key={x} className="small pos">▲ {x}</div>)}
          <div className="tiny muted upper mb mt">Descensos</div>
          {summary.relegated.map((x) => <div key={x} className="small neg">▼ {x}</div>)}
        </div>
      </div>
      {summary.notes.length > 0 && (
        <>
          <div className="tiny muted upper mt">Novedades</div>
          {summary.notes.map((n, i) => <div key={i} className="small list-row">{n}</div>)}
        </>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ jugadores
function PlayerModal({ id }: { id: string }) {
  const { s, act, push, pop, toast } = useGame();
  const p = s.players[id];
  const c = userClub(s);
  const mine = !!c && p?.clubId === c.id && s.president.pos === 'club';
  const [wage, setWage] = useState(() => (p && c ? Math.round(Math.max(p.wage, wageDemand(s, p, c)) / 100) * 100 : 0));
  const [years, setYears] = useState(3);
  const [msg, setMsg] = useState('');
  if (!p) return <Modal title="Jugador" onClose={pop}><p>No disponible.</p></Modal>;
  const club = p.clubId ? s.clubs[p.clubId] : null;
  const offers = s.offers.filter((o) => o.playerId === p.id && o.expiresAbs >= absWeek(s));
  const agent = p.agentId ? s.chars[p.agentId] : null;
  return (
    <Modal title={p.name} sub={`${POS_LABEL[p.pos]} · ${p.age} años · ${p.nat}${club ? ` · ${club.name}` : ' · Libre'}${p.loanFrom ? ' (a préstamo)' : ''}`} onClose={pop}>
      <div className="grid g4" style={{ gap: 8 }}>
        <div className="kpi"><div className="label">Nivel</div><div className="value">{p.ovr}</div><div className="sub">Potencial {p.pot}</div></div>
        <div className="kpi"><div className="label">Valor</div><div className="value" style={{ fontSize: 16 }}>{money(p.value)}</div><div className="sub">Sueldo {money(p.wage)}/mes</div></div>
        <div className="kpi"><div className="label">Contrato</div><div className="value">{p.contractEnd}</div><div className="sub">{contractYearsLeft(s, p) <= 0 ? 'Vence este año' : `${contractYearsLeft(s, p)} años más`}</div></div>
        <div className="kpi"><div className="label">Estado</div><div className="value" style={{ fontSize: 16 }}>{p.injury > 0 ? `Lesión (${Math.ceil(p.injury)} sem.)` : `${Math.round(p.fitness)}% físico`}</div><div className="sub">Moral {Math.round(p.morale)} · Popularidad {Math.round(p.popularity)}</div></div>
      </div>
      <div className="small muted mt">Temporada: {p.season.apps} PJ · {p.season.goals} goles · {p.season.assists} asistencias. Carrera: {p.career.apps} PJ, {p.career.goals} goles. Representante: {agent ? `${agent.name} (${opinionLabel(agent.opinion).toLowerCase()})` : '—'}.</div>
      {p.history.length > 0 && <div className="tiny muted mt-s">Historial: {p.history.slice(-4).join(' · ')}</div>}
      {mine && (
        <>
          <div className="tiny muted upper mt">Renovar contrato</div>
          <div className="grid g2 mt-s" style={{ gap: 8 }}>
            <label className="field">Sueldo mensual: {money(wage)}<input type="range" min={Math.round(p.wage * 0.6)} max={Math.round(Math.max(p.wage, wageDemand(s, p, c!)) * 2)} step={100} value={wage} onChange={(e) => setWage(Number(e.target.value))} /></label>
            <label className="field">Duración<select className="input" value={years} onChange={(e) => setYears(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} {y === 1 ? 'temporada' : 'temporadas'}</option>)}</select></label>
          </div>
          <div className="small muted">Pretensión estimada: {money(wageDemand(s, p, c!))}/mes</div>
          <div className="row wrap mt-s">
            <button className="btn gold sm" onClick={() => { const r = act((g) => renewContract(g, rngOf(g), p.id, wage, years)); setMsg(r.msg); if (r.counter) setWage(r.counter); }}>Ofrecer renovación</button>
            <button className="btn sm" onClick={() => setMsg(act((g) => toggleListed(g, p.id)))}>{p.listed ? 'Quitar de transferibles' : 'Declarar transferible'}</button>
            <button className="btn sm" disabled={!isWindowOpen(s.week)} onClick={() => { const r = act((g) => findBuyers(g, rngOf(g), p.id)); setMsg(r.msg); }}>Buscar comprador</button>
            <button className="btn sm" disabled={!isWindowOpen(s.week) || p.age > 23} title="Sólo menores de 24 años" onClick={() => setMsg(act((g) => loanOut(g, rngOf(g), p.id)))}>Ceder a préstamo</button>
            <button className="btn sm danger" onClick={() => push({ type: 'confirm', title: 'Rescindir contrato', body: `Pagarás una indemnización por los ${Math.max(0, contractYearsLeft(s, p))} años restantes de ${p.name}.`, ok: 'Rescindir', danger: true, onOk: () => { toast(act((g) => releasePlayer(g, p.id))); pop(); } })}>Rescindir</button>
          </div>
          {msg && <div className="card flat tight mt small">{msg}</div>}
          {offers.length > 0 && (
            <>
              <div className="tiny muted upper mt">Ofertas recibidas</div>
              {offers.map((o) => (
                <div key={o.id} className="list-row">
                  <Crest club={s.clubs[o.fromClub]} size={26} />
                  <span className="grow small"><b>{s.clubs[o.fromClub].name}</b> <span className="muted">({s.clubs[o.fromClub].country})</span></span>
                  <b className="gold num">{money(o.amount)}</b>
                  <button className="btn sm success" onClick={() => { toast(act((g) => acceptOffer(g, o.id)), 'ok'); pop(); }}>Aceptar</button>
                </div>
              ))}
            </>
          )}
          {!isWindowOpen(s.week) && <div className="tiny muted mt">Libro de pases cerrado: abre en las semanas 1–4 y 19–21.</div>}
        </>
      )}
      {!mine && s.president.pos === 'club' && (
        <div className="row mt"><button className="btn gold" onClick={() => push({ type: 'buy', id: p.id })}>{p.clubId ? 'Hacer una oferta' : 'Ofrecer contrato'}</button></div>
      )}
    </Modal>
  );
}

function BuyModal({ id }: { id: string }) {
  const { s, act, pop } = useGame();
  const p = s.players[id];
  const c = userClub(s)!;
  const ask = p.clubId ? askingPrice(s, p, c) : 0;
  const demand = wageDemand(s, p, c);
  const [fee, setFee] = useState(ask);
  const [wage, setWage] = useState(demand);
  const [years, setYears] = useState(3);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const xi = bestXI(squad(s, c.id));
  const myBest = xi.filter((x) => x.pos === p.pos).sort((a, b) => b.ovr - a.ovr)[0];
  return (
    <Modal title={`${p.clubId ? 'Oferta por' : 'Contrato para'} ${p.name}`} sub={`${POS_LABEL[p.pos]} · ${p.age} años · Nivel ${p.ovr} (pot. ${p.pot})${p.clubId ? ` · ${s.clubs[p.clubId].name}` : ' · Jugador libre'}`} onClose={pop} footer={
      msg?.ok ? <button className="btn gold" onClick={pop}>Cerrar</button> : <button className="btn gold" onClick={() => { const r = act((g) => buyPlayer(g, rngOf(g), p.id, fee, wage, years)); setMsg({ t: r.msg, ok: r.ok }); if (r.counter && r.stage === 'club') setFee(r.counter); if (r.counter && r.stage === 'jugador') setWage(r.counter); }}>Enviar oferta</button>
    }>
      <div className="grid g3" style={{ gap: 8 }}>
        <div className="kpi"><div className="label">Precio pedido</div><div className="value" style={{ fontSize: 16 }}>{p.clubId ? money(ask) : 'Libre'}</div></div>
        <div className="kpi"><div className="label">Pretensión salarial</div><div className="value" style={{ fontSize: 16 }}>{money(demand)}</div></div>
        <div className="kpi"><div className="label">Tu caja</div><div className="value" style={{ fontSize: 16 }}><Money v={c.fin.cash} /></div></div>
      </div>
      <div className="small muted mt-s">Tu mejor {POS_LABEL[p.pos]} titular: {myBest ? `${myBest.name} (${myBest.ovr})` : '—'} · Presupuesto de fichajes: {money(s.economy.transferBudget)}</div>
      {p.clubId && <label className="field mt">Monto del pase: {money(fee)}<input type="range" min={Math.round(ask * 0.5)} max={Math.round(ask * 1.6)} step={10000} value={fee} onChange={(e) => setFee(Number(e.target.value))} /></label>}
      <label className="field mt">Sueldo mensual: {money(wage)}<input type="range" min={Math.round(demand * 0.6)} max={Math.round(demand * 1.8)} step={100} value={wage} onChange={(e) => setWage(Number(e.target.value))} /></label>
      <label className="field mt">Duración<select className="input" value={years} onChange={(e) => setYears(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} {y === 1 ? 'temporada' : 'temporadas'}</option>)}</select></label>
      {msg && <div className={`card flat tight mt small ${msg.ok ? 'pos' : ''}`}>{msg.t}</div>}
      {p.clubId && !isWindowOpen(s.week) && <div className="small neg mt">El libro de pases está cerrado.</div>}
    </Modal>
  );
}

function CoachModal({ id }: { id: string }) {
  const { s, act, pop } = useGame();
  const co = s.coaches[id];
  const c = userClub(s);
  const ask = co && c ? coachAskFor(s, co, c) : 0;
  const [wage, setWage] = useState(ask);
  const [years, setYears] = useState(2);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  if (!co || !c) return <Modal title="Entrenador" onClose={pop}><p>No disponible.</p></Modal>;
  const join = willCoachJoin(s, co, c);
  const attrs: [string, number][] = [['Capacidad', co.ability], ['Experiencia', co.experience], ['Liderazgo', co.leadership], ['Juveniles', co.youthDev], ['Relación con el plantel', co.squadRel], ['Popularidad', co.popularity]];
  return (
    <Modal title={co.name} sub={`${co.age} años · ${co.personality} · ${co.titles} títulos`} onClose={pop} footer={msg?.ok ? <button className="btn gold" onClick={pop}>Cerrar</button> : <button className="btn gold" disabled={!join.ok} onClick={() => { const r = act((g) => hireCoach(g, co.id, wage, years, rngOf(g))); setMsg({ t: r.msg, ok: r.ok }); }}>Contratar</button>}>
      <div className="col" style={{ gap: 8 }}>
        {attrs.map(([k, v]) => <div key={k} className="ind-row"><span className="name">{k}</span><span className="val">{v}</span><Bar value={v} /></div>)}
      </div>
      <div className="small muted mt">Opinión sobre vos: {opinionLabel(co.opinion)}. {co.memory.length ? `Recuerda: “${co.memory[co.memory.length - 1].t}”.` : ''}</div>
      {!join.ok && <div className="small neg mt">{join.why}</div>}
      <label className="field mt">Sueldo mensual: {money(wage)} (pretende {money(ask)})<input type="range" min={Math.round(ask * 0.6)} max={Math.round(ask * 1.8)} step={500} value={wage} onChange={(e) => setWage(Number(e.target.value))} /></label>
      <label className="field mt">Duración<select className="input" value={years} onChange={(e) => setYears(Number(e.target.value))}>{[1, 2, 3].map((y) => <option key={y} value={y}>{y} {y === 1 ? 'temporada' : 'temporadas'}</option>)}</select></label>
      {c.coachId && <div className="small warn mt">Contratarlo implica despedir a {s.coaches[c.coachId].name} y pagar su indemnización.</div>}
      {msg && <div className="card flat tight mt small">{msg.t}</div>}
    </Modal>
  );
}

// ------------------------------------------------------------------ varios
function ConfirmModal({ title, body, ok, danger, onOk }: { title: string; body: string; ok: string; danger?: boolean; onOk: () => void }) {
  const { pop } = useGame();
  return (
    <Modal title={title} onClose={pop} footer={<><button className="btn" onClick={pop}>Cancelar</button><button className={`btn ${danger ? 'danger' : 'gold'}`} onClick={() => { pop(); onOk(); }}>{ok}</button></>}>
      <p style={{ lineHeight: 1.6 }}>{body}</p>
    </Modal>
  );
}

function InfoModal({ title, body }: { title: string; body: React.ReactNode }) {
  const { pop } = useGame();
  return <Modal title={title} onClose={pop}>{body}</Modal>;
}

function ReportModal({ notes, title }: { notes: string[]; title: string }) {
  const { pop } = useGame();
  return (
    <Modal title={title} onClose={pop} footer={<button className="btn gold" onClick={pop}>Continuar</button>}>
      {notes.map((n, i) => <div key={i} className="list-row small">{n}</div>)}
    </Modal>
  );
}

function GameMenuModal() {
  const { s, act, pop, exit, save, toast, push } = useGame();
  const [view, setView] = useState<'menu' | 'settings' | 'export'>('menu');
  const text = useMemo(() => (view === 'export' ? exportSave(s) : ''), [view, s]);
  if (view === 'settings') {
    return (
      <Modal title="Configuración de la partida" onClose={pop}>
        <SettingsPanel settings={s.settings} onChange={(n) => act((g) => { g.settings = n; })} />
      </Modal>
    );
  }
  if (view === 'export') {
    return (
      <Modal title="Exportar partida" sub="Copiá este código o descargalo para importarlo en otro dispositivo." onClose={pop}>
        <textarea className="input" readOnly rows={6} value={text} style={{ fontFamily: 'monospace', fontSize: 11 }} onFocus={(e) => e.currentTarget.select()} />
        <div className="row mt">
          <button className="btn" onClick={() => navigator.clipboard?.writeText(text).then(() => toast('Código copiado.', 'ok')).catch(() => toast('Copialo manualmente.', 'err'))}>Copiar</button>
          <button className="btn gold" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = `el-presidente-${s.president.surname.toLowerCase()}-${s.season}.elp`; a.click(); }}>Descargar archivo</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="Menú" onClose={pop}>
      <div className="col">
        <button className="btn block" onClick={() => { save(); toast('Partida guardada.', 'ok'); pop(); }}><Icon name="save" size={18} /> Guardar ahora</button>
        <button className="btn block" onClick={() => setView('export')}>Exportar partida</button>
        <button className="btn block" onClick={() => setView('settings')}>Configuración</button>
        <button className="btn block" onClick={() => { pop(); push({ type: 'info', title: 'Cómo jugar', body: <p className="small" style={{ lineHeight: 1.6 }}>Avanzá semanas, resolvé decisiones y cuidá tus indicadores. Las urgentes bloquean el avance. El dinero del club y tu patrimonio personal están separados. Para crecer, ganá elecciones: club → Comité de la AAF → presidencia de la AAF → Confederación → FIF.</p> }); }}>Ayuda rápida</button>
        <button className="btn block danger" onClick={exit}>Guardar y volver al menú principal</button>
      </div>
    </Modal>
  );
}

function MoreModal() {
  const { setTab, pop, push } = useGame();
  const nav = useNav();
  return (
    <Modal title="Secciones" onClose={pop}>
      <div className="grid g2" style={{ gap: 8 }}>
        {nav.map((n) => (
          <button key={n.id} className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => { setTab(n.id); pop(); }}>
            <Icon name={n.icon} size={18} /> {n.label}
          </button>
        ))}
        <button className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => { pop(); push({ type: 'gamemenu' }); }}><Icon name="menu" size={18} /> Menú</button>
      </div>
    </Modal>
  );
}

function BioModal() {
  const { s, exit, pop } = useGame();
  const L = computeLegacy(s);
  useEffect(() => {
    if (s.gameOver) repo.addHistory(historyEntry(s, s.gameOver.reason));
  }, [s]);
  return (
    <Modal wide closable={!s.gameOver} onClose={pop} title={<span className="serif" style={{ fontSize: 24 }}>{s.president.name} {s.president.surname}</span>} sub={L.title} footer={s.gameOver ? <button className="btn gold" onClick={exit}>Volver al menú principal</button> : <button className="btn" onClick={pop}>Cerrar</button>}>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="gold" style={{ fontSize: 46, fontWeight: 900, lineHeight: 1 }}>{L.total}</div>
        <div className="muted small">puntos de legado</div>
      </div>
      <div className="grid g2 stack mt">
        {L.parts.map((p) => <div key={p.key} className="ind-row"><span className="name">{p.label}</span><span className="val">{p.value}</span><Bar value={p.value} /></div>)}
      </div>
      <p className="mt" style={{ lineHeight: 1.7 }}>{L.bio}</p>
    </Modal>
  );
}

export { Toggle };
