import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { GoalAnalysisResult } from "@/lib/goalCoach";

interface GoalCoachCardProps {
  goal: string;
  analysis: GoalAnalysisResult | null;
  isSaving: boolean;
  onSave: (goal: string) => void;
  analysisPeriodLabel: string;
}

export default function GoalCoachCard({
  goal,
  analysis,
  isSaving,
  onSave,
  analysisPeriodLabel,
}: GoalCoachCardProps) {
  const [draft, setDraft] = useState(goal);
  const [isEditing, setIsEditing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    setDraft(goal);
  }, [goal]);

  useEffect(() => {
    setShowAnalysis(false);
  }, [goal, analysisPeriodLabel, analysis?.summary]);

  const trimmedDraft = draft.trim();
  const hasChanges = trimmedDraft !== goal.trim();
  const actionLabel = goal ? "Изменить цель" : "Поставить цель";

  const analysisButtonLabel = useMemo(() => {
    switch (analysisPeriodLabel) {
      case "день":
        return "Анализ дня";
      case "неделю":
        return "Анализ недели";
      case "месяц":
        return "Анализ месяца";
      case "год":
        return "Анализ года";
      default:
        return "Анализ периода";
    }
  }, [analysisPeriodLabel]);

  return (
    <section className="rounded-[24px] border border-white/6 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Strategic Goal</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(59,130,246,0.85)]" />
            <p className="text-sm font-semibold text-foreground">
              {goal ? goal : "Цель не задана"}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={goal ? "border-primary/25 bg-primary/10 text-primary" : "border-white/10 bg-transparent text-muted-foreground"}
        >
          {goal ? "Активна" : "Ожидает"}
        </Badge>
      </div>

      {!isEditing ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            className="h-11 rounded-2xl"
            data-testid="button-open-goal-editor"
          >
            {actionLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAnalysis((current) => !current)}
            disabled={!goal}
            className="h-11 rounded-2xl border-white/10 bg-transparent"
            data-testid="button-run-goal-analysis"
          >
            {analysisButtonLabel}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Напиши цель коротко и конкретно"
            className="min-h-[110px] rounded-[20px] border-white/10 bg-black/10"
            data-testid="textarea-goal"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                onSave(trimmedDraft);
                setIsEditing(false);
              }}
              disabled={isSaving || !hasChanges}
              className="h-11 rounded-2xl"
              data-testid="button-save-goal"
            >
              {isSaving ? "Сохраняю..." : "Сохранить"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft(goal);
                setIsEditing(false);
              }}
              className="h-11 rounded-2xl border-white/10 bg-transparent"
              data-testid="button-cancel-goal"
            >
              Отмена
            </Button>
            {goal && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onSave("");
                  setDraft("");
                  setIsEditing(false);
                  setShowAnalysis(false);
                }}
                disabled={isSaving}
                className="h-11 rounded-2xl border-white/10 bg-transparent"
                data-testid="button-clear-goal"
              >
                Убрать
              </Button>
            )}
          </div>
        </div>
      )}

      {showAnalysis && (
        <div className="mt-4 space-y-4 rounded-[22px] border border-white/8 bg-black/10 p-4" data-testid="goal-analysis-card">
          {!goal ? (
            <p className="text-sm text-muted-foreground">Сначала поставь цель.</p>
          ) : !analysis ? (
            <p className="text-sm text-muted-foreground">Нет данных для анализа за этот период.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Period Brief</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Анализ за {analysisPeriodLabel}</p>
                </div>
                <Badge variant="outline" className="border-white/10 bg-transparent text-muted-foreground">
                  {analysis.totalEvents} событий
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">{analysis.summary}</p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-positive/20 bg-positive/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className="bg-positive text-white hover:bg-positive">Приближает</Badge>
                  </div>
                  {analysis.towardEntries.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.towardEntries.slice(0, 4).map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-positive/15 bg-black/10 p-3">
                          <p className="text-sm font-semibold text-positive">{entry.text}</p>
                          <p className="mt-1 text-xs text-positive/80">{entry.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">За этот период явных приближающих действий не найдено.</p>
                  )}
                </div>

                <div className="rounded-[20px] border border-negative/20 bg-negative/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className="bg-negative text-white hover:bg-negative">Отдаляет</Badge>
                  </div>
                  {analysis.awayEntries.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.awayEntries.slice(0, 4).map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-negative/15 bg-black/10 p-3">
                          <p className="text-sm font-semibold text-negative">{entry.text}</p>
                          <p className="mt-1 text-xs text-negative/80">{entry.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">За этот период нет действий, которые явно отдаляют от цели.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
