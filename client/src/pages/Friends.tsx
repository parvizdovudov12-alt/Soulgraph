import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, apiUrl } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, UserMinus, Users, ArrowLeft } from "lucide-react";
import type { UserProfile } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";

interface SocialUser {
  id: string;
  tokenName: string | null;
  avatarUrl: string | null;
  profile?: UserProfile;
  isFollowing?: boolean;
}

interface FriendsProps {
  onBack: () => void;
  onViewUser: (userId: string) => void;
}

const copy = {
  ru: {
    title: "Друзья",
    searchPlaceholder: "Поиск по имени токена",
    searchResults: "Результаты поиска",
    searching: "Поиск...",
    noUsersFound: "Пользователи не найдены",
    following: "Подписки",
    followers: "Подписчики",
    loading: "Загрузка...",
    noFollowing: "Вы пока ни на кого не подписаны",
    noFollowers: "Подписчиков пока нет",
    follow: "Подписаться",
    unfollow: "Отписаться",
    unknown: "Неизвестно",
    searchFailed: "Ошибка поиска",
  },
  en: {
    title: "Friends",
    searchPlaceholder: "Search by token name",
    searchResults: "Search results",
    searching: "Searching...",
    noUsersFound: "No users found",
    following: "Following",
    followers: "Followers",
    loading: "Loading...",
    noFollowing: "You are not following anyone yet",
    noFollowers: "No followers yet",
    follow: "Follow",
    unfollow: "Unfollow",
    unknown: "Unknown",
    searchFailed: "Search failed",
  },
} as const;

export default function Friends({ onBack, onViewUser }: FriendsProps) {
  const { language } = useLanguage();
  const t = copy[language];
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: isSearching } = useQuery<SocialUser[]>({
    queryKey: ["/api/social/search", debouncedQuery, language],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/social/search?query=${encodeURIComponent(debouncedQuery)}`), { credentials: "include" });
      if (!res.ok) throw new Error(t.searchFailed);
      return res.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const { data: following = [], isLoading: isLoadingFollowing } = useQuery<SocialUser[]>({ queryKey: ["/api/social/following"] });
  const { data: followers = [], isLoading: isLoadingFollowers } = useQuery<SocialUser[]>({ queryKey: ["/api/social/followers"] });

  const refreshSocialQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/social/following"] });
    queryClient.invalidateQueries({ queryKey: ["/api/social/followers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/social/search"] });
  };

  const followMutation = useMutation({ mutationFn: async (userId: string) => apiRequest("POST", "/api/social/follow", { userId }), onSuccess: refreshSocialQueries });
  const unfollowMutation = useMutation({ mutationFn: async (userId: string) => apiRequest("DELETE", `/api/social/follow/${userId}`), onSuccess: refreshSocialQueries });

  const renderUserCard = (user: SocialUser, showFollowButton = true) => (
    <Card key={user.id} className="p-3 flex items-center justify-between gap-3" data-testid={`card-user-${user.id}`}>
      <button type="button" className="flex items-center gap-3 min-w-0 text-left hover-elevate flex-1" onClick={() => onViewUser(user.id)} data-testid={`link-user-${user.id}`}>
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">{user.tokenName?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium truncate text-primary hover:underline" data-testid={`text-username-${user.id}`}>
            {user.tokenName || t.unknown}
          </div>
          {user.profile?.displayName && <div className="text-xs text-muted-foreground truncate">{user.profile.displayName}</div>}
        </div>
      </button>
      {showFollowButton &&
        (user.isFollowing ? (
          <Button size="sm" variant="outline" onClick={() => unfollowMutation.mutate(user.id)} disabled={unfollowMutation.isPending} data-testid={`button-unfollow-${user.id}`}>
            <UserMinus className="h-4 w-4 mr-1" />
            {t.unfollow}
          </Button>
        ) : (
          <Button size="sm" onClick={() => followMutation.mutate(user.id)} disabled={followMutation.isPending} data-testid={`button-follow-${user.id}`}>
            <UserPlus className="h-4 w-4 mr-1" />
            {t.follow}
          </Button>
        ))}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t.title}
        </h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t.searchPlaceholder} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" data-testid="input-search" />
      </div>

      {debouncedQuery && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">{t.searchResults}</h2>
          {isSearching ? <div className="text-center py-4 text-muted-foreground">{t.searching}</div> : searchResults.length === 0 ? <div className="text-center py-4 text-muted-foreground">{t.noUsersFound}</div> : <div className="space-y-2">{searchResults.map((user) => renderUserCard(user))}</div>}
        </div>
      )}

      <Tabs defaultValue="following" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="following" data-testid="tab-following">{t.following} ({following.length})</TabsTrigger>
          <TabsTrigger value="followers" data-testid="tab-followers">{t.followers} ({followers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4">
          {isLoadingFollowing ? <div className="text-center py-8 text-muted-foreground">{t.loading}</div> : following.length === 0 ? <div className="text-center py-8 text-muted-foreground">{t.noFollowing}</div> : <div className="space-y-2">{following.map((user) => renderUserCard({ ...user, isFollowing: true }))}</div>}
        </TabsContent>

        <TabsContent value="followers" className="mt-4">
          {isLoadingFollowers ? <div className="text-center py-8 text-muted-foreground">{t.loading}</div> : followers.length === 0 ? <div className="text-center py-8 text-muted-foreground">{t.noFollowers}</div> : <div className="space-y-2">{followers.map((user) => renderUserCard({ ...user, isFollowing: following.some((followingUser) => followingUser.id === user.id) }))}</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
