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
import { Button } from "@/components/ui/button";
import { formatPeriodLabel, timeframeToSeconds, type Timeframe } from "@/lib/dateUtils";
import { useLanguage } from "@/lib/i18n";
import { Expand, Minus, Plus } from "lucide-react";

export interface StateData {
  time: Time;
  mental: number;
  physical: number;
  moral: number;
  financial: number;
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
  shell: "#12161d",
  panel: "#0f1319",
  border: "rgba(255,255,255,0.08)",
  grid: "rgba(255,255,255,0.05)",
  text: "#E5E9F0",
  muted: "#8F98AC",
  positive: "#F3B35A",
  positiveAlt: "#6FA8FF",
  negative: "#F0886A",
  gold: "#34C98B",
  blue: "#E15B64",
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

function buildRenderableData(input: StateData[], timeframe: Timeframe): StateData[] {
  const deduped = deduplicateData(input);
  if (deduped.length >= 2) return deduped;

  const source =
    deduped[0] ??
    ({
      time: Math.floor(Date.now() / 1000) as Time,
      mental: 0,
      physical: 0,
      moral: 0,
      financial: 0,
    } as StateData);

  const windowSize = timeframe === "ALL" ? timeframeToSeconds("1Y") : timeframeToSeconds(timeframe);
  const pointsByTimeframe: Record<Timeframe, number> = {
    ALL: 84,
    "1D": 18,
    "1W": 28,
    "1M": 42,
    "1Y": 84,
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

export default function LifeChart({
  data,
  visibleStates,
  weights,
  news,
  chartType = "candlestick",
  tokenName,
  timeframe = "ALL",
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

  useEffect(() => {
    newsRef.current = news;
  }, [news]);

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
          { value: "ALL", label: "ВСЕ" },
          { value: "1D", label: "1Д" },
          { value: "1W", label: "1Н" },
          { value: "1M", label: "1М" },
          { value: "1Y", label: "1Г" },
        ]
      : [
          { value: "ALL", label: "ALL" },
          { value: "1D", label: "1D" },
          { value: "1W", label: "1W" },
          { value: "1M", label: "1M" },
          { value: "1Y", label: "1Y" },
        ];
  const stateLabels = STATE_META[language];

  const renderableData = useMemo(() => buildRenderableData(data, timeframe), [data, timeframe]);
  const barSpacingByTimeframe: Record<Timeframe, number> = {
    ALL: 8,
    "1D": 28,
    "1W": 18,
    "1M": 10,
    "1Y": 4,
  };
  const rightOffsetByTimeframe: Record<Timeframe, number> = {
    ALL: 6,
    "1D": 10,
    "1W": 8,
    "1M": 6,
    "1Y": 3,
  };
  const minBarSpacingByTimeframe: Record<Timeframe, number> = {
    ALL: 2,
    "1D": 16,
    "1W": 10,
    "1M": 6,
    "1Y": 2,
  };
  const aggregateStats = useMemo(() => {
    if (renderableData.length === 0) {
      return { current: 0, previous: 0, change: 0, changePercent: 0, max: 0, min: 0, open: 0, close: 0 };
    }

    const values = renderableData.map((point) => aggregateValue(point, weights));
    const current = values[values.length - 1] ?? 0;
    const previous = values[Math.max(values.length - 2, 0)] ?? current;
    const open = values[0] ?? current;
    const close = current;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const change = current - previous;
    const changePercent = previous === 0 ? (current === 0 ? 0 : 100) : (change / Math.abs(previous)) * 100;

    return { current, previous, change, changePercent, max, min, open, close };
  }, [renderableData, weights]);

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

    if (timeframe === "ALL") {
      fitFullChart();
      return;
    }

    const firstTime = plottedDataRef.current[0]?.time as number | undefined;
    const lastTime = plottedDataRef.current[plottedDataRef.current.length - 1]?.time as number | undefined;
    if (firstTime === undefined || lastTime === undefined) return;

    const periodSeconds = timeframeToSeconds(timeframe);
    const from = Math.max(firstTime, lastTime - periodSeconds);
    const padding = Math.max(periodSeconds * 0.02, 60 * 60);
    const to = lastTime + padding;

    try {
      timeScale.setVisibleRange({
        from: from as Time,
        to: to as Time,
      });
    } catch {
      fitFullChart();
    }
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
  }, [news]);

  useEffect(() => {
    seriesRef.current.mental?.applyOptions({ visible: visibleStates.mental });
    seriesRef.current.physical?.applyOptions({ visible: visibleStates.physical });
    seriesRef.current.moral?.applyOptions({ visible: visibleStates.moral });
    seriesRef.current.financial?.applyOptions({ visible: visibleStates.financial });
  }, [visibleStates]);

  useEffect(() => {
    if (!seriesRef.current.aggregate) return;

    if (chartType === "line" && news.length > 0 && typeof (seriesRef.current.aggregate as any)?.setMarkers === "function") {
      const markers: SeriesMarker<Time>[] = news.map((event) => ({
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
  }, [news, chartType]);

  const renderNewsMarkers = () => {
    if (!chartRef.current || plottedDataRef.current.length === 0) return null;

    return news.map((event, index) => {
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
  const copy =
    language === "ru"
      ? {
          stateDynamics: "Динамика состояния",
          live: "Онлайн",
          indexLabel: "индекс",
          aggregate: "Сводный курс по всем зонам",
          empty: "Добавь первое событие, чтобы график начал накапливать реальную динамику.",
          hint: "Нажми на точку события, чтобы открыть запись. ВСЕ показывает весь период, 1Д/1Н/1М/1Г - выбранный отрезок.",
        }
      : {
          stateDynamics: "State dynamics",
          live: "Live",
          indexLabel: "index",
          aggregate: "Combined direction across all areas",
          empty: "Add the first event so the chart can start building real movement.",
          hint: "Tap an event point to open its entry. ALL shows the full period; 1D/1W/1M/1Y show the selected range.",
        };

  return (
    <div className="flex h-full min-h-[560px] flex-col rounded-[24px] border border-white/8 bg-[#12161d] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8f98ac]">{copy.stateDynamics}</p>
          <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3">
            <p className="text-[2.1rem] leading-none font-semibold text-[#f3d19b] sm:text-[2.5rem] lg:text-[3.05rem]">{aggregateStats.current.toFixed(2)}</p>
            <div className="min-w-[112px] sm:min-w-[132px]">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/72">{tokenName} {copy.indexLabel}</p>
              <p className={`mt-1 text-[14px] sm:text-[15px] lg:text-[17px] font-semibold ${changeIsPositive ? "text-[#34C98B]" : "text-[#E15B64]"}`}>
                {changeIsPositive ? "+" : ""}
                {aggregateStats.change.toFixed(2)} ({changeIsPositive ? "+" : ""}
                {aggregateStats.changePercent.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onTimeframeChange && (
            <div className="inline-flex rounded-2xl border border-white/8 bg-white/[0.03] p-1">
              {timeframeOptions.map((option) => {
                const active = timeframe === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl px-2.5 text-[10px] font-semibold tracking-[0.12em] sm:px-3 sm:text-[11px] sm:tracking-[0.14em]"
                    style={{
                      backgroundColor: active ? "rgba(243,179,90,0.12)" : "transparent",
                      color: active ? CHART_COLORS.gold : CHART_COLORS.muted,
                      boxShadow: active ? "inset 0 0 0 1px rgba(243,179,90,0.22)" : "none",
                    }}
                    onClick={() => onTimeframeChange(option.value)}
                    data-testid={`button-chart-timeframe-${option.value.toLowerCase()}`}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => zoomChart("out")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/78 transition hover:bg-white/[0.06] sm:h-10 sm:w-10"
            data-testid="button-chart-zoom-out"
            title={language === "ru" ? "Отдалить" : "Zoom out"}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomChart("in")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/78 transition hover:bg-white/[0.06] sm:h-10 sm:w-10"
            data-testid="button-chart-zoom-in"
            title={language === "ru" ? "Приблизить" : "Zoom in"}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={fitFullChart}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/78 sm:h-10 sm:w-10"
            title={language === "ru" ? "Показать весь график" : "Fit chart"}
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[18px] font-semibold text-white sm:text-[20px] lg:text-2xl">{tokenName}/USDT</span>
          <span className="flex items-center gap-1 text-xs text-white/70 sm:text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[#36c98b]" />
            {copy.live}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
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
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-[#8f98ac]">
              {copy.aggregate}
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-white/6 px-4 py-2 text-[11px] leading-relaxed text-[#8f98ac] sm:px-5">
        {copy.hint}
      </div>

      <div className="relative min-h-[380px] flex-1 overflow-hidden sm:min-h-[420px] lg:min-h-0">
        <div
          ref={chartContainerRef}
          className="h-full w-full touch-pan-x touch-pan-y"
          style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          data-testid="chart-container"
        />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-none relative h-full w-full">{renderNewsMarkers()}</div>
        </div>

        {news.length === 0 && (
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/8 bg-black/30 px-3 py-1.5 text-xs text-[#8f98ac] backdrop-blur-sm">
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








