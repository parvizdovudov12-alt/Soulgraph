import type { LucideIcon } from "lucide-react";
import type { Timeframe } from "@/lib/dateUtils";
import type { GoalAnalysisResult } from "@/lib/goalCoach";
import type { DailyTask, TaskImpact } from "@/lib/localDashboardState";
import type { LevelProgress } from "@/lib/levelSystem";

export type StateKey = "mental" | "physical" | "moral" | "financial";

export type StateValues = Record<StateKey, number>;

export type VisibleStates = Record<StateKey, boolean>;

export type FocusZone = "mental" | "spiritual" | "financial" | "physical" | null;

export interface AiGoalAnalysisResult {
  summary: string;
  helpfulActions: string[];
  mistakes: string[];
  nextSteps: string[];
  focusArea: string;
  encouragement: string;
  model: string;
  generatedAt: string;
}

export interface ControlPanelProps {
  totalAssets: number;
  visibleStates: VisibleStates;
  currentValues: StateValues;
  news?: unknown[];
  onToggleState: (state: StateKey) => void;
  onAddPositiveNews: () => void;
  onAddNegativeNews: () => void;
  isAuthenticated: boolean;
  avatarUrl?: string | null;
  tokenName: string;
  profileDisplayName?: string | null;
  profileBio?: string | null;
  twoFactorEnabled: boolean;
  goal: string;
  onGoalSave: (goal: string) => void;
  onGoalComplete: () => void;
  isGoalCompleted: boolean;
  isSavingGoal: boolean;
  onProfileSave: (profile: { displayName: string; bio: string }) => void;
  isSavingProfile: boolean;
  goalAnalysis: GoalAnalysisResult | null;
  aiGoalAnalysis: AiGoalAnalysisResult | null;
  isLoadingAiGoalAnalysis: boolean;
  aiGoalAnalysisError?: string | null;
  analysisPeriodLabel: string;
  analysisTimeframe: Timeframe;
  levelProgress: LevelProgress;
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

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface StateItem {
  key: StateKey;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface ControlPanelText {
  profile: string;
  workspace: string;
  about: string;
  editProfile: string;
  displayName: string;
  displayNamePlaceholder: string;
  bio: string;
  bioPlaceholder: string;
  goalLabel: string;
  setGoal: string;
  completeGoal: string;
  goalCompleted: string;
  goalPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  goalNotSet: string;
  active: string;
  pending: string;
  analysis: string;
  collapse: string;
  expand: string;
  analysisEmpty: string;
  noGoal: string;
  plus: string;
  minus: string;
  events: string;
  indicators: string;
  dailyBalance: string;
  shown: string;
  hidden: string;
  focus: string;
  energy: string;
  relationships: string;
  finance: string;
  toward: string;
  away: string;
  direction: string;
  goalBeacon: string;
  eventsHint: string;
  aiCoach: string;
  aiCoachShort: string;
  aiLoading: string;
  aiUnavailable: string;
  helpfulActions: string;
  mistakes: string;
  nextSteps: string;
  focusArea: string;
  encouragement: string;
  security: string;
  twoFactor: string;
  twoFactorOn: string;
  twoFactorOff: string;
  twoFactorSetupHint: string;
  twoFactorSetupStart: string;
  twoFactorEnable: string;
  twoFactorDisable: string;
  twoFactorCodeLabel: string;
  twoFactorCodePlaceholder: string;
  twoFactorSecret: string;
  twoFactorSaved: string;
  twoFactorSavedDescription: string;
  twoFactorDisabled: string;
  twoFactorDisabledDescription: string;
  twoFactorError: string;
  tasks: string;
  taskPlaceholder: string;
  addTask: string;
  done: string;
  doneToday: string;
  completeTask: string;
  overdueTask: string;
  overdueTasks: string;
  noTasks: string;
  deleteTask: string;
  pinTask?: string;
  unpinTask?: string;
  taskImpact: string;
  taskImpactHint: string;
  noImpact: string;
  quickStartTitle: string;
  quickStartGoal: string;
  quickStartTask: string;
  quickStartEvent: string;
  quickStartHint: string;
  chartHint: string;
  taskCompletionHint: string;
  eventsHintShort: string;
  indicatorsHint: string;
  levelTitle: string;
  levelProgress: string;
  levelHint: string;
}
