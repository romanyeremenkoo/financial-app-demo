import { useLanguage } from '../../app/providers/language-context';
import { type Money as MoneyValue, formatMoney } from '../../domain/money/money';
import './money.scss';

export interface MoneyProps {
  readonly value: MoneyValue;
  readonly signDisplay?: 'auto' | 'always' | 'never';
  readonly hidden?: boolean;
  /** Colour credits green / debits neutral. Off for neutral totals. */
  readonly tone?: 'signed' | 'neutral';
  readonly className?: string;
}

/**
 * Renders a monetary value with tabular numerals.
 *
 * All formatting flows through the domain formatter, so no component can
 * invent its own currency presentation.
 */
export const Money = ({
  value,
  signDisplay = 'auto',
  hidden = false,
  tone = 'neutral',
  className,
}: MoneyProps) => {
  const { locale } = useLanguage();
  const formatted = formatMoney(value, { signDisplay, hidden, locale });
  const signed = tone === 'signed' && !hidden;

  const classes = [
    'amount',
    signed && value.amountMinor > 0 ? 'amount--positive' : '',
    signed && value.amountMinor < 0 ? 'amount--negative' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes}>{formatted}</span>;
};
