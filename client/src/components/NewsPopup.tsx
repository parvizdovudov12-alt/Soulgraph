import { X, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { NewsEvent } from './LifeChart';
import { formatMoscowDateTime, formatMoscowTime } from '@/lib/dateUtils';

interface NewsPopupProps {
  events: NewsEvent[];
  onClose: () => void;
  position: { x: number; y: number };
}

export default function NewsPopup({ events, onClose, position }: NewsPopupProps) {
  if (!events || events.length === 0) return null;

  return (
    <div
      className="fixed z-50 bg-card border border-card-border rounded-lg shadow-2xl w-96 max-h-[32rem] overflow-auto"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 384)}px`,
        top: `${Math.min(position.y, window.innerHeight - 512)}px`,
      }}
      data-testid="popup-news"
    >
      <div className="sticky top-0 bg-card border-b border-border p-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            События дня
          </h3>
          <span className="text-xs text-muted-foreground">
            ({events.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-close-popup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {formatMoscowDateTime(events[0].time as number)}
        </div>

        {events.map((event, eventIndex) => {
          const isPositive = event.type === 'positive';
          
          return (
            <div 
              key={eventIndex} 
              className="pb-4 border-b border-border last:border-0 last:pb-0"
              data-testid={`event-item-${eventIndex}`}
            >
              <div className="flex items-center gap-2 mb-3">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-positive" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-negative" />
                )}
                <h4 className={`text-sm font-medium ${isPositive ? 'text-positive' : 'text-negative'}`}>
                  {isPositive ? 'Позитивное' : 'Негативное'}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {formatMoscowTime(event.time as number)} МСК
                </span>
              </div>

              <p className="text-sm text-foreground mb-3">{event.text}</p>

              {/* Media Gallery */}
              {event.media && event.media.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Медиа</p>
                  <div className="grid grid-cols-1 gap-2">
                    {event.media.map((media, index) => (
                      <div key={index} className="rounded-md overflow-hidden border border-border">
                        {media.type === 'image' ? (
                          <img
                            src={media.url}
                            alt={`Event media ${index + 1}`}
                            className="w-full h-auto max-h-48 object-cover"
                            data-testid={`image-event-${eventIndex}-${index}`}
                          />
                        ) : (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-auto max-h-48 object-cover"
                            data-testid={`video-event-${eventIndex}-${index}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact Details */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Влияние</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded bg-background">
                    <span className="text-xs text-mental">Душевное</span>
                    <span className="text-xs font-mono text-mental">
                      {event.impact.mental > 0 ? '+' : ''}{event.impact.mental}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-background">
                    <span className="text-xs text-physical">Физическое</span>
                    <span className="text-xs font-mono text-physical">
                      {event.impact.physical > 0 ? '+' : ''}{event.impact.physical}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-background">
                    <span className="text-xs text-moral">Моральное</span>
                    <span className="text-xs font-mono text-moral">
                      {event.impact.moral > 0 ? '+' : ''}{event.impact.moral}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-background">
                    <span className="text-xs text-financial">Финансовое</span>
                    <span className="text-xs font-mono text-financial">
                      {event.impact.financial > 0 ? '+' : ''}{event.impact.financial}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
