import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/lib/i18n";

interface DailyBalanceProps {
  values: {
    mental: number;
    physical: number;
    moral: number;
    financial: number;
  };
}

const COLORS = {
  mental: "#9F7AEA",
  physical: "#4FC3F7",
  moral: "#F6C453",
  financial: "#36C98B",
} as const;

export default function DailyBalance({ values }: DailyBalanceProps) {
  const { language } = useLanguage();

  const copy =
    language === "ru"
      ? {
          title: "Баланс дня",
          empty: "Нет данных",
          dominance: "Доминирует",
          mental: "Ментальное",
          physical: "Физическое",
          moral: "Душевное",
          financial: "Финансовое",
        }
      : {
          title: "Daily balance",
          empty: "No data",
          dominance: "Dominant",
          mental: "Mental",
          physical: "Physical",
          moral: "Spiritual",
          financial: "Financial",
        };

  const chartData = useMemo(() => {
    const items = [
      { key: "mental", label: copy.mental, value: values.mental, color: COLORS.mental },
      { key: "physical", label: copy.physical, value: values.physical, color: COLORS.physical },
      { key: "moral", label: copy.moral, value: values.moral, color: COLORS.moral },
      { key: "financial", label: copy.financial, value: values.financial, color: COLORS.financial },
    ] as const;

    const withMagnitude = items.map((item) => ({
      ...item,
      magnitude: Math.abs(item.value),
    }));

    const nonZero = withMagnitude.filter((item) => item.magnitude > 0);
    const dataset = nonZero.length > 0 ? nonZero : withMagnitude.map((item) => ({ ...item, magnitude: 1 }));
    const dominant = [...withMagnitude].sort((a, b) => b.magnitude - a.magnitude)[0];
    const total = withMagnitude.reduce((sum, item) => sum + item.value, 0);

    return {
      dataset,
      dominant,
      total,
      isEmpty: nonZero.length === 0,
      rows: withMagnitude,
    };
  }, [copy.financial, copy.mental, copy.moral, copy.physical, values.financial, values.mental, values.moral, values.physical]);

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4" data-testid="daily-balance-chart">
      <div className="mb-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.title}</div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.dataset}
                dataKey="magnitude"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
              >
                {chartData.dataset.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} fillOpacity={chartData.isEmpty ? 0.28 : 1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, payload) => {
                  const item = payload?.payload as { value: number } | undefined;
                  const realValue = item?.value ?? 0;
                  return [`${realValue > 0 ? "+" : ""}${realValue.toFixed(1)}`, ""];
                }}
                contentStyle={{
                  background: "rgba(20,23,30,0.96)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-xl font-bold font-mono ${chartData.total >= 0 ? "text-positive" : "text-negative"}`}>
                {chartData.total >= 0 ? "+" : ""}{chartData.total.toFixed(1)}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{copy.title}</div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2 text-center">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{copy.dominance}</div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {chartData.isEmpty ? copy.empty : chartData.dominant.label}
            </div>
          </div>

          <div className="space-y-2">
            {chartData.rows.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-foreground">{item.label}</span>
                </div>
                <span className="font-mono" style={{ color: item.color }}>
                  {item.value > 0 ? "+" : ""}{item.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
