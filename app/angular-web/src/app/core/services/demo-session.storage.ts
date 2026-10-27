const STORAGE_KEY = 'financial-app.demo-session';

/**
 * Session-storage access for the demo gate.
 *
 * Storage can throw (private mode, disabled cookies), so both helpers degrade
 * to a safe default and let the in-memory signal remain the source of truth.
 */
export const readDemoSessionFlag = (): boolean => {
  try {
    return globalThis.sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const writeDemoSessionFlag = (value: boolean): void => {
  try {
    globalThis.sessionStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Intentionally ignored: the in-memory signal still drives the session.
  }
};
