import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import LifeChart, { type StateData, type NewsEvent } from "@/components/LifeChart";
import ControlPanel from "@/components/ControlPanel";
import NewsModal from "@/components/NewsModal";
import ConnectWallet from "@/components/ConnectWallet";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { NewsEvent as DBNewsEvent, UserProfile } from "@shared/schema";
import type { Timeframe } from "@/lib/dateUtils";
import { timeframeToSeconds } from "@/lib/dateUtils";
import { analyzeGoalProgress } from "@/lib/goalCoach";
import { useLanguage } from "@/lib/i18n";
import { calculateLevelProgress } from "@/lib/levelSystem";
import { getLocalDayKey, mergeDashboardEvents, normalizeTaskImpact, readLocalDashboardState, updateLocalDashboardState, type DailyTask, type TaskImpact } from "@/lib/localDashboardState";
import type { SubscriptionResponse } from "@/lib/premium";
import type { AiGoalAnalysisResult } from "@/components/ControlPanel";

interface DashboardProps {
  onOpenFriends?: () => void;
}

export default function Dashboard({ onOpenFriends }: DashboardProps) {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [localState, setLocalState] = useState(() => readLocalDashboardState());
  const [tokenName, setTokenName] = useState(user?.tokenName || "SOUL");
  const [visibleStates, setVisibleStates] = useState({ mental: false, physical: false, moral: false, financial: false });
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsModalType, setNewsModalType] = useState<"positive" | "negative">("positive");
  const [chartType] = useState<"line" | "candlestick">("candlestick");
  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [aiGoalAnalysis, setAiGoalAnalysis] = useState<AiGoalAnalysisResult | null>(null);
  const [aiGoalAnalysisError, setAiGoalAnalysisError] = useState<string | null>(null);
  const [draftTask, setDraftTask] = useState("");
  const [draftTaskImpact, setDraftTaskImpact] = useState<TaskImpact>({
    mental: 0,
    physical: 0,
    moral: 0,
    financial: 0,
  });

  const t =
    language === "ru"
      ? {
          subtitle: "Операционная система человека",
          dateLocale: "ru-RU",
          friends: "Друзья",
          eventSavedLocal: "Событие сохранено локально",
          eventSavedLocalDescription: "Сервер сейчас недоступен. Мы сохранили событие в браузере:",
          goalSaved: "Цель сохранена",
          goalCleared: "Цель очищена",
          goalSavedDescription: "Теперь кабинет будет разбирать события относительно этой цели.",
          goalClearedDescription: "Задай новую цель, чтобы снова включить анализ действий.",
          goalSavedLocal: "Цель сохранена локально",
          goalSavedLocalDescription: "Сервер сейчас недоступен. Мы сохранили цель в браузере:",
          day: "день",
          week: "неделю",
          month: "месяц",
          quarter: "квартал",
          year: "год",
          allPeriod: "весь период",
          taskCompleted: "Задача выполнена",
          taskCompletedDescription: "Добавили выполнение в события и на график.",
          goalCompleted: "Цель выполнена",
          goalCompletedDescription: "Добавили достижение цели в события и на график.",
          premiumRequired: "AI-анализ цели доступен в Premium.",
        }
      : {
          subtitle: "Soulgraph Human Operating System",
          dateLocale: "en-US",
          friends: "Friends",
          eventSavedLocal: "Event saved locally",
          eventSavedLocalDescription: "The server is unavailable right now. We saved the event in the browser:",
          goalSaved: "Goal saved",
          goalCleared: "Goal cleared",
          goalSavedDescription: "The desk will now evaluate events against this goal.",
          goalClearedDescription: "Set a new goal to turn the analysis back on.",
          goalSavedLocal: "Goal saved locally",
          goalSavedLocalDescription: "The server is unavailable right now. We saved the goal in the browser:",
          day: "day",
          week: "week",
          month: "month",
          quarter: "quarter",
          year: "year",
          allPeriod: "all time",
          taskCompleted: "Task completed",
          taskCompletedDescription: "Completion was added to events and the chart.",
          goalCompleted: "Goal completed",
          goalCompletedDescription: "Goal achievement was added to events and the chart.",
          premiumRequired: "AI goal analysis is available in Premium.",
        };

  useEffect(() => {
    if (user?.tokenName) {
      setTokenName(user.tokenName);
    }
  }, [user?.tokenName]);

  const [stateData, setStateData] = useState<StateData[]>(() => {
    const now = Math.floor(Date.now() / 1000);
    return [{ time: now as any, mental: 0, physical: 0, moral: 0, financial: 0 }];
  });

  const liveSyncIntervalMs = isAuthenticated ? 10_000 : false;
  const liveSyncQueryOptions = {
    enabled: isAuthenticated,
    refetchInterval: liveSyncIntervalMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  } as const;

  const newsEventsQuery = useQuery<DBNewsEvent[]>({ queryKey: ["/api/news-events"], ...liveSyncQueryOptions });
  const profileQuery = useQuery<UserProfile>({ queryKey: ["/api/social/profile"], enabled: isAuthenticated });
  const subscriptionQuery = useQuery<SubscriptionResponse>({ queryKey: ["/api/me/subscription"], enabled: isAuthenticated });
  const dailyTasksQuery = useQuery<DailyTask[]>({ queryKey: ["/api/daily-tasks"], ...liveSyncQueryOptions });
  const newsEventsData = newsEventsQuery.data ?? [];
  const profile = profileQuery.data;
  const isPremium = !!subscriptionQuery.data?.isPremium;
  const effectiveGoal = localState.pendingGoal ?? profile?.goal ?? localState.lastKnownGoal ?? "";
  const effectiveDbNewsEvents = useMemo(
    () => mergeDashboardEvents(newsEventsData, localState),
    [localState, newsEventsData],
  );

  useEffect(() => {
    if (newsEventsQuery.isSuccess) {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        lastKnownEvents: newsEventsData,
        pendingEvents: current.pendingEvents.filter(
          (pendingEvent) => !newsEventsData.some((event) => event.id === pendingEvent.id),
        ),
      })));
    }
  }, [newsEventsData, newsEventsQuery.isSuccess]);

  useEffect(() => {
    if (profileQuery.isSuccess) {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        lastKnownGoal: profile?.goal ?? "",
        pendingGoal: current.pendingGoal === (profile?.goal ?? "") ? null : current.pendingGoal,
      })));
    }
  }, [profile?.goal, profileQuery.isSuccess]);

  const migrateLocalDailyTasksMutation = useMutation({
    mutationFn: async (tasks: DailyTask[]) => {
      await Promise.all(tasks.map((task) => apiRequest("POST", "/api/daily-tasks", task)));
    },
    onSuccess: () => {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        dailyTasks: [],
      })));
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !dailyTasksQuery.isSuccess || migrateLocalDailyTasksMutation.isPending) {
      return;
    }

    const serverTasks = dailyTasksQuery.data ?? [];
    const serverTaskIds = new Set(serverTasks.map((task) => task.id));
    const serverTaskTexts = new Set(serverTasks.map((task) => task.text.trim().toLowerCase()));
    const tasksToMigrate = localState.dailyTasks.filter((task) => (
      !serverTaskIds.has(task.id) && !serverTaskTexts.has(task.text.trim().toLowerCase())
    ));

    if (tasksToMigrate.length > 0) {
      migrateLocalDailyTasksMutation.mutate(tasksToMigrate);
    } else if (localState.dailyTasks.length > 0) {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        dailyTasks: [],
      })));
    }
  }, [dailyTasksQuery.data, dailyTasksQuery.isSuccess, isAuthenticated, localState.dailyTasks, migrateLocalDailyTasksMutation.isPending]);

  const newsEvents = useMemo((): NewsEvent[] => {
    let lastChartTime = 0;

    return [...effectiveDbNewsEvents]
      .sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;

        const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt;

        return String(a.id).localeCompare(String(b.id));
      })
      .map((event) => {
        const chartTime = Math.max(event.time, lastChartTime + 1);
        lastChartTime = chartTime;

        return {
      id: event.id,
      time: chartTime as any,
      type: event.type as "positive" | "negative",
      text: event.text,
      impact: {
        mental: event.impactMental,
        physical: event.impactPhysical,
        moral: event.impactMoral,
        financial: event.impactFinancial,
      },
      media: event.media || undefined,
        };
      });
  }, [effectiveDbNewsEvents]);

  useEffect(() => {
    if (newsEvents.length > 0) {
      const sortedEvents = [...newsEvents].sort((a, b) => (a.time as number) - (b.time as number));
      const firstEventTime = sortedEvents[0].time as number;
      const baseline = { time: (firstEventTime - 1) as any, mental: 0, physical: 0, moral: 0, financial: 0 };
      const newData: StateData[] = [baseline];

      sortedEvents.forEach((event) => {
        const lastPoint = newData[newData.length - 1];
        newData.push({
          time: event.time,
          mental: Math.max(-1000, Math.min(1000, lastPoint.mental + event.impact.mental)),
          physical: Math.max(-1000, Math.min(1000, lastPoint.physical + event.impact.physical)),
          moral: Math.max(-1000, Math.min(1000, lastPoint.moral + event.impact.moral)),
          financial: Math.max(-1000, Math.min(1000, lastPoint.financial + event.impact.financial)),
        });
      });

      setStateData(newData);
    } else {
      const now = Math.floor(Date.now() / 1000);
      setStateData([{ time: now as any, mental: 0, physical: 0, moral: 0, financial: 0 }]);
    }
  }, [newsEvents]);

  const weights = { mental: 0.25, physical: 0.25, moral: 0.25, financial: 0.25 };

  const totalAssets = useMemo(() => {
    if (stateData.length === 0) {
      return 0;
    }

    const lastPoint = stateData[stateData.length - 1];
    const total = weights.mental + weights.physical + weights.moral + weights.financial;
    return (
      (lastPoint.mental * weights.mental +
        lastPoint.physical * weights.physical +
        lastPoint.moral * weights.moral +
        lastPoint.financial * weights.financial) /
      total
    );
  }, [stateData]);

  const currentValues = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodaySeconds = Math.floor(startOfToday.getTime() / 1000);

    const todayEvents = newsEvents.filter((event) => Number(event.time) >= startOfTodaySeconds);

    if (todayEvents.length === 0) {
      return { mental: 0, physical: 0, moral: 0, financial: 0 };
    }

    return todayEvents.reduce(
      (acc, event) => ({
        mental: Math.max(-1000, Math.min(1000, acc.mental + event.impact.mental)),
        physical: Math.max(-1000, Math.min(1000, acc.physical + event.impact.physical)),
        moral: Math.max(-1000, Math.min(1000, acc.moral + event.impact.moral)),
        financial: Math.max(-1000, Math.min(1000, acc.financial + event.impact.financial)),
      }),
      { mental: 0, physical: 0, moral: 0, financial: 0 },
    );
  }, [newsEvents]);

  const analysisPeriodLabel = useMemo(() => {
    switch (timeframe) {
      case "ALL":
        return t.allPeriod;
      case "1D":
        return t.day;
      case "1W":
        return t.week;
      case "1M":
        return t.month;
      case "3M":
        return t.quarter;
      case "1Y":
        return t.year;
    }
  }, [timeframe, t.allPeriod, t.day, t.month, t.quarter, t.week, t.year]);

  const analysisEvents = useMemo(() => {
    if (newsEvents.length === 0) return [];
    if (timeframe === "ALL") return newsEvents;
    const latestEventTime = Math.max(...newsEvents.map((event) => Number(event.time)));
    const periodStart = latestEventTime - timeframeToSeconds(timeframe);
    return newsEvents.filter((event) => Number(event.time) >= periodStart);
  }, [newsEvents, timeframe]);
  const analysisEventsFingerprint = useMemo(
    () =>
      JSON.stringify(
        analysisEvents.map((event) => ({
          id: event.id ?? "no-id",
          time: Number(event.time),
          type: event.type,
          text: event.text,
          impact: event.impact,
        })),
      ),
    [analysisEvents],
  );

  const goalAnalysis = useMemo(() => analyzeGoalProgress(effectiveGoal, analysisEvents, language), [effectiveGoal, analysisEvents, language]);

  const aiGoalAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/goal-analysis/ai", {
        goal: effectiveGoal,
        timeframe,
        language,
        events: analysisEvents.map((event) => ({
          id: event.id,
          time: Number(event.time),
          type: event.type,
          text: event.text,
          impact: event.impact,
        })),
      });

      return response.json() as Promise<AiGoalAnalysisResult>;
    },
    onSuccess: (result) => {
      setAiGoalAnalysis(result);
      setAiGoalAnalysisError(null);
    },
    onError: (error: Error) => {
      setAiGoalAnalysis(null);
      setAiGoalAnalysisError(error.message);
    },
  });

  useEffect(() => {
    if (!effectiveGoal.trim()) {
      setAiGoalAnalysis(null);
      setAiGoalAnalysisError(null);
      return;
    }

    if (analysisEvents.length === 0) {
      setAiGoalAnalysis(null);
      setAiGoalAnalysisError(null);
      return;
    }

    if (!isPremium) {
      setAiGoalAnalysis(null);
      setAiGoalAnalysisError(t.premiumRequired);
      return;
    }

    setAiGoalAnalysisError(null);
    aiGoalAnalysisMutation.mutate();
  }, [effectiveGoal, timeframe, language, analysisEventsFingerprint, isPremium, t.premiumRequired]);

  const createNewsEventMutation = useMutation({
    mutationFn: async (data: { type: "positive" | "negative"; text: string; time: number; impact: { mental: number; physical: number; moral: number; financial: number }; media?: { type: "image" | "video"; url: string }[] }) => {
      return apiRequest("POST", "/api/news-events", {
        type: data.type,
        time: data.time,
        text: data.text,
        impactMental: data.impact.mental,
        impactPhysical: data.impact.physical,
        impactMoral: data.impact.moral,
        impactFinancial: data.impact.financial,
        media: data.media || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news-events"] });
    },
    onError: (error: Error, data) => {
      const fallbackEvent: DBNewsEvent = {
        id: `local-${Date.now()}`,
        userId: user?.id ?? "local-user",
        time: data.time,
        type: data.type,
        text: data.text,
        impactMental: data.impact.mental,
        impactPhysical: data.impact.physical,
        impactMoral: data.impact.moral,
        impactFinancial: data.impact.financial,
        media: data.media ?? null,
        createdAt: new Date(),
      };

      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        pendingEvents: [...current.pendingEvents, fallbackEvent],
      })));

      toast({
        title: t.eventSavedLocal,
        description: `${t.eventSavedLocalDescription} ${error.message}`,
      });
    },
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (goal: string) => {
      return apiRequest("PATCH", "/api/social/profile", {
        displayName: profile?.displayName ?? user?.tokenName ?? null,
        bio: profile?.bio ?? null,
        goal: goal || null,
        isPublic: profile?.isPublic ?? true,
        allowEventSharing: profile?.allowEventSharing ?? false,
      });
    },
    onSuccess: async (_response, goal) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/social/profile"] });
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        lastKnownGoal: goal,
        pendingGoal: null,
      })));
      toast({
        title: goal ? t.goalSaved : t.goalCleared,
        description: goal ? t.goalSavedDescription : t.goalClearedDescription,
      });
    },
    onError: (error: Error, goal) => {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        pendingGoal: goal,
      })));
      toast({
        title: t.goalSavedLocal,
        description: `${t.goalSavedLocalDescription} ${error.message}`,
      });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (payload: { displayName: string; bio: string }) => {
      return apiRequest("PATCH", "/api/social/profile", {
        displayName: payload.displayName || null,
        bio: payload.bio || null,
        goal: profile?.goal ?? (effectiveGoal || null),
        isPublic: profile?.isPublic ?? true,
        allowEventSharing: profile?.allowEventSharing ?? false,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/social/profile"] });
    },
  });

  const deleteNewsEventMutation = useMutation({
    mutationFn: async (eventId: string) => apiRequest("DELETE", `/api/news-events/${eventId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news-events"] });
    },
  });

  const deleteMultipleEventsMutation = useMutation({
    mutationFn: async (params: { eventIds: string[]; onSuccess?: () => void }) => {
      const results = await Promise.allSettled(params.eventIds.map((eventId) => apiRequest("DELETE", `/api/news-events/${eventId}`, {})));
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) {
        throw new Error(`Failed to delete ${failures.length} of ${params.eventIds.length} events`);
      }
      return params.onSuccess;
    },
    onSuccess: (callback) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news-events"] });
      callback?.();
    },
  });

  const createDailyTaskMutation = useMutation({
    mutationFn: async (task: DailyTask) => apiRequest("POST", "/api/daily-tasks", task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
    },
    onError: (_error: Error, task) => {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        dailyTasks: current.dailyTasks.some((currentTask) => currentTask.id === task.id)
          ? current.dailyTasks
          : [...current.dailyTasks, task],
      })));
    },
  });

  const completeDailyTaskMutation = useMutation({
    mutationFn: async (payload: { taskId: string; dayKey: string }) => (
      apiRequest("PATCH", `/api/daily-tasks/${payload.taskId}/complete`, { dayKey: payload.dayKey })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
    },
  });

  const pinDailyTaskMutation = useMutation({
    mutationFn: async (payload: { taskId: string; pinned: boolean }) => (
      apiRequest("PATCH", `/api/daily-tasks/${payload.taskId}/pin`, { pinned: payload.pinned })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
    },
  });

  const reorderDailyTasksMutation = useMutation({
    mutationFn: async (taskIds: string[]) => apiRequest("PATCH", "/api/daily-tasks/reorder", { taskIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
    },
  });

  const deleteDailyTaskMutation = useMutation({
    mutationFn: async (taskId: string) => apiRequest("DELETE", `/api/daily-tasks/${taskId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
    },
  });

  const todayKey = getLocalDayKey();
  const dailyTasks = isAuthenticated ? (dailyTasksQuery.data ?? []) : localState.dailyTasks;
  const isGoalCompleted = Boolean(
    effectiveGoal.trim() &&
      localState.completedGoals.some((completedGoal) => completedGoal.goal.trim() === effectiveGoal.trim()),
  );
  const levelProgress = useMemo(
    () => calculateLevelProgress({ events: newsEvents, tasks: dailyTasks, language }),
    [newsEvents, dailyTasks, language],
  );

  const handleAddNews = (data: { text: string; time: number; impact: { mental: number; physical: number; moral: number; financial: number }; media?: { type: "image" | "video"; url: string }[] }) => {
    createNewsEventMutation.mutate({ ...data, type: newsModalType });
  };

  const handleAddDailyTask = () => {
    const text = draftTask.trim();
    if (!text) return;

    const task: DailyTask = {
      id: `task-${Date.now()}`,
      text,
      impact: normalizeTaskImpact(draftTaskImpact),
      createdAt: new Date().toISOString(),
      completedDates: [],
      pinned: false,
      orderIndex: dailyTasks.length,
    };

    if (isAuthenticated) {
      createDailyTaskMutation.mutate(task);
    } else {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        dailyTasks: [...current.dailyTasks, task],
      })));
    }
    setDraftTask("");
    setDraftTaskImpact({
      mental: 0,
      physical: 0,
      moral: 0,
      financial: 0,
    });
  };

  const handleCompleteDailyTask = (task: DailyTask) => {
    if (task.completedDates.includes(todayKey)) return;

    if (isAuthenticated) {
      completeDailyTaskMutation.mutate({ taskId: task.id, dayKey: todayKey });
    } else {
      setLocalState(updateLocalDashboardState((current) => ({
        ...current,
        dailyTasks: current.dailyTasks.map((currentTask) =>
          currentTask.id === task.id
            ? { ...currentTask, completedDates: [...currentTask.completedDates, todayKey] }
            : currentTask,
        ),
      })));
    }

    createNewsEventMutation.mutate({
      type: task.impact.mental + task.impact.physical + task.impact.moral + task.impact.financial >= 0 ? "positive" : "negative",
      time: Math.floor(Date.now() / 1000),
      text: language === "ru" ? `Выполнена задача: ${task.text}` : `Completed task: ${task.text}`,
      impact: normalizeTaskImpact(task.impact),
    });

    toast({
      title: t.taskCompleted,
      description: t.taskCompletedDescription,
    });
  };

  const handleCompleteGoal = () => {
    const goalText = effectiveGoal.trim();
    if (!goalText) return;

    setLocalState(updateLocalDashboardState((current) => ({
      ...current,
      completedGoals: [
        ...current.completedGoals,
        {
          goal: goalText,
          completedAt: new Date().toISOString(),
        },
      ],
    })));

    createNewsEventMutation.mutate({
      type: "positive",
      time: Math.floor(Date.now() / 1000),
      text: language === "ru" ? `Выполнена цель: ${goalText}` : `Goal completed: ${goalText}`,
      impact: {
        mental: 40,
        physical: 20,
        moral: 40,
        financial: 20,
      },
    });

    toast({
      title: t.goalCompleted,
      description: t.goalCompletedDescription,
    });
  };

  const handleDeleteDailyTask = (taskId: string) => {
    if (isAuthenticated) {
      deleteDailyTaskMutation.mutate(taskId);
      return;
    }

    setLocalState(updateLocalDashboardState((current) => ({
      ...current,
      dailyTasks: current.dailyTasks.filter((task) => task.id !== taskId),
    })));
  };

  const handleToggleDailyTaskPin = (taskId: string) => {
    const task = dailyTasks.find((currentTask) => currentTask.id === taskId);
    if (!task) return;

    if (isAuthenticated) {
      pinDailyTaskMutation.mutate({ taskId, pinned: !task.pinned });
      return;
    }

    setLocalState(updateLocalDashboardState((current) => ({
      ...current,
      dailyTasks: current.dailyTasks.map((currentTask) =>
        currentTask.id === taskId ? { ...currentTask, pinned: !currentTask.pinned, orderIndex: currentTask.orderIndex } : currentTask,
      ),
    })));
  };

  const getOrderedDailyTasks = (tasks: DailyTask[]) => [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const moveTaskInList = (tasks: DailyTask[], taskId: string, direction: "up" | "down") => {
    const ordered = getOrderedDailyTasks(tasks);
    const currentIndex = ordered.findIndex((task) => task.id === taskId);
    if (currentIndex < 0) return tasks;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= ordered.length) return tasks;

    const [task] = ordered.splice(currentIndex, 1);
    ordered.splice(nextIndex, 0, task);
    const orderById = new Map(ordered.map((orderedTask, index) => [orderedTask.id, index]));
    return tasks.map((currentTask) => ({
      ...currentTask,
      orderIndex: orderById.get(currentTask.id) ?? currentTask.orderIndex,
    }));
  };

  const handleMoveDailyTask = (taskId: string, direction: "up" | "down") => {
    const nextTasks = moveTaskInList(dailyTasks, taskId, direction);
    const nextTaskIds = getOrderedDailyTasks(nextTasks).map((task) => task.id);

    if (isAuthenticated) {
      queryClient.setQueryData(["/api/daily-tasks"], nextTasks);
      reorderDailyTasksMutation.mutate(nextTaskIds);
      return;
    }

    setLocalState(updateLocalDashboardState((current) => ({
      ...current,
      dailyTasks: moveTaskInList(current.dailyTasks, taskId, direction),
    })));
  };

  const applyDailyTaskOrder = (tasks: DailyTask[], taskIds: string[]) => {
    const orderById = new Map(taskIds.map((taskId, index) => [taskId, index]));
    return tasks.map((task) => ({
      ...task,
      orderIndex: orderById.get(task.id) ?? task.orderIndex,
    }));
  };

  const handleReorderDailyTasks = (taskIds: string[]) => {
    if (taskIds.length === 0) return;

    if (isAuthenticated) {
      queryClient.setQueryData(["/api/daily-tasks"], applyDailyTaskOrder(dailyTasks, taskIds));
      reorderDailyTasksMutation.mutate(taskIds);
      return;
    }

    setLocalState(updateLocalDashboardState((current) => ({
      ...current,
      dailyTasks: applyDailyTaskOrder(current.dailyTasks, taskIds),
    })));
  };

  const handleDeleteAllDayEvents = (eventIds: string[], onSuccess?: () => void) => {
    if (eventIds.length > 0) {
      deleteMultipleEventsMutation.mutate({ eventIds, onSuccess });
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen flex-col lg:h-full lg:min-h-0">
      <header className="shrink-0 border-b border-border px-3 py-3 md:px-6 lg:h-16 lg:py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:h-full">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <img src="/assets/soulgraph-logo-192.png" alt="Soulgraph" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">Soulgraph</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-4">
          <div className="hidden text-sm text-muted-foreground lg:block">
            {new Date().toLocaleDateString(t.dateLocale, { year: "numeric", month: "long", day: "numeric" })}
          </div>
          <LanguageSwitcher />
          {onOpenFriends && (
            <Button size="icon" variant="ghost" onClick={onOpenFriends} data-testid="button-open-friends">
              <Users className="h-5 w-5" />
              <span className="sr-only">{t.friends}</span>
            </Button>
          )}
          <ConnectWallet />
        </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-h-0 min-w-0 px-1 pb-2 pt-1 md:px-2 md:pb-3 md:pt-2 lg:pb-2">
          <LifeChart
            data={stateData}
            visibleStates={visibleStates}
            weights={weights}
            news={newsEvents}
            chartType={chartType}
            tokenName={tokenName}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onDeleteEvent={(eventId) => deleteNewsEventMutation.mutate(eventId)}
            onDeleteAllDayEvents={handleDeleteAllDayEvents}
            isDeletingMultiple={deleteMultipleEventsMutation.isPending}
          />
        </div>

        <ControlPanel
          totalAssets={totalAssets}
          visibleStates={visibleStates}
          currentValues={currentValues}
          news={newsEvents}
          onToggleState={(state) => setVisibleStates((current) => ({ ...current, [state]: !current[state] }))}
          onAddPositiveNews={() => {
            setNewsModalType("positive");
            setNewsModalOpen(true);
          }}
          onAddNegativeNews={() => {
            setNewsModalType("negative");
            setNewsModalOpen(true);
          }}
          isAuthenticated={isAuthenticated}
          avatarUrl={user?.avatarUrl}
          tokenName={tokenName}
          profileDisplayName={profile?.displayName ?? null}
          profileBio={profile?.bio ?? null}
          twoFactorEnabled={!!user?.twoFactorEnabled}
          goal={effectiveGoal}
          onGoalSave={(goal) => saveGoalMutation.mutate(goal)}
          onGoalComplete={handleCompleteGoal}
          isGoalCompleted={isGoalCompleted}
          isSavingGoal={saveGoalMutation.isPending}
          onProfileSave={(profileData) => saveProfileMutation.mutate(profileData)}
          isSavingProfile={saveProfileMutation.isPending}
          goalAnalysis={goalAnalysis}
          aiGoalAnalysis={aiGoalAnalysis}
          isLoadingAiGoalAnalysis={aiGoalAnalysisMutation.isPending}
          aiGoalAnalysisError={aiGoalAnalysisError}
          analysisPeriodLabel={analysisPeriodLabel}
          analysisTimeframe={timeframe}
          levelProgress={levelProgress}
          dailyTasks={dailyTasks}
          todayKey={todayKey}
          draftTask={draftTask}
          draftTaskImpact={draftTaskImpact}
          onDraftTaskChange={setDraftTask}
          onDraftTaskImpactChange={(impact) => setDraftTaskImpact(normalizeTaskImpact(impact))}
          onAddDailyTask={handleAddDailyTask}
          onCompleteDailyTask={handleCompleteDailyTask}
          onDeleteDailyTask={handleDeleteDailyTask}
          onToggleDailyTaskPin={handleToggleDailyTaskPin}
          onReorderDailyTasks={handleReorderDailyTasks}
        />
      </div>

      <NewsModal open={newsModalOpen} onClose={() => setNewsModalOpen(false)} type={newsModalType} onSubmit={handleAddNews} />
      </div>
    </div>
  );
}
