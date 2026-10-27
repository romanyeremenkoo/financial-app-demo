/**
 * Chart theme.
 *
 * ECharts cannot read CSS custom properties, so the few design tokens the
 * charts need are mirrored here once instead of being repeated as literals in
 * every chart component.
 */

export const CHART_FONT_FAMILY = 'Inter, sans-serif';

export const CHART_LABEL_FONT_SIZE = 12;

const CHART_INK = '#101828';
const CHART_ON_INK = '#fff';

export const CHART_MUTED_TEXT = '#667085';
export const CHART_AXIS_LINE = '#E4E7EC';
export const CHART_SPLIT_LINE = '#EEF1F6';

export const CHART_INCOME_COLOR = '#18B7A0';
export const CHART_EXPENSE_COLOR = '#315EF5';

export const CHART_LABEL_STYLE = {
  color: CHART_MUTED_TEXT,
  fontFamily: CHART_FONT_FAMILY,
  fontSize: CHART_LABEL_FONT_SIZE,
} as const;

/** Shared tooltip chrome; each chart supplies its own formatter. */
export const CHART_TOOLTIP_STYLE = {
  borderWidth: 0,
  backgroundColor: CHART_INK,
  textStyle: {
    color: CHART_ON_INK,
    fontFamily: CHART_FONT_FAMILY,
    fontSize: CHART_LABEL_FONT_SIZE,
  },
} as const;
