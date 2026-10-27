import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { DemoSessionContext } from './demo-session-context';

const STORAGE_KEY = 'financial-app.demo-session';

/**
 * Session-storage access for the demo gate.
 *
 * Storage can throw (private mode, disabled cookies), so both helpers degrade
 * to a safe default and let the in-memory state remain the source of truth.
 */
const readFlag = (): boolean => {
  try {
    return globalThis.sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeFlag = (value: boolean): void => {
  try {
    globalThis.sessionStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Intentionally ignored: the in-memory state still drives the session.
  }
};

/**
 * Lightweight stand-in for authentication.
 *
 * There is no credential handling: entering the demo simply marks the session
 * as active and unlocks the product routes. The flag survives a page reload so
 * deep links keep working during a demo.
 */
export const DemoSessionProvider = ({ children }: { readonly children: ReactNode }) => {
  const [isActive, setActive] = useState<boolean>(readFlag);

  const update = useCallback((value: boolean) => {
    setActive(value);
    writeFlag(value);
  }, []);

  const value = useMemo(
    () => ({
      isActive,
      enter: () => {
        update(true);
      },
      exit: () => {
        update(false);
      },
    }),
    [isActive, update],
  );

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>;
};
