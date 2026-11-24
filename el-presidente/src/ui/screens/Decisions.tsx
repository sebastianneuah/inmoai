// Bandeja de acontecimientos y registro de decisiones.
import React, { useState } from 'react';
import { useGame } from '../store';
import { Card, Empty, Icon, Tabs } from '../components';
import { CAT_LABEL, EVENTS, delegateUrgent, type Cat } from '../../engine/events';
import { rngOf } from '../../engine/rng';
import { absWeek } from '../../engine/util';

export function Decisions() {
  const { s, push, act, toast } = useGame();
  const [tab, setTab] = useState<'bandeja' | 'historial'>('bandeja');
  const now = absWeek(s);
  const groups: ['urgente' | 'importante' | 'informativo', string][] = [['urgente', 'Urgentes'], ['importante', 'Importantes'], ['informativo', 'Informativos']];
  return (
    <>
      <div className="page-h">
        <div>
          <h1>Decisiones</h1>
          <div className="sub">Las urgentes bloquean el avance. Las demás se resuelven solas al vencer su plazo, con la opción más conservadora.</div>
        </div>
        {s.inbox.some((e) => e.urgency === 'urgente') && (
          <button className="btn sm" onClick={() => { const r = act((g) => delegateUrgent(g, rngOf(g))); r.forEach((x) => toast(x)); }}>Delegar urgentes al vicepresidente</button>
        )}
      </div>
      <Tabs tabs={[{ id: 'bandeja', label: `Bandeja (${s.inbox.length})` }, { id: 'historial', label: 'Historial de decisiones' }]} value={tab} onChange={setTab} />
      {tab === 'bandeja' && (
        <div className="stack-m">
          {s.inbox.length === 0 && <Card><Empty>Bandeja vacía. El fútbol nunca duerme: avanzá una semana.</Empty></Card>}
          {groups.map(([u, label]) => {
            const items = s.inbox.filter((e) => e.urgency === u);
            if (!items.length) return null;
            return (
              <Card key={u} title={label}>
                <div className="col gap-s">
                  {items.map((e) => {
                    const def = EVENTS[e.defId];
                    const left = e.expiresAbs - now;
                    return (
                      <button key={e.uid} className="inbox-item" onClick={() => push({ type: 'decision', uid: e.uid })}>
                        <span className={`dot ${e.urgency}`} />
                        <div className="grow">
                          <div style={{ fontWeight: 650 }}>{e.title}</div>
                          <div className="small muted ellipsis">{def ? CAT_LABEL[def.cat as Cat] : ''} · Gravedad {e.severity}/5 · {u === 'urgente' ? 'Requiere respuesta ya' : left <= 0 ? 'Vence esta semana' : `Vence en ${left} ${left === 1 ? 'semana' : 'semanas'}`}</div>
                        </div>
                        <Icon name="right" size={18} />
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {tab === 'historial' && (
        <Card>
          {s.resolved.length === 0 && <Empty>Todavía no tomaste decisiones.</Empty>}
          {s.resolved.slice(0, 80).map((r) => (
            <div key={r.uid} className="list-row" style={{ alignItems: 'flex-start' }}>
              <span className="chip" style={{ minWidth: 86, justifyContent: 'center' }}>{r.season} · S{r.week}</span>
              <div className="grow">
                <div style={{ fontWeight: 650 }}>{r.title}</div>
                <div className="small"><span className="gold">{r.auto ? 'Delegado/automático: ' : 'Decisión: '}</span>{r.choice}</div>
                <div className="small muted">{r.outcome}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
