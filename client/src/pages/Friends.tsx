import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, UserMinus, Users, ArrowLeft } from "lucide-react";
import type { UserProfile } from "@shared/schema";

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

export default function Friends({ onBack, onViewUser }: FriendsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: searchResults = [], isLoading: isSearching } = useQuery<SocialUser[]>({
    queryKey: ["/api/social/search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/social/search?query=${encodeURIComponent(debouncedQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const { data: following = [], isLoading: isLoadingFollowing } = useQuery<SocialUser[]>({
    queryKey: ["/api/social/following"],
  });

  const { data: followers = [], isLoading: isLoadingFollowers } = useQuery<SocialUser[]>({
    queryKey: ["/api/social/followers"],
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", "/api/social/follow", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/search"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/social/follow/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/search"] });
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const renderUserCard = (user: SocialUser, showFollowButton = true) => (
    <Card 
      key={user.id} 
      className="p-3 flex items-center justify-between gap-3"
      data-testid={`card-user-${user.id}`}
    >
      <div 
        className="flex items-center gap-3 min-w-0 cursor-pointer hover-elevate flex-1"
        onClick={() => onViewUser(user.id)}
        data-testid={`link-user-${user.id}`}
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {user.tokenName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-medium truncate text-primary hover:underline" data-testid={`text-username-${user.id}`}>
            {user.tokenName || "Unknown"}
          </div>
          {user.profile?.displayName && (
            <div className="text-xs text-muted-foreground truncate">
              {user.profile.displayName}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showFollowButton && (
          user.isFollowing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => unfollowMutation.mutate(user.id)}
              disabled={unfollowMutation.isPending}
              data-testid={`button-unfollow-${user.id}`}
            >
              <UserMinus className="h-4 w-4 mr-1" />
              Отписаться
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => followMutation.mutate(user.id)}
              disabled={followMutation.isPending}
              data-testid={`button-follow-${user.id}`}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Подписаться
            </Button>
          )
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Друзья
        </h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {debouncedQuery && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Результаты поиска
          </h2>
          {isSearching ? (
            <div className="text-center py-4 text-muted-foreground">
              Поиск...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Пользователи не найдены
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map(user => renderUserCard(user))}
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="following" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="following" data-testid="tab-following">
            Подписки ({following.length})
          </TabsTrigger>
          <TabsTrigger value="followers" data-testid="tab-followers">
            Подписчики ({followers.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="following" className="mt-4">
          {isLoadingFollowing ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Вы пока ни на кого не подписаны
            </div>
          ) : (
            <div className="space-y-2">
              {following.map(user => renderUserCard({ ...user, isFollowing: true }))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="followers" className="mt-4">
          {isLoadingFollowers ? (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              У вас пока нет подписчиков
            </div>
          ) : (
            <div className="space-y-2">
              {followers.map(user => {
                const isFollowingBack = following.some(f => f.id === user.id);
                return renderUserCard({ ...user, isFollowing: isFollowingBack });
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
