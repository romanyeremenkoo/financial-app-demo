import './status-chip.scss';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export interface StatusChipProps {
  readonly label: string;
  readonly tone?: StatusTone;
  readonly qa?: string;
}

/** Compact status pill used for transaction and card states. */
export const StatusChip = ({ label, tone = 'neutral', qa }: StatusChipProps) => (
  <span className={`chip chip--${tone}`} data-qa={qa}>
    {label}
  </span>
);
