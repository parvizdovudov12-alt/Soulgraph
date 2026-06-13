import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, RefreshCw, Trash2, TrendingDown, TrendingUp } from "lucide-react";
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

type PortfolioCurrency = "USD" | "RUB" | "EUR" | "AED" | "TRY" | "KZT" | "USDT";

interface PortfolioResponse {
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
}

interface PortfolioCandle {
  id: string;
  open: number;
  high: number;
  low: number;
  close: number;
  side: string;
  amount: number;
  currency: PortfolioCurrency;
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

const portfolioCurrencies: PortfolioCurrency[] = ["USD", "RUB", "EUR", "AED", "TRY", "KZT", "USDT"];
const portfolioCurrencyStorageKey = "soulgraph_portfolio_currency";
const portfolioCurrencyVersionKey = "soulgraph_portfolio_currency_v2";
const portfolioUsdRates: Record<PortfolioCurrency, number> = {
  USD: 1,
  USDT: 1,
  RUB: 0.011,
  EUR: 1.08,
  AED: 0.272,
  TRY: 0.031,
  KZT: 0.002,
};

function getStoredPortfolioCurrency(): PortfolioCurrency {
  if (typeof window === "undefined") return "RUB";
  const storedCurrency = window.localStorage.getItem(portfolioCurrencyStorageKey);
  const hasCurrencyV2 = window.localStorage.getItem(portfolioCurrencyVersionKey) === "true";
  if (!hasCurrencyV2 && storedCurrency === "USD") {
    return "RUB";
  }
  return portfolioCurrencies.includes(storedCurrency as PortfolioCurrency) ? (storedCurrency as PortfolioCurrency) : "RUB";
}

function formatMoney(value: number, currency: PortfolioCurrency) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const locale = currency === "RUB" ? "ru-RU" : "en-US";
  if (currency === "USDT") {
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: safeValue >= 1000 ? 0 : 2,
    }).format(safeValue)} USDT`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(safeValue);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number.isFinite(value) ? value : 0);
}

function getMovementCurrency(symbol: string): PortfolioCurrency | null {
  const currency = symbol.replace("PORTFOLIO_", "");
  return portfolioCurrencies.includes(currency as PortfolioCurrency) ? (currency as PortfolioCurrency) : null;
}

function convertToUsd(value: number, currency: PortfolioCurrency) {
  return value * portfolioUsdRates[currency];
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
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

function buildPortfolioUsdCandles(points: PortfolioTransaction[]): PortfolioCandle[] {
  const balancesByCurrency = new Map<PortfolioCurrency, number>();
  let previousTotal = 0;

  return points.map((point) => {
    const movementCurrency = getMovementCurrency(point.symbol);
    if (!movementCurrency) {
      return {
        id: point.id,
        open: previousTotal,
        close: previousTotal,
        high: previousTotal,
        low: previousTotal,
        side: point.side,
        amount: 0,
        currency: "USD",
      };
    }

    balancesByCurrency.set(movementCurrency, Number(point.portfolioValue) || 0);
    const close = Array.from(balancesByCurrency.entries()).reduce(
      (sum, [currency, value]) => sum + convertToUsd(value, currency),
      0,
    );
    const open = previousTotal;
    previousTotal = close;

    return {
      id: point.id,
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      side: point.side,
      amount: Math.abs(Number(point.price) || 0),
      currency: movementCurrency,
    };
  });
}

function PortfolioCandlestickChart({ candles, profitLabel, lossLabel }: { candles: PortfolioCandle[]; profitLabel: string; lossLabel: string }) {
  const [activeCandleId, setActiveCandleId] = useState<string | null>(null);
  const width = 300;
  const height = 124;
  const top = 14;
  const bottom = 108;
  const left = 10;
  const right = 258;
  const axisX = 266;
  const candleGap = 10;
  const maxVisible = Math.max(1, Math.floor((right - left) / candleGap) + 1);
  const visibleCandles = candles.slice(-maxVisible);
  const values = visibleCandles.flatMap((candle) => [candle.high, candle.low]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const padding = Math.max(1, Math.abs(max - min) * 0.12);
  const scaleMin = min - padding;
  const scaleMax = max + padding;
  const span = scaleMax - scaleMin || 1;
  const plotWidth = right - left;
  const candleBodyWidth = 5;
  const yFor = (value: number) => bottom - ((value - scaleMin) / span) * (bottom - top);
  const lastClose = visibleCandles[visibleCandles.length - 1]?.close ?? 0;
  const activeCandle = visibleCandles.find((candle) => candle.id === activeCandleId) ?? null;
  const activeIndex = activeCandle ? visibleCandles.findIndex((candle) => candle.id === activeCandle.id) : -1;
  const activeX = activeIndex >= 0 ? left + activeIndex * candleGap : left;
  const tooltipX = Math.max(8, Math.min(width - 124, activeX + 8));
  const tooltipY = activeCandle ? Math.max(8, Math.min(height - 54, yFor(activeCandle.high) - 48)) : 8;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-[128px] w-full overflow-visible rounded-md bg-black" onMouseLeave={() => setActiveCandleId(null)}>
      <defs>
        <linearGradient id="portfolioChartGlow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#07120e" />
          <stop offset="100%" stopColor="#020403" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#portfolioChartGlow)" />
      {[0, 1, 2, 3].map((line) => {
        const y = top + line * ((bottom - top) / 3);
        return <line key={`h-${line}`} x1="0" x2={width} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      {[0, 1, 2, 3, 4].map((line) => {
        const x = left + line * (plotWidth / 4);
        return <line key={`v-${line}`} x1={x} x2={x} y1="0" y2={height} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
      })}
      {visibleCandles.length === 0 ? (
        <text x={width / 2} y={height / 2} fill="rgba(255,255,255,0.35)" fontSize="9" textAnchor="middle">
          No data
        </text>
      ) : null}
      {visibleCandles.length ? (
        <>
          <text x={axisX} y={yFor(scaleMax) + 4} fill="rgba(255,255,255,0.45)" fontSize="8">
            {scaleMax.toFixed(0)}
          </text>
          <text x={axisX} y={yFor((scaleMax + scaleMin) / 2) + 3} fill="rgba(255,255,255,0.38)" fontSize="8">
            {((scaleMax + scaleMin) / 2).toFixed(0)}
          </text>
          <text x={axisX} y={yFor(scaleMin)} fill="rgba(255,255,255,0.45)" fontSize="8">
            {scaleMin.toFixed(0)}
          </text>
        </>
      ) : null}
      {visibleCandles.map((candle, index) => {
        const x = left + index * candleGap;
        const openY = yFor(candle.open);
        const closeY = yFor(candle.close);
        const highY = yFor(candle.high);
        const lowY = yFor(candle.low);
        const isUp = candle.side === "profit" || candle.close >= candle.open;
        const color = isUp ? "#22c98f" : "#ff5c66";
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(3, Math.abs(closeY - openY));

        return (
          <g
            key={candle.id}
            className="cursor-pointer"
            onClick={() => setActiveCandleId((current) => (current === candle.id ? null : candle.id))}
            onMouseEnter={() => setActiveCandleId(candle.id)}
          >
            <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth="1.4" strokeLinecap="round" />
            <rect
              x={x - candleBodyWidth / 2}
              y={bodyTop}
              width={candleBodyWidth}
              height={bodyHeight}
              rx="1"
              fill={color}
              opacity="0.95"
            />
            <rect x={x - 5} y={top} width="10" height={bottom - top} fill="transparent" />
          </g>
        );
      })}
      {visibleCandles.length ? (
        <>
          <line x1="0" x2={right} y1={yFor(lastClose)} y2={yFor(lastClose)} stroke="#20e0a0" strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />
          <rect x={right + 2} y={yFor(lastClose) - 6} width="38" height="12" rx="2" fill="#20e0a0" />
          <text x={right + 5} y={yFor(lastClose) + 3} fill="#03110c" fontSize="8" fontWeight="700">
            {lastClose.toFixed(0)}
          </text>
        </>
      ) : null}
      {activeCandle ? (
        <g>
          <rect x={tooltipX} y={tooltipY} width="116" height="46" rx="5" fill="#10161d" stroke="rgba(255,255,255,0.16)" />
          <text x={tooltipX + 7} y={tooltipY + 13} fill={activeCandle.side === "profit" ? "#22c98f" : "#ff5c66"} fontSize="8" fontWeight="700">
            {activeCandle.side === "profit" ? profitLabel : lossLabel}
          </text>
          <text x={tooltipX + 7} y={tooltipY + 27} fill="rgba(255,255,255,0.82)" fontSize="8">
            {formatMoney(activeCandle.amount, activeCandle.currency)}
          </text>
          <text x={tooltipX + 7} y={tooltipY + 39} fill="rgba(255,255,255,0.55)" fontSize="8">
            USD {formatMoney(activeCandle.close, "USD")}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function PortfolioSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("cash");
  const [currency, setCurrency] = useState<PortfolioCurrency>(() => getStoredPortfolioCurrency());
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
          currency: "\u0412\u0430\u043b\u044e\u0442\u0430",
          name: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435",
          quantity: "\u041a\u043e\u043b-\u0432\u043e",
          price: "\u0426\u0435\u043d\u0430",
          addFamily: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0441\u0435\u043c\u044c\u044e",
          profit: "\u041f\u0440\u0438\u0431\u044b\u043b\u044c",
          loss: "\u0423\u0431\u044b\u0442\u043e\u043a",
          value: "\u041e\u0431\u0449\u0435\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 USD",
          assets: "\u0410\u043a\u0442\u0438\u0432\u043e\u0432",
          allocation: "\u0420\u0430\u0441\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435",
          chart: "\u0413\u0440\u0430\u0444\u0438\u043a \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u044f USD",
          history: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f",
          empty: "\u0414\u043e\u0431\u0430\u0432\u044c \u043f\u0435\u0440\u0432\u044b\u0439 \u0430\u043a\u0442\u0438\u0432.",
          addError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432. \u041f\u0440\u043e\u0432\u0435\u0440\u044c \u043a\u043e\u043b-\u0432\u043e \u0438 \u0446\u0435\u043d\u0443.",
          records: "\u0417\u0430\u043f\u0438\u0441\u0438",
          allRecords: "\u0412\u0441\u0435 \u0437\u0430\u043f\u0438\u0441\u0438, \u0432\u043b\u0438\u044f\u044e\u0449\u0438\u0435 \u043d\u0430 USD",
          update: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c",
          delete: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c",
          real_estate: "\u041d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u044c",
          cash: "\u041d\u0430\u043b\u0438\u0447\u043d\u044b\u0435",
          card: "\u041d\u0430 \u043a\u0430\u0440\u0442\u0435",
          transport: "\u0422\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442",
          children: "\u0421\u0435\u043c\u044c\u044f",
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
          currency: "Currency",
          name: "Name",
          quantity: "Qty",
          price: "Price",
          addFamily: "Add family",
          profit: "Profit",
          loss: "Loss",
          value: "Net worth USD",
          assets: "Assets",
          allocation: "Allocation",
          chart: "Net worth chart USD",
          history: "History",
          empty: "Add your first asset.",
          addError: "Could not add asset. Check quantity and price.",
          records: "Records",
          allRecords: "All records affecting USD",
          update: "Update",
          delete: "Delete",
          real_estate: "Real estate",
          cash: "Cash",
          card: "Card",
          transport: "Transport",
          children: "Family",
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

  useEffect(() => {
    window.localStorage.setItem(portfolioCurrencyStorageKey, currency);
    window.localStorage.setItem(portfolioCurrencyVersionKey, "true");
  }, [currency]);

  const portfolioQuery = useQuery<PortfolioResponse>({
    queryKey: ["/api/portfolio"],
    enabled: isAuthenticated,
  });
  const portfolio = portfolioQuery.data ?? emptyPortfolio;

  const totals = useMemo(() => {
    const value = portfolio.assets.reduce((sum, asset) => sum + asset.quantity * asset.currentPrice, 0);
    return { value, count: portfolio.assets.length };
  }, [portfolio.assets]);

  const rawQuantityNumber = parseAmountInput(quantity);
  const quantityNumber = rawQuantityNumber > 0 ? rawQuantityNumber : 1;
  const priceNumber = parseAmountInput(price);

  const addAssetMutation = useMutation({
    mutationFn: async (direction: "profit" | "loss") => {
      const amount = quantityNumber > 1 ? quantityNumber * priceNumber : priceNumber;
      const response = await apiRequest("POST", "/api/portfolio/movements", {
        direction,
        amount,
        currency,
      });
      return response.json() as Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }>;
    },
    onSuccess: (result) => {
      setName("");
      setQuantity("");
      setPrice("");
      queryClient.setQueryData<PortfolioResponse>(["/api/portfolio"], (current) => ({
        assets: result.assets,
        transactions: [...(current?.transactions ?? []), result.transaction],
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });

  const addFamilyAssetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/portfolio/assets", {
        symbol: typeLabels.children,
        name: name || typeLabels.children,
        type: "children",
        quantity: 1,
        entryPrice: 0,
        currentPrice: 0,
      });
      return response.json() as Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }>;
    },
    onSuccess: (result) => {
      setName("");
      setQuantity("");
      setPrice("");
      queryClient.setQueryData<PortfolioResponse>(["/api/portfolio"], (current) => ({
        assets: result.assets,
        transactions: [...(current?.transactions ?? []), result.transaction],
      }));
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

  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId: string) => {
      const response = await apiRequest("DELETE", `/api/portfolio/movements/${movementId}`, {});
      return response.json() as Promise<PortfolioResponse>;
    },
    onSuccess: (portfolioResult) => {
      queryClient.setQueryData<PortfolioResponse>(["/api/portfolio"], portfolioResult);
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });

  const canAdd = priceNumber > 0 && isAuthenticated;
  const canAddFamilyWithoutPrice = type === "children" && isAuthenticated && !(priceNumber > 0);
  const allPortfolioMovements = useMemo(
    () => portfolio.transactions.filter((transaction) => getMovementCurrency(transaction.symbol) && (transaction.side === "profit" || transaction.side === "loss")),
    [portfolio.transactions],
  );
  const candles = useMemo(() => buildPortfolioUsdCandles(allPortfolioMovements), [allPortfolioMovements]);
  const displayedTotalUsd = useMemo(() => {
    const latestByCurrency = new Map<PortfolioCurrency, number>();
    for (const transaction of allPortfolioMovements) {
      const movementCurrency = getMovementCurrency(transaction.symbol);
      if (!movementCurrency) continue;
      latestByCurrency.set(movementCurrency, transaction.portfolioValue);
    }
    return Array.from(latestByCurrency.entries()).reduce(
      (sum, [movementCurrency, value]) => sum + convertToUsd(value, movementCurrency),
      0,
    );
  }, [allPortfolioMovements]);
  const currencyBalances = useMemo(() => {
    const latestByCurrency = new Map<PortfolioCurrency, number>();
    for (const transaction of allPortfolioMovements) {
      const movementCurrency = getMovementCurrency(transaction.symbol);
      if (!movementCurrency) continue;
      latestByCurrency.set(movementCurrency, transaction.portfolioValue);
    }
    return portfolioCurrencies
      .map((movementCurrency) => ({
        currency: movementCurrency,
        value: latestByCurrency.get(movementCurrency) ?? 0,
      }))
      .filter((entry) => entry.value !== 0);
  }, [allPortfolioMovements]);

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
          <p className="mt-1 text-lg font-semibold leading-none text-white">{formatMoney(displayedTotalUsd, "USD")}</p>
          {currencyBalances.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {currencyBalances.map((entry) => (
                <span key={entry.currency} className="rounded border border-white/10 bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
                  {entry.currency} {formatMoney(entry.value, entry.currency)}
                </span>
              ))}
            </div>
          ) : null}
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
        <Select value={currency} onValueChange={(nextCurrency) => setCurrency(nextCurrency as PortfolioCurrency)}>
          <SelectTrigger className="h-8 border-white/10 bg-black/40 text-xs text-white">
            <SelectValue placeholder={t.currency} />
          </SelectTrigger>
          <SelectContent>
            {portfolioCurrencies.map((portfolioCurrency) => (
              <SelectItem key={portfolioCurrency} value={portfolioCurrency}>
                {portfolioCurrency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.name} className="h-8 border-white/10 bg-black/40 text-xs text-white" />
        <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" placeholder={t.quantity} className="h-8 border-white/10 bg-black/40 text-xs text-white" />
        <Input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder={`${t.price} ${currency}`} className="h-8 border-white/10 bg-black/40 text-xs text-white" />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          disabled={!canAdd || addAssetMutation.isPending}
          onClick={() => addAssetMutation.mutate("profit")}
          className="h-8 bg-emerald-400 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
        >
          <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
          {t.profit}
        </Button>
        <Button
          type="button"
          disabled={!canAdd || addAssetMutation.isPending}
          onClick={() => addAssetMutation.mutate("loss")}
          className="h-8 bg-red-400 text-xs font-semibold text-white hover:bg-red-300 hover:text-slate-950"
        >
          <TrendingDown className="mr-1.5 h-3.5 w-3.5" />
          {t.loss}
        </Button>
      </div>
      {canAddFamilyWithoutPrice ? (
        <Button
          type="button"
          disabled={addFamilyAssetMutation.isPending}
          onClick={() => addFamilyAssetMutation.mutate()}
          className="mt-2 h-8 w-full bg-cyan-300 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
        >
          {t.addFamily}
        </Button>
      ) : null}
      {addAssetMutation.isError ? <p className="mt-2 text-xs leading-relaxed text-red-200">{t.addError}</p> : null}

      <div className="mt-3 rounded-md border border-emerald-400/15 bg-black p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-white/45">{t.chart}</p>
          <span className="text-[10px] text-white/35">{allPortfolioMovements.length}</span>
        </div>
        <PortfolioCandlestickChart candles={candles} profitLabel={t.profit} lossLabel={t.loss} />
        {allPortfolioMovements.length ? (
          <div className="mt-2 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-white/40">{t.allRecords}</p>
            {allPortfolioMovements.slice(-8).reverse().map((transaction) => {
              const isProfit = transaction.side === "profit";
              const movementCurrency = getMovementCurrency(transaction.symbol) ?? currency;
              return (
                <div key={transaction.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded border border-white/10 bg-white/[0.025] px-2 py-1.5">
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${isProfit ? "text-emerald-300" : "text-red-300"}`}>
                      {isProfit ? t.profit : t.loss} {formatMoney(Math.abs(transaction.price), movementCurrency)}
                    </p>
                    <p className="truncate text-[10px] text-white/38">
                      {movementCurrency} {formatMoney(transaction.portfolioValue, movementCurrency)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-red-300/25 bg-red-400/10 text-red-200 hover:bg-red-400/20"
                    onClick={() => deleteMovementMutation.mutate(transaction.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">{t.delete}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
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
                    {formatNumber(asset.quantity)} x {formatMoney(asset.currentPrice, currency)}
                  </p>
                </div>
                <p className="text-right text-sm font-semibold text-white">{formatMoney(value, currency)}</p>
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
