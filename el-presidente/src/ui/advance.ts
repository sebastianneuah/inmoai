// Lógica de avance del tiempo desde la interfaz (semana, próximo partido, mes, próximo acontecimiento).
import { useGame, type ModalState } from './store';
import { advanceWeek, simulateToNextMatch, advanceMany, blockingReason, type MultiReport } from '../engine/game';
import type { WeekReport } from '../engine/types';

export function useAdvance() {
  const { s, act, push, toast } = useGame();

  const after = (weeks: WeekReport[], stopReason: string) => {
    const queue: ModalState[] = []; // se muestran en orden
    const fixtures = weeks.flatMap((w) => w.userFixtures);
    if (fixtures.length) {
      const last = fixtures[fixtures.length - 1];
      queue.push({ type: 'match', fixtureId: last, live: s.settings.liveMatches && weeks.length === 1 && fixtures.length === 1 });
      if (fixtures.length > 1 && weeks.length === 1) {
        // segundo partido en la misma semana: también se muestra
        queue.splice(0, 1, { type: 'match', fixtureId: fixtures[0], live: false }, { type: 'match', fixtureId: last, live: false });
      }
    }
    const notes = weeks.flatMap((w) => w.notes).filter(Boolean);
    const ended = weeks.find((w) => w.seasonEnded);
    if (ended) {
      const summary = s.seasons[s.seasons.length - 1];
      if (summary) queue.push({ type: 'season', summary });
    }
    if (notes.length >= 3 || (weeks.length > 1 && notes.length)) queue.push({ type: 'report', notes, title: weeks.length > 1 ? `Resumen: ${weeks.length} semanas simuladas` : 'Novedades de la semana' });
    else notes.forEach((n) => toast(n));
    const urgent = s.inbox.find((e) => e.urgency === 'urgente');
    if (urgent) queue.push({ type: 'decision', uid: urgent.uid });
    if (s.gameOver) queue.push({ type: 'bio' });
    if (queue.length) push(...queue.reverse());
    if (stopReason && weeks.length > 1) toast(stopReason);
  };

  const guard = (): boolean => {
    const b = blockingReason(s);
    if (b) {
      toast(b, 'err');
      const urgent = s.inbox.find((e) => e.urgency === 'urgente');
      if (urgent) push({ type: 'decision', uid: urgent.uid });
      return false;
    }
    return true;
  };

  return {
    week: () => {
      if (!guard()) return;
      const r = act((g) => advanceWeek(g));
      after([r], '');
    },
    nextMatch: () => {
      if (!guard()) return;
      const r: MultiReport = act((g) => simulateToNextMatch(g));
      after(r.weeks, r.stopReason);
    },
    month: () => {
      if (!guard()) return;
      const r: MultiReport = act((g) => advanceMany(g, 4));
      after(r.weeks, r.stopReason);
    },
    toEvent: () => {
      if (!guard()) return;
      const r: MultiReport = act((g) => advanceMany(g, 10, true));
      after(r.weeks, r.stopReason);
    },
  };
}
