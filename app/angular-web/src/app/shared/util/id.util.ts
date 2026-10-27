let counter = 0;

/** Radix used to keep the generated segments short and URL-safe. */
const ID_RADIX = 36;

/** `Math.random().toString(36)` yields `0.xxxxx`; skip the `0.` prefix. */
const RANDOM_PREFIX_LENGTH = 2;
const RANDOM_SEGMENT_LENGTH = 6;

/**
 * Stable, collision-free identifiers for client-created entities.
 * Monotonic suffix keeps ordering deterministic inside a session.
 */
export const createId = (prefix: string): string => {
  counter += 1;
  const random = Math.random()
    .toString(ID_RADIX)
    .slice(RANDOM_PREFIX_LENGTH, RANDOM_PREFIX_LENGTH + RANDOM_SEGMENT_LENGTH);
  return `${prefix}-${Date.now().toString(ID_RADIX)}-${counter.toString(ID_RADIX)}-${random}`;
};

/** Idempotency key for a single user submission attempt. */
export const createRequestToken = (): string => createId('req');
