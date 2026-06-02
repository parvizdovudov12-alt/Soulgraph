import { Crown, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { usePremiumSubscription } from "@/lib/premium";

interface PremiumSectionProps {
  isAuthenticated: boolean;
}

export function PremiumSection({ isAuthenticated }: PremiumSectionProps) {
  const { language } = useLanguage();
  const { subscription, isPremium, isLoading, unlockPremium, isUnlocking, unlockError } = usePremiumSubscription(isAuthenticated);

  const t =
    language === "ru"
      ? {
          title: "Premium",
          active: "Premium активен",
          unlock: "Открыть Premium",
          loading: "Проверяем доступ",
          price: "500 Stars / 30 дней",
          paywall: "AI-анализ цели и закрытые функции доступны после оплаты Telegram Stars.",
          validUntil: "Доступ до",
          error: "Не удалось открыть оплату. Проверь настройки Telegram-бота.",
        }
      : {
          title: "Premium",
          active: "Premium active",
          unlock: "Unlock Premium",
          loading: "Checking access",
          price: "500 Stars / 30 days",
          paywall: "AI goal analysis and locked functions open after Telegram Stars payment.",
          validUntil: "Access until",
          error: "Could not open payment. Check Telegram bot settings.",
        };

  if (!isAuthenticated) {
    return null;
  }

  const expiresAt = subscription?.subscription?.expiresAt
    ? new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(subscription.subscription.expiresAt))
    : null;

  return (
    <section className="rounded-md border border-emerald-300/25 bg-emerald-950/35 p-3 shadow-sm" data-testid="premium-section">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-300 text-emerald-950">
            <Crown className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold leading-none text-white">{t.title}</h3>
              {isPremium ? (
                <Badge className="border-emerald-200/40 bg-emerald-200 text-emerald-950 hover:bg-emerald-200">{t.active}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-snug text-white/70">
              {isLoading ? t.loading : isPremium && expiresAt ? `${t.validUntil} ${expiresAt}` : t.price}
            </p>
          </div>
        </div>

        {!isPremium ? (
          <Button
            type="button"
            size="sm"
            onClick={() => unlockPremium()}
            disabled={isUnlocking}
            className="shrink-0 bg-emerald-300 px-3 text-xs font-semibold text-emerald-950 hover:bg-emerald-200"
            data-testid="button-unlock-premium"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {isUnlocking ? "..." : t.unlock}
          </Button>
        ) : null}
      </div>

      {!isPremium ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-snug text-white/68" data-testid="premium-paywall">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-200" />
          <span>{t.paywall}</span>
        </div>
      ) : null}

      {unlockError ? <p className="mt-2 text-xs text-red-200">{t.error}</p> : null}
    </section>
  );
}
