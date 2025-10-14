import { useState } from 'react';
import NewsModal from '../NewsModal';
import { Button } from '@/components/ui/button';

export default function NewsModalExample() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'positive' | 'negative'>('positive');

  return (
    <div className="p-8 space-y-4 bg-background">
      <div className="flex gap-4">
        <Button 
          onClick={() => { setType('positive'); setOpen(true); }}
          className="bg-positive hover:bg-positive/90"
        >
          Открыть позитивную новость
        </Button>
        <Button 
          onClick={() => { setType('negative'); setOpen(true); }}
          className="bg-negative hover:bg-negative/90"
        >
          Открыть негативную новость
        </Button>
      </div>

      <NewsModal
        open={open}
        onClose={() => setOpen(false)}
        type={type}
        onSubmit={(data) => {
          console.log('News submitted:', data);
          setOpen(false);
        }}
      />
    </div>
  );
}
