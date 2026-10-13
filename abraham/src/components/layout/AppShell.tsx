import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ToastHost } from '@/components/ui/Toast';
import { LocationSheet } from '@/components/fulfillment/LocationSheet';
import { CartBar } from './CartBar';
import { DesktopHeader } from './DesktopHeader';
import { TabBar } from './TabBar';

export function ScreenFallback() {
  return (
    <div className="mx-auto max-w-content px-gutter pt-[calc(24px+var(--safe-top))] lg:px-8">
      <div className="shimmer h-8 w-40 rounded-sm" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer aspect-square rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** Root-tab layout: tab bar + floating cart on phones, top navigation on desktop. */
export function TabLayout() {
  return (
    <div className="min-h-dvh">
      <DesktopHeader />
      <main className={cn('pb-[calc(64px+var(--safe-bottom)+88px)] lg:pb-20')}>
        <Suspense fallback={<ScreenFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <CartBar />
      <TabBar />
      <LocationSheet />
      <ToastHost />
      <ScrollRestoration />
    </div>
  );
}

/** Pushed flows (product, cart, checkout): no tab bar, screens own their bottom actions. */
export function FlowLayout() {
  return (
    <div className="min-h-dvh">
      <DesktopHeader />
      <main>
        <Suspense fallback={<ScreenFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <LocationSheet />
      <ToastHost />
      <ScrollRestoration />
    </div>
  );
}
