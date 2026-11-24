// Plantel profesional, mercado de pases y cuerpo técnico.
import React, { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Card, Crest, Empty, Tabs, Bar, OpinionChip, Money, POS_LABEL, KPI } from '../components';
import { squad, sortSquad, userClub, bestXI } from '../../engine/queries';
import { marketList, MAX_SQUAD } from '../../engine/market';
import { freeCoaches, backCoach, demandObjective, renewCoach, fireCoach, severance, coachAskFor } from '../../engine/coaches';
import { isWindowOpen } from '../../engine/competitions';
import { opinionLabel } from '../../engine/relations';
import { money, avg } from '../../engine/util';
import { rngOf } from '../../engine/rng';
import type { Position } from '../../engine/types';
import { teamPower } from '../../engine/match';

export function Squad() {
  const { s } = useGame();
  const [tab, setTab] = useState<'plantel' | 'mercado' | 'tecnico'>('plantel');
  const c = userClub(s);
  if (!c) return <Card><Empty>Sin club.</Empty></Card>;
  return (
    <>
      <div className="page-h">
        <div>
          <h1>Plantel</h1>
          <div className="sub">{isWindowOpen(s.week) ? 'Libro de pases ABIERTO' : 'Libro de pases cerrado (abre semanas 1–4 y 19–21). Libres: siempre.'}</div>
        </div>
      </div>
      <Tabs tabs={[{ id: 'plantel', label: `Plantel (${squad(s, c.id).length})` }, { id: 'mercado', label: 'Mercado de pases' }, { id: 'tecnico', label: 'Cuerpo técnico' }]} value={tab} onChange={setTab} />
      {tab === 'plantel' && <SquadList />}
      {tab === 'mercado' && <Market />}
      {tab === 'tecnico' && <CoachPanel />}
    </>
  );
}

function SquadList() {
  const { s, push } = useGame();
  const c = userClub(s)!;
  const list = sortSquad(squad(s, c.id));
  const xi = new Set(bestXI(list).map((p) => p.id));
  const tp = teamPower(s, c.id, false, true);
  const wages = list.reduce((a, p) => a + p.wage, 0);
  const loaned = Object.values(s.players).filter((p) => p.loanFrom === c.id);
  return (
    <div className="stack-m">
      <div className="grid g4">
        <KPI label="Nivel del equipo" value={tp.rating.toFixed(1)} sub={`Once titular: ${avg(bestXI(list).map((p) => p.ovr)).toFixed(1)}`} />
        <KPI label="Masa salarial" value={money(wages)} sub="mensual" />
        <KPI label="Valor del plantel" value={money(list.reduce((a, p) => a + p.value, 0))} />
        <KPI label="Moral media" value={Math.round(avg(list.map((p) => p.morale)))} sub={`Lesionados: ${list.filter((p) => p.injury > 0).length}`} />
      </div>
      <Card title="Plantel profesional" right={<span className="tiny muted">★ titular probable · tocá un jugador para gestionarlo</span>}>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Pos</th><th>Jugador</th><th className="r">Edad</th><th className="r">Niv</th><th className="r">Pot</th><th className="r">Valor</th><th className="r">Sueldo</th><th className="r">Contrato</th><th>Moral</th><th>Estado</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="click" onClick={() => push({ type: 'player', id: p.id })}>
                  <td><span className="chip" style={{ minWidth: 44, justifyContent: 'center' }}>{POS_LABEL[p.pos]}</span></td>
                  <td><b>{p.name}</b> {xi.has(p.id) && <span className="gold">★</span>} {p.listed && <span className="chip amber">Transferible</span>} {p.youth && p.age <= 19 && <span className="chip blue">Juvenil</span>}</td>
                  <td className="r">{p.age}</td>
                  <td className="r"><b>{p.ovr}</b></td>
                  <td className="r muted">{p.pot}</td>
                  <td className="r">{money(p.value)}</td>
                  <td className="r">{money(p.wage)}</td>
                  <td className={`r ${p.contractEnd <= s.season ? 'neg' : ''}`}>{p.contractEnd}</td>
                  <td style={{ minWidth: 70 }}><Bar value={p.morale} /></td>
                  <td>{p.injury > 0 ? <span className="chip red">Lesión {Math.ceil(p.injury)}s</span> : <span className="small muted">{Math.round(p.fitness)}%</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {loaned.length > 0 && (
        <Card title="Cedidos a préstamo">
          {loaned.map((p) => <div key={p.id} className="list-row small"><span className="grow">{p.name} ({POS_LABEL[p.pos]}, {p.ovr})</span><span className="muted">en {s.clubs[p.clubId!]?.name}</span></div>)}
        </Card>
      )}
    </div>
  );
}

function Market() {
  const { s, push } = useGame();
  const c = userClub(s)!;
  const [pos, setPos] = useState<Position | ''>('');
  const [scope, setScope] = useState<'todos' | 'libres' | 'arg' | 'ext'>('todos');
  const [q, setQ] = useState('');
  const [max, setMax] = useState(0);
  const list = useMemo(() => marketList(s, { pos, scope, q, maxPrice: max || undefined }), [s, pos, scope, q, max, s.week]);
  const sq = squad(s, c.id);
  return (
    <div className="stack-m">
      <div className="grid g4">
        <KPI label="Caja" value={<Money v={c.fin.cash} />} />
        <KPI label="Presupuesto fichajes" value={money(s.economy.transferBudget)} sub="Configurable en Finanzas" />
        <KPI label="Tope salarial" value={s.economy.wageCap ? money(s.economy.wageCap) : 'Sin tope'} />
        <KPI label="Cupo de plantel" value={`${sq.length}/${MAX_SQUAD}`} />
      </div>
      {s.flags.transferBan && <Card><div className="neg small">El club está inhibido por deudas: no puede incorporar jugadores hasta regularizar su situación.</div></Card>}
      <Card>
        <div className="grid g4" style={{ gap: 8 }}>
          <label className="field">Posición<select className="input" value={pos} onChange={(e) => setPos(e.target.value as Position | '')}><option value="">Todas</option><option value="POR">Arqueros</option><option value="DEF">Defensores</option><option value="MED">Mediocampistas</option><option value="DEL">Delanteros</option></select></label>
          <label className="field">Origen<select className="input" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="todos">Todos</option><option value="libres">Libres</option><option value="arg">Argentina</option><option value="ext">Exterior</option></select></label>
          <label className="field">Valor máximo<select className="input" value={max} onChange={(e) => setMax(Number(e.target.value))}><option value={0}>Sin límite</option>{[250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000].map((v) => <option key={v} value={v}>{money(v)}</option>)}</select></label>
          <label className="field">Buscar<input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre…" /></label>
        </div>
      </Card>
      <Card title={`${list.length} jugadores`}>
        {list.length === 0 && <Empty>No hay jugadores con esos filtros.</Empty>}
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Pos</th><th>Jugador</th><th className="r">Edad</th><th className="r">Niv</th><th className="r">Pot</th><th>Club</th><th className="r">Valor</th></tr></thead>
            <tbody>
              {list.slice(0, 80).map((p) => (
                <tr key={p.id} className="click" onClick={() => push({ type: 'player', id: p.id })}>
                  <td><span className="chip" style={{ minWidth: 44, justifyContent: 'center' }}>{POS_LABEL[p.pos]}</span></td>
                  <td><b>{p.name}</b> <span className="tiny muted">{p.nat}</span></td>
                  <td className="r">{p.age}</td>
                  <td className="r"><b>{p.ovr}</b></td>
                  <td className="r muted">{p.pot}</td>
                  <td>{p.clubId ? <span className="row gap-s"><Crest club={s.clubs[p.clubId]} size={18} /><span className="small ellipsis" style={{ maxWidth: 150 }}>{s.clubs[p.clubId].name}</span></span> : <span className="chip green">Libre</span>}</td>
                  <td className="r">{money(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CoachPanel() {
  const { s, act, push } = useGame();
  const c = userClub(s)!;
  const co = c.coachId ? s.coaches[c.coachId] : null;
  const free = freeCoaches(s).slice(0, 14);
  const [obj, setObj] = useState('Terminar en la mitad superior');
  return (
    <div className="stack-m">
      {co ? (
        <Card title="Director técnico">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div style={{ fontWeight: 800, fontSize: 18 }}>{co.name}</div>
              <div className="small muted">{co.age} años · {co.personality} · contrato hasta {co.contractEnd} · {money(co.wage)}/mes · {co.titles} títulos</div>
              <div className="row gap-s mt-s wrap"><OpinionChip v={co.opinion} /><span className="small muted">{opinionLabel(co.opinion)}</span><span className="chip">Confianza en el cargo: {Math.round(co.confidence)}</span>{co.tags.includes('interino') && <span className="chip amber">Interino</span>}</div>
            </div>
          </div>
          <div className="grid g3 mt" style={{ gap: 10 }}>
            {([['Capacidad deportiva', co.ability], ['Experiencia', co.experience], ['Liderazgo', co.leadership], ['Desarrollo de juveniles', co.youthDev], ['Relación con el plantel', co.squadRel], ['Popularidad', co.popularity]] as [string, number][]).map(([k, v]) => (
              <div key={k} className="ind-row"><span className="name small">{k}</span><span className="val">{v}</span><Bar value={v} /></div>
            ))}
          </div>
          {co.memory.length > 0 && <div className="tiny muted mt">Recuerda: {co.memory.slice(-3).map((m) => `“${m.t}”`).join(' · ')}</div>}
          <div className="row wrap mt">
            <button className="btn sm" onClick={() => act((g) => backCoach(g), { toast: true })}>Respaldar públicamente</button>
            <button className="btn sm" onClick={() => act((g) => renewCoach(g, 2, rngOf(g)), { toast: true })}>Renovar 2 años</button>
            <button className="btn sm danger" onClick={() => push({ type: 'confirm', title: `Despedir a ${co.name}`, body: `La indemnización estimada es de ${money(severance(s, co))}. El plantel y los hinchas reaccionarán según su popularidad. Asumirá un interino.`, ok: 'Despedir', danger: true, onOk: () => act((g) => fireCoach(g, rngOf(g)), { toast: true }) })}>Despedir</button>
          </div>
          <div className="row wrap mt-s">
            <select className="input" style={{ maxWidth: 320 }} value={obj} onChange={(e) => setObj(e.target.value)}>
              {['Pelear el campeonato', 'Clasificar a copas internacionales', 'Terminar en la mitad superior', 'Lograr el ascenso', 'Evitar el descenso', 'Hacer debutar juveniles'].map((o) => <option key={o}>{o}</option>)}
            </select>
            <button className="btn sm" onClick={() => act((g) => demandObjective(g, obj, rngOf(g)), { toast: true })}>Exigir objetivo</button>
          </div>
          {s.flags.coachObjective && Number(s.flags.coachObjectiveSeason) === s.season && <div className="small muted mt-s">Objetivo exigido: <b>{String(s.flags.coachObjective)}</b></div>}
        </Card>
      ) : (
        <Card><div className="neg">El club no tiene entrenador. Contratá uno de la lista.</div></Card>
      )}
      <Card title="Entrenadores disponibles">
        {free.length === 0 && <Empty>No hay entrenadores libres.</Empty>}
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Entrenador</th><th className="r">Edad</th><th className="r">Cap.</th><th className="r">Exp.</th><th className="r">Lid.</th><th>Perfil</th><th className="r">Pretende</th><th>Opinión</th></tr></thead>
            <tbody>
              {free.map((x) => (
                <tr key={x.id} className="click" onClick={() => push({ type: 'coach', id: x.id })}>
                  <td><b>{x.name}</b></td>
                  <td className="r">{x.age}</td>
                  <td className="r"><b>{x.ability}</b></td>
                  <td className="r">{x.experience}</td>
                  <td className="r">{x.leadership}</td>
                  <td className="small">{x.personality}</td>
                  <td className="r">{money(coachAskFor(s, x, c))}</td>
                  <td><OpinionChip v={x.opinion} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
