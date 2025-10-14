import { NewsEvent } from './LifeChart';

interface ChartTooltipProps {
  event: NewsEvent | null;
  position: { x: number; y: number };
}

export default function ChartTooltip({ event, position }: ChartTooltipProps) {
  if (!event) return null;

  const isPositive = event.type === 'positive';

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y}px`,
        transform: 'translateY(-50%)',
      }}
      data-testid="chart-tooltip"
    >
      <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg shadow-2xl max-w-sm">
        {/* Header */}
        <div className={`px-3 py-2 border-b ${isPositive ? 'border-positive/20 bg-positive/5' : 'border-negative/20 bg-negative/5'}`}>
          <p className={`text-sm font-semibold ${isPositive ? 'text-positive' : 'text-negative'}`}>
            {isPositive ? '📈 Позитивное событие' : '📉 Негативное событие'}
          </p>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Text */}
          <p className="text-sm text-foreground">{event.text}</p>

          {/* Media */}
          {event.media && event.media.length > 0 && (
            <div className="space-y-2">
              {event.media.slice(0, 1).map((media, index) => (
                <div key={index} className="rounded-md overflow-hidden border border-border">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt="Event media"
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-32 object-cover"
                      muted
                    />
                  )}
                </div>
              ))}
              {event.media.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  +{event.media.length - 1} еще
                </p>
              )}
            </div>
          )}

          {/* Impact */}
          <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border">
            {event.impact.mental !== 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-mental">Душевное</span>
                <span className="text-mental font-mono">
                  {event.impact.mental > 0 ? '+' : ''}{event.impact.mental}
                </span>
              </div>
            )}
            {event.impact.physical !== 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-physical">Физическое</span>
                <span className="text-physical font-mono">
                  {event.impact.physical > 0 ? '+' : ''}{event.impact.physical}
                </span>
              </div>
            )}
            {event.impact.moral !== 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-moral">Моральное</span>
                <span className="text-moral font-mono">
                  {event.impact.moral > 0 ? '+' : ''}{event.impact.moral}
                </span>
              </div>
            )}
            {event.impact.financial !== 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-financial">Финансовое</span>
                <span className="text-financial font-mono">
                  {event.impact.financial > 0 ? '+' : ''}{event.impact.financial}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
