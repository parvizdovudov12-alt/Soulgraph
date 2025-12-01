import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, UserPlus, UserMinus, Lock, Calendar } from "lucide-react";
import LifeChart, { StateData as ChartStateData, NewsEvent as ChartNewsEvent } from "@/components/LifeChart";
import type { UserProfile, StateData, NewsEvent } from "@shared/schema";
import { useMemo } from "react";

interface ViewUserData {
  user: {
    id: string;
    tokenName: string | null;
    avatarUrl: string | null;
  };
  profile?: UserProfile;
  stateData: StateData[];
  events?: NewsEvent[];
  isFollowing: boolean;
}

interface ViewUserProps {
  userId: string;
  onBack: () => void;
}

export default function ViewUser({ userId, onBack }: ViewUserProps) {
  const { data, isLoading, error } = useQuery<ViewUserData>({
    queryKey: ["/api/social/users", userId],
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/social/follow", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/users", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/following"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/social/follow/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/users", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/following"] });
    },
  });

  // Hooks must be called before any conditional returns
  const chartData = useMemo((): ChartStateData[] => {
    if (!data?.stateData) return [];
    return data.stateData.map(s => ({
      time: s.time as any,
      mental: s.mental,
      physical: s.physical,
      moral: s.moral,
      financial: s.financial,
    }));
  }, [data?.stateData]);

  const chartEvents = useMemo((): ChartNewsEvent[] => {
    if (!data?.events) return [];
    return data.events.map(e => ({
      id: e.id,
      time: e.time as any,
      type: e.type as 'positive' | 'negative',
      text: e.text,
      impact: {
        mental: e.impactMental,
        physical: e.impactPhysical,
        moral: e.impactMoral,
        financial: e.impactFinancial,
      },
      media: e.media || undefined,
    }));
  }, [data?.events]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center py-8 text-muted-foreground">
          Пользователь не найден
        </div>
      </div>
    );
  }

  const hasData = data.stateData.length > 0;
  const isPrivate = !hasData && !data.isFollowing && data.profile?.isPublic === false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Профиль</h1>
        </div>

        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={data.user.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {data.user.tokenName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-lg" data-testid="text-username">
                  {data.user.tokenName || "Unknown"}
                </div>
                {data.profile?.displayName && (
                  <div className="text-sm text-muted-foreground">
                    {data.profile.displayName}
                  </div>
                )}
                {data.profile?.bio && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {data.profile.bio}
                  </div>
                )}
              </div>
            </div>
            
            {data.isFollowing ? (
              <Button
                variant="outline"
                onClick={() => unfollowMutation.mutate()}
                disabled={unfollowMutation.isPending}
                data-testid="button-unfollow"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Отписаться
              </Button>
            ) : (
              <Button
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                data-testid="button-follow"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Подписаться
              </Button>
            )}
          </div>
        </Card>

        {isPrivate ? (
          <Card className="p-8 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium mb-2">Закрытый профиль</h2>
            <p className="text-muted-foreground">
              Подпишитесь, чтобы увидеть график этого пользователя
            </p>
          </Card>
        ) : hasData ? (
          <div>
            <Card className="p-4 mb-4">
              <LifeChart 
                data={chartData}
                news={chartEvents}
                tokenName={data.user.tokenName || "SOUL"}
                visibleStates={{ mental: false, physical: false, moral: false, financial: false }}
                weights={{ mental: 0.25, physical: 0.25, moral: 0.25, financial: 0.25 }}
                chartType="line"
              />
            </Card>
            
            {data.events && data.events.length > 0 && (
              <Card className="p-4">
                <h2 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  События ({data.events.length})
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.events.slice().reverse().map((event) => (
                    <div 
                      key={event.id}
                      className={`p-2 rounded text-sm ${
                        event.type === 'positive' 
                          ? 'bg-green-500/10 border-l-2 border-green-500' 
                          : 'bg-red-500/10 border-l-2 border-red-500'
                      }`}
                    >
                      <div className="font-medium">{event.text}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(event.time * 1000).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium mb-2">Нет данных</h2>
            <p className="text-muted-foreground">
              Этот пользователь ещё не добавлял события
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
