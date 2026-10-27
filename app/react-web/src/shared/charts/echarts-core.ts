import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';

/**
 * ECharts is registered through its tree-shakeable core build: only the chart
 * types and components the app actually renders are pulled into the bundle.
 */
echarts.use([PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

export type ChartInstance = EChartsType;

export const initChart = (element: HTMLElement): ChartInstance =>
  echarts.init(element, undefined, { renderer: 'canvas' });
