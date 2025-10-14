import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface NewsModalProps {
  open: boolean;
  onClose: () => void;
  type: 'positive' | 'negative';
  onSubmit: (data: {
    text: string;
    time: number;
    impact: {
      mental: number;
      physical: number;
      moral: number;
      financial: number;
    };
  }) => void;
}

export default function NewsModal({ open, onClose, type, onSubmit }: NewsModalProps) {
  const [text, setText] = useState('');
  const [impact, setImpact] = useState({
    mental: 0,
    physical: 0,
    moral: 0,
    financial: 0,
  });

  const handleSubmit = () => {
    if (!text.trim()) return;

    onSubmit({
      text,
      time: Date.now() / 1000,
      impact,
    });

    // Reset form
    setText('');
    setImpact({ mental: 0, physical: 0, moral: 0, financial: 0 });
    onClose();
  };

  const isPositive = type === 'positive';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-card-border" data-testid="modal-news">
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold ${isPositive ? 'text-positive' : 'text-negative'}`}>
            {isPositive ? 'Положительная новость' : 'Отрицательная новость'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="news-text" className="text-sm text-muted-foreground">
              Текст новости
            </Label>
            <Input
              id="news-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Что произошло?"
              className="bg-background border-border"
              data-testid="input-news-text"
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Влияние на состояния
            </p>

            {/* Mental */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-mental">Душевное</Label>
                <span className="text-sm font-mono text-mental">{impact.mental > 0 ? '+' : ''}{impact.mental}</span>
              </div>
              <Slider
                value={[impact.mental]}
                onValueChange={([value]) => setImpact({ ...impact, mental: value })}
                min={-20}
                max={20}
                step={1}
                className="[&_[role=slider]]:bg-mental"
                data-testid="slider-mental"
              />
            </div>

            {/* Physical */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-physical">Физическое</Label>
                <span className="text-sm font-mono text-physical">{impact.physical > 0 ? '+' : ''}{impact.physical}</span>
              </div>
              <Slider
                value={[impact.physical]}
                onValueChange={([value]) => setImpact({ ...impact, physical: value })}
                min={-20}
                max={20}
                step={1}
                className="[&_[role=slider]]:bg-physical"
                data-testid="slider-physical"
              />
            </div>

            {/* Moral */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-moral">Моральное</Label>
                <span className="text-sm font-mono text-moral">{impact.moral > 0 ? '+' : ''}{impact.moral}</span>
              </div>
              <Slider
                value={[impact.moral]}
                onValueChange={([value]) => setImpact({ ...impact, moral: value })}
                min={-20}
                max={20}
                step={1}
                className="[&_[role=slider]]:bg-moral"
                data-testid="slider-moral"
              />
            </div>

            {/* Financial */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-financial">Финансовое</Label>
                <span className="text-sm font-mono text-financial">{impact.financial > 0 ? '+' : ''}{impact.financial}</span>
              </div>
              <Slider
                value={[impact.financial]}
                onValueChange={([value]) => setImpact({ ...impact, financial: value })}
                min={-20}
                max={20}
                step={1}
                className="[&_[role=slider]]:bg-financial"
                data-testid="slider-financial"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={isPositive ? 'bg-positive hover:bg-positive/90' : 'bg-negative hover:bg-negative/90'}
              data-testid="button-submit-news"
            >
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
