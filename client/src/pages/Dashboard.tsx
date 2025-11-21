import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import LifeChart, { StateData, NewsEvent } from '@/components/LifeChart';
import ControlPanel from '@/components/ControlPanel';
import NewsModal from '@/components/NewsModal';
import ConnectWallet from '@/components/ConnectWallet';
import { useAuth } from '@/hooks/useAuth';
import { Activity } from 'lucide-react';
import type { NewsEvent as DBNewsEvent, StateData as DBStateData } from '@shared/schema';
import { aggregateCandles, timeframeToDays, type Timeframe } from '@/lib/dateUtils';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [tokenName, setTokenName] = useState(user?.tokenName || 'SOUL');

  // Update token name when user changes
  useEffect(() => {
    if (user?.tokenName) {
      setTokenName(user.tokenName);
    }
  }, [user?.tokenName]);

  // Initial state data - start with one baseline point at zero
  const [stateData, setStateData] = useState<StateData[]>(() => {
    const now = Math.floor(Date.now() / 1000);
    return [{
      time: now as any,
      mental: 0,
      physical: 0,
      moral: 0,
      financial: 0,
    }];
  });

  // Load news events from server
  const { data: newsEventsData = [] } = useQuery<DBNewsEvent[]>({
    queryKey: ['/api/news-events'],
  });

  // Convert DB news events to frontend format
  const newsEvents = useMemo((): NewsEvent[] => {
    return newsEventsData.map(event => ({
      id: event.id,
      time: event.time as any,
      type: event.type as 'positive' | 'negative',
      text: event.text,
      impact: {
        mental: event.impactMental,
        physical: event.impactPhysical,
        moral: event.impactMoral,
        financial: event.impactFinancial,
      },
      media: event.media || undefined,
    }));
  }, [newsEventsData]);

  // Apply loaded events to state data
  useEffect(() => {
    if (newsEvents.length > 0) {
      // Sort events by time first
      const sortedEvents = [...newsEvents].sort((a, b) => (a.time as number) - (b.time as number));
      
      // Get initial baseline point - 1 second before first event
      const firstEventTime = sortedEvents[0].time as number;
      const baseline = { 
        time: (firstEventTime - 1) as any, 
        mental: 0, 
        physical: 0, 
        moral: 0, 
        financial: 0 
      };
      
      // Build new data array starting from baseline
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
    } else if (newsEvents.length === 0) {
      // Reset to baseline when no events
      const now = Math.floor(Date.now() / 1000);
      setStateData([{
        time: now as any,
        mental: 0,
        physical: 0,
        moral: 0,
        financial: 0,
      }]);
    }
  }, [newsEvents]); // Re-run when events change

  const [visibleStates, setVisibleStates] = useState({
    mental: false,
    physical: false,
    moral: false,
    financial: false,
  });

  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsModalType, setNewsModalType] = useState<'positive' | 'negative'>('positive');
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');

  // Fixed weights (equal for all states)
  const weights = {
    mental: 0.25,
    physical: 0.25,
    moral: 0.25,
    financial: 0.25,
  };

  // Aggregate data based on timeframe
  const aggregatedData = useMemo(() => {
    if (timeframe === '1D') {
      return stateData; // No aggregation for 1D view
    }

    if (stateData.length === 0) return stateData;

    const days = timeframeToDays(timeframe);
    
    // Convert StateData to format expected by aggregateCandles
    const dailyData = stateData.map(d => ({
      time: d.time as number,
      mental: d.mental,
      physical: d.physical,
      moral: d.moral,
      financial: d.financial,
    }));
    
    const candles = aggregateCandles(dailyData, days);

    // Convert aggregated candles back to StateData format for chart
    // Use dateEnd to align with closing values
    return candles.map(candle => ({
      time: candle.dateEnd as any,
      mental: candle.mental,
      physical: candle.physical,
      moral: candle.moral,
      financial: candle.financial,
    }));
  }, [stateData, timeframe]);

  // Aggregate news events by period
  const aggregatedNews = useMemo(() => {
    if (timeframe === '1D') {
      return newsEvents; // No aggregation for 1D view
    }

    if (newsEvents.length === 0) return newsEvents;

    const days = timeframeToDays(timeframe);
    
    // Sort events by time
    const sorted = [...newsEvents].sort((a, b) => (a.time as number) - (b.time as number));
    
    // Group events into periods
    const periods: NewsEvent[][] = [];
    let currentPeriod: NewsEvent[] = [];
    let periodStartTime = sorted[0].time as number;
    
    for (let i = 0; i < sorted.length; i++) {
      const event = sorted[i];
      const daysSinceStart = Math.floor(((event.time as number) - periodStartTime) / (24 * 60 * 60));
      
      if (daysSinceStart >= days) {
        if (currentPeriod.length > 0) {
          periods.push(currentPeriod);
        }
        currentPeriod = [event];
        periodStartTime = event.time as number;
      } else {
        currentPeriod.push(event);
      }
    }
    
    if (currentPeriod.length > 0) {
      periods.push(currentPeriod);
    }

    // Create summary event for each period
    const aggregated: NewsEvent[] = periods.map(events => {
      // Calculate total impact for the period
      const totalImpact = events.reduce(
        (acc, event) => ({
          mental: acc.mental + event.impact.mental,
          physical: acc.physical + event.impact.physical,
          moral: acc.moral + event.impact.moral,
          financial: acc.financial + event.impact.financial,
        }),
        { mental: 0, physical: 0, moral: 0, financial: 0 }
      );

      // Determine overall type based on total impact
      const totalValue = totalImpact.mental + totalImpact.physical + totalImpact.moral + totalImpact.financial;
      const type = totalValue >= 0 ? 'positive' : 'negative';

      // Create summary text
      const positiveCount = events.filter(e => e.type === 'positive').length;
      const negativeCount = events.filter(e => e.type === 'negative').length;
      const summaryText = `${events.length} событий (+${positiveCount} -${negativeCount})`;

      return {
        id: events[0].id, // Use first event's id for aggregated event
        time: events[0].time,
        type,
        text: summaryText,
        impact: totalImpact,
        groupedEvents: events,
      } as any;
    });

    return aggregated;
  }, [newsEvents, timeframe]);

  // Calculate total assets
  const totalAssets = useMemo(() => {
    if (stateData.length === 0) return 50;
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

  // Get current values for daily norm display
  const currentValues = useMemo(() => {
    if (stateData.length === 0) {
      return { mental: 50, physical: 50, moral: 50, financial: 50 };
    }
    const lastPoint = stateData[stateData.length - 1];
    return {
      mental: lastPoint.mental,
      physical: lastPoint.physical,
      moral: lastPoint.moral,
      financial: lastPoint.financial,
    };
  }, [stateData]);

  // Mutation for creating news events
  const createNewsEventMutation = useMutation({
    mutationFn: async (data: {
      text: string;
      time: number;
      impact: { mental: number; physical: number; moral: number; financial: number };
      media?: { type: 'image' | 'video'; url: string }[];
    }) => {
      return apiRequest('POST', '/api/news-events', {
        type: newsModalType,
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
      queryClient.invalidateQueries({ queryKey: ['/api/news-events'] });
    },
  });

  // Mutation for deleting a single event
  const deleteNewsEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest('DELETE', `/api/news-events/${eventId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-events'] });
    },
  });

  // Mutation for deleting all events
  const deleteAllEventsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/news-events', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-events'] });
      // Reset to baseline
      const now = Math.floor(Date.now() / 1000);
      setStateData([{
        time: now as any,
        mental: 0,
        physical: 0,
        moral: 0,
        financial: 0,
      }]);
    },
  });

  const handleToggleState = (state: 'mental' | 'physical' | 'moral' | 'financial') => {
    setVisibleStates({ ...visibleStates, [state]: !visibleStates[state] });
  };

  const handleAddNews = (data: {
    text: string;
    time: number;
    impact: { mental: number; physical: number; moral: number; financial: number };
    media?: { type: 'image' | 'video'; url: string }[];
  }) => {
    // Save to server - the useEffect will handle updating the chart
    createNewsEventMutation.mutate(data);
  };

  const handleClearAllEvents = () => {
    deleteAllEventsMutation.mutate();
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteNewsEventMutation.mutate(eventId);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">Soulgraph</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Трекер жизни</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-xs md:text-sm text-muted-foreground font-medium hidden lg:block">
            {new Date().toLocaleDateString('ru-RU', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 p-2 md:p-4 min-h-0">
          <LifeChart
            data={aggregatedData}
            visibleStates={visibleStates}
            weights={weights}
            news={aggregatedNews}
            chartType={chartType}
            tokenName={tokenName}
            timeframe={timeframe}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>

        {/* Control Panel */}
        <ControlPanel
          totalAssets={totalAssets}
          visibleStates={visibleStates}
          currentValues={currentValues}
          news={newsEvents}
          onToggleState={handleToggleState}
          onAddPositiveNews={() => {
            setNewsModalType('positive');
            setNewsModalOpen(true);
          }}
          onAddNegativeNews={() => {
            setNewsModalType('negative');
            setNewsModalOpen(true);
          }}
          chartType={chartType}
          onChartTypeChange={setChartType}
          tokenName={tokenName}
          onTokenNameUpdate={setTokenName}
          isAuthenticated={isAuthenticated}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
      </div>

      {/* News Modal */}
      <NewsModal
        open={newsModalOpen}
        onClose={() => setNewsModalOpen(false)}
        type={newsModalType}
        onSubmit={handleAddNews}
      />
    </div>
  );
}
