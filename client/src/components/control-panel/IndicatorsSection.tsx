import type { ControlPanelText, FocusZone, StateItem, StateKey, VisibleStates } from "./types";

interface IndicatorsSectionProps {
  t: ControlPanelText;
  stateItems: StateItem[];
  visibleStates: VisibleStates;
  activeFocusZone: FocusZone;
  setActiveFocusZone: (value: (current: FocusZone) => FocusZone) => void;
  onToggleState: (state: StateKey) => void;
}

export function IndicatorsSection({
  t,
  stateItems,
  visibleStates,
  activeFocusZone,
  setActiveFocusZone,
  onToggleState,
}: IndicatorsSectionProps) {
  const descriptions: Record<StateKey, string> = {
    mental: "Прочитать книгу, разобрать мысли или сделать короткую практику фокуса.",
    physical: "Заняться спортом, разминкой или хотя бы пройтись.",
    moral: "Провести время с близкими, поговорить по душам или сделать духовную практику.",
    financial: "Поработать над доходом, задачами, планом или финансовой дисциплиной.",
  };

  return (
    <section className="rounded-lg border border-border bg-background/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.indicators}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.indicatorsHint}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {stateItems.map((state) => {
          const Icon = state.icon;
          const active = visibleStates[state.key];
          const zoneKey: FocusZone = state.key === "moral" ? "spiritual" : state.key;
          const focused = activeFocusZone === zoneKey;

          return (
            <button
              key={state.key}
              type="button"
              onClick={() => {
                setActiveFocusZone((current) => (current === zoneKey ? null : zoneKey));
                onToggleState(state.key);
              }}
              className={`group rounded-lg border p-3 text-left transition ${
                focused
                  ? "border-white/30 bg-white/5"
                  : active
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-background/40"
              }`}
              style={focused ? { boxShadow: `inset 0 0 0 1px ${state.color}55` } : undefined}
              data-testid={`indicator-${state.key}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: state.color }} />
                <span className="text-sm font-medium text-foreground">{state.label}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{active ? t.shown : t.hidden}</div>
              <p className={`mt-2 text-[11px] leading-relaxed text-muted-foreground ${focused ? "block" : "hidden group-hover:block group-focus-visible:block"}`}>
                {descriptions[state.key]}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
