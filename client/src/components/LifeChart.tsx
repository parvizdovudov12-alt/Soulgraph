import { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, CandlestickSeries, IChartApi, LineData, CandlestickData, SeriesMarker, Time } from 'lightweight-charts';
import NewsPopup from './NewsPopup';
import ChartTooltip from './ChartTooltip';
import { formatPeriodLabel, type Timeframe } from '@/lib/dateUtils';

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
  media?: {
    type: 'image' | 'video';
    url: string;
  }[];
  groupedEvents?: NewsEvent[]; // For aggregated timeframes
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
  tokenName: string;
  timeframe?: Timeframe;
}

export default function LifeChart({ data, visibleStates, weights, news, chartType = 'line', tokenName, timeframe = '1D' }: LifeChartProps) {
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
  
  // Use refs to avoid stale closures in chart event handlers
  const newsRef = useRef(news);
  useEffect(() => {
    newsRef.current = news;
  }, [news]);
  
  const [selectedNews, setSelectedNews] = useState<NewsEvent[]>([]);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const markersReadyRef = useRef(false);
  const [renderKey, setRenderKey] = useState(0);
  const [tooltipEvent, setTooltipEvent] = useState<NewsEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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
        shiftVisibleRangeOnNewBar: true,
      },
      localization: {
        timeFormatter: (timestamp: number) => {
          return formatPeriodLabel(timestamp, timeframe);
        },
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
        title: tokenName,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      seriesRef.current.aggregate = aggregateSeries;
    } else {
      const aggregateSeries = chart.addSeries(LineSeries, {
        color: '#60a5fa',
        lineWidth: 2,
        title: tokenName,
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

    // Subscribe to crosshair move for tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setTooltipEvent(null);
        return;
      }

      // Find event at this time (use ref to avoid stale closure)
      const event = newsRef.current.find((e) => e.time === param.time);
      
      if (event && chartContainerRef.current) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        setTooltipEvent(event);
        setTooltipPosition({
          x: rect.left + param.point.x,
          y: rect.top + param.point.y,
        });
      } else {
        setTooltipEvent(null);
      }
    });

    // Subscribe to click events on the chart
    chart.subscribeClick((param) => {
      if (!param.time || !chartContainerRef.current) return;

      const clickTime = param.time as number;

      // Find matching news event(s)
      let eventsToShow: NewsEvent[] = [];

      // First check if clicked event has groupedEvents (aggregated timeframe)
      const clickedEvent = newsRef.current.find(e => (e.time as number) === clickTime);
      if (clickedEvent?.groupedEvents) {
        // Show all grouped events
        eventsToShow = clickedEvent.groupedEvents;
      } else {
        // Daily timeframe - find all events on this date
        const clickDate = new Date(clickTime * 1000);
        clickDate.setHours(0, 0, 0, 0);

        eventsToShow = newsRef.current.filter((event) => {
          // Skip aggregated summary events
          if (event.groupedEvents) return false;
          
          const eventTime = event.time as number;
          const eventDate = new Date(eventTime * 1000);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === clickDate.getTime();
        });
      }

      if (eventsToShow.length > 0 && param.point) {
        const rect = chartContainerRef.current.getBoundingClientRect();
        setSelectedNews(eventsToShow);
        setPopupPosition({
          x: rect.left + param.point.x,
          y: rect.top + param.point.y,
        });
      }
    });

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartType]);

  // Update timeFormatter when timeframe changes
  useEffect(() => {
    if (!chartRef.current) return;
    
    chartRef.current.applyOptions({
      localization: {
        timeFormatter: (timestamp: number) => {
          return formatPeriodLabel(timestamp, timeframe);
        },
      },
    });
  }, [timeframe]);

  // Deduplicate data by time (keep last value for each timestamp)
  const deduplicateData = <T extends { time: Time }>(data: T[]): T[] => {
    const seen = new Map<number, T>();
    data.forEach(point => {
      seen.set(point.time as number, point);
    });
    return Array.from(seen.values()).sort((a, b) => (a.time as number) - (b.time as number));
  };

  // Update data
  useEffect(() => {
    if (!seriesRef.current.aggregate || data.length === 0) return;

    // Deduplicate input data to prevent assertion errors
    const dedupedData = deduplicateData(data);

    // Calculate aggregate data
    const total = weights.mental + weights.physical + weights.moral + weights.financial;
    
    if (chartType === 'candlestick') {
      const candleData: CandlestickData[] = dedupedData.map((point, index) => {
        // Calculate current aggregate value
        const mental = Number(point.mental) || 0;
        const physical = Number(point.physical) || 0;
        const moral = Number(point.moral) || 0;
        const financial = Number(point.financial) || 0;
        
        const currentValue =
          (mental * weights.mental +
            physical * weights.physical +
            moral * weights.moral +
            financial * weights.financial) /
          total;
        
        // Get previous value (open)
        let openValue = currentValue;
        if (index > 0) {
          const prevMental = Number(dedupedData[index - 1].mental) || 0;
          const prevPhysical = Number(dedupedData[index - 1].physical) || 0;
          const prevMoral = Number(dedupedData[index - 1].moral) || 0;
          const prevFinancial = Number(dedupedData[index - 1].financial) || 0;
          
          openValue = (prevMental * weights.mental +
                      prevPhysical * weights.physical +
                      prevMoral * weights.moral +
                      prevFinancial * weights.financial) / total;
        }
        
        // Simple candlestick: open=prev, close=current, high/low=max/min
        return {
          time: point.time,
          open: openValue,
          high: Math.max(openValue, currentValue),
          low: Math.min(openValue, currentValue),
          close: currentValue,
        };
      });
      
      seriesRef.current.aggregate.setData(candleData);
    } else {
      const aggregateData: LineData[] = dedupedData.map((point) => {
        const mental = Number(point.mental) || 0;
        const physical = Number(point.physical) || 0;
        const moral = Number(point.moral) || 0;
        const financial = Number(point.financial) || 0;
        
        const value =
          (mental * weights.mental +
            physical * weights.physical +
            moral * weights.moral +
            financial * weights.financial) /
          total;
        return { time: point.time, value: Number.isFinite(value) ? value : 0 };
      });
      
      seriesRef.current.aggregate.setData(aggregateData);
    }

    seriesRef.current.mental?.setData(dedupedData.map((d) => ({ 
      time: d.time, 
      value: Number.isFinite(d.mental) ? d.mental : 0 
    })));
    seriesRef.current.physical?.setData(dedupedData.map((d) => ({ 
      time: d.time, 
      value: Number.isFinite(d.physical) ? d.physical : 0 
    })));
    seriesRef.current.moral?.setData(dedupedData.map((d) => ({ 
      time: d.time, 
      value: Number.isFinite(d.moral) ? d.moral : 0 
    })));
    seriesRef.current.financial?.setData(dedupedData.map((d) => ({ 
      time: d.time, 
      value: Number.isFinite(d.financial) ? d.financial : 0 
    })));

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
    if (!seriesRef.current.aggregate) return;

    // setMarkers only works for LineSeries, not CandlestickSeries
    if (chartType === 'line' && news.length > 0 && typeof (seriesRef.current.aggregate as any)?.setMarkers === 'function') {
      const markers: SeriesMarker<Time>[] = news.map((event) => ({
        time: event.time,
        position: event.type === 'positive' ? 'aboveBar' : 'belowBar',
        color: event.type === 'positive' ? '#10b981' : '#ef4444',
        shape: event.type === 'positive' ? 'arrowUp' : 'arrowDown',
        text: event.text.substring(0, 20),
      }));

      try {
        (seriesRef.current.aggregate as any).setMarkers(markers);
      } catch (error) {
        console.warn('Failed to set markers:', error);
      }
    }
    
    // Re-render HTML markers when news changes (using ref to avoid loop)
    markersReadyRef.current = false;
    const timeoutId = setTimeout(() => {
      markersReadyRef.current = true;
      setRenderKey(prev => prev + 1);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [news, chartType]);

  // Render custom HTML markers for news with media
  const renderNewsMarkers = () => {
    if (!chartRef.current || !markersReadyRef.current) return null;

    return news.map((event, index) => {
      const hasMedia = event.media && event.media.length > 0;
      const coordinate = chartRef.current?.timeScale().timeToCoordinate(event.time);
      const price = data.find((d) => d.time === event.time);
      
      if (!coordinate || !price) return null;

      const total = weights.mental + weights.physical + weights.moral + weights.financial;
      const value =
        (price.mental * weights.mental +
          price.physical * weights.physical +
          price.moral * weights.moral +
          price.financial * weights.financial) /
        total;

      const priceCoordinate = seriesRef.current.aggregate?.priceToCoordinate(value);
      
      if (priceCoordinate === null || priceCoordinate === undefined) return null;

      const isPositive = event.type === 'positive';
      const yOffset = isPositive ? -40 : 40;

      return (
        <div
          key={index}
          className={`absolute cursor-pointer transition-transform hover:scale-110 ${
            hasMedia ? 'w-8 h-8' : 'w-6 h-6'
          }`}
          style={{
            left: `${coordinate}px`,
            top: `${priceCoordinate + yOffset}px`,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedNews([event]);
            setPopupPosition({ x: e.clientX, y: e.clientY });
          }}
          data-testid={`marker-news-${index}`}
        >
          <div
            className={`w-full h-full rounded-full flex items-center justify-center ${
              isPositive ? 'bg-positive' : 'bg-negative'
            } border-2 border-background shadow-lg`}
          >
            {hasMedia && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="relative w-full h-full">
      <div 
        ref={chartContainerRef} 
        className="w-full h-full"
        data-testid="chart-container"
      />
      
      {/* Custom HTML markers for news */}
      {renderKey > 0 && (
        <div className="absolute inset-0 pointer-events-none" key={renderKey}>
          <div className="relative w-full h-full pointer-events-auto">
            {renderNewsMarkers()}
          </div>
        </div>
      )}

      {/* Chart tooltip */}
      <ChartTooltip
        event={tooltipEvent}
        position={tooltipPosition}
      />

      {/* News popup */}
      {selectedNews.length > 0 && (
        <NewsPopup
          events={selectedNews}
          onClose={() => setSelectedNews([])}
          position={popupPosition}
        />
      )}
    </div>
  );
}
