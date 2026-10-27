/** Monotonic counter guaranteeing uniqueness within a single browser session. */
let sequence = 0;

const RADIX = 36;
const RANDOM_SLICE_START = 2;
const RANDOM_SLICE_LENGTH = 8;

/**
 * Stable, collision-resistant identifier for client-generated entities.
 *
 * `crypto.randomUUID` is used when available; the counter suffix keeps ids
 * unique even in the fallback path and makes them sortable within a session.
 */
export const createId = (prefix: string): string => {
  sequence += 1;

  const random =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, RANDOM_SLICE_LENGTH)
      : Math.random()
          .toString(RADIX)
          .slice(RANDOM_SLICE_START, RANDOM_SLICE_START + RANDOM_SLICE_LENGTH);

  return `${prefix}-${random}-${sequence.toString(RADIX)}`;
};

/** Idempotency key minted once per review step and reused by every retry. */
export const createRequestToken = (): string => createId('req');
