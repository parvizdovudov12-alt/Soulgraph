import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }
}

export interface SubscriptionResponse {
  isPremium: boolean;
  subscription: {
    id: string;
    provider: "telegram_stars";
    plan: "premium_monthly";
    status: "active" | "expired" | "cancelled";
    startsAt: string;
    expiresAt: string;
  } | null;
}

export function usePremiumSubscription(isAuthenticated: boolean) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("premium") === "return") {
      queryClient.invalidateQueries({ queryKey: ["/api/me/subscription"] });
      params.delete("premium");
      const nextSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`);
    }
  }, []);

  const subscriptionQuery = useQuery<SubscriptionResponse>({
    queryKey: ["/api/me/subscription"],
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments/telegram/create-invoice", {
        initData: window.Telegram?.WebApp?.initData || "",
      });
      return await response.json() as { invoiceUrl: string; botUrl?: string | null; isInvoiceReady: boolean };
    },
    onSuccess: (data) => {
      window.location.href = data.invoiceUrl || data.botUrl || "https://t.me/";
    },
  });

  return {
    subscription: subscriptionQuery.data ?? null,
    isPremium: !!subscriptionQuery.data?.isPremium,
    isLoading: subscriptionQuery.isLoading,
    unlockPremium: unlockMutation.mutate,
    isUnlocking: unlockMutation.isPending,
    unlockError: unlockMutation.error,
  };
}
