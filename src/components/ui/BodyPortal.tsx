'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribeNoop = () => () => {};

/**
 * Renders children on document.body. Wizard sections, cards and the portal header use
 * backdrop-blur, which makes them the containing block for `fixed` descendants — an overlay
 * rendered inside them would be clipped to that box (US-0119, US-0138).
 */
export function BodyPortal({ children }: { children: ReactNode }) {
  // false during SSR/hydration, true on the client — avoids touching `document` on the server
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  return isClient ? createPortal(children, document.body) : null;
}
