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
        return (event.time as number) >= oneDayAgo;
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
    if (value === 0) return `${baseColor}20`; // Very transparent if neutral
    return value > 0 ? baseColor : '#ef4444'; // Base color if positive, red if negative
  };

  const mentalColor = getColor(balance.mental, '#c084fc'); // Purple
  const physicalColor = getColor(balance.physical, '#06b6d4'); // Cyan
  const moralColor = getColor(balance.moral, '#eab308'); // Yellow
  const financialColor = getColor(balance.financial, '#10b981'); // Green

  return (
    <div className="flex flex-col items-center gap-3" data-testid="human-balance">
      <h3 className="text-sm font-medium text-muted-foreground">Баланс дня</h3>
      
      {/* SVG Human Figure */}
      <svg
        width="180"
        height="300"
        viewBox="0 0 180 300"
        className="drop-shadow-lg"
        data-testid="human-figure"
      >
        {/* Background silhouette */}
        <g opacity="0.1" fill="currentColor">
          {/* Head */}
          <circle cx="90" cy="40" r="25" />
          {/* Neck */}
          <rect x="80" y="60" width="20" height="15" rx="5" />
          {/* Shoulders */}
          <ellipse cx="90" cy="85" rx="45" ry="15" />
          {/* Torso */}
          <path d="M 60 85 L 50 140 L 60 180 L 90 190 L 120 180 L 130 140 L 120 85 Z" />
          {/* Left arm */}
          <path d="M 50 90 L 35 120 L 30 150 L 35 155 L 45 130 L 55 100 Z" />
          {/* Right arm */}
          <path d="M 130 90 L 145 120 L 150 150 L 145 155 L 135 130 L 125 100 Z" />
          {/* Left leg */}
          <path d="M 60 185 L 55 240 L 50 290 L 60 295 L 70 290 L 72 240 L 70 185 Z" />
          {/* Right leg */}
          <path d="M 120 185 L 125 240 L 130 290 L 120 295 L 110 290 L 108 240 L 110 185 Z" />
        </g>

        {/* Colored regions based on life states */}
        
        {/* Mental (Head) - Purple */}
        <circle
          cx="90"
          cy="40"
          r="25"
          fill={mentalColor}
          opacity={getOpacity(balance.mental)}
          data-testid="region-mental"
        />

        {/* Moral (Heart/Chest) - Yellow */}
        <ellipse
          cx="90"
          cy="110"
          rx="35"
          ry="25"
          fill={moralColor}
          opacity={getOpacity(balance.moral)}
          data-testid="region-moral"
        />

        {/* Physical (Torso) - Cyan */}
        <ellipse
          cx="90"
          cy="155"
          rx="38"
          ry="35"
          fill={physicalColor}
          opacity={getOpacity(balance.physical)}
          data-testid="region-physical"
        />

        {/* Financial (Legs) - Green */}
        <g
          fill={financialColor}
          opacity={getOpacity(balance.financial)}
          data-testid="region-financial"
        >
          {/* Left leg */}
          <path d="M 60 185 L 55 240 L 50 290 L 60 295 L 70 290 L 72 240 L 70 185 Z" />
          {/* Right leg */}
          <path d="M 120 185 L 125 240 L 130 290 L 120 295 L 110 290 L 108 240 L 110 185 Z" />
        </g>

        {/* Outline for definition */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.3"
        >
          <circle cx="90" cy="40" r="25" />
          <rect x="80" y="60" width="20" height="15" rx="5" />
          <ellipse cx="90" cy="85" rx="45" ry="15" />
          <path d="M 60 85 L 50 140 L 60 180 L 90 190 L 120 180 L 130 140 L 120 85 Z" />
          <path d="M 50 90 L 35 120 L 30 150 L 35 155 L 45 130 L 55 100 Z" />
          <path d="M 130 90 L 145 120 L 150 150 L 145 155 L 135 130 L 125 100 Z" />
          <path d="M 60 185 L 55 240 L 50 290 L 60 295 L 70 290 L 72 240 L 70 185 Z" />
          <path d="M 120 185 L 125 240 L 130 290 L 120 295 L 110 290 L 108 240 L 110 185 Z" />
        </g>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs w-full" data-testid="balance-legend">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: mentalColor, opacity: getOpacity(balance.mental) }}
          />
          <span className="text-muted-foreground">
            Душевное {balance.mental > 0 ? '+' : ''}{balance.mental.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: physicalColor, opacity: getOpacity(balance.physical) }}
          />
          <span className="text-muted-foreground">
            Физическое {balance.physical > 0 ? '+' : ''}{balance.physical.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: moralColor, opacity: getOpacity(balance.moral) }}
          />
          <span className="text-muted-foreground">
            Моральное {balance.moral > 0 ? '+' : ''}{balance.moral.toFixed(0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: financialColor, opacity: getOpacity(balance.financial) }}
          />
          <span className="text-muted-foreground">
            Финансовое {balance.financial > 0 ? '+' : ''}{balance.financial.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}
