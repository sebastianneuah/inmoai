import React from 'react';
import { StoreProvider, useStore } from './store';
import { MainMenu, SavedGames, CareerHistory, HowToPlay, SettingsScreen } from './screens/Menu';
import { NewCareer } from './screens/NewCareer';
import { GameShell } from './screens/GameShell';

function Router() {
  const { screen, toasts } = useStore();
  return (
    <>
      {screen === 'menu' && <MainMenu />}
      {screen === 'new' && <NewCareer />}
      {screen === 'saves' && <SavedGames />}
      {screen === 'history' && <CareerHistory />}
      {screen === 'how' && <HowToPlay />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'game' && <GameShell />}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
