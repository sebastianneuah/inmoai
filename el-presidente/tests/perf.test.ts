import { it, expect } from 'vitest';
import { newGame, advanceWeek } from '../src/engine/game';
import { resolveEvent, EVENTS } from '../src/engine/events';
it('una semana se simula rápido', () => {
  const s = newGame({ name: 'T', surname: 'P', nationality: 'ARG', age: 45, country: 'ARG', clubId: 'cl_sab', difficulty: 'normal', personality: 'empresario', mandateYears: 4, mode: 'normal', seed: 5 });
  const times: number[] = [];
  for (let i = 0; i < 40; i++) {
    while (s.inbox.length) { const e = s.inbox[0]; resolveEvent(s, e.uid, Math.max(0, EVENTS[e.defId].opts.findIndex((o) => o.auto))); }
    const t = performance.now(); advanceWeek(s); times.push(performance.now() - t);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log('ms/semana', avg.toFixed(1), 'máx', Math.max(...times).toFixed(0));
  expect(avg).toBeLessThan(150);
});
