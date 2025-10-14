import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TrendingUp, TrendingDown, LineChart, CandlestickChart } from 'lucide-react';

type StateKey = 'mental' | 'physical' | 'moral' | 'financial';

interface ControlPanelProps {
  aggregateIndex: number;
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
  onToggleState: (state: StateKey) => void;
  onWeightChange: (state: StateKey, value: number) => void;
  onAddPositiveNews: () => void;
  onAddNegativeNews: () => void;
  chartType: 'line' | 'candlestick';
  onChartTypeChange: (type: 'line' | 'candlestick') => void;
}

export default function ControlPanel({
  aggregateIndex,
  visibleStates,
  weights,
  onToggleState,
  onWeightChange,
  onAddPositiveNews,
  onAddNegativeNews,
  chartType,
  onChartTypeChange,
}: ControlPanelProps) {
  const states: Array<{ key: StateKey; label: string; color: string }> = [
    { key: 'mental', label: 'Душевное', color: 'text-mental' },
    { key: 'physical', label: 'Физическое', color: 'text-physical' },
    { key: 'moral', label: 'Моральное', color: 'text-moral' },
    { key: 'financial', label: 'Финансовое', color: 'text-financial' },
  ];

  return (
    <div className="w-80 bg-card border-l border-card-border p-6 space-y-6 overflow-y-auto">
      {/* Aggregate Index Display */}
      <div className="bg-background/50 rounded-lg p-4 border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Агрегированный индекс
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-semibold text-primary">
            {aggregateIndex.toFixed(1)}
          </span>
          <div className="flex items-center gap-1">
            {aggregateIndex >= 50 ? (
              <TrendingUp className="w-4 h-4 text-positive" />
            ) : (
              <TrendingDown className="w-4 h-4 text-negative" />
            )}
            <span className={`text-sm font-mono ${aggregateIndex >= 50 ? 'text-positive' : 'text-negative'}`}>
              {aggregateIndex >= 50 ? '+' : ''}{(aggregateIndex - 50).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Type Toggle */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Тип графика
        </p>
        <div className="flex gap-2">
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChartTypeChange('line')}
            className="flex-1"
            data-testid="button-chart-line"
          >
            <LineChart className="w-4 h-4 mr-2" />
            Линии
          </Button>
          <Button
            variant={chartType === 'candlestick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChartTypeChange('candlestick')}
            className="flex-1"
            data-testid="button-chart-candlestick"
          >
            <CandlestickChart className="w-4 h-4 mr-2" />
            Свечи
          </Button>
        </div>
      </div>

      {/* State Toggles */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Состояния
        </p>
        {states.map((state) => (
          <div key={state.key} className="flex items-center gap-3">
            <Checkbox
              id={`state-${state.key}`}
              checked={visibleStates[state.key]}
              onCheckedChange={() => onToggleState(state.key)}
              className="data-[state=checked]:bg-chart-1"
              data-testid={`checkbox-${state.key}`}
            />
            <Label
              htmlFor={`state-${state.key}`}
              className={`text-sm cursor-pointer ${state.color}`}
            >
              {state.label}
            </Label>
          </div>
        ))}
      </div>

      {/* Weight Sliders */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Веса состояний
        </p>
        {states.map((state) => (
          <div key={state.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={`text-sm ${state.color}`}>{state.label}</Label>
              <span className={`text-sm font-mono ${state.color}`}>
                {(weights[state.key] * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[weights[state.key] * 100]}
              onValueChange={([value]) => onWeightChange(state.key, value / 100)}
              min={0}
              max={100}
              step={5}
              className={`[&_[role=slider]]:bg-${state.key}`}
              data-testid={`slider-weight-${state.key}`}
            />
          </div>
        ))}
      </div>

      {/* News Actions */}
      <div className="space-y-3 pt-4 border-t border-border">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Добавить событие
        </p>
        <Button
          onClick={onAddPositiveNews}
          className="w-full bg-positive hover:bg-positive/90 text-white"
          data-testid="button-add-positive-news"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Положительная новость
        </Button>
        <Button
          onClick={onAddNegativeNews}
          className="w-full bg-negative hover:bg-negative/90 text-white"
          data-testid="button-add-negative-news"
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          Отрицательная новость
        </Button>
      </div>
    </div>
  );
}
