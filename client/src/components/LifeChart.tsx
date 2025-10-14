import { useEffect, useRef } from 'react';
import { createChart, LineSeries, CandlestickSeries, IChartApi, LineData, CandlestickData, SeriesMarker, Time } from 'lightweight-charts';

export interface StateData {
  time: Time;
  mental: number;
  physical: number;
  moral: number;
  financial: number;
}

export interface NewsEvent {
  time: Time;
  type: 'positive' | 'negative';
  text: string;
  impact: {
    mental: number;
    physical: number;
    moral: number;
    financial: number;
  };
}

interface LifeChartProps {
  data: StateData[];
  visibleStates: {
    mental: boolean;
    physical: boolean;
    moral: boolean;
    financial: boolean;
  };
  weights: {
    mental: number;
    physical: number;
    moral: number;
    financial: number;
  };
  news: NewsEvent[];
  chartType?: 'line' | 'candlestick';
}

export default function LifeChart({ data, visibleStates, weights, news, chartType = 'line' }: LifeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<{
    aggregate: any;
    mental: any;
    physical: any;
    moral: any;
    financial: any;
  }>({
    aggregate: null,
    mental: null,
    physical: null,
    moral: null,
    financial: null,
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: '#0f0f11' },
        textColor: '#e5e7eb',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#60a5fa',
          width: 1,
          style: 0,
        },
        horzLine: {
          color: '#60a5fa',
          width: 1,
          style: 0,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    chartRef.current = chart;

    // Aggregate series (always visible)
    if (chartType === 'candlestick') {
      const aggregateSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
        title: 'Агрегированный индекс',
        priceLineVisible: true,
        lastValueVisible: true,
      });
      seriesRef.current.aggregate = aggregateSeries;
    } else {
      const aggregateSeries = chart.addSeries(LineSeries, {
        color: '#60a5fa',
        lineWidth: 2,
        title: 'Агрегированный индекс',
        priceLineVisible: true,
        lastValueVisible: true,
      });
      seriesRef.current.aggregate = aggregateSeries;
    }

    // State series
    const mentalSeries = chart.addSeries(LineSeries, {
      color: '#c084fc',
      lineWidth: 2,
      title: 'Душевное',
      visible: visibleStates.mental,
    });
    seriesRef.current.mental = mentalSeries;

    const physicalSeries = chart.addSeries(LineSeries, {
      color: '#06b6d4',
      lineWidth: 2,
      title: 'Физическое',
      visible: visibleStates.physical,
    });
    seriesRef.current.physical = physicalSeries;

    const moralSeries = chart.addSeries(LineSeries, {
      color: '#eab308',
      lineWidth: 2,
      title: 'Моральное',
      visible: visibleStates.moral,
    });
    seriesRef.current.moral = moralSeries;

    const financialSeries = chart.addSeries(LineSeries, {
      color: '#10b981',
      lineWidth: 2,
      title: 'Финансовое',
      visible: visibleStates.financial,
    });
    seriesRef.current.financial = financialSeries;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    chart.timeScale().fitContent();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartType]);

  // Update data
  useEffect(() => {
    if (!seriesRef.current.aggregate || data.length === 0) return;

    // Calculate aggregate data
    const total = weights.mental + weights.physical + weights.moral + weights.financial;
    
    if (chartType === 'candlestick') {
      const candleData: CandlestickData[] = data.map((point, index) => {
        const value =
          (point.mental * weights.mental +
            point.physical * weights.physical +
            point.moral * weights.moral +
            point.financial * weights.financial) /
          total;
        
        const prevValue = index > 0 
          ? (data[index - 1].mental * weights.mental +
             data[index - 1].physical * weights.physical +
             data[index - 1].moral * weights.moral +
             data[index - 1].financial * weights.financial) / total
          : value;
        
        const volatility = Math.abs(value - prevValue) * 0.5;
        
        return {
          time: point.time,
          open: prevValue,
          high: Math.max(value, prevValue) + volatility,
          low: Math.min(value, prevValue) - volatility,
          close: value,
        };
      });
      
      seriesRef.current.aggregate.setData(candleData);
    } else {
      const aggregateData: LineData[] = data.map((point) => {
        const value =
          (point.mental * weights.mental +
            point.physical * weights.physical +
            point.moral * weights.moral +
            point.financial * weights.financial) /
          total;
        return { time: point.time, value };
      });
      
      seriesRef.current.aggregate.setData(aggregateData);
    }

    seriesRef.current.mental?.setData(data.map((d) => ({ time: d.time, value: d.mental })));
    seriesRef.current.physical?.setData(data.map((d) => ({ time: d.time, value: d.physical })));
    seriesRef.current.moral?.setData(data.map((d) => ({ time: d.time, value: d.moral })));
    seriesRef.current.financial?.setData(data.map((d) => ({ time: d.time, value: d.financial })));

    chartRef.current?.timeScale().fitContent();
  }, [data, weights, chartType]);

  // Update visibility
  useEffect(() => {
    seriesRef.current.mental?.applyOptions({ visible: visibleStates.mental });
    seriesRef.current.physical?.applyOptions({ visible: visibleStates.physical });
    seriesRef.current.moral?.applyOptions({ visible: visibleStates.moral });
    seriesRef.current.financial?.applyOptions({ visible: visibleStates.financial });
  }, [visibleStates]);

  // Update markers for news (only works with line charts)
  useEffect(() => {
    if (!seriesRef.current.aggregate || news.length === 0 || chartType === 'candlestick') return;

    const markers: SeriesMarker<Time>[] = news.map((event) => ({
      time: event.time,
      position: event.type === 'positive' ? 'aboveBar' : 'belowBar',
      color: event.type === 'positive' ? '#10b981' : '#ef4444',
      shape: event.type === 'positive' ? 'arrowUp' : 'arrowDown',
      text: event.text.substring(0, 20),
    }));

    (seriesRef.current.aggregate as any).setMarkers(markers);
  }, [news, chartType]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full h-full"
      data-testid="chart-container"
    />
  );
}
