import type { ReactNode } from 'react';
import './page-header.scss';

export interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string | null;
  readonly children?: ReactNode;
}

/** Consistent page heading with a slot for page-level actions. */
export const PageHeader = ({ title, subtitle = null, children }: PageHeaderProps) => (
  <header className="header">
    <div className="header__text">
      <h1 className="header__title">{title}</h1>
      {subtitle !== null && subtitle !== '' ? <p className="header__subtitle">{subtitle}</p> : null}
    </div>
    <div className="header__actions">{children}</div>
  </header>
);
