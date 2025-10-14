import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { NewsEvent } from './LifeChart';

interface DailyBalanceProps {
  news: NewsEvent[];
}

interface StateData {
  name: string;
  value: number; // Absolute value for chart visualization
  actualValue: number; // Real value with sign
  color: string;
  label: string;
}

export default function DailyBalance({ news }: DailyBalanceProps) {
  const dailyData = useMemo(() => {
    // Get current time and 24 hours ago
    const now = Date.now() / 1000; // Convert to seconds
    const oneDayAgo = now - (24 * 60 * 60);

    // Filter news from last 24 hours
    const recentNews = (news || []).filter(event => {
      const eventTime = typeof event.time === 'number' ? event.time : parseInt(event.time as string);
      return eventTime >= oneDayAgo;
    });

    // Calculate totals for each state (with sign preserved)
    const totals = {
      mental: 0,
      physical: 0,
      moral: 0,
      financial: 0,
    };

    recentNews.forEach(event => {
      totals.mental += event.impact.mental;
      totals.physical += event.impact.physical;
      totals.moral += event.impact.moral;
      totals.financial += event.impact.financial;
    });

    // Prepare data for pie chart - use absolute values for visualization only
    const allStates: StateData[] = [
      {
        name: 'mental',
        value: Math.abs(totals.mental),
        actualValue: totals.mental,
        color: 'hsl(280, 65%, 65%)', // Purple
        label: 'Душевное',
      },
      {
        name: 'physical',
        value: Math.abs(totals.physical),
        actualValue: totals.physical,
        color: 'hsl(200, 85%, 55%)', // Cyan
        label: 'Физическое',
      },
      {
        name: 'moral',
        value: Math.abs(totals.moral),
        actualValue: totals.moral,
        color: 'hsl(45, 90%, 60%)', // Amber
        label: 'Моральное',
      },
      {
        name: 'financial',
        value: Math.abs(totals.financial),
        actualValue: totals.financial,
        color: 'hsl(142, 76%, 36%)', // Green
        label: 'Финансовое',
      },
    ];
    
    const data: StateData[] = allStates.filter(item => item.value > 0);
    
    // If no data, create empty state visualization with colored segments
    const isEmpty = data.length === 0;
    const chartData = isEmpty ? [
      {
        name: 'mental',
        value: 0.25,
        actualValue: 0,
        color: 'hsl(280, 65%, 65%)', // Purple
        label: '',
      },
      {
        name: 'physical',
        value: 0.25,
        actualValue: 0,
        color: 'hsl(200, 85%, 55%)', // Cyan
        label: '',
      },
      {
        name: 'moral',
        value: 0.25,
        actualValue: 0,
        color: 'hsl(45, 90%, 60%)', // Amber
        label: '',
      },
      {
        name: 'financial',
        value: 0.25,
        actualValue: 0,
        color: 'hsl(142, 76%, 36%)', // Green
        label: '',
      },
    ] : data;

    return {
      data,
      chartData,
      isEmpty,
      totals,
      eventCount: recentNews.length,
    };
  }, [news]);

  // Calculate total balance (sum of all states with signs)
  const totalBalance = dailyData.data.reduce((sum, item) => sum + item.actualValue, 0);

  return (
    <div className="bg-card border border-card-border rounded-lg p-4" data-testid="daily-balance">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground mb-1">Баланс дня</h3>
        <p className="text-xs text-muted-foreground">
          {dailyData.eventCount} {dailyData.eventCount === 1 ? 'событие' : dailyData.eventCount < 5 ? 'события' : 'событий'} за 24 часа
        </p>
      </div>

      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dailyData.chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={dailyData.isEmpty ? 2 : 2}
              dataKey="value"
              label={dailyData.isEmpty ? false : (entry) => entry.label}
              labelLine={false}
              stroke="none"
              strokeWidth={0}
            >
              {dailyData.chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={dailyData.isEmpty ? entry.color : entry.color}
                  fillOpacity={dailyData.isEmpty ? 0.3 : 1}
                />
              ))}
            </Pie>
            {!dailyData.isEmpty && (
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as StateData;
                    const isPositive = data.actualValue >= 0;
                    return (
                      <div className="bg-card/95 backdrop-blur-sm border border-card-border rounded-lg px-3 py-2">
                        <p className="text-sm font-medium" style={{ color: data.color }}>
                          {data.label}
                        </p>
                        <p className={`text-xs font-mono ${isPositive ? 'text-positive' : 'text-negative'}`}>
                          Влияние: {isPositive ? '+' : ''}{data.actualValue.toFixed(0)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Center label with total or empty state message */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            {dailyData.isEmpty ? (
              <>
                <div className="text-xl font-bold text-muted-foreground">0</div>
                <div className="text-xs text-muted-foreground mt-1">Нет событий</div>
              </>
            ) : (
              <>
                <div className={`text-2xl font-bold font-mono ${totalBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {totalBalance >= 0 ? '+' : ''}{totalBalance.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Баланс дня</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* State breakdown - only show when there's data */}
      {!dailyData.isEmpty && (
        <div className="mt-4 space-y-2">
          {dailyData.data.map((item, index) => {
            const isPositive = item.actualValue >= 0;
            return (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
                data-testid={`balance-state-${item.name}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
                <span 
                  className={`font-mono ${isPositive ? 'text-positive' : 'text-negative'}`}
                >
                  {isPositive ? '+' : ''}{item.actualValue.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
