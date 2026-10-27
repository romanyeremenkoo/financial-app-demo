import { useEffect, useState } from 'react';

/**
 * Debounces a rapidly changing value.
 *
 * Used for the transaction search field so typing stays responsive without
 * re-filtering the ledger on every keystroke.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
};
