// Política del fútbol: elecciones, asociación, dirigentes y organismos internacionales.
import React, { useState } from 'react';
import { useGame } from '../store';
import { Card, Crest, Empty, KPI, OpinionChip, Tabs, Bar } from '../components';
import { CAMPAIGN_ACTIONS, campaignAction, withdrawFromElection, voteProposal, presentProposal, PROPOSALS, meetLeader, canRunFor, joinBodyElection, clubsWithElections, runForClub, maxCapital } from '../../engine/politics';
import { charsByRole, userClub } from '../../engine/queries';
import { opinionLabel } from '../../engine/relations';
import { rngOf } from '../../engine/rng';
import { absWeek, absToSW } from '../../engine/util';
import { CONFEDS } from '../../engine/data/world';

export function Politics() {
  const { s } = useGame();
  const [tab, setTab] = useState<'elecciones' | 'asociacion' | 'dirigentes' | 'organismos'>(s.election && !s.election.done ? 'elecciones' : s.president.pos === 'sin_cargo' ? 'elecciones' : 'asociacion');
  return (
    <>
      <div className="page-h">
        <div><h1>Política</h1><div className="sub">El fútbol también se juega en los despachos.</div></div>
        <span className="chip gold">Capital político: {s.president.politicalCapital}/{maxCapital(s)}</span>
      </div>
      <Tabs tabs={[{ id: 'elecciones', label: 'Elecciones' }, { id: 'asociacion', label: 'Asociación (AAF)' }, { id: 'dirigentes', label: 'Dirigentes' }, { id: 'organismos', label: 'CSF y FIF' }]} value={tab} onChange={setTab} />
      {tab === 'elecciones' && <Elections />}
      {tab === 'asociacion' && <Association />}
      {tab === 'dirigentes' && <Leaders />}
      {tab === 'organismos' && <Bodies />}
    </>
  );
}

function Elections() {
  const { s, act, push } = useGame();
  const e = s.election;
  const active = e && !e.done;
  const when = e ? absToSW(s, e.weekAbs) : null;
  return (
    <div className="stack-m">
      {active && e && (
        <Card title={e.kind === 'club' ? `Elecciones en ${s.clubs[e.clubId!]?.name}` : `Elección de presidente de ${e.kind === 'asociacion' ? 'la AAF' : e.kind === 'confederacion' ? 'la CSF' : 'la FIF'}`} right={<span className="chip amber">Votación: semana {when?.week} · {when?.season} ({e.weekAbs - absWeek(s)} sem.)</span>}>
          <div className="col">
            {e.candidates.filter((c) => !c.withdrawn).sort((a, b) => b.support - a.support).map((c) => (
              <div key={c.id} className="ind-row">
                <span className="name"><b className={c.isUser ? 'gold' : ''}>{c.name}</b> <span className="muted small">· {c.platform}</span></span>
                <span className="val">{c.support.toFixed(1)}%</span>
                <Bar value={c.support} color={c.isUser ? 'var(--gold)' : 'var(--blue)'} />
              </div>
            ))}
            {e.candidates.filter((c) => c.withdrawn).map((c) => <div key={c.id} className="small muted">{c.name} retiró su candidatura.</div>)}
          </div>
          {e.kind !== 'club' && <div className="tiny muted mt-s">Votan {e.kind === 'asociacion' ? 'los presidentes de los clubes afiliados (primera división: 2 votos)' : e.kind === 'confederacion' ? 'los presidentes de las federaciones sudamericanas' : 'las confederaciones, ponderadas por cantidad de federaciones'}. Las cifras son votos estimados.</div>}
          {e.polls.length > 1 && <div className="tiny muted mt-s">Encuestas: {e.polls.slice(-5).map((p) => `${p.values.user !== undefined ? Math.round(p.values.user) + '%' : '—'}`).join(' → ')}</div>}
          {e.userRunning ? (
            <>
              <div className="row between mt"><span className="tiny muted upper">Acciones de campaña</span><span className="chip gold">Puntos de campaña: {e.campaignPoints}</span></div>
              <div className="grid g2 stack mt-s" style={{ gap: 8 }}>
                {CAMPAIGN_ACTIONS.filter((a) => a.kinds.includes(e.kind)).map((a) => (
                  <button key={a.id} className="decision-opt" disabled={e.actionsUsed.includes(a.id) || e.campaignPoints < a.cost} onClick={() => act((g) => campaignAction(g, rngOf(g), a.id), { toast: true })}>
                    <span className="letter">{a.cost}</span>
                    <span className="grow"><b>{a.label}</b><span className="small muted" style={{ display: 'block' }}>{e.actionsUsed.includes(a.id) ? 'Ya realizada' : a.desc}</span></span>
                  </button>
                ))}
              </div>
              <button className="btn sm danger mt" onClick={() => push({ type: 'confirm', title: 'Retirar candidatura', body: 'Retirarte tiene costo político. Si es la elección de tu club, dejarás la presidencia al terminar el mandato.', ok: 'Retirarme', danger: true, onOk: () => act((g) => withdrawFromElection(g), { toast: true }) })}>Retirar mi candidatura</button>
            </>
          ) : e.kind !== 'club' ? (
            <div className="mt">
              {(() => {
                const chk = canRunFor(s, e.kind as 'asociacion');
                return chk.ok ? <button className="btn gold" onClick={() => act((g) => joinBodyElection(g, rngOf(g)), { toast: true })}>Lanzar mi candidatura</button> : <div className="small muted">No podés postularte: {chk.why}</div>;
              })()}
            </div>
          ) : null}
        </Card>
      )}
      {e && e.done && e.result && (
        <Card title="Último resultado electoral">
          {Object.entries(e.result).sort((a, b) => b[1] - a[1]).map(([id, v]) => {
            const c = e.candidates.find((x) => x.id === id);
            return <div key={id} className="list-row small"><span className="grow">{c?.name}{c?.isUser ? ' (vos)' : ''}</span><b>{e.kind === 'club' ? `${v}%` : `${v} votos`}</b></div>;
          })}
        </Card>
      )}
      {!active && s.president.pos === 'club' && (
        <Card title="Tu mandato">
          <div className="small">Tu mandato vence al final de la temporada <b>{s.president.mandateEnd}</b>. La campaña arranca en la semana 24 de ese año y se vota en la semana 38. Lo que hagas hasta entonces —resultados, finanzas, promesas cumplidas— define tu reelección.</div>
        </Card>
      )}
      {s.president.pos === 'sin_cargo' && !active && (
        <Card title="Postularte en un club">
          <div className="small muted mb">Clubes con elecciones este año o el próximo. Tus chances dependen de tu reputación nacional, tu integridad y tu influencia.</div>
          {s.president.suspendedUntil && s.president.suspendedUntil > absWeek(s) && <div className="neg small mb">Estás inhabilitado hasta dentro de {s.president.suspendedUntil - absWeek(s)} semanas.</div>}
          {clubsWithElections(s).slice(0, 20).map((c) => (
            <div key={c.id} className="list-row">
              <Crest club={c} size={28} />
              <div className="grow"><b>{c.name}</b><div className="small muted">{c.division === 1 ? 'Liga Profesional' : c.division === 2 ? 'Primera Nacional' : 'Torneo Federal'} · prestigio {c.prestige}</div></div>
              <button className="btn sm gold" onClick={() => act((g) => runForClub(g, rngOf(g), c.id), { toast: true })}>Postularme</button>
            </div>
          ))}
          {clubsWithElections(s).length === 0 && <Empty>No hay elecciones próximas. Esperá propuestas avanzando semanas.</Empty>}
        </Card>
      )}
      {!active && s.president.pos !== 'sin_cargo' && (
        <Card title="Calendario electoral">
          <div className="list-row small"><span className="grow">Asociación Argentina de Fútbol</span><b>{s.assoc.nextElection} (semana 37)</b></div>
          <div className="list-row small"><span className="grow">Confederación Sudamericana</span><b>{s.confed.nextElection}</b></div>
          <div className="list-row small"><span className="grow">Federación Internacional</span><b>{s.fifa.nextElection}</b></div>
          {s.president.pos === 'club' && <div className="list-row small"><span className="grow">Tu club</span><b>{s.president.mandateEnd} (semana 38)</b></div>}
        </Card>
      )}
    </div>
  );
}

function Association() {
  const { s, act } = useGame();
  const pres = s.assoc.presidentId ? s.chars[s.assoc.presidentId] : null;
  const pending = s.assoc.proposals.filter((p) => !p.result);
  const done = s.assoc.proposals.filter((p) => p.result).slice(-6).reverse();
  const [prop, setProp] = useState(PROPOSALS[0].key);
  const canVote = s.president.pos === 'club' || s.president.pos === 'asociacion';
  return (
    <div className="stack-m">
      <div className="grid g4">
        <KPI label="Presidente AAF" value={pres ? pres.name : 'Vos'} sub={pres ? `${opinionLabel(pres.opinion)} hacia vos` : 'Conducís la asociación'} />
        <KPI label="Reparto de TV" value={s.assoc.tvModel === 'meritocratico' ? 'Por mérito' : s.assoc.tvModel === 'equitativo' ? 'Equitativo' : 'Mixto'} sub={`Pozo anual: USD ${(s.assoc.tvPool / 1e6).toFixed(0)} M`} />
        <KPI label="Tu lugar" value={s.president.pos === 'asociacion' ? 'Presidente' : s.president.committee ? 'Comité Ejecutivo' : 'Asamblea'} sub={`Relación AAF: ${Math.round(s.ind.asociacion)}`} />
        <KPI label="Próxima elección" value={s.assoc.nextElection} sub="Semana 37" />
      </div>
      <Card title="Asamblea: propuestas en votación">
        {pending.length === 0 && <Empty>No hay propuestas en tratamiento. Cada pocas semanas la asamblea vota nuevos proyectos.</Empty>}
        {pending.map((p) => (
          <div key={p.id} className="list-row wrap" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <b>{p.title}</b> {p.byUser && <span className="chip gold">Tu proyecto</span>}
              <div className="small muted">{p.text}</div>
              <div className="tiny muted">Propone: {p.byUser ? 'vos' : p.proposerId ? s.chars[p.proposerId]?.name : 'Comité'} · se vota en {Math.max(0, p.voteAbs - absWeek(s))} semanas</div>
            </div>
            {canVote && !p.byUser && (
              <div className="row gap-s">
                {(['si', 'no', 'abstencion'] as const).map((v) => <button key={v} className={`btn sm ${p.userVote === v ? 'gold' : ''}`} onClick={() => act((g) => voteProposal(g, p.id, v))}>{v === 'si' ? 'A favor' : v === 'no' ? 'En contra' : 'Abstención'}</button>)}
              </div>
            )}
          </div>
        ))}
      </Card>
      {canVote && (
        <Card title="Presentar un proyecto">
          <div className="row wrap">
            <select className="input" style={{ maxWidth: 380 }} value={prop} onChange={(e) => setProp(e.target.value)}>{PROPOSALS.map((p) => <option key={p.key} value={p.key}>{p.title}</option>)}</select>
            <button className="btn gold" onClick={() => act((g) => presentProposal(g, prop), { toast: true })}>Presentar (2 capital)</button>
          </div>
          <div className="small muted mt-s">{PROPOSALS.find((p) => p.key === prop)?.text} Requiere 30 de influencia. Ganar la votación suma influencia; perderla, la resta.</div>
        </Card>
      )}
      <div className="grid g2 stack">
        <Card title="Comité Ejecutivo">
          {s.president.committee && <div className="list-row small"><b className="gold grow">Vos</b><span className="chip gold">Miembro</span></div>}
          {s.assoc.committee.map((id) => s.chars[id]).filter(Boolean).map((ch) => (
            <div key={ch.id} className="list-row small"><span className="grow">{ch.name} <span className="muted">· {s.clubs[ch.clubId ?? '']?.short ?? ''}</span></span><span className="chip">{ch.bloc}</span><OpinionChip v={ch.opinion} /></div>
          ))}
        </Card>
        <Card title="Reglamento y decisiones recientes">
          <div className="small">Extranjeros por plantel: <b>{String(s.assoc.rules.extranjeros)}</b> · Descensos: <b>{String(s.assoc.rules.descensos)}</b> · Tope salarial: <b>{s.assoc.rules.topeSalarial ? 'sí' : 'no'}</b> · Fair play financiero: <b>{s.assoc.rules.fairPlay ? 'sí' : 'no'}</b> · Público visitante: <b>{s.assoc.rules.visitantes ? 'sí' : 'no'}</b></div>
          {done.map((p) => <div key={p.id} className="list-row small"><span className="grow">{p.title}</span><span className={`chip ${p.result!.passed ? 'green' : 'red'}`}>{p.result!.passed ? 'Aprobada' : 'Rechazada'} {p.result!.si}-{p.result!.no}</span></div>)}
        </Card>
      </div>
    </div>
  );
}

function Leaders() {
  const { s, act } = useGame();
  const [div, setDiv] = useState(1);
  const list = charsByRole(s, 'presidente_club').filter((c) => c.clubId && s.clubs[c.clubId]?.division === div && c.clubId !== s.president.clubId).sort((a, b) => b.influence - a.influence);
  return (
    <div className="stack-m">
      <div className="pill-tabs">{[1, 2, 3].map((d) => <button key={d} className={`chip ${div === d ? 'gold' : ''}`} onClick={() => setDiv(d)}>{d === 1 ? 'Liga Profesional' : d === 2 ? 'Primera Nacional' : 'Torneo Federal'}</button>)}</div>
      <Card title="Presidentes de clubes" right={<span className="tiny muted">Reunión: 1 capital · Alianza / favor: 2</span>}>
        {list.map((ch) => {
          const c = s.clubs[ch.clubId!];
          return (
            <div key={ch.id} className="list-row wrap">
              <Crest club={c} size={28} />
              <div className="grow" style={{ minWidth: 160 }}>
                <b>{ch.name}</b> {ch.tags.includes('aliado_usuario') && <span className="chip gold">Aliado</span>} {s.flags[`favor_${ch.id}`] && <span className="chip amber">Te debe un favor</span>}
                <div className="small muted">{c.name} · {ch.bloc} · influencia {ch.influence} · {ch.personality}</div>
                {ch.memory.length > 0 && <div className="tiny muted ellipsis">Recuerda: “{ch.memory[ch.memory.length - 1].t}”</div>}
              </div>
              <OpinionChip v={ch.opinion} />
              <div className="row gap-s">
                <button className="btn sm" disabled={s.president.politicalCapital < 1} onClick={() => act((g) => meetLeader(g, rngOf(g), ch.id, 'reunion'), { toast: true })}>Reunión</button>
                <button className="btn sm" disabled={s.president.politicalCapital < 2} onClick={() => act((g) => meetLeader(g, rngOf(g), ch.id, 'alianza'), { toast: true })}>Alianza</button>
                <button className="btn sm" disabled={s.president.politicalCapital < 2} onClick={() => act((g) => meetLeader(g, rngOf(g), ch.id, 'favor'), { toast: true })}>Favor</button>
              </div>
            </div>
          );
        })}
      </Card>
      <Card title="Otros actores">
        {[...charsByRole(s, 'dirigente_asociacion'), ...charsByRole(s, 'politico'), ...charsByRole(s, 'periodista'), ...charsByRole(s, 'empresario'), ...charsByRole(s, 'representante')].map((ch) => (
          <div key={ch.id} className="list-row small"><span className="grow"><b>{ch.name}</b> <span className="muted">· {ch.title}</span></span><span className="muted">{opinionLabel(ch.opinion)}</span><OpinionChip v={ch.opinion} /></div>
        ))}
      </Card>
    </div>
  );
}

function Bodies() {
  const { s } = useGame();
  const cp = s.confed.presidentId ? s.chars[s.confed.presidentId] : null;
  const fp = s.fifa.presidentId ? s.chars[s.fifa.presidentId] : null;
  const rc = canRunFor(s, 'confederacion');
  const rf = canRunFor(s, 'fifa');
  return (
    <div className="grid g2 stack">
      <Card title={s.confed.name}>
        <div className="list-row small"><span className="grow">Presidente</span><b>{cp ? cp.name : 'Vos'}</b></div>
        <div className="list-row small"><span className="grow">Próxima elección</span><b>{s.confed.nextElection}</b></div>
        <div className="list-row small"><span className="grow">Tu reputación internacional</span><b>{Math.round(s.ind.repInternacional)}</b></div>
        <div className={`small mt ${rc.ok ? 'pos' : 'muted'}`}>{rc.ok ? 'Podés postularte cuando se abra la elección.' : `Requisitos: ${rc.why}`}</div>
        <div className="tiny muted upper mt">Federaciones miembro</div>
        {s.confed.members.map((id) => s.chars[id]).filter(Boolean).map((ch) => <div key={ch.id} className="list-row small"><span className="grow">{ch.title.replace('Presidente de la federación de ', '')}</span><span className="muted">{ch.name}</span><OpinionChip v={ch.opinion} /></div>)}
      </Card>
      <Card title={s.fifa.name}>
        <div className="list-row small"><span className="grow">Presidente</span><b>{fp ? fp.name : 'Vos'}</b></div>
        <div className="list-row small"><span className="grow">Próxima elección</span><b>{s.fifa.nextElection}</b></div>
        <div className={`small mt ${rf.ok ? 'pos' : 'muted'}`}>{rf.ok ? 'Podés postularte cuando se abra la elección.' : `Requisitos: ${rf.why}`}</div>
        <div className="tiny muted upper mt">Confederaciones (peso electoral)</div>
        {s.fifa.members.map((id) => s.chars[id]).filter(Boolean).map((ch) => <div key={ch.id} className="list-row small"><span className="grow">{CONFEDS[ch.confed ?? 'CSF']?.short} · {ch.name}</span><span className="muted">{CONFEDS[ch.confed ?? 'CSF']?.members} votos</span><OpinionChip v={ch.opinion} /></div>)}
        {s.fifa.hostDecided && Object.keys(s.fifa.hostDecided).length > 0 && <div className="small mt">Sedes definidas: {Object.entries(s.fifa.hostDecided).map(([y, c]) => `${y}: ${s.nations[c]?.name ?? c}`).join(' · ')}</div>}
      </Card>
    </div>
  );
}
void userClub;
