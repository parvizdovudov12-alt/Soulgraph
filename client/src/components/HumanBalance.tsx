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
          <defs>
            {/* Gradients for 3D muscle effect */}
            <linearGradient id="muscleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Mental (Head) - fills based on balance */}
          <g data-testid="region-mental">
            <ellipse
              cx="110"
              cy="35"
              rx="32"
              ry="35"
              fill={mentalColor}
              opacity={getOpacity(balance.mental)}
            />
            <ellipse cx="110" cy="35" rx="32" ry="35" fill="url(#muscleGradient)" />
          </g>

          {/* Neck muscles */}
          <g stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3">
            <path d="M 100 70 Q 100 80, 100 90" />
            <path d="M 120 70 Q 120 80, 120 90" />
          </g>

          {/* Moral (Chest/Heart) - Pecs with definition */}
          <g data-testid="region-moral">
            {/* Left pec */}
            <path
              d="M 85 95 Q 75 110, 78 130 Q 80 145, 85 158 L 105 162 Q 105 130, 100 110 Z"
              fill={moralColor}
              opacity={getOpacity(balance.moral)}
            />
            {/* Right pec */}
            <path
              d="M 135 95 Q 145 110, 142 130 Q 140 145, 135 158 L 115 162 Q 115 130, 120 110 Z"
              fill={moralColor}
              opacity={getOpacity(balance.moral)}
            />
            {/* Pec separation/definition */}
            <path d="M 85 95 Q 75 110, 78 130 Q 80 145, 85 158 L 105 162 Q 105 130, 100 110 Z" fill="url(#muscleGradient)" />
            <path d="M 135 95 Q 145 110, 142 130 Q 140 145, 135 158 L 115 162 Q 115 130, 120 110 Z" fill="url(#muscleGradient)" />
          </g>

          {/* Shoulders (deltoids) */}
          <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none">
            <ellipse cx="72" cy="98" rx="12" ry="15" />
            <ellipse cx="148" cy="98" rx="12" ry="15" />
          </g>

          {/* Physical (Torso/Core) - Abs definition */}
          <g data-testid="region-physical">
            {/* Main core fill */}
            <path
              d="M 85 165 L 78 180 L 80 210 L 85 240 L 135 240 L 140 210 L 142 180 L 135 165 Z"
              fill={physicalColor}
              opacity={getOpacity(balance.physical)}
            />
            {/* Six-pack abs definition */}
            <g fill="url(#muscleGradient)">
              {/* Upper abs */}
              <rect x="95" y="170" width="30" height="15" rx="3" />
              {/* Middle abs */}
              <rect x="95" y="190" width="30" height="15" rx="3" />
              {/* Lower abs */}
              <rect x="95" y="210" width="30" height="15" rx="3" />
            </g>
            {/* Obliques */}
            <g stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.4">
              <path d="M 85 170 Q 75 190, 78 210" />
              <path d="M 135 170 Q 145 190, 142 210" />
            </g>
          </g>

          {/* Arms - Biceps and Triceps */}
          <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none">
            {/* Left arm */}
            <path d="M 70 95 Q 65 105, 62 120" />
            <path d="M 62 120 Q 58 140, 55 160" />
            <path d="M 55 160 L 50 180" />
            {/* Left bicep bulge */}
            <ellipse cx="65" cy="115" rx="8" ry="12" opacity="0.5" />
            
            {/* Right arm */}
            <path d="M 150 95 Q 155 105, 158 120" />
            <path d="M 158 120 Q 162 140, 165 160" />
            <path d="M 165 160 L 170 180" />
            {/* Right bicep bulge */}
            <ellipse cx="155" cy="115" rx="8" ry="12" opacity="0.5" />
          </g>

          {/* Financial (Legs) - Quads and Calves */}
          <g data-testid="region-financial">
            {/* Left leg - Quad and calf definition */}
            <g opacity={getOpacity(balance.financial)}>
              {/* Left quad */}
              <path
                d="M 85 245 Q 82 260, 82 280 L 80 310 Q 78 330, 80 350 L 82 370 L 80 390 L 95 390 L 93 370 L 95 350 Q 97 330, 95 310 L 93 280 Q 93 260, 95 245 Z"
                fill={financialColor}
              />
              {/* Left quad muscles */}
              <path d="M 85 245 Q 82 260, 82 280 L 80 310 Q 78 330, 80 350 L 82 370 L 80 390 L 95 390 L 93 370 L 95 350 Q 97 330, 95 310 L 93 280 Q 93 260, 95 245 Z" fill="url(#muscleGradient)" />
            </g>

            {/* Right leg - Quad and calf definition */}
            <g opacity={getOpacity(balance.financial)}>
              {/* Right quad */}
              <path
                d="M 135 245 Q 138 260, 138 280 L 140 310 Q 142 330, 140 350 L 138 370 L 140 390 L 125 390 L 127 370 L 125 350 Q 123 330, 125 310 L 127 280 Q 127 260, 125 245 Z"
                fill={financialColor}
              />
              {/* Right quad muscles */}
              <path d="M 135 245 Q 138 260, 138 280 L 140 310 Q 142 330, 140 350 L 138 370 L 140 390 L 125 390 L 127 370 L 125 350 Q 123 330, 125 310 L 127 280 Q 127 260, 125 245 Z" fill="url(#muscleGradient)" />
            </g>

            {/* Quad separation lines */}
            <g stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3">
              <path d="M 88 250 L 87 310" />
              <path d="M 132 250 L 133 310" />
            </g>
          </g>

          {/* Overall body outline */}
          <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.6">
            <ellipse cx="110" cy="35" rx="32" ry="35" />
            <path d="M 110 70 L 110 90" />
            <path d="M 70 95 L 150 95" />
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
