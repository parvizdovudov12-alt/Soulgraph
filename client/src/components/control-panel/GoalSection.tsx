import { useEffect, useState } from "react";
import { Reorder } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Eye, Pin, PinOff, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { GoalAnalysisResult } from "@/lib/goalCoach";
import type { DailyTask, TaskImpact } from "@/lib/localDashboardState";
import type { AiGoalAnalysisResult, ControlPanelText } from "./types";

interface GoalSectionProps {
  t: ControlPanelText;
  goal: string;
  draftGoal: string;
  setDraftGoal: (value: string) => void;
  isEditingGoal: boolean;
  setIsEditingGoal: (value: boolean) => void;
  isSavingGoal: boolean;
  onGoalSave: (goal: string) => void;
  onGoalComplete: () => void;
  isGoalCompleted: boolean;
  goalAnalysis: GoalAnalysisResult | null;
  goalProgress: number;
  showAnalysis: boolean;
  setShowAnalysis: (value: (current: boolean) => boolean) => void;
  periodActionLabel: string;
  isExpanded: boolean;
  setIsExpanded: (value: (current: boolean) => boolean) => void;
  aiCoachExpanded: boolean;
  setAiCoachExpanded: (value: (current: boolean) => boolean) => void;
  aiGoalAnalysis: AiGoalAnalysisResult | null;
  isLoadingAiGoalAnalysis: boolean;
  aiGoalAnalysisError?: string | null;
  dailyTasks: DailyTask[];
  todayKey: string;
  draftTask: string;
  draftTaskImpact: TaskImpact;
  onDraftTaskChange: (task: string) => void;
  onDraftTaskImpactChange: (impact: TaskImpact) => void;
  onAddDailyTask: () => void;
  onCompleteDailyTask: (task: DailyTask) => void;
  onDeleteDailyTask: (taskId: string) => void;
  onToggleDailyTaskPin: (taskId: string) => void;
  onReorderDailyTasks: (taskIds: string[]) => void;
}

export function GoalSection({
  t,
  goal,
  draftGoal,
  setDraftGoal,
  isEditingGoal,
  setIsEditingGoal,
  isSavingGoal,
  onGoalSave,
  onGoalComplete,
  isGoalCompleted,
  goalAnalysis,
  goalProgress,
  showAnalysis,
  setShowAnalysis,
  periodActionLabel,
  isExpanded,
  setIsExpanded,
  aiCoachExpanded,
  setAiCoachExpanded,
  aiGoalAnalysis,
  isLoadingAiGoalAnalysis,
  aiGoalAnalysisError,
  dailyTasks,
  todayKey,
  draftTask,
  draftTaskImpact,
  onDraftTaskChange,
  onDraftTaskImpactChange,
  onAddDailyTask,
  onCompleteDailyTask,
  onDeleteDailyTask,
  onToggleDailyTaskPin,
  onReorderDailyTasks,
}: GoalSectionProps) {
  const hasGoal = Boolean(goal.trim());
  const [showFullGoal, setShowFullGoal] = useState(false);
  const towardEntries = goalAnalysis?.towardEntries.slice(0, 3) ?? [];
  const awayEntries = goalAnalysis?.awayEntries.slice(0, 3) ?? [];

  return (
    <section className="rounded-[18px] border border-[#36C98B]/28 bg-[radial-gradient(circle_at_18%_18%,rgba(54,201,139,0.22),transparent_30%),radial-gradient(circle_at_82%_22%,rgba(79,195,247,0.12),transparent_34%),linear-gradient(180deg,rgba(10,33,24,0.98),rgba(8,13,12,0.96))] p-3 shadow-[0_0_0_1px_rgba(54,201,139,0.1),0_18px_34px_rgba(0,0,0,0.34)]">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => hasGoal && setShowFullGoal((current) => !current)}
          disabled={!hasGoal}
          className="col-span-2 flex min-w-0 items-center gap-2 rounded-md border border-[#36C98B]/25 bg-[#36C98B]/12 px-2.5 py-2 text-left text-[#e8fff1] transition hover:bg-[#36C98B]/18 disabled:cursor-not-allowed disabled:opacity-70"
          data-testid="button-toggle-full-goal"
        >
          <Eye className="h-4 w-4 shrink-0 text-[#8ef0bb]" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{goal.trim() || t.goalNotSet}</span>
        </button>

        {!hasGoal ? (
          <Button type="button" size="sm" onClick={() => setIsEditingGoal(true)} data-testid="button-open-goal-editor">
            <Target className="mr-1.5 h-4 w-4" />
            {languageSafeSetGoal(t.setGoal, false)}
          </Button>
        ) : null}

        <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingGoal(true)} disabled={!hasGoal} className={!hasGoal ? "hidden" : ""} data-testid="button-edit-goal">
          {languageSafeSetGoal(t.setGoal, true)}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onGoalComplete}
          disabled={!hasGoal}
          className={hasGoal ? "" : "col-span-2"}
          data-testid="button-complete-goal"
        >
          <Check className="mr-1.5 h-4 w-4" />
          {t.goalCompleted}
        </Button>
      </div>

      {hasGoal && showFullGoal ? (
        <div className="mt-2 rounded-md border border-white/10 bg-black/25 p-2.5 text-sm leading-relaxed text-white" data-testid="full-goal-text">
          {goal.trim()}
        </div>
      ) : null}

      {isExpanded ? (
        <>
          {!isEditingGoal ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAnalysis((current) => !current)} disabled={!hasGoal} data-testid="button-run-goal-analysis">
                {periodActionLabel}
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <Textarea
                value={draftGoal}
                onChange={(event) => setDraftGoal(event.target.value)}
                placeholder={t.goalPlaceholder}
                className="min-h-[84px]"
                data-testid="textarea-goal"
              />
              <p className="text-xs leading-relaxed text-[#e8fff1]">{t.quickStartHint}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    onGoalSave(draftGoal.trim());
                    setIsEditingGoal(false);
                  }}
                  disabled={isSavingGoal}
                  data-testid="button-save-goal"
                >
                  {isSavingGoal ? t.saving : t.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraftGoal(goal);
                    setIsEditingGoal(false);
                  }}
                  data-testid="button-cancel-goal"
                >
                  {t.cancel}
                </Button>
              </div>
            </div>
          )}
          <DailyTasksPanel
            t={t}
            tasks={dailyTasks}
            todayKey={todayKey}
            draftTask={draftTask}
            draftTaskImpact={draftTaskImpact}
            onDraftTaskChange={onDraftTaskChange}
            onDraftTaskImpactChange={onDraftTaskImpactChange}
            onAddDailyTask={onAddDailyTask}
            onCompleteDailyTask={onCompleteDailyTask}
            onDeleteDailyTask={onDeleteDailyTask}
            onToggleDailyTaskPin={onToggleDailyTaskPin}
            onReorderDailyTasks={onReorderDailyTasks}
          />
        </>
      ) : null}

      {isExpanded && showAnalysis ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
          {!hasGoal ? (
            <p className="text-sm text-[#e8fff1]">{t.noGoal}</p>
          ) : !goalAnalysis ? (
            <p className="text-sm text-[#e8fff1]">{t.analysisEmpty}</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#aef7cf]">{t.direction}</p>
                <p className="mt-1 text-sm text-foreground">{goalAnalysis.summary}</p>
              </div>
              <Progress value={goalProgress} className="h-2" />
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <GoalEntries title={t.toward} tone="positive" entries={towardEntries} />
                <GoalEntries title={t.away} tone="negative" entries={awayEntries} />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {hasGoal ? (
        <AiCoachPanel
          t={t}
          isExpanded={aiCoachExpanded}
          onToggle={() => setAiCoachExpanded((current) => !current)}
          aiGoalAnalysis={aiGoalAnalysis}
          isLoadingAiGoalAnalysis={isLoadingAiGoalAnalysis}
          aiGoalAnalysisError={aiGoalAnalysisError}
        />
      ) : null}
    </section>
  );
}

function languageSafeSetGoal(label: string, isEdit: boolean) {
  if (label === "Set goal" || label === "Edit goal") {
    return isEdit ? "Edit goal" : "Set goal";
  }

  return isEdit ? "Изменить цель" : "Поставить цель";
}

function DailyTasksPanel({
  t,
  tasks,
  todayKey,
  draftTask,
  draftTaskImpact,
  onDraftTaskChange,
  onDraftTaskImpactChange,
  onAddDailyTask,
  onCompleteDailyTask,
  onDeleteDailyTask,
  onToggleDailyTaskPin,
  onReorderDailyTasks,
}: {
  t: ControlPanelText;
  tasks: DailyTask[];
  todayKey: string;
  draftTask: string;
  draftTaskImpact: TaskImpact;
  onDraftTaskChange: (task: string) => void;
  onDraftTaskImpactChange: (impact: TaskImpact) => void;
  onAddDailyTask: () => void;
  onCompleteDailyTask: (task: DailyTask) => void;
  onDeleteDailyTask: (taskId: string) => void;
  onToggleDailyTaskPin: (taskId: string) => void;
  onReorderDailyTasks: (taskIds: string[]) => void;
}) {
  const [isTasksExpanded, setIsTasksExpanded] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [reorderTaskIds, setReorderTaskIds] = useState<string[]>([]);
  const impactItems = [
    { key: "mental" as const, label: t.focus },
    { key: "physical" as const, label: t.energy },
    { key: "moral" as const, label: t.relationships },
    { key: "financial" as const, label: t.finance },
  ];

  const hasTaskImpact = Object.values(draftTaskImpact).some((value) => value !== 0);
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const pinTaskLabel = t.pinTask ?? "Закрепить задачу";
  const unpinTaskLabel = t.unpinTask ?? "Открепить задачу";

  const sortedTaskIds = sortedTasks.map((task) => task.id);
  const orderedTasks = reorderTaskIds.length === sortedTasks.length
    ? reorderTaskIds.map((taskId) => sortedTasks.find((task) => task.id === taskId)).filter((task): task is DailyTask => Boolean(task))
    : sortedTasks;

  useEffect(() => {
    setReorderTaskIds(sortedTaskIds);
  }, [sortedTaskIds.join("|")]);

  const finishDrag = (taskIds = reorderTaskIds) => {
    setDraggedTaskId(null);
    onReorderDailyTasks(taskIds);
  };

  return (
    <div className="mt-4 rounded-lg border border-[#ff4d8d]/75 bg-[radial-gradient(circle_at_12%_0%,rgba(255,77,141,0.42),transparent_34%),linear-gradient(135deg,rgba(98,36,255,0.34),rgba(255,54,84,0.22)_52%,rgba(18,6,16,0.92))] p-3 shadow-[0_0_0_1px_rgba(255,77,141,0.18),0_0_28px_rgba(255,54,116,0.24)]">
      <button
        type="button"
        onClick={() => setIsTasksExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
        data-testid="button-toggle-daily-tasks"
        aria-label={isTasksExpanded ? t.collapse : t.expand}
      >
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#ffd6e6] drop-shadow-[0_0_10px_rgba(255,77,141,0.5)]">{t.tasks}</p>
          <p className="mt-0.5 text-[11px] font-medium text-[#e8fff1]">
            {tasks.filter((task) => task.completedDates.includes(todayKey)).length}/{tasks.length} {t.done}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/86">{t.taskCompletionHint}</p>
        </div>
        {isTasksExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-[#ffd6e6]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#ffd6e6]" />}
      </button>

      {isTasksExpanded ? (
        <>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onAddDailyTask();
            }}
          >
            <div className="flex gap-2">
              <input
                value={draftTask}
                onChange={(event) => onDraftTaskChange(event.target.value)}
                placeholder={t.taskPlaceholder}
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-background/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                data-testid="input-daily-task"
              />
              <Button type="submit" size="icon" disabled={!draftTask.trim()} aria-label={t.addTask} data-testid="button-add-daily-task">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border border-white/8 bg-white/[0.03] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d7f7e3]">{t.taskImpact}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${hasTaskImpact ? "bg-[#36C98B]/10 text-[#8ef0bb]" : "bg-white/5 text-[#d7f7e3]"}`}>
                  {hasTaskImpact ? `${Object.values(draftTaskImpact).filter((value) => value !== 0).length}/4` : t.noImpact}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#bfeccc]">{t.taskImpactHint}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {impactItems.map((item) => (
                  <label key={item.key} className="space-y-1">
                    <span className="text-[11px] font-medium text-[#d7f7e3]">{item.label}</span>
                    <input
                      type="number"
                      min={-1000}
                      max={1000}
                      step={1}
                      value={draftTaskImpact[item.key]}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        onDraftTaskImpactChange({
                          ...draftTaskImpact,
                          [item.key]: Number.isFinite(value) ? Math.max(-1000, Math.min(1000, Math.round(value))) : 0,
                        });
                      }}
                      className="h-9 w-full rounded-md border border-white/10 bg-background/80 px-2 text-sm text-foreground outline-none transition focus:border-primary"
                      data-testid={`input-task-impact-${item.key}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          </form>

          {tasks.length > 0 ? (
            <Reorder.Group axis="y" values={reorderTaskIds} onReorder={setReorderTaskIds} className="mt-3 space-y-2">
              {orderedTasks.map((task) => {
                const completedToday = task.completedDates.includes(todayKey);

                return (
                  <Reorder.Item
                    key={task.id}
                    value={task.id}
                    data-daily-task-id={task.id}
                    layout
                    transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.7 }}
                    whileDrag={{ scale: 1.01, zIndex: 20 }}
                    onDragStart={() => setDraggedTaskId(task.id)}
                    onDragEnd={() => finishDrag()}
                    className={`flex cursor-grab touch-none select-none items-center gap-2 rounded-md border p-2 active:cursor-grabbing ${
                      draggedTaskId === task.id
                        ? "relative z-20 border-[#ff9ca3]/70 bg-[#1f4f3d] shadow-[0_18px_32px_rgba(0,0,0,0.34),0_0_0_1px_rgba(255,156,163,0.28)]"
                        : task.pinned
                          ? "border-[#36C98B]/30 bg-[#36C98B]/10"
                          : "border-white/8 bg-white/[0.03]"
                    }`}
                    title="Зажми и перетащи задачу"
                    data-testid={`daily-task-row-${task.id}`}
                  >
                    <button
                      type="button"
                      data-no-task-drag="true"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onCompleteDailyTask(task)}
                      disabled={completedToday}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
                        completedToday
                          ? "border-[#36C98B]/40 bg-[#36C98B]/15 text-[#8ef0bb]"
                          : "border-white/10 bg-white/5 text-[#d7f7e3] hover:bg-white/10 hover:text-white"
                      }`}
                      aria-label={completedToday ? t.doneToday : t.completeTask}
                      data-testid={`button-complete-task-${task.id}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`whitespace-normal break-words text-sm leading-snug ${completedToday ? "text-[#bfeccc] line-through" : "text-white"}`}>{task.text}</p>
                      <p className="mt-1 whitespace-normal break-words text-[11px] leading-snug text-[#bfeccc]">
                        {completedToday ? t.doneToday : t.completeTask} - {formatTaskImpact(task.impact, t)}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-no-task-drag="true"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onToggleDailyTaskPin(task.id)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
                        task.pinned
                          ? "border-[#36C98B]/35 bg-[#36C98B]/15 text-[#8ef0bb] hover:bg-[#36C98B]/20"
                          : "border-white/10 bg-white/5 text-[#d7f7e3] hover:bg-white/10 hover:text-white"
                      }`}
                      aria-label={task.pinned ? unpinTaskLabel : pinTaskLabel}
                      title={task.pinned ? unpinTaskLabel : pinTaskLabel}
                      data-testid={`button-pin-task-${task.id}`}
                    >
                      {task.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      data-no-task-drag="true"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => onDeleteDailyTask(task.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[#d7f7e3] transition hover:bg-white/10 hover:text-white"
                      aria-label={t.deleteTask}
                      data-testid={`button-delete-task-${task.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          ) : (
            <p className="mt-3 text-sm text-[#d7f7e3]">{t.noTasks}</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function formatTaskImpact(impact: TaskImpact, t: ControlPanelText) {
  const labels = [
    { key: "mental" as const, label: t.focus },
    { key: "physical" as const, label: t.energy },
    { key: "moral" as const, label: t.relationships },
    { key: "financial" as const, label: t.finance },
  ];
  const parts = labels
    .filter((item) => impact[item.key] !== 0)
    .map((item) => `${item.label} ${impact[item.key] > 0 ? "+" : ""}${impact[item.key]}`);

  return parts.length > 0 ? parts.join(", ") : t.noImpact;
}

function GoalEntries({
  title,
  tone,
  entries,
}: {
  title: string;
  tone: "positive" | "negative";
  entries: NonNullable<GoalAnalysisResult>["towardEntries"];
}) {
  const toneClasses = tone === "positive" ? "border-positive/20 bg-positive/5 text-positive" : "border-negative/20 bg-negative/5 text-negative";

  return (
    <div className={`rounded-md border p-3 ${toneClasses}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
      <div className="mt-2 space-y-2">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} className="text-sm text-foreground">
              <div className={`font-medium ${tone === "positive" ? "text-positive" : "text-negative"}`}>{entry.text}</div>
              <div className="text-xs text-[#d7f7e3]">{entry.reason}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#d7f7e3]">-</p>
        )}
      </div>
    </div>
  );
}

function AiCoachPanel({
  t,
  isExpanded,
  onToggle,
  aiGoalAnalysis,
  isLoadingAiGoalAnalysis,
  aiGoalAnalysisError,
}: {
  t: ControlPanelText;
  isExpanded: boolean;
  onToggle: () => void;
  aiGoalAnalysis: AiGoalAnalysisResult | null;
  isLoadingAiGoalAnalysis: boolean;
  aiGoalAnalysisError?: string | null;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#36C98B]/20 bg-black/20 p-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        data-testid="button-toggle-ai-coach"
        aria-label={isExpanded ? t.collapse : t.expand}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[#8ef0bb]">{t.aiCoachShort}</p>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-[#8ef0bb]" /> : <ChevronDown className="h-4 w-4 text-[#8ef0bb]" />}
      </button>
      {isExpanded ? (
        <>
          {isLoadingAiGoalAnalysis ? (
            <p className="mt-2 text-sm text-[#d7f7e3]">{t.aiLoading}</p>
          ) : aiGoalAnalysis ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-foreground">{aiGoalAnalysis.summary}</p>
              <div className="rounded-md border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#d7f7e3]">{t.focusArea}</p>
                <p className="mt-1 text-sm font-medium text-white">{aiGoalAnalysis.focusArea}</p>
              </div>
              <div className="grid gap-3">
                <AiList title={t.helpfulActions} tone="positive" items={aiGoalAnalysis.helpfulActions} />
                <AiList title={t.mistakes} tone="negative" items={aiGoalAnalysis.mistakes} />
                <AiList title={t.nextSteps} tone="primary" items={aiGoalAnalysis.nextSteps} />
              </div>
              <div className="rounded-md border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#d7f7e3]">{t.encouragement}</p>
                <p className="mt-1 text-sm text-foreground">{aiGoalAnalysis.encouragement}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#d7f7e3]">{aiGoalAnalysisError || t.aiUnavailable}</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function AiList({ title, tone, items }: { title: string; tone: "positive" | "negative" | "primary"; items: string[] }) {
  const toneClasses = {
    positive: "border-positive/20 bg-positive/5 text-positive",
    negative: "border-negative/20 bg-negative/5 text-negative",
    primary: "border-primary/20 bg-primary/5 text-primary",
  };

  return (
    <div className={`rounded-md border p-3 ${toneClasses[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-foreground">
        {items.length > 0 ? items.map((item) => <li key={item}>- {item}</li>) : <li>-</li>}
      </ul>
    </div>
  );
}
