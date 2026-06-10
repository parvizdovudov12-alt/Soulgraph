import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/i18n";
import type { PortfolioAsset, PortfolioTransaction } from "@shared/schema";

type AssetType =
  | "real_estate"
  | "cash"
  | "card"
  | "transport"
  | "children"
  | "skins"
  | "business"
  | "work"
  | "crypto"
  | "stock"
  | "etf"
  | "gold";

interface PortfolioResponse {
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
}

const emptyPortfolio: PortfolioResponse = {
  assets: [],
  transactions: [],
};

const assetTypes: AssetType[] = [
  "real_estate",
  "cash",
  "card",
  "transport",
  "children",
  "skins",
  "business",
  "work",
  "crypto",
  "stock",
  "etf",
  "gold",
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number.isFinite(value) ? value : 0);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function buildLinePath(points: PortfolioTransaction[]) {
  const values = points.map((point) => point.portfolioValue);
  if (values.length === 0) return "";
  if (values.length === 1) return "M 8 42 L 152 42";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = 8 + (index / (values.length - 1)) * 144;
      const y = 52 - ((value - min) / span) * 44;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function getAssetTypeLabel(type: string, labels: Record<AssetType, string>) {
  return labels[type as AssetType] ?? type;
}

function parseAmountInput(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function PortfolioSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("cash");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const t =
    language === "ru"
      ? {
          title: "\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c",
          subtitle: "\u041e\u0431\u0449\u0435\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0438 \u0440\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435 \u0430\u043a\u0442\u0438\u0432\u043e\u0432",
          signIn: "\u0412\u043e\u0439\u0434\u0438 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044c \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043b\u0441\u044f \u043d\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0435 \u0438 \u041f\u041a.",
          category: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f",
          name: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435",
          quantity: "\u041a\u043e\u043b-\u0432\u043e",
          price: "\u0426\u0435\u043d\u0430",
          add: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
          value: "\u041e\u0431\u0449\u0435\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435",
          assets: "\u0410\u043a\u0442\u0438\u0432\u043e\u0432",
          allocation: "\u0420\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435",
          chart: "\u0413\u0440\u0430\u0444\u0438\u043a \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u044f",
          history: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f",
          empty: "\u0414\u043e\u0431\u0430\u0432\u044c \u043f\u0435\u0440\u0432\u044b\u0439 \u0430\u043a\u0442\u0438\u0432.",
          addError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432. \u041f\u0440\u043e\u0432\u0435\u0440\u044c \u043a\u043e\u043b-\u0432\u043e \u0438 \u0446\u0435\u043d\u0443.",
          update: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
          delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
          real_estate: "\u041d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u044c",
          cash: "\u041d\u0430\u043b\u0438\u0447\u043d\u044b\u0435",
          card: "\u041d\u0430 \u043a\u0430\u0440\u0442\u0435",
          transport: "\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442",
          children: "\u0414\u0435\u0442\u0438",
          skins: "\u0421\u043a\u0438\u043d\u044b",
          business: "\u0411\u0438\u0437\u043d\u0435\u0441",
          work: "\u0420\u0430\u0431\u043e\u0442\u0430",
          crypto: "\u041a\u0440\u0438\u043f\u0442\u0430",
          stock: "\u0410\u043a\u0446\u0438\u0438",
          etf: "ETF",
          gold: "\u0417\u043e\u043b\u043e\u0442\u043e",
        }
      : {
          title: "Portfolio",
          subtitle: "Net worth and asset allocation",
          signIn: "Sign in to sync portfolio across mobile and desktop.",
          category: "Category",
          name: "Name",
          quantity: "Qty",
          price: "Price",
          add: "Add",
          value: "Net worth",
          assets: "Assets",
          allocation: "Allocation",
          chart: "Net worth chart",
          history: "History",
          empty: "Add your first asset.",
          addError: "Could not add asset. Check quantity and price.",
          update: "Update",
          delete: "Delete",
          real_estate: "Real estate",
          cash: "Cash",
          card: "Card",
          transport: "Transport",
          children: "Children",
          skins: "Skins",
          business: "Business",
          work: "Work",
          crypto: "Crypto",
          stock: "Stocks",
          etf: "ETF",
          gold: "Gold",
        };

  const typeLabels: Record<AssetType, string> = {
    real_estate: t.real_estate,
    cash: t.cash,
    card: t.card,
    transport: t.transport,
    children: t.children,
    skins: t.skins,
    business: t.business,
    work: t.work,
    crypto: t.crypto,
    stock: t.stock,
    etf: t.etf,
    gold: t.gold,
  };

  const portfolioQuery = useQuery<PortfolioResponse>({
    queryKey: ["/api/portfolio"],
    enabled: isAuthenticated,
  });
  const portfolio = portfolioQuery.data ?? emptyPortfolio;

  const totals = useMemo(() => {
    const value = portfolio.assets.reduce((sum, asset) => sum + asset.quantity * asset.currentPrice, 0);
    return { value, count: portfolio.assets.length };
  }, [portfolio.assets]);

  const quantityNumber = parseAmountInput(quantity);
  const priceNumber = parseAmountInput(price);

  const addAssetMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/portfolio/assets", {
        symbol: name || typeLabels[type],
        name: name || typeLabels[type],
        type,
        quantity: quantityNumber,
        entryPrice: priceNumber,
        currentPrice: priceNumber,
      }),
    onSuccess: () => {
      setName("");
      setQuantity("");
      setPrice("");
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ assetId, nextPrice }: { assetId: string; nextPrice: number }) =>
      apiRequest("PATCH", `/api/portfolio/assets/${assetId}/price`, { currentPrice: nextPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => apiRequest("DELETE", `/api/portfolio/assets/${assetId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });

  const canAdd = quantityNumber > 0 && priceNumber >= 0 && isAuthenticated;
  const linePath = buildLinePath(portfolio.transactions);

  return (
    <section className="rounded-lg border border-cyan-400/20 bg-[#050709] p-3 shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_14px_36px_rgba(0,0,0,0.28)]" data-testid="portfolio-section">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">{t.title}</p>
          <p className="mt-1 text-xs text-white/58">{t.subtitle}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-300 text-slate-950">
          <BriefcaseBusiness className="h-4 w-4" />
        </div>
      </div>

      {!isAuthenticated ? (
        <p className="mt-3 rounded-md border border-white/10 bg-white/[0.03] p-2 text-xs leading-relaxed text-white/68">{t.signIn}</p>
      ) : null}

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-2">
          <p className="text-[10px] uppercase tracking-wider text-white/42">{t.value}</p>
          <p className="mt-1 text-lg font-semibold leading-none text-white">{formatMoney(totals.value)}</p>
        </div>
        <div className="w-20 rounded-md border border-white/10 bg-white/[0.035] p-2 text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/42">{t.assets}</p>
          <p className="mt-1 text-lg font-semibold leading-none text-cyan-200">{totals.count}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select value={type} onValueChange={(nextType) => setType(nextType as AssetType)}>
          <SelectTrigger className="h-8 border-white/10 bg-black/40 text-xs text-white">
            <SelectValue placeholder={t.category} />
          </SelectTrigger>
          <SelectContent>
            {assetTypes.map((assetType) => (
              <SelectItem key={assetType} value={assetType}>
                {typeLabels[assetType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.name} className="h-8 border-white/10 bg-black/40 text-xs text-white" />
        <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" placeholder={t.quantity} className="h-8 border-white/10 bg-black/40 text-xs text-white" />
        <Input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder={t.price} className="h-8 border-white/10 bg-black/40 text-xs text-white" />
      </div>

      <Button
        type="button"
        disabled={!canAdd || addAssetMutation.isPending}
        onClick={() => addAssetMutation.mutate()}
        className="mt-2 h-8 w-full bg-cyan-300 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t.add}
      </Button>
      {addAssetMutation.isError ? <p className="mt-2 text-xs leading-relaxed text-red-200">{t.addError}</p> : null}

      <div className="mt-3 rounded-md border border-white/10 bg-black/35 p-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-white/45">{t.chart}</p>
          <span className="text-[10px] text-white/35">{portfolio.transactions.length}</span>
        </div>
        <svg viewBox="0 0 160 60" className="mt-1 h-[72px] w-full overflow-visible">
          <path d="M8 52 H152" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <path d="M8 30 H152" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          {linePath ? <path d={linePath} fill="none" stroke="#34d399" strokeLinecap="round" strokeWidth="2.5" /> : null}
        </svg>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-white/45">{t.allocation}</p>
        {portfolio.assets.length === 0 ? <p className="text-xs text-white/45">{t.empty}</p> : null}
        {portfolio.assets.map((asset) => {
          const value = asset.quantity * asset.currentPrice;
          const allocation = totals.value > 0 ? (value / totals.value) * 100 : 0;
          const draft = priceDrafts[asset.id] ?? String(asset.currentPrice);
          const categoryLabel = getAssetTypeLabel(asset.type, typeLabels);

          return (
            <div key={asset.id} className="rounded-md border border-white/10 bg-white/[0.025] p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{asset.name}</p>
                    <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/48">{categoryLabel}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-white/46">
                    {formatNumber(asset.quantity)} x {formatMoney(asset.currentPrice)}
                  </p>
                </div>
                <p className="text-right text-sm font-semibold text-white">{formatMoney(value)}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300" style={{ width: `${clampPercent(allocation)}%` }} />
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-2">
                <Input value={draft} onChange={(event) => setPriceDrafts((current) => ({ ...current, [asset.id]: event.target.value }))} inputMode="decimal" placeholder={t.price} className="h-8 border-white/10 bg-black/40 text-xs text-white" />
                <Button type="button" size="icon" variant="outline" className="h-8 w-8 border-cyan-300/25 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/20" onClick={() => updatePriceMutation.mutate({ assetId: asset.id, nextPrice: parseAmountInput(draft) })}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="sr-only">{t.update}</span>
                </Button>
                <Button type="button" size="icon" variant="outline" className="h-8 w-8 border-red-300/25 bg-red-400/10 text-red-200 hover:bg-red-400/20" onClick={() => deleteAssetMutation.mutate(asset.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">{t.delete}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
