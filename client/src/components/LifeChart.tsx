import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickData,
  CandlestickSeries,
  createChart,
  IChartApi,
  LineData,
  LineSeries,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import NewsPopup from "./NewsPopup";
import ChartTooltip from "./ChartTooltip";
import { formatPeriodLabel, getPeriodKey, timeframeToSeconds, type Timeframe } from "@/lib/dateUtils";
import { useLanguage } from "@/lib/i18n";
import { Expand, Minus, Plus } from "lucide-react";

export interface StateData {
  time: Time;
  mental: number;
  physical: number;
  moral: number;
  financial: number;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

export interface NewsEvent {
  id?: string;
  time: Time;
  type: "positive" | "negative";
  text: string;
  impact: {
    mental: number;
    physical: number;
    moral: number;
    financial: number;
  };
  media?: {
    type: "image" | "video";
    url: string;
  }[];
  groupedEvents?: NewsEvent[];
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
  chartType?: "line" | "candlestick";
  tokenName: string;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  onDeleteEvent?: (eventId: string) => void;
  onDeleteAllDayEvents?: (eventIds: string[], onSuccess?: () => void) => void;
  isDeletingMultiple?: boolean;
}

const CHART_COLORS = {
  shell: "#000000",
  panel: "#000000",
  border: "rgba(255,255,255,0.10)",
  grid: "rgba(255,255,255,0.07)",
  text: "#F4F7FA",
  muted: "#8A94A6",
  positive: "#25D49D",
  positiveAlt: "#6FA8FF",
  negative: "#FF5D68",
  gold: "#25D49D",
  blue: "#FF4F5D",
  mental: "#B388FF",
  physical: "#58B8FF",
  moral: "#F4C259",
  financial: "#34C98B",
};

const STATE_META = {
  ru: {
    mental: { label: "Ментальное", color: CHART_COLORS.mental },
    physical: { label: "Физическое", color: CHART_COLORS.physical },
    moral: { label: "Душевное", color: CHART_COLORS.moral },
    financial: { label: "Финансовое", color: CHART_COLORS.financial },
  },
  en: {
    mental: { label: "Mental", color: CHART_COLORS.mental },
    physical: { label: "Physical", color: CHART_COLORS.physical },
    moral: { label: "Spiritual", color: CHART_COLORS.moral },
    financial: { label: "Financial", color: CHART_COLORS.financial },
  },
} as const;

type VisibleStateKey = keyof typeof STATE_META.ru;

type SeriesRefs = {
  aggregate: any;
  mental: any;
  physical: any;
  moral: any;
  financial: any;
};

type AggregatePoint = CandlestickData | LineData;
type NumericRange = { from: number; to: number };

function deduplicateData<T extends { time: Time }>(input: T[]): T[] {
  const seen = new Map<number, T>();
  input.forEach((point) => {
    seen.set(point.time as number, point);
  });
  return Array.from(seen.values()).sort((a, b) => (a.time as number) - (b.time as number));
}

function aggregateValue(point: StateData, weights: LifeChartProps["weights"]) {
  const total = weights.mental + weights.physical + weights.moral + weights.financial || 1;
  return (
    (point.mental * weights.mental +
      point.physical * weights.physical +
      point.moral * weights.moral +
      point.financial * weights.financial) /
    total
  );
}

function hasSameWeights(current: LifeChartProps["weights"], previous: LifeChartProps["weights"] | null) {
  return (
    !!previous &&
    current.mental === previous.mental &&
    current.physical === previous.physical &&
    current.moral === previous.moral &&
    current.financial === previous.financial
  );
}

function hasSameStatePoint(current: StateData, previous: StateData) {
  return (
    current.time === previous.time &&
    current.mental === previous.mental &&
    current.physical === previous.physical &&
    current.moral === previous.moral &&
    current.financial === previous.financial
  );
}

function getIncrementalStartIndex(previousData: StateData[], nextData: StateData[]) {
  if (previousData.length === 0 || nextData.length === 0 || nextData.length < previousData.length) {
    return null;
  }

  const sharedLength = Math.min(previousData.length, nextData.length);
  const stablePrefixLength = nextData.length === previousData.length ? sharedLength - 1 : sharedLength;

  for (let index = 0; index < stablePrefixLength; index += 1) {
    if (!hasSameStatePoint(nextData[index], previousData[index])) {
      return null;
    }
  }

  if (nextData.length === previousData.length) {
    const lastIndex = previousData.length - 1;
    return nextData[lastIndex]?.time === previousData[lastIndex]?.time ? lastIndex : null;
  }

  return previousData.length;
}

function buildAggregatePoint(
  point: StateData,
  index: number,
  sourceData: StateData[],
  weights: LifeChartProps["weights"],
  chartType: LifeChartProps["chartType"],
  syntheticSeries: boolean,
): AggregatePoint {
  const close = aggregateValue(point, weights);

  if (chartType !== "candlestick") {
    return {
      time: point.time,
      value: Number.isFinite(close) ? close : 0,
    };
  }

  if (point.ohlc) {
    return {
      time: point.time,
      open: point.ohlc.open,
      high: point.ohlc.high,
      low: point.ohlc.low,
      close: point.ohlc.close,
    };
  }

  const open = index > 0 ? aggregateValue(sourceData[index - 1], weights) : close;
  const spread = Math.max(Math.abs(close - open) * 0.3, syntheticSeries ? 0.06 : 0.32);

  return {
    time: point.time,
    open,
    high: Math.max(open, close) + spread,
    low: Math.min(open, close) - spread,
    close,
  };
}

function captureSeriesScaleState(series: any) {
  const priceScale = series?.priceScale?.();
  if (!priceScale) {
    return null;
  }

  return {
    range: priceScale.getVisibleRange?.() as NumericRange | null,
    options: priceScale.options?.() as { autoScale?: boolean } | undefined,
  };
}

function freezeSeriesScale(series: any, range: NumericRange | null) {
  const priceScale = series?.priceScale?.();
  if (!priceScale || !range) {
    return;
  }

  priceScale.applyOptions?.({ autoScale: false });
  priceScale.setVisibleRange?.(range);
}

function restoreSeriesScale(series: any, range: NumericRange | null, autoScale?: boolean) {
  const priceScale = series?.priceScale?.();
  if (!priceScale) {
    return;
  }

  if (range) {
    priceScale.setVisibleRange?.(range);
  }
  priceScale.applyOptions?.({ autoScale: autoScale ?? true });
}

function buildEventStickerLabel(event: NewsEvent, language: "ru" | "en") {
  const cleaned = event.text
    .replace(/^(выполнена\s+(задача|цель)|completed\s+(task|goal))\s*:\s*/i, "")
    .replace(/[^a-zа-яё0-9\s]/gi, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  if (letters) return letters.slice(0, 2);
  if (language === "ru") return event.type === "positive" ? "ПС" : "НС";
  return event.type === "positive" ? "PS" : "NS";
}

function buildRenderableData(input: StateData[], timeframe: Timeframe, weights: LifeChartProps["weights"]): StateData[] {
  const deduped = deduplicateData(input);
  if (deduped.length >= 2) return aggregateCandlesByTimeframe(deduped, timeframe, weights);

  const source =
    deduped[0] ??
    ({
      time: Math.floor(Date.now() / 1000) as Time,
      mental: 0,
      physical: 0,
      moral: 0,
      financial: 0,
    } as StateData);

  const windowSize = timeframeToSeconds(timeframe);
  const pointsByTimeframe: Record<Timeframe, number> = {
    "30S": 80,
    "1M": 60,
    "30M": 48,
    "1H": 48,
    "4H": 42,
    "1D": 40,
  };
  const points = pointsByTimeframe[timeframe];
  const step = Math.max(Math.floor(windowSize / points), 60 * 60);
  const endTime = source.time as number;
  const startTime = endTime - step * (points - 1);

  const amplitude = 0.38;

  return Array.from({ length: points }, (_, index) => {
    const phase = (index / Math.max(points - 1, 1)) * Math.PI * 2;
    return {
      time: (startTime + step * index) as Time,
      mental: source.mental + Math.sin(phase) * amplitude,
      physical: source.physical + Math.cos(phase * 0.8) * amplitude * 0.75,
      moral: source.moral + Math.sin(phase * 1.25) * amplitude * 0.55,
      financial: source.financial + Math.cos(phase * 1.15) * amplitude * 0.92,
    };
  });
}

function aggregateCandlesByTimeframe(input: StateData[], timeframe: Timeframe, weights: LifeChartProps["weights"]): StateData[] {
  const source = deduplicateData(input);
  if (source.length < 2) {
    return source;
  }

  const result: StateData[] = [];
  let group: StateData[] = [];
  let currentKey: number | null = null;
  let previousPoint: StateData | null = null;

  const flushGroup = () => {
    if (group.length === 0 || currentKey === null) return;

    const open = previousPoint ? aggregateValue(previousPoint, weights) : aggregateValue(group[0], weights);
    const values = [open, ...group.map((point) => aggregateValue(point, weights))];
    const last = group[group.length - 1];

    result.push({
      time: currentKey as Time,
      mental: last.mental,
      physical: last.physical,
      moral: last.moral,
      financial: last.financial,
      ohlc: {
        open,
        high: Math.max(...values),
        low: Math.min(...values),
        close: values[values.length - 1],
      },
    });

    previousPoint = last;
  };

  for (const point of source) {
    const key = getPeriodKey(point.time as number, timeframe);
    if (currentKey === null) {
      currentKey = key;
      group = [point];
      continue;
    }

    if (key !== currentKey) {
      flushGroup();
      currentKey = key;
      group = [point];
      continue;
    }

    group.push(point);
  }

  flushGroup();
  return result;
}

function aggregateEventsByTimeframe(events: NewsEvent[], timeframe: Timeframe): NewsEvent[] {
  const sortedEvents = [...events].sort((a, b) => (a.time as number) - (b.time as number));
  const groups = new Map<number, NewsEvent[]>();
  for (const event of sortedEvents) {
    const key = getPeriodKey(event.time as number, timeframe);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, group]) => {
      const impact = group.reduce(
        (total, event) => ({
          mental: total.mental + event.impact.mental,
          physical: total.physical + event.impact.physical,
          moral: total.moral + event.impact.moral,
          financial: total.financial + event.impact.financial,
        }),
        { mental: 0, physical: 0, moral: 0, financial: 0 },
      );
      const totalImpact = impact.mental + impact.physical + impact.moral + impact.financial;
      const first = group[0];

      return {
        ...first,
        id: `period-${time}`,
        time: time as Time,
        type: totalImpact >= 0 ? "positive" : "negative",
        text: group.length === 1 ? first.text : `${group.length} events`,
        impact,
        groupedEvents: group,
      };
    });
}

export default function LifeChart({
  data,
  visibleStates,
  weights,
  news,
  chartType = "candlestick",
  tokenName,
  timeframe = "1D",
  onTimeframeChange,
  onDeleteEvent,
  onDeleteAllDayEvents,
  isDeletingMultiple = false,
}: LifeChartProps) {
  const { language } = useLanguage();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const markerFrameRequestRef = useRef<number | null>(null);
  const candleAnimationFrameRef = useRef<number | null>(null);
  const seriesRef = useRef<SeriesRefs>({
    aggregate: null,
    mental: null,
    physical: null,
    moral: null,
    financial: null,
  });
  const plottedDataRef = useRef<StateData[]>([]);
  const previousWeightsRef = useRef<LifeChartProps["weights"] | null>(null);
  const previousChartTypeRef = useRef<LifeChartProps["chartType"] | null>(null);
  const newsRef = useRef(news);
  const [, setChartFrame] = useState(0);
  const [selectedNews, setSelectedNews] = useState<NewsEvent[]>([]);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [tooltipEvent, setTooltipEvent] = useState<NewsEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const requestMarkerFrame = (extraFrames = 0) => {
    if (markerFrameRequestRef.current !== null) return;
    markerFrameRequestRef.current = window.requestAnimationFrame(() => {
      markerFrameRequestRef.current = null;
      setChartFrame((frame) => frame + 1);
      if (extraFrames > 0) {
        requestMarkerFrame(extraFrames - 1);
      }
    });
  };

  const timeframeOptions: Array<{ value: Timeframe; label: string }> =
    language === "ru"
      ? [
          { value: "30S", label: "30с" },
          { value: "1M", label: "1м" },
          { value: "30M", label: "30м" },
          { value: "1H", label: "1ч" },
          { value: "4H", label: "4ч" },
          { value: "1D", label: "1Д" },
        ]
      : [
          { value: "30S", label: "30s" },
          { value: "1M", label: "1m" },
          { value: "30M", label: "30m" },
          { value: "1H", label: "1h" },
          { value: "4H", label: "4h" },
          { value: "1D", label: "1D" },
        ];
  const stateLabels = STATE_META[language];

  const renderableData = useMemo(() => buildRenderableData(data, timeframe, weights), [data, timeframe, weights]);
  const chartNews = useMemo(() => aggregateEventsByTimeframe(news, timeframe), [news, timeframe]);

  useEffect(() => {
    newsRef.current = chartNews;
  }, [chartNews]);
  const barSpacingByTimeframe: Record<Timeframe, number> = {
    "30S": 14,
    "1M": 16,
    "30M": 18,
    "1H": 18,
    "4H": 16,
    "1D": 12,
  };
  const rightOffsetByTimeframe: Record<Timeframe, number> = {
    "30S": 8,
    "1M": 8,
    "30M": 8,
    "1H": 8,
    "4H": 7,
    "1D": 6,
  };
  const minBarSpacingByTimeframe: Record<Timeframe, number> = {
    "30S": 6,
    "1M": 7,
    "30M": 8,
    "1H": 8,
    "4H": 7,
    "1D": 5,
  };
  const aggregateStats = useMemo(() => {
    if (renderableData.length === 0) {
      return { current: 0, previous: 0, change: 0, changePercent: 0, max: 0, min: 0, open: 0, close: 0 };
    }

    const values = renderableData.map((point) => point.ohlc?.close ?? aggregateValue(point, weights));
    const highs = renderableData.map((point) => point.ohlc?.high ?? aggregateValue(point, weights));
    const lows = renderableData.map((point) => point.ohlc?.low ?? aggregateValue(point, weights));
    const current = values[values.length - 1] ?? 0;
    const previous = values[Math.max(values.length - 2, 0)] ?? current;
    const open = renderableData[0]?.ohlc?.open ?? values[0] ?? current;
    const close = current;
    const max = Math.max(...highs);
    const min = Math.min(...lows);
    const change = current - previous;
    const changePercent = previous === 0 ? (current === 0 ? 0 : 100) : (change / Math.abs(previous)) * 100;

    return { current, previous, change, changePercent, max, min, open, close };
  }, [renderableData, weights]);

  const volumeBars = useMemo(() => {
    const eventVolumeByTime = new Map<number, { value: number; events: number }>();
    for (const event of chartNews) {
      const groupedEvents = event.groupedEvents ?? [event];
      const impactMagnitude = groupedEvents.reduce((sum, item) => (
        sum +
        Math.abs(item.impact.mental) +
        Math.abs(item.impact.physical) +
        Math.abs(item.impact.moral) +
        Math.abs(item.impact.financial)
      ), 0);
      eventVolumeByTime.set(event.time as number, {
        events: groupedEvents.length,
        value: Math.max(groupedEvents.length, impactMagnitude / 20),
      });
    }

    const bars = renderableData.slice(-96).map((point) => {
      const close = point.ohlc?.close ?? aggregateValue(point, weights);
      const open = point.ohlc?.open ?? close;
      const periodVolume = eventVolumeByTime.get(point.time as number);
      const rawVolume = Math.max(periodVolume?.value ?? Math.abs(close - open) / 8, 0.08);

      return {
        value: rawVolume,
        eventCount: periodVolume?.events ?? 0,
        positive: close >= open,
      };
    });
    const maxVolume = Math.max(...bars.map((bar) => bar.value), 1);

    return bars.map((bar) => ({
      ...bar,
      height: Math.max(8, Math.min(100, (bar.value / maxVolume) * 100)),
    }));
  }, [chartNews, renderableData, weights]);

  const latestVolume = volumeBars[volumeBars.length - 1]?.value ?? 0;

  const visibleLegendItems = (Object.keys(stateLabels) as VisibleStateKey[]).filter((key) => visibleStates[key]);

  const fitFullChart = () => {
    const timeScale = chartRef.current?.timeScale();
    if (!timeScale) return;

    try {
      timeScale.fitContent();
    } catch {
      // The chart may still be mounting; the next data pass will fit it.
    }
  };

  const applyVisibleTimeframe = () => {
    const timeScale = chartRef.current?.timeScale();
    if (!timeScale || plottedDataRef.current.length === 0) return;

    fitFullChart();
  };

  const zoomChart = (direction: "in" | "out") => {
    const timeScale = chartRef.current?.timeScale();
    const visibleRange = timeScale?.getVisibleLogicalRange();
    if (!timeScale || !visibleRange) {
      fitFullChart();
      return;
    }

    const totalBars = Math.max(plottedDataRef.current.length, 1);
    const center = (visibleRange.from + visibleRange.to) / 2;
    const currentSpan = Math.max(visibleRange.to - visibleRange.from, 1);
    const nextSpan = currentSpan * (direction === "in" ? 0.72 : 1.35);
    const minSpan = Math.min(Math.max(5, totalBars * 0.08), totalBars);
    const maxSpan = Math.max(totalBars + 4, minSpan);
    const clampedSpan = Math.min(Math.max(nextSpan, minSpan), maxSpan);
    const halfSpan = clampedSpan / 2;

    try {
      timeScale.setVisibleLogicalRange({
        from: center - halfSpan,
        to: center + halfSpan,
      });
    } catch {
      fitFullChart();
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: CHART_COLORS.panel },
        textColor: CHART_COLORS.text,
        fontSize: 11,
        fontFamily: "'Inter', system-ui, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid, style: 0 },
        horzLines: { color: CHART_COLORS.grid, style: 0 },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(255,255,255,0.18)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#161b22",
        },
        horzLine: {
          color: "rgba(255,255,255,0.12)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#161b22",
        },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: true,
        secondsVisible: false,
        shiftVisibleRangeOnNewBar: false,
        rightOffset: 8,
        barSpacing: 18,
        minBarSpacing: 10,
      },
      localization: {
        timeFormatter: (timestamp: number) => formatPeriodLabel(timestamp, timeframe, language),
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        scaleMargins: {
          top: 0.12,
          bottom: 0.1,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;
    plottedDataRef.current = [];
    previousWeightsRef.current = null;
    previousChartTypeRef.current = null;
    const shouldUseCandles = chartType === "candlestick";

    if (shouldUseCandles) {
      seriesRef.current.aggregate = chart.addSeries(CandlestickSeries, {
        upColor: CHART_COLORS.gold,
        downColor: CHART_COLORS.blue,
        borderUpColor: CHART_COLORS.gold,
        borderDownColor: CHART_COLORS.blue,
        wickUpColor: CHART_COLORS.gold,
        wickDownColor: CHART_COLORS.blue,
        priceLineVisible: true,
        lastValueVisible: true,
        priceLineColor: CHART_COLORS.gold,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });
    } else {
      seriesRef.current.aggregate = chart.addSeries(LineSeries, {
        color: CHART_COLORS.gold,
        lineWidth: 2,
        title: tokenName,
        priceLineVisible: true,
        lastValueVisible: true,
        priceLineColor: CHART_COLORS.gold,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      });
    }

    seriesRef.current.mental = chart.addSeries(LineSeries, {
      color: CHART_COLORS.mental,
      lineWidth: 2,
      visible: visibleStates.mental,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    seriesRef.current.physical = chart.addSeries(LineSeries, {
      color: CHART_COLORS.physical,
      lineWidth: 2,
      visible: visibleStates.physical,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    seriesRef.current.moral = chart.addSeries(LineSeries, {
      color: CHART_COLORS.moral,
      lineWidth: 2,
      visible: visibleStates.moral,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    seriesRef.current.financial = chart.addSeries(LineSeries, {
      color: CHART_COLORS.financial,
      lineWidth: 2,
      visible: visibleStates.financial,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      requestMarkerFrame();
    });

    resizeObserver.observe(chartContainerRef.current);
    const handleVisibleRangeChange = () => requestMarkerFrame();
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setTooltipEvent(null);
        return;
      }

      const event = newsRef.current.find((item) => item.time === param.time);
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

    chart.subscribeClick((param) => {
      if (!param.time || !chartContainerRef.current) return;

      const clickTime = param.time as number;
      const clickedEvent = newsRef.current.find((item) => (item.time as number) === clickTime);
      const eventsToShow = clickedEvent?.groupedEvents ??
        newsRef.current.filter((item) => !item.groupedEvents && (item.time as number) === clickTime);

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
      if (markerFrameRequestRef.current !== null) {
        window.cancelAnimationFrame(markerFrameRequestRef.current);
        markerFrameRequestRef.current = null;
      }
      if (candleAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(candleAnimationFrameRef.current);
        candleAnimationFrameRef.current = null;
      }
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartType, tokenName, timeframe, visibleStates.financial, visibleStates.mental, visibleStates.moral, visibleStates.physical, language]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      localization: {
        timeFormatter: (timestamp: number) => formatPeriodLabel(timestamp, timeframe, language),
      },
      timeScale: {
        barSpacing: barSpacingByTimeframe[timeframe],
        rightOffset: rightOffsetByTimeframe[timeframe],
        minBarSpacing: minBarSpacingByTimeframe[timeframe],
      },
    });
    restoreSeriesScale(seriesRef.current.aggregate, null, true);
    restoreSeriesScale(seriesRef.current.mental, null, true);
    restoreSeriesScale(seriesRef.current.physical, null, true);
    restoreSeriesScale(seriesRef.current.moral, null, true);
    restoreSeriesScale(seriesRef.current.financial, null, true);

    requestAnimationFrame(applyVisibleTimeframe);
    requestMarkerFrame();
  }, [timeframe, language]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current.aggregate || renderableData.length === 0) return;

    const previousData = plottedDataRef.current;
    const currentVisibleRange = chartRef.current.timeScale().getVisibleLogicalRange();
    const canIncrementallyUpdate =
      previousChartTypeRef.current === chartType &&
      hasSameWeights(weights, previousWeightsRef.current) &&
      data.length >= 2;
    const incrementalStartIndex = canIncrementallyUpdate ? getIncrementalStartIndex(previousData, renderableData) : null;
    const syntheticSeries = data.length < 2;

    if (incrementalStartIndex !== null) {
      if (candleAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(candleAnimationFrameRef.current);
        candleAnimationFrameRef.current = null;
      }

      const aggregateScaleState = captureSeriesScaleState(seriesRef.current.aggregate);
      const mentalScaleState = captureSeriesScaleState(seriesRef.current.mental);
      const physicalScaleState = captureSeriesScaleState(seriesRef.current.physical);
      const moralScaleState = captureSeriesScaleState(seriesRef.current.moral);
      const financialScaleState = captureSeriesScaleState(seriesRef.current.financial);

      freezeSeriesScale(seriesRef.current.aggregate, aggregateScaleState?.range ?? null);
      freezeSeriesScale(seriesRef.current.mental, mentalScaleState?.range ?? null);
      freezeSeriesScale(seriesRef.current.physical, physicalScaleState?.range ?? null);
      freezeSeriesScale(seriesRef.current.moral, moralScaleState?.range ?? null);
      freezeSeriesScale(seriesRef.current.financial, financialScaleState?.range ?? null);

      const restoreFrozenRanges = () => {
        if (currentVisibleRange) {
          chartRef.current?.timeScale().setVisibleLogicalRange(currentVisibleRange);
        }
        freezeSeriesScale(seriesRef.current.aggregate, aggregateScaleState?.range ?? null);
        freezeSeriesScale(seriesRef.current.mental, mentalScaleState?.range ?? null);
        freezeSeriesScale(seriesRef.current.physical, physicalScaleState?.range ?? null);
        freezeSeriesScale(seriesRef.current.moral, moralScaleState?.range ?? null);
        freezeSeriesScale(seriesRef.current.financial, financialScaleState?.range ?? null);
      };

      const isAppendingNewPoint = renderableData.length > previousData.length;
      const lastAnimatedIndex = renderableData.length - 1;

      for (let index = incrementalStartIndex; index < renderableData.length; index += 1) {
        const point = renderableData[index];
        if (isAppendingNewPoint && index === lastAnimatedIndex) break;

        seriesRef.current.aggregate.update(buildAggregatePoint(point, index, renderableData, weights, chartType, syntheticSeries));
        seriesRef.current.mental?.update({ time: point.time, value: Number.isFinite(point.mental) ? point.mental : 0 });
        seriesRef.current.physical?.update({ time: point.time, value: Number.isFinite(point.physical) ? point.physical : 0 });
        seriesRef.current.moral?.update({ time: point.time, value: Number.isFinite(point.moral) ? point.moral : 0 });
        seriesRef.current.financial?.update({ time: point.time, value: Number.isFinite(point.financial) ? point.financial : 0 });
      }

      if (!isAppendingNewPoint) {
        plottedDataRef.current = renderableData;
        previousWeightsRef.current = { ...weights };
        previousChartTypeRef.current = chartType;
        restoreFrozenRanges();
        requestMarkerFrame(2);
        return;
      }

      const animatedPoint = renderableData[lastAnimatedIndex];
      const previousPointForAnimation =
        previousData[lastAnimatedIndex]?.time === animatedPoint.time
          ? previousData[lastAnimatedIndex]
          : previousData[previousData.length - 1] ?? animatedPoint;
      const finalAggregatePoint = buildAggregatePoint(animatedPoint, lastAnimatedIndex, renderableData, weights, chartType, syntheticSeries);
      const startTime = performance.now();
      const durationMs = 420;

      const updateAnimatedPoint = (progress: number) => {
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const interpolate = (from: number, to: number) => from + (to - from) * easedProgress;

        if (chartType === "candlestick") {
          const finalCandle = finalAggregatePoint as CandlestickData;
          const startClose = finalCandle.open;
          seriesRef.current.aggregate.update({
            time: animatedPoint.time,
            open: finalCandle.open,
            high: interpolate(finalCandle.open, finalCandle.high),
            low: interpolate(finalCandle.open, finalCandle.low),
            close: interpolate(startClose, finalCandle.close),
          });
        } else {
          const finalLine = finalAggregatePoint as LineData;
          const startValue = aggregateValue(previousPointForAnimation, weights);
          seriesRef.current.aggregate.update({
            time: animatedPoint.time,
            value: interpolate(Number.isFinite(startValue) ? startValue : 0, Number.isFinite(finalLine.value) ? finalLine.value : 0),
          });
        }

        seriesRef.current.mental?.update({ time: animatedPoint.time, value: interpolate(previousPointForAnimation.mental, animatedPoint.mental) });
        seriesRef.current.physical?.update({ time: animatedPoint.time, value: interpolate(previousPointForAnimation.physical, animatedPoint.physical) });
        seriesRef.current.moral?.update({ time: animatedPoint.time, value: interpolate(previousPointForAnimation.moral, animatedPoint.moral) });
        seriesRef.current.financial?.update({ time: animatedPoint.time, value: interpolate(previousPointForAnimation.financial, animatedPoint.financial) });

        restoreFrozenRanges();
      };

      const animateCandle = (timestamp: number) => {
        const progress = Math.min((timestamp - startTime) / durationMs, 1);
        updateAnimatedPoint(progress);

        if (progress < 1) {
          candleAnimationFrameRef.current = window.requestAnimationFrame(animateCandle);
          return;
        }

        candleAnimationFrameRef.current = null;
        seriesRef.current.aggregate.update(finalAggregatePoint);
        seriesRef.current.mental?.update({ time: animatedPoint.time, value: Number.isFinite(animatedPoint.mental) ? animatedPoint.mental : 0 });
        seriesRef.current.physical?.update({ time: animatedPoint.time, value: Number.isFinite(animatedPoint.physical) ? animatedPoint.physical : 0 });
        seriesRef.current.moral?.update({ time: animatedPoint.time, value: Number.isFinite(animatedPoint.moral) ? animatedPoint.moral : 0 });
        seriesRef.current.financial?.update({ time: animatedPoint.time, value: Number.isFinite(animatedPoint.financial) ? animatedPoint.financial : 0 });
        restoreFrozenRanges();
        requestMarkerFrame(4);
      };

      updateAnimatedPoint(0);
      candleAnimationFrameRef.current = window.requestAnimationFrame(animateCandle);

      plottedDataRef.current = renderableData;
      previousWeightsRef.current = { ...weights };
      previousChartTypeRef.current = chartType;

      restoreFrozenRanges();

      requestMarkerFrame(4);
      return;
    }

    const aggregateData = renderableData.map((point, index) =>
      buildAggregatePoint(point, index, renderableData, weights, chartType, syntheticSeries),
    );

    restoreSeriesScale(seriesRef.current.aggregate, null, true);
    restoreSeriesScale(seriesRef.current.mental, null, true);
    restoreSeriesScale(seriesRef.current.physical, null, true);
    restoreSeriesScale(seriesRef.current.moral, null, true);
    restoreSeriesScale(seriesRef.current.financial, null, true);

    seriesRef.current.aggregate.setData(aggregateData);
    seriesRef.current.mental?.setData(
      renderableData.map((point) => ({ time: point.time, value: Number.isFinite(point.mental) ? point.mental : 0 })),
    );
    seriesRef.current.physical?.setData(
      renderableData.map((point) => ({ time: point.time, value: Number.isFinite(point.physical) ? point.physical : 0 })),
    );
    seriesRef.current.moral?.setData(
      renderableData.map((point) => ({ time: point.time, value: Number.isFinite(point.moral) ? point.moral : 0 })),
    );
    seriesRef.current.financial?.setData(
      renderableData.map((point) => ({ time: point.time, value: Number.isFinite(point.financial) ? point.financial : 0 })),
    );

    plottedDataRef.current = renderableData;
    previousWeightsRef.current = { ...weights };
    previousChartTypeRef.current = chartType;

    requestAnimationFrame(() => {
      if (!chartRef.current) return;

      try {
        if (currentVisibleRange) {
          chartRef.current.timeScale().setVisibleLogicalRange(currentVisibleRange);
        } else {
          applyVisibleTimeframe();
        }
      } catch {
        chartRef.current.timeScale().fitContent();
      }

      requestMarkerFrame(2);
    });
  }, [renderableData, weights, chartType, timeframe]);

  useEffect(() => {
    requestMarkerFrame(5);
  }, [chartNews]);

  useEffect(() => {
    seriesRef.current.mental?.applyOptions({ visible: visibleStates.mental });
    seriesRef.current.physical?.applyOptions({ visible: visibleStates.physical });
    seriesRef.current.moral?.applyOptions({ visible: visibleStates.moral });
    seriesRef.current.financial?.applyOptions({ visible: visibleStates.financial });
  }, [visibleStates]);

  useEffect(() => {
    if (!seriesRef.current.aggregate) return;

    if (chartType === "line" && chartNews.length > 0 && typeof (seriesRef.current.aggregate as any)?.setMarkers === "function") {
      const markers: SeriesMarker<Time>[] = chartNews.map((event) => ({
        time: event.time,
        position: event.type === "positive" ? "aboveBar" : "belowBar",
        color: event.type === "positive" ? CHART_COLORS.financial : CHART_COLORS.negative,
        shape: event.type === "positive" ? "arrowUp" : "arrowDown",
        text: event.text.substring(0, 20),
      }));

      try {
        (seriesRef.current.aggregate as any).setMarkers(markers);
      } catch (error) {
        console.warn("Failed to set markers:", error);
      }
    }
  }, [chartNews, chartType]);

  const renderNewsMarkers = () => {
    if (!chartRef.current || plottedDataRef.current.length === 0) return null;

    return chartNews.map((event, index) => {
      const eventTime = event.time as number;
      const price =
        plottedDataRef.current.find((point) => point.time === event.time) ??
        plottedDataRef.current.reduce((nearest, point) => (
          Math.abs((point.time as number) - eventTime) < Math.abs((nearest.time as number) - eventTime) ? point : nearest
        ), plottedDataRef.current[0]);
      if (!price) return null;
      const coordinate = chartRef.current?.timeScale().timeToCoordinate(price.time);
      if (coordinate === null || coordinate === undefined) return null;

      const value = aggregateValue(price, weights);
      const priceCoordinate = seriesRef.current.aggregate?.priceToCoordinate(value);
      if (priceCoordinate === null || priceCoordinate === undefined) return null;

      const isPositive = event.type === "positive";
      const groupedCount = event.groupedEvents?.length ?? 1;
      const yOffset = -34 - Math.min(groupedCount - 1, 3) * 4;
      const top = Math.max(18, priceCoordinate + yOffset);
      const stickerLabel = groupedCount > 1 ? String(groupedCount) : buildEventStickerLabel(event, language);

      return (
        <div
          key={index}
          className="pointer-events-auto absolute h-6 w-6 cursor-pointer transition-transform hover:scale-110"
          style={{
            left: `${coordinate}px`,
            top: `${top}px`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            const eventsToShow = event.groupedEvents || [event];
            setSelectedNews(eventsToShow);
            setPopupPosition({ x: clickEvent.clientX, y: clickEvent.clientY });
          }}
          onWheel={(wheelEvent) => {
            wheelEvent.stopPropagation();
            zoomChart(wheelEvent.deltaY > 0 ? "out" : "in");
          }}
          data-testid={`marker-news-${index}`}
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-full border text-[8px] font-black uppercase leading-none tracking-[-0.01em] text-white shadow-lg ring-1 ring-black/25"
            style={{
              background: isPositive
                ? "linear-gradient(180deg, #4BE39A 0%, #18A96D 100%)"
                : "linear-gradient(180deg, #FF7A7D 0%, #C9333D 100%)",
              borderColor: isPositive ? "rgba(180,255,218,0.72)" : "rgba(255,205,205,0.72)",
              boxShadow: isPositive
                ? "0 2px 6px rgba(0,0,0,0.3), 0 0 12px rgba(52,201,139,0.38)"
                : "0 2px 6px rgba(0,0,0,0.3), 0 0 12px rgba(225,91,100,0.38)",
            }}
          >
            <span>{stickerLabel}</span>
          </div>
        </div>
      );
    });
  };

  const changeIsPositive = aggregateStats.change >= 0;
  const activeTimeframeLabel = timeframeOptions.find((option) => option.value === timeframe)?.label ?? timeframe;
  const copy =
    language === "ru"
      ? {
          stateDynamics: "Динамика состояния",
          chartTab: "График",
          overviewTab: "Обзор",
          dataTab: "Данные",
          newsTab: "Лента событий",
          analysisTab: "Анализ",
          standard: "Стандартный",
          depth: "Глубина",
          ohlcOpen: "ОТКР",
          ohlcHigh: "МАКС",
          ohlcLow: "МИН",
          ohlcClose: "ЗАКР",
          volume: "Объем SOUL",
          live: "Онлайн",
          indexLabel: "индекс",
          aggregate: "Сводный курс по всем зонам",
          empty: "Добавь первое событие, чтобы график начал накапливать реальную динамику.",
          hint: "Нажми на точку события, чтобы открыть запись. 30с/1м/30м/1ч/4ч/1Д задают размер свечи.",
        }
      : {
          stateDynamics: "State dynamics",
          chartTab: "Chart",
          overviewTab: "Overview",
          dataTab: "Data",
          newsTab: "Event feed",
          analysisTab: "Analysis",
          standard: "Standard",
          depth: "Depth",
          ohlcOpen: "O",
          ohlcHigh: "H",
          ohlcLow: "L",
          ohlcClose: "C",
          volume: "SOUL volume",
          live: "Live",
          indexLabel: "index",
          aggregate: "Combined direction across all areas",
          empty: "Add the first event so the chart can start building real movement.",
          hint: "Tap an event point to open its entry. 30s/1m/30m/1h/4h/1D set the candle size.",
        };

  return (
    <div className="flex h-[72vh] min-h-[430px] max-h-[680px] flex-col overflow-hidden rounded-sm border border-white/10 bg-black shadow-[0_18px_70px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.045)] sm:min-h-[560px] lg:h-full lg:min-h-0 lg:max-h-none">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 bg-black px-2 text-[12px] font-semibold text-[#8a94a6] sm:h-10 sm:px-3">
        <div className="relative flex h-full items-center text-white">
          <span>{copy.chartTab}</span>
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#22ab94]" />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="min-w-0 flex-1 overflow-x-auto">
          {onTimeframeChange && (
            <div className="flex w-max items-center gap-1 text-[11px] font-semibold text-[#8a94a6]">
              {timeframeOptions.map((option) => {
                const active = timeframe === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`h-7 shrink-0 rounded px-2 transition hover:bg-white/10 hover:text-white ${active ? "bg-[#22ab94]/18 text-[#34f0bc]" : ""}`}
                    onClick={() => onTimeframeChange(option.value)}
                    data-testid={`button-chart-timeframe-${option.value.toLowerCase()}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => zoomChart("out")}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#050505] text-[#d8dee9] transition hover:border-[#22ab94]/70 hover:bg-[#0b1512] hover:text-white sm:h-8 sm:w-8"
            data-testid="button-chart-zoom-out"
            title={language === "ru" ? "Отдалить" : "Zoom out"}
          >
            <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomChart("in")}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#050505] text-[#d8dee9] transition hover:border-[#22ab94]/70 hover:bg-[#0b1512] hover:text-white sm:h-8 sm:w-8"
            data-testid="button-chart-zoom-in"
            title={language === "ru" ? "Приблизить" : "Zoom in"}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={fitFullChart}
            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#050505] text-[#d8dee9] transition hover:border-[#22ab94]/70 hover:bg-[#0b1512] hover:text-white sm:h-8 sm:w-8"
            title={language === "ru" ? "Показать весь график" : "Fit chart"}
          >
            <Expand className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black px-2 py-1.5 sm:px-5 sm:py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[16px] font-semibold text-white sm:text-[20px] lg:text-2xl">{tokenName}/USDT</span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-white/70 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-[#36c98b] sm:h-2.5 sm:w-2.5" />
            {copy.live}
          </span>
          <span className="hidden text-[11px] font-semibold text-[#8a94a6] sm:inline">
            {aggregateStats.current.toFixed(2)} · {copy.stateDynamics}
          </span>
        </div>

        <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
          {visibleLegendItems.length > 0 ? (
            visibleLegendItems.map((key) => (
              <div
                key={key}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: `${stateLabels[key].color}40`,
                  backgroundColor: `${stateLabels[key].color}14`,
                  color: stateLabels[key].color,
                }}
              >
                {stateLabels[key].label}
              </div>
            ))
          ) : (
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#8a94a6]">
              {copy.aggregate}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto border-b border-white/10 bg-black px-2 py-1.5 text-[10px] leading-none text-[#8a94a6] sm:px-5 sm:py-2 sm:text-[11px]">
        <div className="w-max whitespace-nowrap">
          <span>{tokenName}USDT · {activeTimeframeLabel} · SoulGraph </span>
          <span className="ml-2 text-[#9aa4b2]">{copy.ohlcOpen}</span> <span className="text-white/85">{aggregateStats.open.toFixed(2)}</span>
          <span className="ml-2 text-[#9aa4b2]">{copy.ohlcHigh}</span> <span className="text-[#22AB94]">{aggregateStats.max.toFixed(2)}</span>
          <span className="ml-2 text-[#9aa4b2]">{copy.ohlcLow}</span> <span className="text-[#F23645]">{aggregateStats.min.toFixed(2)}</span>
          <span className="ml-2 text-[#9aa4b2]">{copy.ohlcClose}</span>{" "}
          <span className={changeIsPositive ? "text-[#22AB94]" : "text-[#F23645]"}>{aggregateStats.close.toFixed(2)}</span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <div
          ref={chartContainerRef}
          className="h-full w-full touch-pan-x touch-pan-y"
          style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          data-testid="chart-container"
        />

        <div className="pointer-events-none absolute bottom-7 left-0 right-1 z-10 hidden h-[20%] items-end gap-[2px] px-3 opacity-75 md:flex">
          <div className="absolute left-3 top-0 text-[11px] text-[#8a94a6]">
            {copy.volume} <span className={changeIsPositive ? "text-[#22AB94]" : "text-[#F23645]"}>{latestVolume.toFixed(2)}</span>
          </div>
          {volumeBars.map((bar, index) => (
            <div
              key={index}
              className="min-w-[2px] flex-1 rounded-t-[1px] transition-[height] duration-300"
              style={{
                height: `${bar.height}%`,
                backgroundColor: bar.positive ? "rgba(37,212,157,0.48)" : "rgba(255,79,93,0.48)",
                boxShadow: bar.eventCount > 0 ? "0 0 8px rgba(34,171,148,0.18)" : "none",
              }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-none relative h-full w-full">{renderNewsMarkers()}</div>
        </div>

        {chartNews.length === 0 && (
          <div className="pointer-events-none absolute left-2 right-2 top-2 rounded border border-white/10 bg-black/80 px-2 py-1.5 text-[11px] text-[#b8c0cc] backdrop-blur-sm sm:left-4 sm:right-auto sm:top-4 sm:rounded-full sm:px-3 sm:text-xs">
            {copy.empty}
          </div>
        )}
      </div>

      <ChartTooltip event={tooltipEvent} position={tooltipPosition} />

      {selectedNews.length > 0 && (
        <NewsPopup
          events={selectedNews}
          onClose={() => setSelectedNews([])}
          onDelete={(eventId) => {
            if (onDeleteEvent) {
              onDeleteEvent(eventId);
              setSelectedNews([]);
            }
          }}
          onDeleteAll={
            onDeleteAllDayEvents
              ? () => {
                  const eventIds = selectedNews.map((event) => event.id).filter((id): id is string => Boolean(id));
                  onDeleteAllDayEvents(eventIds, () => {
                    setSelectedNews([]);
                  });
                }
              : undefined
          }
          isDeleting={isDeletingMultiple}
          position={popupPosition}
        />
      )}
    </div>
  );
}








