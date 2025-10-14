import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';

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
    media?: {
      type: 'image' | 'video';
      url: string;
    }[];
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
  const [mediaFiles, setMediaFiles] = useState<{ type: 'image' | 'video'; url: string }[]>([]);

  const handleSubmit = () => {
    if (!text.trim()) return;

    onSubmit({
      text,
      time: Math.floor(Date.now() / 1000),
      impact,
      media: mediaFiles.length > 0 ? mediaFiles : undefined,
    });

    // Reset form
    setText('');
    setImpact({ mental: 0, physical: 0, moral: 0, financial: 0 });
    setMediaFiles([]);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds 10MB limit`);
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        console.warn(`File ${file.name} is not an image or video`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        setMediaFiles((prev) => [...prev, { type, url }]);
      };
      reader.onerror = () => {
        console.error(`Failed to read file ${file.name}`);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isPositive = type === 'positive';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-card-border" data-testid="modal-news">
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold ${isPositive ? 'text-positive' : 'text-negative'}`}>
            {isPositive ? 'Положительная новость' : 'Отрицательная новость'}
          </DialogTitle>
          <DialogDescription>
            Добавьте событие и укажите его влияние на каждое состояние
          </DialogDescription>
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

          {/* Media Upload */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Label className="text-sm text-muted-foreground">Медиа файлы (опционально)</Label>
            
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="media-upload"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-media-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('media-upload')?.click()}
                className="flex items-center gap-2"
                data-testid="button-upload-media"
              >
                <Upload className="w-4 h-4" />
                Загрузить фото/видео
              </Button>
            </div>

            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {mediaFiles.map((media, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden bg-background border border-border">
                    {media.type === 'image' ? (
                      <img src={media.url} alt={`Media ${index + 1}`} className="w-full h-24 object-cover" />
                    ) : (
                      <video src={media.url} className="w-full h-24 object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {media.type === 'image' ? <ImageIcon className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                    </div>
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-negative rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-remove-media-${index}`}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
