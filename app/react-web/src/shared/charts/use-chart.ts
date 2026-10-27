import { useEffect, useRef } from 'react';
import { type ChartInstance, initChart } from './echarts-core';

/**
 * Binds an ECharts instance to a container element.
 *
 * The instance is created once, re-rendered whenever the option object
 * changes, kept in step with container resizes and disposed on unmount so a
 * route change cannot leak a canvas.
 */
export const useChart = (option: Record<string, unknown>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }

    const chart = initChart(container);
    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return containerRef;
};
