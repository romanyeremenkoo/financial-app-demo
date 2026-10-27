const MONOGRAM_LENGTH = 2;

const FALLBACK_MONOGRAM = '?';

/**
 * Builds an uppercase monogram from a person or merchant name: the initials of
 * the first two words, or the first two letters when there is only one word.
 */
export const monogram = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return FALLBACK_MONOGRAM;
  }
  if (words.length === 1) {
    return words[0].slice(0, MONOGRAM_LENGTH).toUpperCase();
  }
  return words
    .slice(0, MONOGRAM_LENGTH)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
};
