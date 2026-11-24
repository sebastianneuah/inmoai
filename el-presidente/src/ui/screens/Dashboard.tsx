// Panel principal.
import React from 'react';
import { useGame } from '../store';
import { useAdvance } from '../advance';
import { Card, Crest, Icon, IndRow, KPI, Money, Form, Empty, NationFlag } from '../components';
import { userClub, positionOf, nextFixture, lastResults, resultFor, teamName, careerLevel, LEVEL_NAMES, sortTable, leagueOf } from '../../engine/queries';
import { gameDate, money } from '../../engine/util';
import { totalDebt, institutionCash } from '../../engine/economy';
import { divisionName } from '../../engine/events';
import { headerIdentity } from './GameShell';
import { isWindowOpen } from '../../engine/competitions';
import { ntRating } from '../../engine/nationalteam';
import type { IndKey, Fixture } from '../../engine/types';

function FixtureLine({ f, me }: { f: Fixture; me: string }) {
  const { s } = useGame();
  const home = f.home === me;
  const opp = home ? f.away : f.home;
  const res = resultFor(f, me);
  return (
    <div className="list-row">
      <span className={`form-res ${res}`}>{res}</span>
      <div className="grow ellipsis small">
        <b>{home ? 'vs' : 'en'} {teamName(s, opp)}</b> <span className="muted">· {s.comps[f.comp]?.short ?? ''} {f.round}</span>
      </div>
      <b className="num">{f.hg}-{f.ag}{f.pens ? ` (${f.pens[0]}-${f.pens[1]} p)` : ''}</b>
    </div>
  );
}

export function Dashboard() {
  const { s, push, setTab } = useGame();
  const adv = useAdvance();
  const c = userClub(s);
  const id = headerIdentity(s);
  const lvl = careerLevel(s);
  const pending = s.inbox.length;
  const urgent = s.inbox.filter((e) => e.urgency === 'urgente').length;
  const mandateLeft = s.president.mandateEnd - s.season;
  const report = s.lastReport;
  const keyInd: IndKey[] = s.president.pos === 'club' ? ['socios', 'hinchas', 'comision', 'jugadores', 'estabilidad', 'gobernabilidad', 'riesgo'] : ['presidentes', 'influencia', 'repNacional', 'repInternacional', 'integridad', 'gobernabilidad', 'riesgo'];
  const ntNext = s.fixtures.filter((f) => !f.played && (f.home === 'ARG' || f.away === 'ARG')).sort((a, b) => a.week - b.week)[0];

  return (
    <div className="stack-m">
      {/* Encabezado */}
      <div className="card" style={{ background: 'radial-gradient(600px 200px at 0% 0%, rgba(212,175,55,.12), transparent), linear-gradient(180deg, var(--card), var(--panel))' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Crest crest={id.crest} short={id.short} size={64} />
          <div className="grow">
            <div className="tiny gold upper">{LEVEL_NAMES[lvl]}</div>
            <h1 className="serif" style={{ fontSize: 'clamp(21px, 4vw, 28px)', lineHeight: 1.15 }}>{id.name}</h1>
            <div className="small muted mt-s">
              {s.president.name} {s.president.surname} · Temporada {s.season} · {gameDate(s.season, s.week)} (semana {s.week}/40)
            </div>
            <div className="row wrap gap-s mt-s">
              {c && <span className="chip">{divisionName(c.division)}</span>}
              {s.president.pos !== 'sin_cargo' && s.president.pos !== 'retirado' && <span className={`chip ${mandateLeft <= 0 ? 'red' : mandateLeft === 1 ? 'amber' : ''}`}>{mandateLeft <= 0 ? 'Último año de mandato' : `Mandato: ${mandateLeft} ${mandateLeft === 1 ? 'año' : 'años'} más`}</span>}
              {s.president.committee && <span className="chip gold">Comité Ejecutivo AAF</span>}
              {c && isWindowOpen(s.week) && <span className="chip green">Libro de pases abierto</span>}
              {s.election && !s.election.done && <span className="chip amber">Campaña electoral en curso</span>}
              {s.economy.emergency && <span className="chip red">Emergencia económica</span>}
              {s.president.suspendedUntil && <span className="chip red">Inhabilitado</span>}
            </div>
          </div>
        </div>
        {/* Botones principales */}
        <div className="grid g3 mt" style={{ gap: 10 }}>
          <button className="btn gold big" onClick={adv.week} disabled={!!s.gameOver}>
            <Icon name="play" size={18} /> Avanzar semana
          </button>
          {s.president.pos === 'club' || s.president.pos === 'asociacion' ? (
            <button className="btn big" onClick={adv.nextMatch} disabled={!!s.gameOver}>
              <Icon name="ff" size={18} /> Simular próximo partido
            </button>
          ) : (
            <button className="btn big" onClick={adv.month} disabled={!!s.gameOver}>
              <Icon name="ff" size={18} /> Simular un mes
            </button>
          )}
          <button className={`btn big ${urgent ? 'danger' : ''}`} onClick={() => (pending ? push({ type: 'decision', uid: (s.inbox.find((e) => e.urgency === 'urgente') ?? s.inbox[0]).uid }) : setTab('decisiones'))}>
            <Icon name="inbox" size={18} /> Resolver decisiones {pending > 0 && <span className="badge" style={{ background: urgent ? 'var(--red)' : 'var(--amber)' }}>{pending}</span>}
          </button>
        </div>
        <div className="row wrap mt-s" style={{ gap: 8 }}>
          <button className="btn sm ghost" onClick={adv.month} disabled={!!s.gameOver}><Icon name="calendar" size={16} /> Simular un mes</button>
          <button className="btn sm ghost" onClick={adv.toEvent} disabled={!!s.gameOver}><Icon name="bolt" size={16} /> Avanzar hasta el próximo acontecimiento</button>
        </div>
      </div>

      {s.president.pos === 'sin_cargo' && (
        <Card title="Estás sin cargo">
          <p className="small muted" style={{ lineHeight: 1.6 }}>El universo sigue girando. Podés postularte en un club con elecciones próximas, esperar propuestas (normalizaciones, listas opositoras) avanzando semanas, o retirarte desde la sección Carrera. Tus relaciones y tu reputación siguen intactas.</p>
          <div className="row wrap mt">
            <button className="btn gold" onClick={() => setTab('politica')}>Buscar un club para postularme</button>
            <button className="btn" onClick={() => setTab('carrera')}>Ver mi carrera</button>
          </div>
        </Card>
      )}

      {/* KPIs */}
      {c && s.president.pos === 'club' && <ClubKPIs />}
      {s.president.pos === 'asociacion' && (
        <div className="grid g4">
          <KPI label="Presupuesto AAF" value={<Money v={s.assoc.budget} />} sub={`TV: ${money(s.assoc.tvPool)}/año`} />
          <KPI label="Selección" value={`${ntRating(s)}`} sub={s.nt.coachId ? s.coaches[s.nt.coachId].name : 'Sin seleccionador'} />
          <KPI label="Próximo partido" value={ntNext ? teamName(s, ntNext.home === 'ARG' ? ntNext.away : ntNext.home) : '—'} sub={ntNext ? `${s.comps[ntNext.comp]?.short} · sem. ${ntNext.week}` : 'Sin fechas'} />
          <KPI label="Patrimonio personal" value={<Money v={s.president.wealth} />} sub={`Capital político: ${s.president.politicalCapital}`} />
        </div>
      )}
      {(s.president.pos === 'confederacion' || s.president.pos === 'fifa') && (
        <div className="grid g4">
          <KPI label="Presupuesto" value={<Money v={institutionCash(s)} />} />
          <KPI label="Influencia" value={Math.round(s.ind.influencia)} />
          <KPI label="Reputación internacional" value={Math.round(s.ind.repInternacional)} />
          <KPI label="Patrimonio personal" value={<Money v={s.president.wealth} />} />
        </div>
      )}

      <div className="grid g2 stack">
        <Card title="Acontecimientos pendientes" right={<button className="btn sm ghost" onClick={() => setTab('decisiones')}>Ver todo</button>}>
          {s.inbox.length === 0 && <Empty>No hay decisiones pendientes. Avanzá para descubrir qué sucede.</Empty>}
          <div className="col gap-s">
            {s.inbox.slice(0, 5).map((e) => (
              <button key={e.uid} className="inbox-item" onClick={() => push({ type: 'decision', uid: e.uid })}>
                <span className={`dot ${e.urgency}`} />
                <div className="grow">
                  <div className="ellipsis" style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                  <div className={`tiny upper urg-${e.urgency}`}>{e.urgency}</div>
                </div>
                <Icon name="right" size={18} />
              </button>
            ))}
          </div>
        </Card>
        <Card title="Situación institucional" right={<button className="btn sm ghost" onClick={() => setTab('institucion')}>20 indicadores</button>}>
          <div className="col" style={{ gap: 9 }}>
            {keyInd.map((k) => <IndRow key={k} k={k} value={s.ind[k]} />)}
          </div>
        </Card>
      </div>

      {c && s.president.pos === 'club' && (
        <div className="grid g2 stack">
          <Card title="Últimos resultados">
            {lastResults(s, c.id, 5).length === 0 && <Empty>Todavía no se jugaron partidos.</Empty>}
            {lastResults(s, c.id, 5).map((f) => <FixtureLine key={f.id} f={f} me={c.id} />)}
          </Card>
          <Card title={`Objetivos ${s.season}`}>
            {s.objectives.map((o) => (
              <div key={o.id} className="list-row">
                <span className={`chip ${o.importance === 'minimo' ? 'red' : o.importance === 'esperado' ? 'amber' : 'gold'}`} style={{ minWidth: 78, justifyContent: 'center' }}>{o.importance === 'minimo' ? 'Mínimo' : o.importance === 'esperado' ? 'Esperado' : 'Ideal'}</span>
                <span className="grow small">{o.text}</span>
                {o.done === true && <Icon name="check" size={18} style={{ color: 'var(--green)' }} />}
                {o.done === false && <Icon name="x" size={18} style={{ color: 'var(--red)' }} />}
              </div>
            ))}
            {s.promises.filter((p) => p.kept === null).length > 0 && (
              <>
                <div className="tiny muted upper mt">Promesas vigentes</div>
                {s.promises.filter((p) => p.kept === null).slice(0, 4).map((p) => <div key={p.id} className="small mt-s">• {p.text}</div>)}
              </>
            )}
          </Card>
        </div>
      )}

      {c && s.president.pos === 'club' && <MiniTable />}

      {s.president.pos === 'asociacion' && ntNext && (
        <Card title="Selección argentina">
          <div className="row"><NationFlag code="ARG" size={34} /><div className="grow small">Próximo: <b>{teamName(s, ntNext.home === 'ARG' ? ntNext.away : ntNext.home)}</b> · {s.comps[ntNext.comp]?.name} · semana {ntNext.week}</div><button className="btn sm" onClick={() => setTab('seleccion')}>Gestionar</button></div>
        </Card>
      )}

      {s.president.pos !== 'club' && <WorldPanorama />}

      {report && report.notes.length > 0 && (
        <Card title={`Semana ${report.week} · ${report.season}`}>
          {report.notes.slice(0, 6).map((n, i) => <div key={i} className="small list-row">{n}</div>)}
        </Card>
      )}
    </div>
  );
}

function ClubKPIs() {
  const { s } = useGame();
  const c = userClub(s)!;
  const { pos: rawPos, of, comp } = positionOf(s, c.id);
  const played = comp?.table.find((r) => r.id === c.id)?.pj ?? 0;
  const pos = played > 0 ? rawPos : 0;
  const nf = nextFixture(s, c.id);
  const opp = nf ? (nf.home === c.id ? nf.away : nf.home) : null;
  const debt = totalDebt(s);
  return (
    <div className="grid g4">
      <KPI label="Posición" value={pos ? `${pos}º de ${of}` : 'Sin jugar'} sub={divisionName(c.division)} color={pos && pos <= 3 ? 'var(--gold2)' : pos && of && pos > of - 3 ? 'var(--red)' : undefined} />
      <KPI label="Próximo rival" value={opp ? teamName(s, opp) : '—'} sub={nf ? `${nf.home === c.id ? 'Local' : 'Visitante'} · ${s.comps[nf.comp]?.short} · sem. ${nf.week}` : 'Sin partidos'} />
      <KPI label="Dinero disponible" value={<Money v={c.fin.cash} />} color={c.fin.cash < 0 ? 'var(--red)' : 'var(--green)'} sub={c.fin.wageArrears ? `${c.fin.wageArrears} meses de atraso salarial` : `Personal: ${money(s.president.wealth)}`} />
      <KPI label="Deuda" value={<Money v={debt} />} color={debt > 0 ? 'var(--amber)' : undefined} sub={`${s.loans.length} ${s.loans.length === 1 ? "préstamo activo" : "préstamos activos"}`} />
      <div className="kpi" style={{ gridColumn: '1 / -1' }}>
        <div className="row between wrap">
          <span className="label">Racha</span>
          <Form list={c.form.slice(-6)} />
        </div>
      </div>
    </div>
  );
}

function MiniTable() {
  const { s, setTab } = useGame();
  const c = userClub(s)!;
  const lg = leagueOf(s, c.division);
  if (!lg) return null;
  const t = sortTable(lg.table);
  const i = t.findIndex((r) => r.id === c.id);
  const from = Math.max(0, Math.min(i - 2, t.length - 5));
  return (
    <Card title={lg.name} right={<button className="btn sm ghost" onClick={() => setTab('competicion')}>Tabla completa</button>}>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>#</th><th>Equipo</th><th className="r">PJ</th><th className="r">DG</th><th className="r">PTS</th></tr></thead>
          <tbody>
            {t.slice(from, from + 5).map((r, k) => (
              <tr key={r.id} className={r.id === c.id ? 'me' : ''}>
                <td>{from + k + 1}</td>
                <td><span className="row gap-s"><Crest club={s.clubs[r.id]} size={20} /><span className="ellipsis" style={{ maxWidth: 200 }}>{s.clubs[r.id].name}</span></span></td>
                <td className="r">{r.pj}</td>
                <td className="r">{r.gf - r.gc}</td>
                <td className="r"><b>{r.pts}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function WorldPanorama() {
  const { s } = useGame();
  const comps = Object.values(s.comps).filter((c) => (c.season === s.season || c.persistent) && (c.scope === 'national' || c.type !== 'league'));
  const leaders = Object.values(s.comps).filter((c) => c.type === 'league' && c.scope === 'club' && c.season === s.season).sort((a, b) => (a.division ?? 9) - (b.division ?? 9));
  return (
    <div className="grid g2 stack">
      <Card title="Panorama de competiciones">
        {leaders.map((l) => {
          const t = sortTable(l.table);
          return <div key={l.id} className="list-row small"><span className="grow">{l.name}</span><span className="muted">Líder:</span><b>{t[0] ? teamName(s, t[0].id) : '—'}</b></div>;
        })}
        {comps.map((c) => <div key={c.id} className="list-row small"><span className="grow">{c.name}</span><b>{c.winner ? `Campeón: ${teamName(s, c.winner)}` : c.stage === 'groups' ? 'Fase de grupos' : c.stage === 'ko' ? c.koWeeks[c.koIndex]?.name ?? 'Eliminación' : 'En juego'}</b></div>)}
      </Card>
      <Card title="Agenda institucional">
        <div className="list-row small"><span className="grow">Próxima elección AAF</span><b>{s.assoc.nextElection}</b></div>
        <div className="list-row small"><span className="grow">Próxima elección CSF</span><b>{s.confed.nextElection}</b></div>
        <div className="list-row small"><span className="grow">Próxima elección FIF</span><b>{s.fifa.nextElection}</b></div>
        <div className="list-row small"><span className="grow">Capital político</span><b>{s.president.politicalCapital}</b></div>
        {s.fifa.hostDecided && Object.entries(s.fifa.hostDecided).map(([y, c]) => <div key={y} className="list-row small"><span className="grow">Sede del Mundial {y}</span><b>{s.nations[c]?.name ?? c}</b></div>)}
        {s.nt.results.slice(0, 3).map((r, i) => <div key={i} className="list-row small"><NationFlag code="ARG" size={18} /><span className="grow">{r.comp}</span><b>{r.text}</b></div>)}
      </Card>
    </div>
  );
}
