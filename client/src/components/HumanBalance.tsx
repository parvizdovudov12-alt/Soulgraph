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
              <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
            </linearGradient>
            <radialGradient id="muscleRadial">
              <stop offset="30%" stopColor="#fff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.15" />
            </radialGradient>
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

          {/* Neck muscles - Trapezius */}
          <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.4">
            <path d="M 100 70 Q 100 80, 100 90" />
            <path d="M 120 70 Q 120 80, 120 90" />
            {/* Trapezius outline */}
            <path d="M 90 75 Q 85 85, 85 95" />
            <path d="M 130 75 Q 135 85, 135 95" />
          </g>
          
          {/* Upper Trapezius muscles */}
          <g opacity="0.3">
            <ellipse cx="95" cy="82" rx="8" ry="10" fill="url(#muscleRadial)" />
            <ellipse cx="125" cy="82" rx="8" ry="10" fill="url(#muscleRadial)" />
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

          {/* Shoulders (deltoids) - Enhanced */}
          <g>
            {/* Deltoid muscle mass */}
            <ellipse cx="72" cy="98" rx="13" ry="16" fill="url(#muscleRadial)" opacity="0.4" />
            <ellipse cx="148" cy="98" rx="13" ry="16" fill="url(#muscleRadial)" opacity="0.4" />
            {/* Deltoid definition lines */}
            <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none">
              <ellipse cx="72" cy="98" rx="12" ry="15" />
              <ellipse cx="148" cy="98" rx="12" ry="15" />
              {/* Anterior/Lateral/Posterior heads */}
              <path d="M 67 90 Q 72 98, 67 106" opacity="0.5" />
              <path d="M 153 90 Q 148 98, 153 106" opacity="0.5" />
            </g>
          </g>
          
          {/* Latissimus dorsi (lats) - visible from front */}
          <g stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3">
            <path d="M 78 110 Q 70 130, 75 160" />
            <path d="M 142 110 Q 150 130, 145 160" />
          </g>

          {/* Physical (Torso/Core) - Abs definition */}
          <g data-testid="region-physical">
            {/* Main core fill */}
            <path
              d="M 85 165 L 78 180 L 80 210 L 85 240 L 135 240 L 140 210 L 142 180 L 135 165 Z"
              fill={physicalColor}
              opacity={getOpacity(balance.physical)}
            />
            {/* Enhanced Six-pack abs with more definition */}
            <g>
              {/* Upper abs - split left/right */}
              <rect x="96" y="170" width="13" height="14" rx="3" fill="url(#muscleRadial)" opacity="0.6" />
              <rect x="111" y="170" width="13" height="14" rx="3" fill="url(#muscleRadial)" opacity="0.6" />
              {/* Middle abs - split left/right */}
              <rect x="96" y="188" width="13" height="14" rx="3" fill="url(#muscleRadial)" opacity="0.6" />
              <rect x="111" y="188" width="13" height="14" rx="3" fill="url(#muscleRadial)" opacity="0.6" />
              {/* Lower abs - split left/right */}
              <rect x="96" y="206" width="13" height="14" rx="3" fill="url(#muscleRadial)" opacity="0.6" />
              <rect x="111" y="206" width="13" height="14" rx="3" fill="url(#muscleRadial)" opacity="0.6" />
              {/* Ab separation lines */}
              <line x1="110" y1="168" x2="110" y2="222" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
            </g>
            
            {/* Serratus anterior (finger muscles) */}
            <g stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.35">
              <path d="M 82 175 Q 78 178, 80 182" />
              <path d="M 82 185 Q 78 188, 80 192" />
              <path d="M 82 195 Q 78 198, 80 202" />
              <path d="M 138 175 Q 142 178, 140 182" />
              <path d="M 138 185 Q 142 188, 140 192" />
              <path d="M 138 195 Q 142 198, 140 202" />
            </g>
            {/* Obliques */}
            <g stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.4">
              <path d="M 85 170 Q 75 190, 78 210" />
              <path d="M 135 170 Q 145 190, 142 210" />
            </g>
          </g>

          {/* Arms - Massive Enhanced Biceps, Triceps, Forearms */}
          <g>
            {/* Left arm */}
            <g>
              {/* Upper arm structure - thicker */}
              <path d="M 70 95 Q 64 105, 60 120" stroke="hsl(var(--border))" strokeWidth="3.5" fill="none" />
              <path d="M 60 120 Q 56 140, 53 160" stroke="hsl(var(--border))" strokeWidth="3" fill="none" />
              <path d="M 53 160 L 48 180" stroke="hsl(var(--border))" strokeWidth="2.5" fill="none" />
              
              {/* Massive bicep peak */}
              <ellipse cx="64" cy="115" rx="12" ry="17" fill="url(#muscleRadial)" opacity="0.6" />
              <path d="M 57 110 Q 64 117, 71 110" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M 59 108 Q 64 114, 69 108" stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3" />
              
              {/* Massive tricep */}
              <ellipse cx="67" cy="125" rx="9" ry="14" fill="url(#muscleRadial)" opacity="0.4" />
              
              {/* Massive forearm muscles */}
              <ellipse cx="56" cy="150" rx="7" ry="12" fill="url(#muscleRadial)" opacity="0.45" />
              <path d="M 52 145 L 51 165" stroke="hsl(var(--border))" strokeWidth="1.2" opacity="0.4" />
              <path d="M 58 145 L 57 165" stroke="hsl(var(--border))" strokeWidth="1.2" opacity="0.4" />
              <path d="M 55 145 L 54 165" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.3" />
            </g>
            
            {/* Right arm */}
            <g>
              {/* Upper arm structure - thicker */}
              <path d="M 150 95 Q 156 105, 160 120" stroke="hsl(var(--border))" strokeWidth="3.5" fill="none" />
              <path d="M 160 120 Q 164 140, 167 160" stroke="hsl(var(--border))" strokeWidth="3" fill="none" />
              <path d="M 167 160 L 172 180" stroke="hsl(var(--border))" strokeWidth="2.5" fill="none" />
              
              {/* Massive bicep peak */}
              <ellipse cx="156" cy="115" rx="12" ry="17" fill="url(#muscleRadial)" opacity="0.6" />
              <path d="M 149 110 Q 156 117, 163 110" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M 151 108 Q 156 114, 161 108" stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3" />
              
              {/* Massive tricep */}
              <ellipse cx="153" cy="125" rx="9" ry="14" fill="url(#muscleRadial)" opacity="0.4" />
              
              {/* Massive forearm muscles */}
              <ellipse cx="164" cy="150" rx="7" ry="12" fill="url(#muscleRadial)" opacity="0.45" />
              <path d="M 168 145 L 169 165" stroke="hsl(var(--border))" strokeWidth="1.2" opacity="0.4" />
              <path d="M 162 145 L 163 165" stroke="hsl(var(--border))" strokeWidth="1.2" opacity="0.4" />
              <path d="M 165 145 L 166 165" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.3" />
            </g>
          </g>

          {/* Financial (Legs) - Quads and Calves */}
          <g data-testid="region-financial">
            {/* Left leg - Massive Quad definition */}
            <g opacity={getOpacity(balance.financial)}>
              {/* Left quad - wider and more massive */}
              <path
                d="M 85 245 Q 78 260, 75 280 L 72 310 Q 70 330, 72 350 L 75 370 L 72 390 L 98 390 L 95 370 L 97 350 Q 99 330, 97 310 L 95 280 Q 95 260, 97 245 Z"
                fill={financialColor}
              />
              {/* Left quad muscles - enhanced volume */}
              <path d="M 85 245 Q 80 260, 78 280 L 75 310 Q 73 330, 75 350 L 78 370 L 75 390 L 98 390 L 95 370 L 97 350 Q 99 330, 97 310 L 95 280 Q 95 260, 97 245 Z" fill="url(#muscleGradient)" />
              {/* Additional quad mass */}
              <ellipse cx="86" cy="275" rx="8" ry="22" fill="url(#muscleRadial)" opacity="0.5" />
            </g>

            {/* Right leg - Massive Quad definition */}
            <g opacity={getOpacity(balance.financial)}>
              {/* Right quad - wider and more massive */}
              <path
                d="M 135 245 Q 142 260, 145 280 L 148 310 Q 150 330, 148 350 L 145 370 L 148 390 L 122 390 L 125 370 L 123 350 Q 121 330, 123 310 L 125 280 Q 125 260, 123 245 Z"
                fill={financialColor}
              />
              {/* Right quad muscles - enhanced volume */}
              <path d="M 135 245 Q 140 260, 142 280 L 145 310 Q 147 330, 145 350 L 142 370 L 145 390 L 122 390 L 125 370 L 123 350 Q 121 330, 123 310 L 125 280 Q 125 260, 123 245 Z" fill="url(#muscleGradient)" />
              {/* Additional quad mass */}
              <ellipse cx="134" cy="275" rx="8" ry="22" fill="url(#muscleRadial)" opacity="0.5" />
            </g>

            {/* Enhanced Quad separation and definition - thicker lines */}
            <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.5">
              {/* Vastus medialis/lateralis separation - wider */}
              <path d="M 86 250 L 85 310" />
              <path d="M 91 252 L 90 308" />
              <path d="M 134 250 L 135 310" />
              <path d="M 129 252 L 130 308" />
              {/* Rectus femoris - center line */}
              <path d="M 85 255 Q 83 280, 84 305" />
              <path d="M 135 255 Q 137 280, 136 305" />
            </g>
            
            {/* Hamstring hints (back of leg visible) - larger */}
            <g opacity="0.35">
              <ellipse cx="80" cy="270" rx="5" ry="18" fill="url(#muscleRadial)" />
              <ellipse cx="140" cy="270" rx="5" ry="18" fill="url(#muscleRadial)" />
            </g>
            
            {/* Calves - Massive Gastrocnemius */}
            <g opacity={getOpacity(balance.financial) * 0.8}>
              {/* Left calf - HUGE */}
              <ellipse cx="86" cy="340" rx="10" ry="24" fill={financialColor} />
              <ellipse cx="86" cy="340" rx="10" ry="24" fill="url(#muscleRadial)" />
              <path d="M 81 328 Q 86 342, 91 328" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M 83 330 Q 86 340, 89 330" stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3" />
              
              {/* Right calf - HUGE */}
              <ellipse cx="134" cy="340" rx="10" ry="24" fill={financialColor} />
              <ellipse cx="134" cy="340" rx="10" ry="24" fill="url(#muscleRadial)" />
              <path d="M 129 328 Q 134 342, 139 328" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M 131 330 Q 134 340, 137 330" stroke="hsl(var(--border))" strokeWidth="1" fill="none" opacity="0.3" />
            </g>
            
            {/* Tibialis anterior (shin) - thicker */}
            <g stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" opacity="0.4">
              <path d="M 92 315 L 94 365" />
              <path d="M 95 317 L 97 363" />
              <path d="M 128 315 L 126 365" />
              <path d="M 125 317 L 123 363" />
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
