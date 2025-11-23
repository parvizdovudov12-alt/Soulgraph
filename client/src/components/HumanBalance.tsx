import { useMemo } from 'react';
import type { NewsEvent } from './LifeChart';

interface HumanBalanceProps {
  newsEvents: NewsEvent[];
}

export function HumanBalance({ newsEvents }: HumanBalanceProps) {
  // Calculate net balance for last 24 hours
  const balance = useMemo(() => {
    const now = Date.now() / 1000; // Convert to seconds (Time format)
    const oneDayAgo = now - 24 * 60 * 60;

    const recent = newsEvents.filter(
      (event) => {
        // Skip aggregated summary events
        if (event.groupedEvents) return false;
        
        const eventTime = typeof event.time === 'number' ? event.time : parseInt(event.time as string);
        return eventTime >= oneDayAgo;
      }
    );

    const totals = recent.reduce(
      (acc, event) => ({
        mental: acc.mental + (event.impact?.mental || 0),
        physical: acc.physical + (event.impact?.physical || 0),
        moral: acc.moral + (event.impact?.moral || 0),
        financial: acc.financial + (event.impact?.financial || 0),
      }),
      { mental: 0, physical: 0, moral: 0, financial: 0 }
    );

    return totals;
  }, [newsEvents]);

  // Convert balance to opacity (0 to 1)
  const getOpacity = (value: number) => {
    // Map -20 to +20 range to 0.1 to 1.0 opacity
    const normalized = Math.abs(value) / 20;
    return Math.min(Math.max(0.1 + normalized * 0.9, 0.1), 1);
  };

  // Get color based on positive/negative
  const getColor = (value: number, baseColor: string) => {
    if (value === 0) return `${baseColor}30`; // Low opacity if neutral (visible in legend)
    return value > 0 ? baseColor : '#ef4444'; // Base color if positive, red if negative
  };

  const mentalColor = getColor(balance.mental, '#c084fc'); // Purple
  const physicalColor = getColor(balance.physical, '#06b6d4'); // Cyan
  const moralColor = getColor(balance.moral, '#eab308'); // Yellow
  const financialColor = getColor(balance.financial, '#10b981'); // Green

  return (
    <div className="flex flex-col items-center gap-3" data-testid="human-balance">
      <h3 className="text-sm font-medium text-muted-foreground">Баланс дня</h3>
      
      {/* SVG Human Figure with Dynamic Fills */}
      <div className="relative w-[220px] h-[400px]" data-testid="human-figure">
        <svg
          viewBox="0 0 220 400"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base outline - subtle gray */}
          <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none">
            {/* Head outline */}
            <ellipse cx="110" cy="35" rx="32" ry="35" />
            {/* Neck */}
            <line x1="110" y1="70" x2="110" y2="90" />
            {/* Shoulders */}
            <line x1="70" y1="95" x2="150" y2="95" />
            {/* Arms */}
            <line x1="70" y1="95" x2="50" y2="180" />
            <line x1="150" y1="95" x2="170" y2="180" />
            {/* Torso */}
            <path d="M 85 95 L 75 170 L 85 245 L 135 245 L 145 170 L 135 95 Z" />
            {/* Legs */}
            <path d="M 85 245 L 80 390" />
            <path d="M 135 245 L 140 390" />
          </g>

          {/* Mental (Head) - fills based on balance */}
          <ellipse
            cx="110"
            cy="35"
            rx="32"
            ry="35"
            fill={mentalColor}
            opacity={getOpacity(balance.mental)}
            data-testid="region-mental"
          />

          {/* Moral (Chest/Heart) - fills based on balance */}
          <path
            d="M 85 95 L 75 130 L 80 165 L 140 165 L 145 130 L 135 95 Z"
            fill={moralColor}
            opacity={getOpacity(balance.moral)}
            data-testid="region-moral"
          />

          {/* Physical (Torso/Core) - fills based on balance */}
          <path
            d="M 80 165 L 75 170 L 85 245 L 135 245 L 145 170 L 140 165 Z"
            fill={physicalColor}
            opacity={getOpacity(balance.physical)}
            data-testid="region-physical"
          />

          {/* Financial (Legs) - fills based on balance */}
          <g opacity={getOpacity(balance.financial)} data-testid="region-financial">
            <path d="M 85 245 L 82 320 L 80 390 L 95 390 L 95 320 Z" fill={financialColor} />
            <path d="M 135 245 L 138 320 L 140 390 L 125 390 L 125 320 Z" fill={financialColor} />
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs w-full" data-testid="balance-legend">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: mentalColor, opacity: Math.max(getOpacity(balance.mental), 0.3) }}
          />
          <span className="text-muted-foreground">
            Душевное {balance.mental > 0 ? '+' : ''}{balance.mental.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: physicalColor, opacity: Math.max(getOpacity(balance.physical), 0.3) }}
          />
          <span className="text-muted-foreground">
            Физическое {balance.physical > 0 ? '+' : ''}{balance.physical.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: moralColor, opacity: Math.max(getOpacity(balance.moral), 0.3) }}
          />
          <span className="text-muted-foreground">
            Моральное {balance.moral > 0 ? '+' : ''}{balance.moral.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: financialColor, opacity: Math.max(getOpacity(balance.financial), 0.3) }}
          />
          <span className="text-muted-foreground">
            Финансовое {balance.financial > 0 ? '+' : ''}{balance.financial.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}
