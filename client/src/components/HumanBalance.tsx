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

  // Convert balance to opacity (with visual distinction for negative values)
  const getOpacity = (value: number) => {
    const absValue = Math.abs(value);
    const normalized = Math.min(absValue / 20, 1); // 0 to 1
    
    if (value === 0) return 0.05; // Nearly invisible for zero
    
    // Positive values: scale from 0.1 to 1.0 (full brightness)
    if (value > 0) {
      return 0.1 + normalized * 0.9;
    }
    
    // Negative values: scale from 0.1 to 0.6 (dimmer to distinguish from positive)
    return 0.1 + normalized * 0.5;
  };

  // Base colors for each state (always consistent)
  const mentalColor = '#c084fc'; // Purple
  const physicalColor = '#06b6d4'; // Cyan
  const moralColor = '#eab308'; // Yellow
  const financialColor = '#10b981'; // Green

  return (
    <div className="flex flex-col items-center gap-3" data-testid="human-balance">
      <h3 className="text-sm font-medium text-muted-foreground">Баланс дня</h3>
      
      {/* SVG Human Figure - Tactical Style */}
      <svg
        width="200"
        height="400"
        viewBox="0 0 200 400"
        className="drop-shadow-lg"
        data-testid="human-figure"
      >
        {/* Background silhouette - detailed tactical figure */}
        <g opacity="0.08" fill="currentColor">
          {/* Head with helmet */}
          <ellipse cx="100" cy="35" rx="22" ry="28" />
          {/* Neck */}
          <rect x="92" y="58" width="16" height="12" rx="3" />
          
          {/* Shoulders with tactical vest straps */}
          <path d="M 55 70 Q 77 68 100 70 Q 123 68 145 70 L 140 85 L 60 85 Z" />
          
          {/* Tactical vest / chest */}
          <rect x="70" y="85" width="60" height="50" rx="5" />
          {/* Vest details */}
          <rect x="75" y="90" width="12" height="20" rx="2" opacity="0.3" />
          <rect x="113" y="90" width="12" height="20" rx="2" opacity="0.3" />
          
          {/* Belt / waist */}
          <rect x="75" y="135" width="50" height="8" rx="2" />
          
          {/* Upper torso */}
          <path d="M 70 85 L 65 135 L 70 165 L 100 170 L 130 165 L 135 135 L 130 85 Z" />
          
          {/* Arms with tactical gear */}
          {/* Left arm */}
          <path d="M 60 85 L 45 105 L 35 135 L 30 165 L 35 170 L 42 145 L 50 115 L 65 90 Z" />
          {/* Left forearm guard */}
          <rect x="30" y="150" width="8" height="20" rx="2" opacity="0.4" />
          
          {/* Right arm */}
          <path d="M 140 85 L 155 105 L 165 135 L 170 165 L 165 170 L 158 145 L 150 115 L 135 90 Z" />
          {/* Right forearm guard */}
          <rect x="162" y="150" width="8" height="20" rx="2" opacity="0.4" />
          
          {/* Hips */}
          <ellipse cx="100" cy="175" rx="35" ry="15" />
          
          {/* Thighs - longer legs */}
          {/* Left thigh */}
          <path d="M 75 175 L 70 210 L 68 250 L 72 252 L 78 250 L 80 210 L 78 175 Z" />
          {/* Right thigh */}
          <path d="M 125 175 L 130 210 L 132 250 L 128 252 L 122 250 L 120 210 L 122 175 Z" />
          
          {/* Knees */}
          <ellipse cx="74" cy="255" rx="8" ry="10" opacity="0.4" />
          <ellipse cx="126" cy="255" rx="8" ry="10" opacity="0.4" />
          
          {/* Lower legs - extended */}
          {/* Left shin */}
          <path d="M 70 260 L 67 310 L 65 360 L 70 365 L 78 362 L 76 310 L 74 260 Z" />
          {/* Right shin */}
          <path d="M 130 260 L 133 310 L 135 360 L 130 365 L 122 362 L 124 310 L 126 260 Z" />
          
          {/* Boots */}
          {/* Left boot */}
          <path d="M 65 360 L 62 375 L 60 385 L 75 388 L 78 375 L 76 362 Z" />
          <rect x="60" y="380" width="15" height="8" rx="2" />
          
          {/* Right boot */}
          <path d="M 135 360 L 138 375 L 140 385 L 125 388 L 122 375 L 124 362 Z" />
          <rect x="125" y="380" width="15" height="8" rx="2" />
        </g>

        {/* Colored regions based on life states */}
        
        {/* Mental (Head with helmet) - Purple */}
        <ellipse
          cx="100"
          cy="35"
          rx="22"
          ry="28"
          fill={mentalColor}
          opacity={getOpacity(balance.mental)}
          stroke={balance.mental < 0 ? '#ef4444' : 'none'}
          strokeWidth={balance.mental < 0 ? '3' : '0'}
          data-testid="region-mental"
        />

        {/* Moral (Chest/Heart - tactical vest area) - Yellow */}
        <rect
          x="70"
          y="85"
          width="60"
          height="50"
          rx="5"
          fill={moralColor}
          opacity={getOpacity(balance.moral)}
          stroke={balance.moral < 0 ? '#ef4444' : 'none'}
          strokeWidth={balance.moral < 0 ? '3' : '0'}
          data-testid="region-moral"
        />

        {/* Physical (Torso/Core) - Cyan */}
        <ellipse
          cx="100"
          cy="155"
          rx="32"
          ry="25"
          fill={physicalColor}
          opacity={getOpacity(balance.physical)}
          stroke={balance.physical < 0 ? '#ef4444' : 'none'}
          strokeWidth={balance.physical < 0 ? '3' : '0'}
          data-testid="region-physical"
        />

        {/* Financial (Legs - full length) - Green */}
        <g
          fill={financialColor}
          opacity={getOpacity(balance.financial)}
          stroke={balance.financial < 0 ? '#ef4444' : 'none'}
          strokeWidth={balance.financial < 0 ? '3' : '0'}
          data-testid="region-financial"
        >
          {/* Left leg complete */}
          <path d="M 75 175 L 70 210 L 68 250 L 67 310 L 65 360 L 70 365 L 78 362 L 76 310 L 74 250 L 78 210 L 78 175 Z" />
          {/* Right leg complete */}
          <path d="M 125 175 L 130 210 L 132 250 L 133 310 L 135 360 L 130 365 L 122 362 L 124 310 L 126 250 L 122 210 L 122 175 Z" />
          {/* Boots */}
          <path d="M 65 360 L 62 375 L 60 385 L 75 388 L 78 375 L 76 362 Z" />
          <path d="M 135 360 L 138 375 L 140 385 L 125 388 L 122 375 L 124 362 Z" />
        </g>

        {/* Detailed outline for tactical definition */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.25"
        >
          {/* Head */}
          <ellipse cx="100" cy="35" rx="22" ry="28" />
          {/* Neck */}
          <rect x="92" y="58" width="16" height="12" rx="3" />
          {/* Shoulders */}
          <path d="M 55 70 Q 77 68 100 70 Q 123 68 145 70 L 140 85 L 60 85 Z" />
          {/* Vest */}
          <rect x="70" y="85" width="60" height="50" rx="5" />
          {/* Belt */}
          <rect x="75" y="135" width="50" height="8" rx="2" />
          {/* Arms */}
          <path d="M 60 85 L 45 105 L 35 135 L 30 165 L 35 170 L 42 145 L 50 115 L 65 90 Z" />
          <path d="M 140 85 L 155 105 L 165 135 L 170 165 L 165 170 L 158 145 L 150 115 L 135 90 Z" />
          {/* Legs */}
          <path d="M 75 175 L 70 210 L 68 250 L 67 310 L 65 360 L 70 365 L 78 362 L 76 310 L 74 250 L 78 210 L 78 175 Z" />
          <path d="M 125 175 L 130 210 L 132 250 L 133 310 L 135 360 L 130 365 L 122 362 L 124 310 L 126 250 L 122 210 L 122 175 Z" />
          {/* Boots */}
          <path d="M 65 360 L 62 375 L 60 385 L 75 388 L 78 375 L 76 362 Z" />
          <path d="M 135 360 L 138 375 L 140 385 L 125 388 L 122 375 L 124 362 Z" />
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
