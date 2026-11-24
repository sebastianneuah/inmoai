// Configuración de una nueva carrera.
import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { ARG_PRIMERA, ARG_NACIONAL, ARG_FEDERAL, COUNTRY_INFO } from '../../engine/data/clubs';
import { PERSONALITIES, DIFFICULTIES } from '../../engine/data/world';
import { NATIONALITIES } from '../../engine/data/names';
import { newGame } from '../../engine/game';
import { Crest, Icon, Card } from '../components';
import { loadPrefs } from './Menu';
import type { Difficulty, PersonalityId, GameMode, CrestDef } from '../../engine/types';
import { money } from '../../engine/util';

const DIVS = [
  { div: 1, name: 'Liga Profesional', rows: ARG_PRIMERA },
  { div: 2, name: 'Primera Nacional', rows: ARG_NACIONAL },
  { div: 3, name: 'Torneo Federal', rows: ARG_FEDERAL },
];

function budgetLabel(div: number, prestige: number) {
  const est = div === 1 ? 6_000_000 + Math.pow(prestige / 100, 3) * 55_000_000 : div === 2 ? 2_000_000 + prestige * 50_000 : 400_000 + prestige * 10_000;
  return `~${money(est)}/año`;
}
function challenge(div: number, prestige: number) {
  if (div === 1 && prestige >= 85) return { t: 'Presión máxima', c: 'red' };
  if (div === 1 && prestige >= 70) return { t: 'Exigente', c: 'amber' };
  if (div === 1) return { t: 'Pelear la permanencia', c: 'amber' };
  if (div === 2 && prestige >= 55) return { t: 'Candidato al ascenso', c: 'blue' };
  if (div === 2) return { t: 'Reconstrucción', c: 'blue' };
  return { t: 'Desde abajo', c: 'green' };
}

export function NewCareer() {
  const { setScreen, load, toast } = useStore();
  const prefs = loadPrefs();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [nat, setNat] = useState('ARG');
  const [age, setAge] = useState(48);
  const [pers, setPers] = useState<PersonalityId>('empresario');
  const [clubId, setClubId] = useState('cl_sab');
  const [div, setDiv] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [mandate, setMandate] = useState(3);
  const [mode, setMode] = useState<GameMode>(prefs.mode);
  const [busy, setBusy] = useState(false);

  const clubs = useMemo(() => DIVS.find((d) => d.div === div)!.rows, [div]);
  const chosen = [...ARG_PRIMERA, ...ARG_NACIONAL, ...ARG_FEDERAL].find((r) => `cl_${r[1].toLowerCase()}` === clubId);
  const p = PERSONALITIES.find((x) => x.id === pers)!;
  const canNext = step === 0 ? name.trim().length >= 2 && surname.trim().length >= 2 && age >= 25 && age <= 80 : true;

  const start = () => {
    setBusy(true);
    setTimeout(() => {
      try {
        const g = newGame({ name: name.trim(), surname: surname.trim(), nationality: nat, age, country: 'ARG', clubId, difficulty, personality: pers, mandateYears: mandate, mode });
        g.settings = { ...prefs, difficulty, mode, liveMatches: mode === 'rapido' ? false : prefs.liveMatches };
        load(g);
      } catch (e) {
        console.error(e);
        toast('No se pudo crear la partida.', 'err');
        setBusy(false);
      }
    }, 30);
  };

  const steps = ['Presidente', 'Perfil', 'Club', 'Mandato'];
  return (
    <div className="content" style={{ maxWidth: 920 }}>
      <div className="page-h">
        <div className="row">
          <button className="icon-btn" onClick={() => (step ? setStep(step - 1) : setScreen('menu'))} aria-label="Volver">
            <Icon name="left" />
          </button>
          <div>
            <h1>Nueva carrera</h1>
            <div className="sub">Paso {step + 1} de 4 · {steps[step]}</div>
          </div>
        </div>
        <div className="row gap-s">
          {steps.map((s, i) => (
            <span key={s} className={`chip ${i === step ? 'gold' : i < step ? 'green' : ''}`}>{i + 1}. {s}</span>
          ))}
        </div>
      </div>

      {step === 0 && (
        <Card>
          <div className="grid g2 stack">
            <label className="field">Nombre<input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Horacio" maxLength={24} autoFocus /></label>
            <label className="field">Apellido<input className="input" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Ej.: Mendizábal" maxLength={24} /></label>
            <label className="field">Nacionalidad
              <select className="input" value={nat} onChange={(e) => setNat(e.target.value)}>
                {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{n.name}</option>)}
              </select>
            </label>
            <label className="field">Edad: {age} años<input type="range" min={28} max={75} value={age} onChange={(e) => setAge(Number(e.target.value))} /></label>
          </div>
          <label className="field mt">País donde comienza la carrera
            <select className="input" value="ARG" onChange={() => undefined}>
              <option value="ARG">Argentina — Asociación Argentina de Fútbol</option>
            </select>
          </label>
          <p className="small muted mt-s">{COUNTRY_INFO.ARG.politics} Los clubes de Brasil, Uruguay, Chile, Colombia, México, EE.UU., España, Inglaterra, Italia, Alemania, Francia, Portugal y Arabia Saudita participan como rivales internacionales, compradores y vendedores.</p>
        </Card>
      )}

      {step === 1 && (
        <div className="opt-grid">
          {PERSONALITIES.map((x) => (
            <button key={x.id} className={`opt-card ${pers === x.id ? 'on' : ''}`} onClick={() => setPers(x.id)}>
              <div className="row between"><b>{x.name}</b>{pers === x.id && <Icon name="check" size={18} style={{ color: 'var(--gold)' }} />}</div>
              <span className="small muted">{x.desc}</span>
              <div className="small">{x.strengths.map((s) => <div key={s} className="pos">+ {s}</div>)}{x.weaknesses.map((s) => <div key={s} className="neg">− {s}</div>)}</div>
              <span className="tiny muted">Patrimonio: {money(x.wealth)} · Contactos: {x.contacts}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <>
          <div className="tabs">
            {DIVS.map((d) => (
              <button key={d.div} className={`tab ${div === d.div ? 'on' : ''}`} onClick={() => setDiv(d.div)}>{d.name}</button>
            ))}
          </div>
          <div className="grid g2 stack">
            {clubs.map((r) => {
              const id = `cl_${r[1].toLowerCase()}`;
              const crest: CrestDef = { shape: r[9], pattern: r[10], c1: r[4], c2: r[5] };
              const ch = challenge(div, r[3]);
              return (
                <button key={id} className={`club-pick ${clubId === id ? 'on' : ''}`} onClick={() => setClubId(id)}>
                  <Crest crest={crest} short={r[1].slice(0, 3)} size={40} />
                  <div className="grow">
                    <div style={{ fontWeight: 700 }} className="ellipsis">{r[0]}</div>
                    <div className="small muted ellipsis">{r[2]} · {r[6]} ({r[7].toLocaleString('es-AR')})</div>
                    <div className="row gap-s mt-s wrap">
                      <span className="chip gold">Prestigio {r[3]}</span>
                      <span className={`chip ${ch.c}`}>{ch.t}</span>
                      <span className="chip">{budgetLabel(div, r[3])}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 3 && (
        <div className="grid g2 stack">
          <Card title="Dificultad">
            <div className="col">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                <button key={d} className={`opt-card ${difficulty === d ? 'on' : ''}`} onClick={() => setDifficulty(d)}>
                  <b>{DIFFICULTIES[d].name}</b>
                  <span className="small muted">{DIFFICULTIES[d].desc}</span>
                </button>
              ))}
            </div>
          </Card>
          <div className="col">
            <Card title="Duración del mandato inicial">
              <div className="row">
                {[2, 3, 4].map((y) => (
                  <button key={y} className={`opt-card grow ${mandate === y ? 'on' : ''}`} onClick={() => setMandate(y)}>
                    <b>{y} años</b>
                    <span className="small muted">{y === 2 ? 'Elecciones pronto' : y === 3 ? 'Estándar' : 'Margen para un proyecto'}</span>
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Modo de juego">
              <div className="col">
                {([['rapido', 'Rápido', 'Sólo decisiones importantes y partidos instantáneos'], ['normal', 'Normal', 'Decisiones frecuentes y gestión intermedia'], ['detallado', 'Detallado', 'Gestión institucional profunda']] as const).map(([id, n, d]) => (
                  <button key={id} className={`opt-card ${mode === id ? 'on' : ''}`} onClick={() => setMode(id)}>
                    <b>{n}</b>
                    <span className="small muted">{d}</span>
                  </button>
                ))}
              </div>
            </Card>
            <Card>
              <div className="row">
                {chosen && <Crest crest={{ shape: chosen[9], pattern: chosen[10], c1: chosen[4], c2: chosen[5] }} short={chosen[1].slice(0, 3)} size={46} />}
                <div className="grow">
                  <div className="tiny muted upper">Resumen</div>
                  <div style={{ fontWeight: 800 }}>{name} {surname}</div>
                  <div className="small muted">{p.name} · {chosen?.[0]} · {mandate} años · {DIFFICULTIES[difficulty].name}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <div className="row mt" style={{ justifyContent: 'flex-end' }}>
        {step < 3 ? (
          <button className="btn gold" disabled={!canNext} onClick={() => setStep(step + 1)}>Siguiente <Icon name="right" size={18} /></button>
        ) : (
          <button className="btn gold big" disabled={busy} onClick={start}>{busy ? 'Generando universo…' : 'Asumir la presidencia'}</button>
        )}
      </div>
    </div>
  );
}
