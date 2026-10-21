'use client';

import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning-subtle px-4 py-2 text-sm font-medium">
      <WifiOff className="size-4 text-warning" aria-hidden />
      You are offline. Edits are kept on this device and saved to your account when you reconnect.
    </div>
  );
}
