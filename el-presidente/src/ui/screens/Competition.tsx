// Competiciones: tablas, fixture, goleadores, copas, selección y palmarés.
import React, { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Card, Crest, Empty, NationFlag, Tabs, Form } from '../components';
import { sortTable, teamName, userClub } from '../../engine/queries';
import type { Competition as Comp, TableRow } from '../../engine/types';

function TeamCell({ id }: { id: string }) {
  const { s } = useGame();
  const c = s.clubs[id];
  return (
    <span className="row gap-s" style={{ minWidth: 0 }}>
      {c ? <Crest club={c} size={20} /> : <NationFlag code={id} size={20} />}
      <span className="ellipsis" style={{ maxWidth: 210 }}>{teamName(s, id)}</span>
    </span>
  );
}

export function StandingsTable({ rows, me, comp, compact }: { rows: TableRow[]; me?: string | null; comp?: Comp; compact?: boolean }) {
  const t = sortTable(rows);
  const n = t.length;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr><th>#</th><th>Equipo</th><th className="r">PJ</th>{!compact && <><th className="r">G</th><th className="r">E</th><th className="r">P</th><th className="r">GF</th><th className="r">GC</th></>}<th className="r">DG</th><th className="r">PTS</th>{!compact && <th>Forma</th>}</tr>
        </thead>
        <tbody>
          {t.map((r, i) => {
            let zone = '';
            if (comp?.type === 'league' && comp.scope === 'club') {
              if (comp.division === 1 && i < (comp.intlSpots ?? 0)) zone = 'zone-intl';
              if (comp.promo && i < comp.promo) zone = 'zone-up';
              if (comp.releg && i >= n - comp.releg) zone = 'zone-down';
            }
            if (comp?.id.startsWith('elim') && i < 6) zone = 'zone-up';
            return (
              <tr key={r.id} className={`${r.id === me ? 'me' : ''} ${zone}`}>
                <td>{i + 1}</td>
                <td><TeamCell id={r.id} /></td>
                <td className="r">{r.pj}</td>
                {!compact && <><td className="r">{r.g}</td><td className="r">{r.e}</td><td className="r">{r.p}</td><td className="r">{r.gf}</td><td className="r">{r.gc}</td></>}
                <td className="r">{r.gf - r.gc > 0 ? '+' : ''}{r.gf - r.gc}</td>
                <td className="r"><b>{r.pts}</b></td>
                {!compact && <td><Form list={r.form} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Competition() {
  const { s } = useGame();
  const me = s.president.clubId;
  const uc = userClub(s);
  const comps = Object.values(s.comps).filter((c) => c.season === s.season || c.persistent);
  const leagues = comps.filter((c) => c.type === 'league' && c.scope === 'club').sort((a, b) => (a.division ?? 9) - (b.division ?? 9));
  const cups = comps.filter((c) => c.type !== 'league' && c.scope === 'club');
  const national = comps.filter((c) => c.scope === 'national');
  const [tab, setTab] = useState<'tabla' | 'fixture' | 'goleadores' | 'copas' | 'seleccion' | 'palmares'>('tabla');
  const [lg, setLg] = useState(leagues.find((l) => l.division === uc?.division)?.id ?? leagues[0]?.id);
  const [cup, setCup] = useState(cups[0]?.id);
  const [nat, setNat] = useState(national[0]?.id);
  const league = s.comps[lg ?? ''] ?? leagues[0];
  const [round, setRound] = useState<number | null>(null);

  const fixtures = useMemo(() => (league ? s.fixtures.filter((f) => f.comp === league.id) : []), [league, s.fixtures, s.week]);
  const rounds = [...new Set(fixtures.map((f) => f.week))].sort((a, b) => a - b);
  const currentRound = round ?? (rounds.find((w) => w >= s.week) ?? rounds[rounds.length - 1]);

  const scorers = useMemo(() => {
    if (!league) return [];
    const ids = new Set(league.participants);
    return Object.values(s.players).filter((p) => p.clubId && ids.has(p.clubId) && p.season.goals > 0).sort((a, b) => b.season.goals - a.season.goals || a.season.apps - b.season.apps).slice(0, 25);
  }, [league, s.players, s.week]);

  return (
    <>
      <div className="page-h"><div><h1>Competición</h1><div className="sub">Temporada {s.season} · semana {s.week}</div></div></div>
      <Tabs tabs={[{ id: 'tabla', label: 'Tablas' }, { id: 'fixture', label: 'Fixture' }, { id: 'goleadores', label: 'Goleadores' }, { id: 'copas', label: 'Copas' }, { id: 'seleccion', label: 'Selecciones' }, { id: 'palmares', label: 'Palmarés' }]} value={tab} onChange={setTab} />
      {(tab === 'tabla' || tab === 'fixture' || tab === 'goleadores') && (
        <div className="pill-tabs mb">
          {leagues.map((l) => <button key={l.id} className={`chip ${l.id === league?.id ? 'gold' : ''}`} onClick={() => { setLg(l.id); setRound(null); }}>{l.name}</button>)}
        </div>
      )}
      {tab === 'tabla' && league && (
        <Card title={league.name} right={<span className="tiny muted">{league.division === 1 ? 'Azul: Copa Continental · Rojo: descenso' : 'Verde: ascenso · Rojo: descenso'}</span>}>
          <StandingsTable rows={league.table} me={me} comp={league} />
        </Card>
      )}
      {tab === 'fixture' && league && (
        <Card title={`${league.name} · ${fixtures.find((f) => f.week === currentRound)?.round ?? ''}`} right={
          <div className="row gap-s">
            <button className="btn sm" disabled={rounds.indexOf(currentRound) <= 0} onClick={() => setRound(rounds[rounds.indexOf(currentRound) - 1])}>‹</button>
            <span className="small muted">Semana {currentRound}</span>
            <button className="btn sm" disabled={rounds.indexOf(currentRound) >= rounds.length - 1} onClick={() => setRound(rounds[rounds.indexOf(currentRound) + 1])}>›</button>
          </div>
        }>
          {fixtures.filter((f) => f.week === currentRound).map((f) => (
            <div key={f.id} className="list-row" style={{ background: f.home === me || f.away === me ? 'var(--gold-soft)' : undefined, padding: '9px 6px', borderRadius: 8 }}>
              <div className="grow right ellipsis small"><b>{teamName(s, f.home)}</b></div>
              <Crest club={s.clubs[f.home]} size={22} />
              <b className="num" style={{ minWidth: 46, textAlign: 'center' }}>{f.played ? `${f.hg} - ${f.ag}` : 'vs'}</b>
              <Crest club={s.clubs[f.away]} size={22} />
              <div className="grow ellipsis small"><b>{teamName(s, f.away)}</b></div>
            </div>
          ))}
        </Card>
      )}
      {tab === 'goleadores' && (
        <Card title={`Goleadores · ${league?.name ?? ''}`}>
          {scorers.length === 0 && <Empty>Todavía no hay goles.</Empty>}
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>#</th><th>Jugador</th><th>Club</th><th className="r">PJ</th><th className="r">Goles</th></tr></thead>
              <tbody>{scorers.map((p, i) => <tr key={p.id} className={p.clubId === me ? 'me' : ''}><td>{i + 1}</td><td>{p.name}</td><td><TeamCell id={p.clubId!} /></td><td className="r">{p.season.apps}</td><td className="r"><b>{p.season.goals}</b></td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}
      {tab === 'copas' && (
        <>
          <div className="pill-tabs mb">{cups.map((c) => <button key={c.id} className={`chip ${c.id === (cup ?? cups[0]?.id) ? 'gold' : ''}`} onClick={() => setCup(c.id)}>{c.name}</button>)}</div>
          {cups.length === 0 && <Card><Empty>No hay copas activas.</Empty></Card>}
          {s.comps[cup ?? ''] && <CupView comp={s.comps[cup!]} me={me} />}
        </>
      )}
      {tab === 'seleccion' && (
        <>
          <div className="pill-tabs mb">{national.map((c) => <button key={c.id} className={`chip ${c.id === (nat ?? national[0]?.id) ? 'gold' : ''}`} onClick={() => setNat(c.id)}>{c.name}</button>)}</div>
          {national.length === 0 && <Card><Empty>No hay competencias de selecciones esta temporada. Eliminatorias: temporadas previas al Mundial ({s.season % 4 === 3 ? s.season + 3 : '—'}). Copa de las Américas: años múltiplos de 4. Mundial: {s.season + ((2 - (s.season % 4) + 4) % 4)}.</Empty></Card>}
          {s.comps[nat ?? ''] && (s.comps[nat!].type === 'league' ? <Card title={s.comps[nat!].name}><StandingsTable rows={s.comps[nat!].table} me="ARG" comp={s.comps[nat!]} /><NatFixtures compId={nat!} /></Card> : <CupView comp={s.comps[nat!]} me="ARG" />)}
          {s.nt.results.length > 0 && <Card title="Historial reciente de Argentina" className="mt">{s.nt.results.slice(0, 10).map((r, i) => <div key={i} className="list-row small"><span className="chip">{r.season}</span><span className="grow">{r.comp}</span><b>{r.text}</b></div>)}</Card>}
        </>
      )}
      {tab === 'palmares' && (
        <Card title="Palmarés por temporada">
          {s.seasons.length === 0 && <Empty>Al terminar la primera temporada verás aquí a todos los campeones.</Empty>}
          {[...s.seasons].reverse().map((x) => (
            <div key={x.season} className="list-row" style={{ alignItems: 'flex-start' }}>
              <span className="chip gold">{x.season}</span>
              <div className="grow small">
                {Object.entries(x.champions).map(([k, v]) => <div key={k}><span className="muted">{k}:</span> <b>{v}</b></div>)}
                {x.userClub && <div className="gold mt-s">Tu club: {x.userClub} — {x.userPos}º</div>}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

function NatFixtures({ compId }: { compId: string }) {
  const { s } = useGame();
  const fx = s.fixtures.filter((f) => f.comp === compId && (f.home === 'ARG' || f.away === 'ARG')).sort((a, b) => a.week - b.week);
  if (!fx.length) return null;
  return (
    <div className="mt">
      <div className="tiny muted upper">Partidos de Argentina</div>
      {fx.map((f) => <div key={f.id} className="list-row small"><span className="chip">S{f.week}</span><span className="grow">{teamName(s, f.home)} vs {teamName(s, f.away)}</span><b>{f.played ? `${f.hg}-${f.ag}` : '—'}</b></div>)}
    </div>
  );
}

function CupView({ comp, me }: { comp: Comp; me?: string | null }) {
  const { s } = useGame();
  const fx = s.fixtures.filter((f) => f.comp === comp.id);
  const koRounds = comp.koWeeks.filter((k) => fx.some((f) => f.round === k.name && f.group === undefined));
  return (
    <div className="stack-m">
      {comp.winner && <Card><div className="row"><span className="chip gold">Campeón</span><TeamCell id={comp.winner} /></div></Card>}
      {comp.groups && (
        <div className="grid g2 stack">
          {comp.groups.map((g) => <Card key={g.name} title={g.name}><StandingsTable rows={g.table} me={me} compact /></Card>)}
        </div>
      )}
      {koRounds.map((k) => (
        <Card key={k.name} title={`${k.name} · semana ${k.week}`}>
          {fx.filter((f) => f.round === k.name && f.group === undefined).map((f) => (
            <div key={f.id} className="list-row small" style={{ background: f.home === me || f.away === me ? 'var(--gold-soft)' : undefined, borderRadius: 8, padding: '8px 6px' }}>
              <div className="grow right ellipsis"><TeamCell id={f.home} /></div>
              <b className="num" style={{ minWidth: 70, textAlign: 'center' }}>{f.played ? `${f.hg}-${f.ag}${f.pens ? ` (${f.pens[0]}-${f.pens[1]})` : ''}` : 'vs'}</b>
              <div className="grow ellipsis"><TeamCell id={f.away} /></div>
            </div>
          ))}
        </Card>
      ))}
      {!comp.groups && koRounds.length === 0 && <Card><Empty>El cuadro se sortea al comenzar.</Empty></Card>}
      <Card><div className="small muted">Próximas rondas: {comp.koWeeks.map((k) => `${k.name} (sem. ${k.week})`).join(' · ')}. Premio al campeón: USD {(comp.prizeWin / 1_000_000).toFixed(1)} M.</div></Card>
    </div>
  );
}
