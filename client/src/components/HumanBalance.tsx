import { useMemo } from 'react';
import type { NewsEvent } from './LifeChart';
import anatomyImage from '@assets/anatomy_muscles.png';

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
    
    if (value === 0) return 0; // Invisible for zero
    
    // Positive values: scale from 0.15 to 0.6 (visible but not overwhelming)
    if (value > 0) {
      return 0.15 + normalized * 0.45;
    }
    
    // Negative values: scale from 0.15 to 0.4 (dimmer to distinguish from positive)
    return 0.15 + normalized * 0.25;
  };

  // Base colors for each state
  const mentalColor = '#c084fc'; // Purple
  const physicalColor = '#06b6d4'; // Cyan
  const moralColor = '#eab308'; // Yellow
  const financialColor = '#10b981'; // Green

  return (
    <div className="flex flex-col items-center gap-3" data-testid="human-balance">
      <h3 className="text-sm font-medium text-muted-foreground">Баланс дня</h3>
      
      {/* Anatomical Figure with Color Overlays */}
      <div className="relative w-[220px] h-[400px]" data-testid="human-figure">
        {/* Base anatomical image */}
        <img
          src={anatomyImage}
          alt="Human anatomy"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: 0.85 }}
        />

        {/* Mental overlay (Head) - Purple */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: mentalColor,
            opacity: getOpacity(balance.mental),
            clipPath: 'polygon(35% 0%, 65% 0%, 65% 18%, 35% 18%)',
            border: balance.mental < 0 ? '3px solid #ef4444' : 'none',
            borderRadius: '4px',
          }}
          data-testid="region-mental"
        />

        {/* Moral overlay (Chest/Heart) - Yellow */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: moralColor,
            opacity: getOpacity(balance.moral),
            clipPath: 'polygon(30% 18%, 70% 18%, 70% 42%, 30% 42%)',
            border: balance.moral < 0 ? '3px solid #ef4444' : 'none',
          }}
          data-testid="region-moral"
        />

        {/* Physical overlay (Torso/Core) - Cyan */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: physicalColor,
            opacity: getOpacity(balance.physical),
            clipPath: 'polygon(32% 42%, 68% 42%, 68% 62%, 32% 62%)',
            border: balance.physical < 0 ? '3px solid #ef4444' : 'none',
          }}
          data-testid="region-physical"
        />

        {/* Financial overlay (Legs) - Green */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: financialColor,
            opacity: getOpacity(balance.financial),
            clipPath: 'polygon(25% 62%, 75% 62%, 60% 100%, 40% 100%)',
            border: balance.financial < 0 ? '3px solid #ef4444' : 'none',
          }}
          data-testid="region-financial"
        />
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
