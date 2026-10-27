/** `[0, 1, …, count - 1]`, used to render a fixed number of placeholders. */
export const range = (count: number): readonly number[] =>
  Array.from({ length: count }, (_, index) => index);

/**
 * Groups adjacent items that share a derived key.
 *
 * Grouping is deliberately consecutive rather than global: under an amount
 * sort the same day can legitimately appear in more than one block, and
 * merging those blocks would reorder the user's chosen sort.
 */
export const groupConsecutive = <T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K,
): readonly { readonly key: K; readonly items: readonly T[] }[] => {
  const groups: { key: K; items: T[] }[] = [];

  for (const item of items) {
    const key = keyOf(item);
    const current = groups.at(-1);
    if (current === undefined || current.key !== key) {
      groups.push({ key, items: [item] });
    } else {
      current.items.push(item);
    }
  }
  return groups;
};
