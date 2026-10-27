/** `[0, 1, …, count - 1]`, used to render a fixed number of placeholders. */
export const range = (count: number): readonly number[] =>
  Array.from({ length: count }, (_, index) => index);
