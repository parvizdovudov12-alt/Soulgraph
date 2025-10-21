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
      setStateData((prev) => {
        // Get initial baseline point (first point)
        const baseline = prev[0] || { time: Math.floor(Date.now() / 1000) as any, mental: 0, physical: 0, moral: 0, financial: 0 };
        
        // Sort events by time
        const sortedEvents = [...newsEvents].sort((a, b) => (a.time as number) - (b.time as number));
        
        // Build new data array starting from baseline
        const newData: StateData[] = [baseline];
        
        sortedEvents.forEach((event) => {
          const lastPoint = newData[newData.length - 1];
          newData.push({
            time: event.time,
            mental: Math.max(0, Math.min(100, lastPoint.mental + event.impact.mental)),
            physical: Math.max(0, Math.min(100, lastPoint.physical + event.impact.physical)),
            moral: Math.max(0, Math.min(100, lastPoint.moral + event.impact.moral)),
            financial: Math.max(0, Math.min(100, lastPoint.financial + event.impact.financial)),
          });
        });
        
        // Sort entire array by time and deduplicate (keep last value for each timestamp)
        const sortedData = newData.sort((a, b) => (a.time as number) - (b.time as number));
        const deduplicated = sortedData.reduce<StateData[]>((acc, point) => {
          const lastInAcc = acc[acc.length - 1];
          if (!lastInAcc || (lastInAcc.time as number) !== (point.time as number)) {
            acc.push(point);
          } else {
            // Replace with newer data if timestamp is duplicate
            acc[acc.length - 1] = point;
          }
          return acc;
        }, []);
        
        return deduplicated;
      });
    }
  }, [newsEvents.length]); // Only re-run when number of events changes

  const [visibleStates, setVisibleStates] = useState({
    mental: true,
    physical: true,
    moral: true,
    financial: true,
  });

  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsModalType, setNewsModalType] = useState<'positive' | 'negative'>('positive');
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');

  // Fixed weights (equal for all states)
  const weights = {
    mental: 0.25,
    physical: 0.25,
    moral: 0.25,
    financial: 0.25,
  };

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

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Activity className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Soulgraph</h1>
            <p className="text-xs text-muted-foreground">Трекер жизни</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground font-medium">
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
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 p-4">
          <LifeChart
            data={stateData}
            visibleStates={visibleStates}
            weights={weights}
            news={newsEvents}
            chartType={chartType}
            tokenName={tokenName}
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
          onClearAllEvents={handleClearAllEvents}
          chartType={chartType}
          onChartTypeChange={setChartType}
          tokenName={tokenName}
          onTokenNameUpdate={setTokenName}
          isAuthenticated={isAuthenticated}
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
