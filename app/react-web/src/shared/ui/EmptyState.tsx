import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import './empty-state.scss';

export interface EmptyStateProps {
  readonly title: string;
  readonly message: string;
  readonly icon?: IconName;
  readonly qa?: string;
  readonly children?: ReactNode;
}

/** Shared empty / zero-result presentation with an optional action slot. */
export const EmptyState = ({ title, message, icon = 'search', qa, children }: EmptyStateProps) => (
  <div className="empty" role="status" data-qa={qa}>
    <span className="empty__icon">
      <Icon name={icon} size={24} />
    </span>
    <h3 className="empty__title">{title}</h3>
    <p className="empty__message">{message}</p>
    {children}
  </div>
);
