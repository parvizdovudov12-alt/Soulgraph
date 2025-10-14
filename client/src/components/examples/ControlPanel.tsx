import { useState } from 'react';
import ControlPanel from '../ControlPanel';

export default function ControlPanelExample() {
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

  const handleToggleState = (state: 'mental' | 'physical' | 'moral' | 'financial') => {
    setVisibleStates({ ...visibleStates, [state]: !visibleStates[state] });
    console.log(`Toggled ${state}`);
  };

  const handleWeightChange = (state: 'mental' | 'physical' | 'moral' | 'financial', value: number) => {
    setWeights({ ...weights, [state]: value });
    console.log(`Weight ${state} changed to ${value}`);
  };

  return (
    <div className="h-screen bg-background">
      <ControlPanel
        aggregateIndex={65.3}
        visibleStates={visibleStates}
        weights={weights}
        onToggleState={handleToggleState}
        onWeightChange={handleWeightChange}
        onAddPositiveNews={() => console.log('Add positive news')}
        onAddNegativeNews={() => console.log('Add negative news')}
      />
    </div>
  );
}
