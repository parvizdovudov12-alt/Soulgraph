import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, LineChart, CandlestickChart, Activity, Heart, Sparkles, Coins, Trash2 } from 'lucide-react';
import { HumanBalance } from './HumanBalance';
import TokenNameEditor from './TokenNameEditor';
import type { NewsEvent } from './LifeChart';
import type { Timeframe } from '@/lib/dateUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  onClearAllEvents: () => void;
  chartType: 'line' | 'candlestick';
  onChartTypeChange: (type: 'line' | 'candlestick') => void;
  tokenName: string;
  onTokenNameUpdate: (newName: string) => void;
  isAuthenticated: boolean;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
}

export default function ControlPanel({
  totalAssets,
  visibleStates,
  currentValues,
  news,
  onToggleState,
  onAddPositiveNews,
  onAddNegativeNews,
  onClearAllEvents,
  chartType,
  onChartTypeChange,
  tokenName,
  onTokenNameUpdate,
  isAuthenticated,
  timeframe = '1D',
  onTimeframeChange,
}: ControlPanelProps) {
  const states: Array<{ key: StateKey; label: string; color: string; bgColor: string; icon: any }> = [
    { key: 'mental', label: 'Душевное', color: 'text-mental', bgColor: 'bg-mental/10', icon: Sparkles },
    { key: 'physical', label: 'Физическое', color: 'text-physical', bgColor: 'bg-physical/10', icon: Activity },
    { key: 'moral', label: 'Моральное', color: 'text-moral', bgColor: 'bg-moral/10', icon: Heart },
    { key: 'financial', label: 'Финансовое', color: 'text-financial', bgColor: 'bg-financial/10', icon: Coins },
  ];

  return (
    <div className="w-full lg:w-80 bg-card border-t lg:border-t-0 lg:border-l border-card-border p-3 md:p-6 space-y-4 md:space-y-6 overflow-y-auto max-h-[50vh] lg:max-h-none">
      {/* Aggregate Index Display */}
      <div className="bg-background/50 rounded-lg p-3 md:p-4 border border-border">
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

      {/* Timeframe Selector */}
      {onTimeframeChange && (
        <div className="space-y-2 md:space-y-3">
          <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Таймфрейм
          </p>
          <div className="grid grid-cols-4 md:grid-cols-2 gap-1.5 md:gap-2">
            <Button
              variant={timeframe === '1D' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeframeChange('1D')}
              className="flex-1 text-xs md:text-sm min-h-[44px] md:h-auto font-mono"
              data-testid="button-timeframe-1d"
            >
              1D
            </Button>
            <Button
              variant={timeframe === '7D' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeframeChange('7D')}
              className="flex-1 text-xs md:text-sm min-h-[44px] md:h-auto font-mono"
              data-testid="button-timeframe-7d"
            >
              7D
            </Button>
            <Button
              variant={timeframe === '30D' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeframeChange('30D')}
              className="flex-1 text-xs md:text-sm min-h-[44px] md:h-auto font-mono"
              data-testid="button-timeframe-30d"
            >
              30D
            </Button>
            <Button
              variant={timeframe === '90D' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeframeChange('90D')}
              className="flex-1 text-xs md:text-sm min-h-[44px] md:h-auto font-mono"
              data-testid="button-timeframe-90d"
            >
              90D
            </Button>
          </div>
        </div>
      )}

      {/* Chart Type Toggle */}
      <div className="space-y-2 md:space-y-3">
        <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
          График
        </p>
        <div className="grid grid-cols-2 gap-1.5 md:gap-2">
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChartTypeChange('line')}
            className="flex-1 text-xs md:text-sm min-h-[44px] md:h-auto"
            data-testid="button-chart-line"
          >
            <LineChart className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Линии
          </Button>
          <Button
            variant={chartType === 'candlestick' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChartTypeChange('candlestick')}
            className="flex-1 text-xs md:text-sm min-h-[44px] md:h-auto"
            data-testid="button-chart-candlestick"
          >
            <CandlestickChart className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Свечи
          </Button>
        </div>
      </div>

      {/* News Actions */}
      <div className="space-y-2 md:space-y-3">
        <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
          События
        </p>
        <div className="grid grid-cols-2 gap-1.5 md:gap-2">
          <Button
            onClick={onAddPositiveNews}
            className="bg-positive hover:bg-positive/90 text-white flex-1 text-xs md:text-sm min-h-[44px] md:h-auto"
            size="sm"
            data-testid="button-add-positive-news"
          >
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Позитив
          </Button>
          <Button
            onClick={onAddNegativeNews}
            className="bg-negative hover:bg-negative/90 text-white flex-1 text-xs md:text-sm min-h-[44px] md:h-auto"
            size="sm"
            data-testid="button-add-negative-news"
          >
            <TrendingDown className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Негатив
          </Button>
        </div>
        {news.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive text-xs md:text-sm min-h-[44px] md:h-auto"
                data-testid="button-clear-all-events"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Очистить все события
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить все события?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Все ваши события ({news.length}) и данные графика будут удалены.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-clear">Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onClearAllEvents}
                  className="bg-destructive hover:bg-destructive/90"
                  data-testid="button-confirm-clear"
                >
                  Удалить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* State Indicators */}
      <div className="space-y-2 md:space-y-3 hidden md:block">
        <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Индикаторы
        </p>
        <div className="grid grid-cols-2 gap-1.5 md:gap-2">
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
      <div className="hidden lg:block">
        <HumanBalance newsEvents={news} />
      </div>

      {/* Daily Norm Progress */}
      <div className="space-y-3 md:space-y-4 hidden md:block">
        <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
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
    </div>
  );
}
