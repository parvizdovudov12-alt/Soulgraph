import { useState } from "react";
import ControlPanel from "../ControlPanel";
import { analyzeGoalProgress } from "@/lib/goalCoach";

export default function ControlPanelExample() {
  const [visibleStates, setVisibleStates] = useState({
    mental: true,
    physical: true,
    moral: true,
    financial: true,
  });
  const [goal, setGoal] = useState("Стать спокойнее и стабильнее в работе");
  const [draftTask, setDraftTask] = useState("");

  return (
    <div className="h-screen bg-background">
      <ControlPanel
        totalAssets={64}
        visibleStates={visibleStates}
        currentValues={{ mental: 62, physical: 58, moral: 71, financial: 70 }}
        news={[]}
        onToggleState={(state) => setVisibleStates((current) => ({ ...current, [state]: !current[state] }))}
        onAddPositiveNews={() => undefined}
        onAddNegativeNews={() => undefined}
        isAuthenticated={false}
        tokenName="SOUL"
        profileDisplayName="Parviz"
        profileBio="Собираю более сильную и спокойную версию себя."
        twoFactorEnabled={false}
        goal={goal}
        onGoalSave={setGoal}
        onGoalComplete={() => undefined}
        isGoalCompleted={false}
        isSavingGoal={false}
        onProfileSave={() => undefined}
        isSavingProfile={false}
        goalAnalysis={analyzeGoalProgress(goal, [])}
        aiGoalAnalysis={null}
        isLoadingAiGoalAnalysis={false}
        aiGoalAnalysisError={null}
        analysisPeriodLabel="день"
        analysisTimeframe="1D"
        levelProgress={{ level: 1, xp: 42, xpToNextLevel: 100, rankName: "Искра роста", progress: 42, totalXp: 42 }}
        dailyTasks={[]}
        todayKey="2026-05-23"
        draftTask={draftTask}
        draftTaskImpact={{ mental: 0, physical: 0, moral: 0, financial: 0 }}
        onDraftTaskChange={setDraftTask}
        onDraftTaskImpactChange={() => undefined}
        onAddDailyTask={() => undefined}
        onCompleteDailyTask={() => undefined}
        onDeleteDailyTask={() => undefined}
        onToggleDailyTaskPin={() => undefined}
        onReorderDailyTasks={() => undefined}
      />
    </div>
  );
}
