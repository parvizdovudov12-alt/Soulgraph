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

  // Initial state data for last 30 days
  const [stateData, setStateData] = useState<StateData[]>(() => {
    const now = Math.floor(Date.now() / 1000);
    const data: StateData[] = [];
    
    for (let i = 30; i >= 0; i--) {
      const time = now - i * 24 * 60 * 60;
      data.push({
        time: time as any, // lightweight-charts Time type
        mental: 50 + Math.sin(i / 5) * 10 + Math.random() * 3,
        physical: 55 + Math.cos(i / 4) * 8 + Math.random() * 3,
        moral: 48 + Math.sin(i / 6) * 12 + Math.random() * 3,
        financial: 52 + Math.cos(i / 7) * 9 + Math.random() * 3,
      });
    }
    return data;
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

  const handleToggleState = (state: 'mental' | 'physical' | 'moral' | 'financial') => {
    setVisibleStates({ ...visibleStates, [state]: !visibleStates[state] });
  };

  const handleAddNews = (data: {
    text: string;
    time: number;
    impact: { mental: number; physical: number; moral: number; financial: number };
    media?: { type: 'image' | 'video'; url: string }[];
  }) => {
    // Save to server
    createNewsEventMutation.mutate(data);

    // Update state data - add impact to current values
    setStateData((prev) => {
      const newData = [...prev];
      const lastPoint = newData[newData.length - 1];
      
      newData.push({
        time: data.time as any,
        mental: Math.max(0, Math.min(100, lastPoint.mental + data.impact.mental)),
        physical: Math.max(0, Math.min(100, lastPoint.physical + data.impact.physical)),
        moral: Math.max(0, Math.min(100, lastPoint.moral + data.impact.moral)),
        financial: Math.max(0, Math.min(100, lastPoint.financial + data.impact.financial)),
      });

      return newData;
    });
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
