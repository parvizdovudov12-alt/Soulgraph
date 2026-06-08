import { useEffect, useMemo, useState } from "react";
import { Activity, Coins, Heart, Sparkles } from "lucide-react";
import HumanStateModel from "./HumanStateModel";
import { useLanguage } from "@/lib/i18n";
import { EventsSection } from "./control-panel/EventsSection";
import { GoalSection } from "./control-panel/GoalSection";
import { IndicatorsSection } from "./control-panel/IndicatorsSection";
import { LevelSection } from "./control-panel/LevelSection";
import { PremiumSection } from "./control-panel/PremiumSection";
import { PortfolioSection } from "./control-panel/PortfolioSection";
import { ProfileSection } from "./control-panel/ProfileSection";
import { getControlPanelText, getPeriodActionLabel } from "./control-panel/translations";
import { useTwoFactor } from "./control-panel/useTwoFactor";
import type { ControlPanelProps, FocusZone, StateItem } from "./control-panel/types";
export type { AiGoalAnalysisResult } from "./control-panel/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ControlPanel({
  visibleStates,
  currentValues,
  onToggleState,
  onAddPositiveNews,
  onAddNegativeNews,
  isAuthenticated,
  avatarUrl,
  tokenName,
  profileDisplayName,
  profileBio,
  twoFactorEnabled,
  goal,
  onGoalSave,
  onGoalComplete,
  isGoalCompleted,
  isSavingGoal,
  onProfileSave,
  isSavingProfile,
  goalAnalysis,
  aiGoalAnalysis,
  isLoadingAiGoalAnalysis,
  aiGoalAnalysisError,
  analysisTimeframe,
  levelProgress,
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
}: ControlPanelProps) {
  const { language } = useLanguage();
  const [draftGoal, setDraftGoal] = useState(goal);
  const [draftDisplayName, setDraftDisplayName] = useState(profileDisplayName ?? "");
  const [draftBio, setDraftBio] = useState(profileBio ?? "");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activeFocusZone, setActiveFocusZone] = useState<FocusZone>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [goalSectionExpanded, setGoalSectionExpanded] = useState(true);
  const [aiCoachExpanded, setAiCoachExpanded] = useState(false);

  const t = useMemo(() => getControlPanelText(language, Boolean(goal.trim())), [goal, language]);
  const twoFactor = useTwoFactor(twoFactorEnabled, t);

  useEffect(() => {
    setDraftGoal(goal);
  }, [goal]);

  useEffect(() => {
    setDraftDisplayName(profileDisplayName ?? "");
  }, [profileDisplayName]);

  useEffect(() => {
    setDraftBio(profileBio ?? "");
  }, [profileBio]);

  const periodActionLabel = useMemo(
    () => getPeriodActionLabel(analysisTimeframe, language),
    [analysisTimeframe, language],
  );

  const stateItems = useMemo<StateItem[]>(
    () => [
      { key: "mental", label: t.focus, icon: Sparkles, color: "#9F7AEA" },
      { key: "physical", label: t.energy, icon: Activity, color: "#4FC3F7" },
      { key: "moral", label: t.relationships, icon: Heart, color: "#F6C453" },
      { key: "financial", label: t.finance, icon: Coins, color: "#36C98B" },
    ],
    [t.energy, t.finance, t.focus, t.relationships],
  );

  const goalProgress = clamp(Math.round(52 + (goalAnalysis?.stateScore ?? 0) * 18), 0, 100);
  const humanState = {
    mental: currentValues.mental > 0 ? "good" : "bad",
    spiritual: currentValues.moral > 0 ? "good" : "bad",
    financial: currentValues.financial > 0 ? "good" : "bad",
    physical: currentValues.physical > 0 ? "good" : "bad",
  } as const;

  return (
    <aside className="w-full border-t border-border bg-card p-3 md:p-4 lg:h-full lg:min-h-0 lg:border-l lg:border-t-0 lg:overflow-y-auto">
      <div className="space-y-4">
        {isAuthenticated ? (
          <ProfileSection
            t={t}
            avatarUrl={avatarUrl}
            tokenName={tokenName}
            profileDisplayName={profileDisplayName}
            profileBio={profileBio}
            draftDisplayName={draftDisplayName}
            setDraftDisplayName={setDraftDisplayName}
            draftBio={draftBio}
            setDraftBio={setDraftBio}
            isExpanded={profileExpanded}
            onToggleExpanded={() => setProfileExpanded((current) => !current)}
            isEditing={isEditingProfile}
            onEdit={() => setIsEditingProfile(true)}
            onCancelEdit={() => setIsEditingProfile(false)}
            onProfileSave={onProfileSave}
            isSavingProfile={isSavingProfile}
            twoFactor={twoFactor}
          />
        ) : null}

        <LevelSection t={t} levelProgress={levelProgress} />

        <PremiumSection isAuthenticated={isAuthenticated} />

        <GoalSection
          t={t}
          goal={goal}
          draftGoal={draftGoal}
          setDraftGoal={setDraftGoal}
          isEditingGoal={isEditingGoal}
          setIsEditingGoal={setIsEditingGoal}
          isSavingGoal={isSavingGoal}
          onGoalSave={onGoalSave}
          onGoalComplete={onGoalComplete}
          isGoalCompleted={isGoalCompleted}
          goalAnalysis={goalAnalysis}
          goalProgress={goalProgress}
          showAnalysis={showAnalysis}
          setShowAnalysis={setShowAnalysis}
          periodActionLabel={periodActionLabel}
          isExpanded={goalSectionExpanded}
          setIsExpanded={setGoalSectionExpanded}
          aiCoachExpanded={aiCoachExpanded}
          setAiCoachExpanded={setAiCoachExpanded}
          aiGoalAnalysis={aiGoalAnalysis}
          isLoadingAiGoalAnalysis={isLoadingAiGoalAnalysis}
          aiGoalAnalysisError={aiGoalAnalysisError}
          dailyTasks={dailyTasks}
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

        <EventsSection
          t={t}
          onAddPositiveNews={onAddPositiveNews}
          onAddNegativeNews={onAddNegativeNews}
        />

        <IndicatorsSection
          t={t}
          stateItems={stateItems}
          visibleStates={visibleStates}
          activeFocusZone={activeFocusZone}
          setActiveFocusZone={setActiveFocusZone}
          onToggleState={onToggleState}
        />

        <section className="rounded-lg border border-border bg-background/50 p-2" data-testid="human-state-balance">
          <HumanStateModel {...humanState} activeZone={activeFocusZone} />
        </section>

        <PortfolioSection isAuthenticated={isAuthenticated} />
      </div>
    </aside>
  );
}
