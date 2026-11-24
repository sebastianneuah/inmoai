// Carrera profesional, progresión y legado.
import React from 'react';
import { useGame } from '../store';
import { Card, KPI, Bar, Empty } from '../components';
import { careerLevel, LEVEL_NAMES } from '../../engine/queries';
import { computeLegacy } from '../../engine/legacy';
import { money } from '../../engine/util';
import { retire } from '../../engine/game';
import { PERSONALITIES } from '../../engine/data/world';

const LADDER = [
  { n: 1, t: 'Presidente de club pequeño', d: 'Presupuestos limitados, ascensos y relaciones locales.' },
  { n: 2, t: 'Presidente de club importante', d: 'Grandes presupuestos, copas internacionales e influencia.' },
  { n: 3, t: 'Dirigente de la asociación nacional', d: 'Comité Ejecutivo: comisiones, votaciones y decisiones generales.' },
  { n: 4, t: 'Presidente de la asociación nacional', d: 'Selección, campeonatos, TV, reglamentos y relación con los clubes.' },
  { n: 5, t: 'Presidente de la confederación continental', d: 'Competiciones internacionales y federaciones afiliadas.' },
  { n: 6, t: 'Presidente de la FIF', d: 'Sedes mundialistas, formatos, ingresos y crisis globales.' },
];

export function Career() {
  const { s, act, push } = useGame();
  const lvl = careerLevel(s);
  const L = computeLegacy(s);
  const c = s.career;
  const pers = PERSONALITIES.find((p) => p.id === s.president.personality);
  return (
    <>
      <div className="page-h">
        <div><h1>Carrera</h1><div className="sub">{s.president.name} {s.president.surname} · {s.president.age} años · {pers?.name}</div></div>
        <div className="row gap-s">
          <button className="btn sm" onClick={() => push({ type: 'bio' })}>Ver biografía</button>
          {!s.gameOver && <button className="btn sm danger" onClick={() => push({ type: 'confirm', title: 'Retirarse de la dirigencia', body: 'Tu carrera terminará ahora. Se generará tu biografía y quedará registrada en el historial de carreras.', ok: 'Retirarme', danger: true, onOk: () => { act((g) => retire(g, 'Retiro voluntario')); push({ type: 'bio' }); } })}>Retirarme</button>}
        </div>
      </div>
      <div className="grid g4 mb">
        <KPI label="Cargo actual" value={LEVEL_NAMES[lvl]} sub={`Techo alcanzado: ${LEVEL_NAMES[c.peakLevel]}`} />
        <KPI label="Legado" value={L.total} sub={L.title} color="var(--gold2)" />
        <KPI label="Títulos" value={c.titles.length} sub={`${c.promotions} ascensos · ${c.relegations} descensos`} />
        <KPI label="Elecciones" value={`${c.electionsWon}-${c.electionsLost}`} sub="ganadas-perdidas" />
      </div>
      <div className="grid g2 stack">
        <Card title="Progresión profesional">
          <div className="ladder">
            {LADDER.map((x) => (
              <div key={x.n} className={`step ${x.n === lvl ? 'now' : x.n < lvl || x.n <= c.peakLevel ? 'done' : ''}`}>
                <span className="n">{x.n}</span>
                <div className="grow"><b>{x.t}</b><div className="small muted">{x.d}</div></div>
              </div>
            ))}
          </div>
          <div className="small muted mt">Nadie asciende por acumular puntos: hay que ganar elecciones, conseguir respaldos o recibir propuestas. Podés perder cargos y reconstruir tu carrera.</div>
        </Card>
        <Card title="Puntuación de legado">
          <div className="col" style={{ gap: 10 }}>
            {L.parts.map((p) => <div key={p.key} className="ind-row"><span className="name">{p.label}</span><span className="val">{p.value}</span><Bar value={p.value} /></div>)}
          </div>
        </Card>
        <Card title="Trayectoria">
          {c.positions.map((p, i) => <div key={i} className="list-row small"><span className="grow">{p.label}</span><span className="muted">{p.from}–{p.to ?? 'hoy'}</span></div>)}
          <div className="list-row small"><span className="grow">Dinero generado para las instituciones</span><b>{money(c.moneyGenerated)}</b></div>
          <div className="list-row small"><span className="grow">Patrimonio personal</span><b>{money(s.president.wealth)}</b></div>
          <div className="list-row small"><span className="grow">Crisis atravesadas</span><b>{c.crises}</b></div>
        </Card>
        <Card title="Títulos y logros">
          {c.titles.length === 0 && <Empty>Todavía no levantaste un trofeo.</Empty>}
          {c.titles.map((t, i) => <div key={i} className="list-row small"><span className="chip gold">{t.season}</span><span className="grow">{t.comp}</span><span className="muted">{t.club}</span></div>)}
          {c.works.length > 0 && <><div className="tiny muted upper mt">Obras</div>{c.works.map((w, i) => <div key={i} className="small">• {w}</div>)}</>}
          {c.signings.length > 0 && <><div className="tiny muted upper mt">Fichajes</div>{c.signings.slice(-6).map((w, i) => <div key={i} className="small">• {w}</div>)}</>}
          {c.sanctions.length > 0 && <><div className="tiny muted upper mt">Sanciones</div>{c.sanctions.map((w, i) => <div key={i} className="small neg">• {w}</div>)}</>}
        </Card>
      </div>
      <Card title="Momentos clave" className="mt">
        {c.milestones.length === 0 && <Empty>Tu historia recién empieza.</Empty>}
        {[...c.milestones].reverse().slice(0, 30).map((m, i) => <div key={i} className="list-row small"><span className="chip">{m.season} · S{m.week}</span><span className="grow">{m.text}</span></div>)}
      </Card>
    </>
  );
}
