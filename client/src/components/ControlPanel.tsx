import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, LineChart, CandlestickChart, Activity, Heart, Sparkles, Coins } from 'lucide-react';
import DailyBalance from './DailyBalance';
import TokenNameEditor from './TokenNameEditor';
import type { NewsEvent } from './LifeChart';

type StateKey = 'mental' | 'physical' | 'moral' | 'financial';

interface ControlPanelProps {
  totalAssets: number;
  visibleStates: {
    mental: boolean;
    physical: boolean;
    moral: boolean;
    financial: boolean;
  };
  currentValues: {
    mental: number;
    physical: number;
    moral: number;
    financial: number;
  };
  news: NewsEvent[];
  onToggleState: (state: StateKey) => void;
  onAddPositiveNews: () => void;
  onAddNegativeNews: () => void;
  chartType: 'line' | 'candlestick';
  onChartTypeChange: (type: 'line' | 'candlestick') => void;
  tokenName: string;
  onTokenNameUpdate: (newName: string) => void;
  isAuthenticated: boolean;
}

export default function ControlPanel({
  totalAssets,
  visibleStates,
  currentValues,
  news,
  onToggleState,
  onAddPositiveNews,
  onAddNegativeNews,
  chartType,
  onChartTypeChange,
  tokenName,
  onTokenNameUpdate,
  isAuthenticated,
}: ControlPanelProps) {
  const states: Array<{ key: StateKey; label: string; color: string; bgColor: string; icon: any }> = [
    { key: 'mental', label: 'Душевное', color: 'text-mental', bgColor: 'bg-mental/10', icon: Sparkles },
    { key: 'physical', label: 'Физическое', color: 'text-physical', bgColor: 'bg-physical/10', icon: Activity },
    { key: 'moral', label: 'Моральное', color: 'text-moral', bgColor: 'bg-moral/10', icon: Heart },
    { key: 'financial', label: 'Финансовое', color: 'text-financial', bgColor: 'bg-financial/10', icon: Coins },
  ];

  return (
    <div className="w-80 bg-card border-l border-card-border p-6 space-y-6 overflow-y-auto">
      {/* Aggregate Index Display */}
      <div className="bg-background/50 rounded-lg p-4 border border-border">
        <div className="flex items-center mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide" data-testid="text-token-name">
            {tokenName}
          </p>
          {isAuthenticated && (
            <TokenNameEditor
              currentTokenName={tokenName}
              onUpdate={onTokenNameUpdate}
            />
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-semibold text-primary">
            {totalAssets.toFixed(1)}
          </span>
          <div className="flex items-center gap-1">
            {totalAssets >= 50 ? (
              <TrendingUp className="w-4 h-4 text-positive" />
            ) : (
              <TrendingDown className="w-4 h-4 text-negative" />
            )}
            <span className={`text-sm font-mono ${totalAssets >= 50 ? 'text-positive' : 'text-negative'}`}>
              {totalAssets >= 50 ? '+' : ''}{(totalAssets - 50).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Type Toggle */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          График
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChartTypeChange('line')}
            className="flex-1"
            data-testid="button-chart-line"
          >
            <LineChart className="w-4 h-4 mr-1" />
            Линии
          </Button>
          <Button
            variant={chartType === 'candlestick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChartTypeChange('candlestick')}
            className="flex-1"
            data-testid="button-chart-candlestick"
          >
            <CandlestickChart className="w-4 h-4 mr-1" />
            Свечи
          </Button>
        </div>
      </div>

      {/* State Indicators */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Индикаторы
        </p>
        <div className="grid grid-cols-2 gap-2">
          {states.map((state) => {
            const Icon = state.icon;
            const isActive = visibleStates[state.key];
            return (
              <button
                key={state.key}
                onClick={() => onToggleState(state.key)}
                className={`
                  relative flex flex-col items-center gap-2 p-3 rounded-lg
                  transition-all duration-200
                  ${isActive ? state.bgColor : 'bg-background/50'}
                  ${isActive ? 'border-2' : 'border'} 
                  ${isActive ? `border-${state.key}` : 'border-border'}
                  hover-elevate
                `}
                style={isActive ? { borderColor: `hsl(var(--chart-${states.findIndex(s => s.key === state.key) + 1}))` } : {}}
                data-testid={`indicator-${state.key}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? state.color : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${isActive ? state.color : 'text-muted-foreground'}`}>
                  {state.label}
                </span>
                {isActive && (
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${state.color.replace('text-', 'bg-')}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Balance */}
      <DailyBalance news={news} />

      {/* Daily Norm Progress */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Суточная норма
        </p>
        {states.map((state) => {
          const value = currentValues[state.key];
          const percentage = Math.min(100, Math.max(0, value));
          
          return (
            <div key={state.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${state.color}`}>{state.label}</span>
                <span className={`text-sm font-mono ${state.color}`}>
                  {value.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
                data-testid={`progress-${state.key}`}
              />
            </div>
          );
        })}
      </div>

      {/* News Actions */}
      <div className="space-y-3 pt-4 border-t border-border">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          События
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onAddPositiveNews}
            className="bg-positive hover:bg-positive/90 text-white flex-1"
            size="sm"
            data-testid="button-add-positive-news"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Позитив
          </Button>
          <Button
            onClick={onAddNegativeNews}
            className="bg-negative hover:bg-negative/90 text-white flex-1"
            size="sm"
            data-testid="button-add-negative-news"
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            Негатив
          </Button>
        </div>
      </div>
    </div>
  );
}
