// Periódico deportivo dinámico y entrevistas.
import React, { useState } from 'react';
import { useGame } from '../store';
import { Card, Empty, Tabs } from '../components';
import { PAPERS } from '../../engine/news';
import { STATEMENTS, giveInterview, actionCooldown } from '../../engine/actions';

export function News() {
  const { s, act } = useGame();
  const [tab, setTab] = useState<'todas' | 'mias'>('todas');
  const list = s.news.filter((n) => tab === 'todas' || n.mine);
  const paper = PAPERS[s.week % PAPERS.length];
  const cd = actionCooldown(s, 'entrevista', 3);
  return (
    <>
      <div className="page-h"><div><h1>Noticias</h1><div className="sub">Titulares generados a partir de lo que sucede en tu partida.</div></div></div>
      <div className="grid g2 stack" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <Card>
          <div className="newspaper-mast">{paper}</div>
          <Tabs tabs={[{ id: 'todas', label: 'Todas' }, { id: 'mias', label: 'Sobre tu gestión' }]} value={tab} onChange={setTab} />
          {list.length === 0 && <Empty>Sin noticias.</Empty>}
          {list.slice(0, 60).map((n) => (
            <div key={n.id} className="news-item">
              <div className="tiny muted upper">{n.season} · semana {n.week}{n.tag ? ` · ${n.tag}` : ''}</div>
              <h4 className={n.tone === 'neg' ? 'neg' : n.tone === 'pos' ? '' : ''} style={{ color: n.tone === 'neg' ? '#ff9a9d' : n.tone === 'pos' ? 'var(--text)' : 'var(--text)' }}>{n.headline}</h4>
              {n.body && <p className="small muted mt-s">{n.body}</p>}
            </div>
          ))}
        </Card>
        <Card title="Dar una entrevista">
          <div className="small muted mb">Tus declaraciones modifican relaciones y pueden tener consecuencias futuras. {cd ?? ''}</div>
          <div className="col gap-s">
            {STATEMENTS.map((st) => <button key={st.id} className="decision-opt" disabled={!!cd} onClick={() => act((g) => giveInterview(g, st.id), { toast: true })}><span className="grow small">{st.label}</span></button>)}
          </div>
          <div className="tiny muted mt">Relación con periodistas: {Math.round(s.ind.periodistas)}</div>
        </Card>
      </div>
    </>
  );
}
