import type { ReactElement } from 'react';
import './icon.scss';

export type IconName =
  | 'grid'
  | 'wallet'
  | 'card'
  | 'list'
  | 'transfer'
  | 'chart'
  | 'eye'
  | 'eye-off'
  | 'search'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'arrow-down-left'
  | 'check'
  | 'close'
  | 'freeze'
  | 'unfreeze'
  | 'alert'
  | 'menu'
  | 'logout'
  | 'chevron-down'
  | 'clock'
  | 'refresh';

const DEFAULT_ICON_SIZE_PX = 20;

/** Default stroke weight, tuned to sit between Inter's regular and medium. */
const DEFAULT_ICON_STROKE_WIDTH = 1.7;

/**
 * Inline SVG icon set.
 *
 * Icons are authored in-repo rather than pulled from an icon font so the
 * bundle stays small and every glyph inherits `currentColor` and the stroke
 * weight of the surrounding typography.
 */
const GLYPHS: Readonly<Record<IconName, ReactElement>> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 8a3 3 0 0 1 3-3h11a2 2 0 0 1 2 2v2" />
      <rect x="3" y="7" width="18" height="12" rx="3" />
      <path d="M16 13h2" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
      <path d="M6 15h4" />
    </>
  ),
  list: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </>
  ),
  transfer: (
    <>
      <path d="M4 8h13" />
      <path d="M14 5l3 3-3 3" />
      <path d="M20 16H7" />
      <path d="M10 13l-3 3 3 3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.4 4.1" />
      <path d="M6.3 7.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 3.7-.75" />
      <path d="M9.9 10.2a3 3 0 0 0 4 4.1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h15" />
      <path d="M14 7l5 5-5 5" />
    </>
  ),
  'arrow-up-right': (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  'arrow-down-left': (
    <>
      <path d="M17 7 7 17" />
      <path d="M16 17H7V8" />
    </>
  ),
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  freeze: (
    <>
      <path d="M12 3v18" />
      <path d="m4.5 7.5 15 9" />
      <path d="m19.5 7.5-15 9" />
      <path d="m9 5 3 2 3-2" />
      <path d="m9 19 3-2 3 2" />
    </>
  ),
  unfreeze: (
    <>
      <path d="M12 3v7" />
      <path d="m5 8 4 2.5" />
      <path d="m19 8-4 2.5" />
      <rect x="6" y="13" width="12" height="8" rx="2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.5 2.8 19.5h18.4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  logout: (
    <>
      <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </>
  ),
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11.5a8 8 0 1 0-1.3 5.5" />
      <path d="M20 5v6h-6" />
    </>
  ),
};

export interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly strokeWidth?: number;
}

export const Icon = ({
  name,
  size = DEFAULT_ICON_SIZE_PX,
  strokeWidth = DEFAULT_ICON_STROKE_WIDTH,
}: IconProps) => (
  <span className="fin-icon">
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLYPHS[name]}
    </svg>
  </span>
);
