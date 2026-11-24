// Institución: indicadores, personajes y relaciones, grupos de hinchas, infraestructura y promesas.
import React, { useState } from 'react';
import { useGame } from '../store';
import { Card, Empty, IndRow, KPI, OpinionChip, Tabs, Bar, Money } from '../components';
import { IND_INFO, opinionLabel } from '../../engine/relations';
import { IND_KEYS, type Character, type FacilityKey, type IndKey } from '../../engine/types';
import { userClub } from '../../engine/queries';
import { FACILITY_INFO, projectCost, startProject } from '../../engine/economy';
import { meetMembers, meetBarra, setSecurity, transparencyPolicy, actionCooldown } from '../../engine/actions';
import { money, absWeek } from '../../engine/util';
import { rngOf } from '../../engine/rng';

export function Institution() {
  const { s } = useGame();
  const club = s.president.pos === 'club';
  const [tab, setTab] = useState<'indicadores' | 'personajes' | 'grupos' | 'infra' | 'promesas'>('indicadores');
  return (
    <>
      <div className="page-h"><div><h1>Institución</h1><div className="sub">Cada indicador afecta realmente la simulación.</div></div></div>
      <Tabs tabs={[{ id: 'indicadores', label: 'Indicadores' }, { id: 'personajes', label: 'Personajes' }, { id: 'grupos', label: 'Socios, hinchas y barra', hidden: !club }, { id: 'infra', label: 'Infraestructura', hidden: !club }, { id: 'promesas', label: 'Promesas' }]} value={tab} onChange={setTab} />
      {tab === 'indicadores' && <Indicators />}
      {tab === 'personajes' && <People />}
      {club && tab === 'grupos' && <Groups />}
      {club && tab === 'infra' && <Infra />}
      {tab === 'promesas' && <Promises />}
    </>
  );
}

function Indicators() {
  const { s } = useGame();
  const groups = [...new Set(IND_KEYS.map((k) => IND_INFO[k].group))];
  const prev = s.indHistory[s.indHistory.length - 2]?.v;
  return (
    <div className="grid g2 stack">
      {groups.map((g) => (
        <Card key={g} title={g}>
          <div className="col" style={{ gap: 12 }}>
            {IND_KEYS.filter((k) => IND_INFO[k].group === g).map((k) => (
              <div key={k}>
                <IndRow k={k} value={s.ind[k]} delta={prev && prev[k] !== undefined ? Math.round(s.ind[k] - (prev[k] as number)) : undefined} />
                <div className="tiny muted mt-s">{IND_INFO[k].desc}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PersonRow({ ch }: { ch: Character }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <button className="row" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', width: '100%' }} onClick={() => setOpen(!open)}>
        <div className="grow">
          <b>{ch.name}</b>
          <div className="small muted ellipsis">{ch.title}</div>
        </div>
        <span className="small muted hide-m">{opinionLabel(ch.opinion)}</span>
        <OpinionChip v={ch.opinion} />
      </button>
      {open && (
        <div className="mt-s">
          <div className="grid g4" style={{ gap: 6 }}>
            <div className="small">Personalidad: <b>{ch.personality}</b></div>
            <div className="small">Ambición: <b>{ch.ambition}</b></div>
            <div className="small">Lealtad: <b>{ch.loyalty}</b></div>
            <div className="small">Influencia: <b>{ch.influence}</b></div>
            <div className="small">Confianza: <b>{Math.round(ch.trust)}</b></div>
            <div className="small">Poder económico: <b>{ch.wealth}</b></div>
            <div className="small">Edad: <b>{ch.age}</b></div>
            {ch.bloc && <div className="small">Bloque: <b>{ch.bloc}</b></div>}
          </div>
          <div className="tiny muted upper mt-s">Historial de interacciones</div>
          {ch.memory.length === 0 && <div className="small muted">Sin interacciones registradas.</div>}
          {[...ch.memory].reverse().slice(0, 8).map((m, i) => <div key={i} className="small">{m.s} · S{m.w}: {m.t} <span className={m.d > 0 ? 'pos' : m.d < 0 ? 'neg' : 'muted'}>{m.d > 0 ? `+${m.d}` : m.d || ''}</span></div>)}
        </div>
      )}
    </div>
  );
}

function People() {
  const { s } = useGame();
  const c = userClub(s);
  const staff = c?.staff ? [c.staff.vicepresidente, c.staff.tesorero, ...(c.staff.vocales ?? []), c.staff.director_deportivo, c.staff.lider_socios, c.staff.opositor, c.staff.lider_barra].filter(Boolean).map((id) => s.chars[id!]).filter((x) => x && x.active) : [];
  const assoc = [s.assoc.presidentId, ...Object.values(s.chars).filter((x) => x.role === 'dirigente_asociacion' && x.active).map((x) => x.id)].filter(Boolean).map((id) => s.chars[id!]).filter(Boolean);
  const coaches = Object.values(s.coaches).filter((x) => x.memory.length > 0).sort((a, b) => b.opinion - a.opinion).slice(0, 10);
  const others = Object.values(s.chars).filter((x) => x.active && ['periodista', 'politico', 'empresario', 'representante', 'referente_hinchas'].includes(x.role)).sort((a, b) => Math.abs(b.opinion) - Math.abs(a.opinion));
  return (
    <div className="grid g2 stack">
      {staff.length > 0 && <Card title="Comisión directiva y entorno del club">{staff.map((ch) => <PersonRow key={ch.id} ch={ch} />)}</Card>}
      <Card title="Asociación nacional">{assoc.map((ch) => <PersonRow key={ch.id} ch={ch} />)}</Card>
      <Card title="Entrenadores que te recuerdan">
        {coaches.length === 0 && <Empty>Ningún entrenador guarda recuerdos de vos todavía.</Empty>}
        {coaches.map((co) => <div key={co.id} className="list-row"><div className="grow"><b>{co.name}</b><div className="small muted ellipsis">{co.clubId ? s.clubs[co.clubId]?.name : co.nationalTeam ? 'Seleccionador' : 'Libre'} · “{co.memory[co.memory.length - 1].t}”</div></div><OpinionChip v={co.opinion} /></div>)}
      </Card>
      <Card title="Prensa, política, negocios y representantes">{others.slice(0, 18).map((ch) => <PersonRow key={ch.id} ch={ch} />)}</Card>
    </div>
  );
}

function Groups() {
  const { s, act } = useGame();
  const c = userClub(s)!;
  const leader = (k: 'lider_socios' | 'opositor' | 'lider_barra') => (c.staff?.[k] ? s.chars[c.staff[k]!] : null);
  const cd = (k: string, w: number) => actionCooldown(s, k, w);
  const digital = Math.round((s.ind.hinchas * 0.6 + s.ind.periodistas * 0.4));
  const groups: { name: string; value: number; desc: string; who?: Character | null }[] = [
    { name: 'Socios', value: s.ind.socios, desc: `${(c.members * 1000).toLocaleString('es-AR')} socios. Votan en las elecciones y pagan la cuota.`, who: leader('lider_socios') },
    { name: 'Hinchas tradicionales', value: s.ind.hinchas, desc: 'Llenan el estadio, compran camisetas y exigen resultados.' },
    { name: 'Hinchas digitales', value: digital, desc: 'Marcan la agenda en redes: amplifican aciertos y errores.' },
    { name: 'Agrupación opositora', value: 50 - (leader('opositor')?.opinion ?? 0) / 2, desc: 'Más alto = oposición más fuerte. Capitaliza cada crisis.', who: leader('opositor') },
    { name: 'Barra brava', value: s.ind.barra, desc: 'Muy baja: violencia. Muy alta: exigencias, extorsión y riesgo judicial.', who: leader('lider_barra') },
  ];
  return (
    <div className="stack-m">
      <div className="grid g2 stack">
        {groups.map((g) => (
          <Card key={g.name} title={g.name} right={<b className="num">{Math.round(g.value)}</b>}>
            <Bar value={g.value} />
            <div className="small muted mt-s">{g.desc}</div>
            {g.who && <div className="small mt-s">Referente: <b>{g.who.name}</b> · {opinionLabel(g.who.opinion)}</div>}
          </Card>
        ))}
      </div>
      <Card title="Acciones institucionales">
        <div className="list-row wrap"><div className="grow"><b>Reunión abierta con socios</b><div className="small muted">Escuchar reclamos mejora el apoyo. {cd('socios', 6) ?? 'Disponible.'}</div></div><button className="btn sm" disabled={!!cd('socios', 6)} onClick={() => act((g) => meetMembers(g, rngOf(g)), { toast: true })}>Convocar</button></div>
        <div className="list-row wrap"><div className="grow"><b>Reunión con la barra</b><div className="small muted">Baja la tensión a cambio de integridad y riesgo judicial. {cd('barra', 8) ?? 'Disponible.'}</div></div><button className="btn sm" disabled={!!cd('barra', 8)} onClick={() => act((g) => meetBarra(g), { toast: true })}>Reunirse</button></div>
        <div className="list-row wrap"><div className="grow"><b>Política de transparencia</b><div className="small muted">Contratos y balances públicos. Integridad alta y menor riesgo, pero algunos representantes se molestan.</div></div><button className="btn sm" disabled={!!s.flags.transparencia} onClick={() => act((g) => transparencyPolicy(g), { toast: true })}>{s.flags.transparencia ? 'Vigente' : 'Adoptar'}</button></div>
        <label className="field mt">Nivel de seguridad en partidos de local: {Math.round(s.economy.securityLevel * 100)}%<input type="range" min={0.6} max={2} step={0.1} value={s.economy.securityLevel} onChange={(e) => act((g) => setSecurity(g, Number(e.target.value)))} /></label>
        <div className="small muted">Más seguridad cuesta más por partido, enfría la relación con la barra y reduce el riesgo de incidentes.</div>
      </Card>
    </div>
  );
}

function Infra() {
  const { s, act } = useGame();
  const c = userClub(s)!;
  const keys = Object.keys(FACILITY_INFO) as FacilityKey[];
  return (
    <div className="stack-m">
      {s.projects.length > 0 && (
        <Card title="Obras en curso">
          {s.projects.map((p) => (
            <div key={p.id} className="list-row wrap">
              <div className="grow"><b>{p.name}</b> {p.delayed && <span className="chip red">Demorada</span>}<div className="small muted">Costo {money(p.cost)} · pagado {money(p.paid)} · {p.weeksLeft} semanas restantes{p.financed ? ' · financiada' : ''}</div></div>
              <div style={{ width: 140 }}><Bar value={((p.weeksTotal - p.weeksLeft) / p.weeksTotal) * 100} color="var(--gold)" /></div>
            </div>
          ))}
        </Card>
      )}
      <div className="grid g2 stack">
        {keys.map((k) => {
          const lvl = c.facilities[k];
          const cost = projectCost(c, k);
          const busy = s.projects.some((p) => p.facility === k);
          return (
            <Card key={k} title={FACILITY_INFO[k].name} right={<span className="chip gold">Nivel {lvl}/5</span>}>
              <Bar value={lvl * 20} color="var(--gold)" />
              <div className="small muted mt-s">{FACILITY_INFO[k].desc}{k === 'estadio' ? ` Capacidad actual: ${c.stadium.capacity.toLocaleString('es-AR')}.` : ''}</div>
              {lvl < 5 && (
                <>
                  <div className="small mt-s">Mejora a nivel {lvl + 1}: <b>{money(cost)}</b> · {FACILITY_INFO[k].weeks} semanas</div>
                  <div className="row wrap mt-s">
                    <button className="btn sm gold" disabled={busy || c.fin.cash < cost * 0.3} onClick={() => act((g) => startProject(g, k, false), { toast: true })}>Con fondos propios (30% anticipo)</button>
                    <button className="btn sm" disabled={busy || c.fin.cash < cost * 0.1} onClick={() => act((g) => startProject(g, k, true), { toast: true })}>Financiada (10%)</button>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>
      <div className="small muted">Caja disponible: <Money v={c.fin.cash} />. Las obras pueden sufrir sobrecostos, demoras y conflictos, pero generan beneficios de largo plazo.</div>
    </div>
  );
}

function Promises() {
  const { s } = useGame();
  const now = absWeek(s);
  const open = s.promises.filter((p) => p.kept === null);
  const closed = s.promises.filter((p) => p.kept !== null).slice(-20).reverse();
  return (
    <div className="grid g2 stack">
      <Card title="Promesas vigentes">
        {open.length === 0 && <Empty>No tenés promesas pendientes. Cada promesa suma apoyo hoy… y se cobra mañana.</Empty>}
        {open.map((p) => <div key={p.id} className="list-row small"><span className="grow">{p.text}{p.to && s.chars[p.to] ? <span className="muted"> · a {s.chars[p.to].name}</span> : null}</span><span className="chip amber">{Math.max(0, p.deadlineAbs - now)} sem.</span></div>)}
      </Card>
      <Card title="Promesas cumplidas e incumplidas">
        {closed.length === 0 && <Empty>Todavía no venció ninguna promesa.</Empty>}
        {closed.map((p) => <div key={p.id} className="list-row small"><span className="grow">{p.text}</span><span className={`chip ${p.kept ? 'green' : 'red'}`}>{p.kept ? 'Cumplida' : 'Incumplida'}</span></div>)}
      </Card>
      <KPI label="Promesas rotas en tu carrera" value={Number(s.flags.brokenPromises ?? 0)} sub="Los socios y los personajes lo recuerdan" />
    </div>
  );
}
void IND_INFO as unknown as IndKey;
