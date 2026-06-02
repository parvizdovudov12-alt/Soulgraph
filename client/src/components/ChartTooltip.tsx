import { useLanguage } from "@/lib/i18n";
import { NewsEvent } from "./LifeChart";

interface ChartTooltipProps {
  event: NewsEvent | null;
  position: { x: number; y: number };
}

const impactLabels = {
  ru: {
    mental: "Ментальное",
    physical: "Физическое",
    moral: "Душевное",
    financial: "Финансовое",
  },
  en: {
    mental: "Mental",
    physical: "Physical",
    moral: "Spiritual",
    financial: "Financial",
  },
} as const;

const impactColors = {
  mental: "#B388FF",
  physical: "#2EC5FF",
  moral: "#F7C948",
  financial: "#00C076",
} as const;

export default function ChartTooltip({ event, position }: ChartTooltipProps) {
  const { language } = useLanguage();

  if (!event) return null;

  const isPositive = event.type === "positive";
  const labels = impactLabels[language];
  const impactEntries = Object.entries(event.impact).filter(([, value]) => value !== 0) as Array<
    [keyof typeof labels, number]
  >;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y}px`,
        transform: "translateY(-50%)",
      }}
      data-testid="chart-tooltip"
    >
      <div
        className="max-w-sm overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(20, 23, 30, 0.96)",
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          className="border-b px-3 py-2"
          style={{
            borderColor: isPositive ? "rgba(0, 192, 118, 0.24)" : "rgba(246, 70, 93, 0.24)",
            backgroundColor: isPositive ? "rgba(0, 192, 118, 0.08)" : "rgba(246, 70, 93, 0.08)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: isPositive ? "#00C076" : "#F6465D" }}>
            {isPositive
              ? language === "ru"
                ? "Позитивное событие"
                : "Positive event"
              : language === "ru"
                ? "Негативное событие"
                : "Negative event"}
          </p>
        </div>

        <div className="space-y-3 p-3">
          <p className="text-sm leading-6 text-white">{event.text}</p>

          {event.media && event.media.length > 0 && (
            <div className="space-y-2">
              {event.media.slice(0, 1).map((media, index) => (
                <div key={index} className="overflow-hidden rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {media.type === "image" ? (
                    <img src={media.url} alt="Event media" className="h-32 w-full object-cover" />
                  ) : (
                    <video src={media.url} className="h-32 w-full object-cover" muted />
                  )}
                </div>
              ))}
              {event.media.length > 1 && (
                <p className="text-xs" style={{ color: "#8D94A5" }}>
                  +{event.media.length - 1} {language === "ru" ? "ещё" : "more"}
                </p>
              )}
            </div>
          )}

          {impactEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-2 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {impactEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.035)",
                    color: impactColors[key],
                  }}
                >
                  <span>{labels[key]}</span>
                  <span className="font-mono font-semibold">
                    {value > 0 ? "+" : ""}
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
