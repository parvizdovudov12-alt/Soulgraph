import { useState, useMemo } from 'react';
import LifeChart, { StateData, NewsEvent } from '@/components/LifeChart';
import ControlPanel from '@/components/ControlPanel';
import NewsModal from '@/components/NewsModal';
import { BarChart3 } from 'lucide-react';

export default function Dashboard() {
  // Initial state data for last 30 days
  const [stateData, setStateData] = useState<StateData[]>(() => {
    const now = Date.now() / 1000;
    const data: StateData[] = [];
    
    for (let i = 30; i >= 0; i--) {
      const time = (now - i * 24 * 60 * 60) as any;
      data.push({
        time,
        mental: 50 + Math.sin(i / 5) * 10 + Math.random() * 3,
        physical: 55 + Math.cos(i / 4) * 8 + Math.random() * 3,
        moral: 48 + Math.sin(i / 6) * 12 + Math.random() * 3,
        financial: 52 + Math.cos(i / 7) * 9 + Math.random() * 3,
      });
    }
    return data;
  });

  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [visibleStates, setVisibleStates] = useState({
    mental: true,
    physical: true,
    moral: true,
    financial: true,
  });
  const [weights, setWeights] = useState({
    mental: 0.25,
    physical: 0.25,
    moral: 0.25,
    financial: 0.25,
  });

  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [newsModalType, setNewsModalType] = useState<'positive' | 'negative'>('positive');

  // Calculate aggregate index
  const aggregateIndex = useMemo(() => {
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
  }, [stateData, weights]);

  const handleToggleState = (state: 'mental' | 'physical' | 'moral' | 'financial') => {
    setVisibleStates({ ...visibleStates, [state]: !visibleStates[state] });
  };

  const handleWeightChange = (state: 'mental' | 'physical' | 'moral' | 'financial', value: number) => {
    setWeights({ ...weights, [state]: value });
  };

  const handleAddNews = (data: {
    text: string;
    time: number;
    impact: { mental: number; physical: number; moral: number; financial: number };
  }) => {
    // Add news event
    const newsEvent: NewsEvent = {
      time: data.time as any,
      type: newsModalType,
      text: data.text,
      impact: data.impact,
    };
    setNewsEvents([...newsEvents, newsEvent]);

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
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Soulgraph</h1>
            <p className="text-xs text-muted-foreground">Трекер жизни</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('ru-RU', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
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
          />
        </div>

        {/* Control Panel */}
        <ControlPanel
          aggregateIndex={aggregateIndex}
          visibleStates={visibleStates}
          weights={weights}
          onToggleState={handleToggleState}
          onWeightChange={handleWeightChange}
          onAddPositiveNews={() => {
            setNewsModalType('positive');
            setNewsModalOpen(true);
          }}
          onAddNegativeNews={() => {
            setNewsModalType('negative');
            setNewsModalOpen(true);
          }}
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
