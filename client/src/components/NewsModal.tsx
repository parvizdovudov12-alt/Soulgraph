import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, X, Image as ImageIcon, Video } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface NewsModalProps {
  open: boolean;
  onClose: () => void;
  type: "positive" | "negative";
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
      type: "image" | "video";
      url: string;
    }[];
  }) => void;
}

const copy = {
  ru: {
    positiveTitle: "Положительное событие",
    negativeTitle: "Отрицательное событие",
    description: "Добавьте событие и укажите его влияние на каждое состояние",
    text: "Текст события",
    textPlaceholder: "Что произошло?",
    impactTitle: "Влияние на состояния",
    mental: "Ментальное",
    physical: "Физическое",
    moral: "Душевное",
    financial: "Финансовое",
    media: "Медиафайлы (опционально)",
    upload: "Загрузить фото/видео",
    cancel: "Отмена",
    add: "Добавить",
  },
  en: {
    positiveTitle: "Positive event",
    negativeTitle: "Negative event",
    description: "Add an event and specify how it affects each state",
    text: "Event text",
    textPlaceholder: "What happened?",
    impactTitle: "Impact on states",
    mental: "Mental",
    physical: "Physical",
    moral: "Spiritual",
    financial: "Financial",
    media: "Media files (optional)",
    upload: "Upload photo/video",
    cancel: "Cancel",
    add: "Add",
  },
} as const;

export default function NewsModal({ open, onClose, type, onSubmit }: NewsModalProps) {
  const { language } = useLanguage();
  const t = copy[language];
  const [text, setText] = useState("");
  const [impact, setImpact] = useState({ mental: 0, physical: 0, moral: 0, financial: 0 });
  const [mediaFiles, setMediaFiles] = useState<{ type: "image" | "video"; url: string }[]>([]);

  useEffect(() => {
    if (open) {
      setText("");
      setImpact({ mental: 0, physical: 0, moral: 0, financial: 0 });
      setMediaFiles([]);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({ text, time: Math.floor(Date.now() / 1000), impact, media: mediaFiles.length > 0 ? mediaFiles : undefined });
    setText("");
    setImpact({ mental: 0, physical: 0, moral: 0, financial: 0 });
    setMediaFiles([]);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) return;
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const mediaType = file.type.startsWith("image/") ? "image" : "video";
        setMediaFiles((prev) => [...prev, { type: mediaType, url }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  const isPositive = type === "positive";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[95vw] md:w-full bg-card border-card-border max-h-[90vh] overflow-y-auto" data-testid="modal-news">
        <DialogHeader>
          <DialogTitle className={`text-lg md:text-xl font-semibold ${isPositive ? "text-positive" : "text-negative"}`}>
            {isPositive ? t.positiveTitle : t.negativeTitle}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="news-text" className="text-xs md:text-sm text-muted-foreground">{t.text}</Label>
            <Input id="news-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.textPlaceholder} className="bg-background border-border text-sm md:text-base" data-testid="input-news-text" />
          </div>

          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.impactTitle}</p>
            {([
              ["mental", t.mental, "text-mental"],
              ["physical", t.physical, "text-physical"],
              ["moral", t.moral, "text-moral"],
              ["financial", t.financial, "text-financial"],
            ] as const).map(([key, label, colorClass]) => (
              <div key={key} className="space-y-1.5 md:space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={`text-xs md:text-sm ${colorClass}`}>{label}</Label>
                  <span className={`text-xs md:text-sm font-mono ${colorClass}`}>{impact[key] > 0 ? "+" : ""}{impact[key]}</span>
                </div>
                <Slider value={[impact[key]]} onValueChange={([value]) => setImpact({ ...impact, [key]: value })} min={-20} max={20} step={1} className={`[&_[role=slider]]:${key === "mental" ? "bg-mental" : key === "physical" ? "bg-physical" : key === "moral" ? "bg-moral" : "bg-financial"}`} data-testid={`slider-${key}`} />
              </div>
            ))}
          </div>

          <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t border-border">
            <Label className="text-xs md:text-sm text-muted-foreground">{t.media}</Label>
            <div className="flex items-center gap-2">
              <input type="file" id="media-upload" accept="image/*,video/*" multiple onChange={handleFileUpload} className="hidden" data-testid="input-media-upload" />
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("media-upload")?.click()} className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm min-h-[44px] md:h-auto" data-testid="button-upload-media">
                <Upload className="w-3 h-3 md:w-4 md:h-4" />
                {t.upload}
              </Button>
            </div>

            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                {mediaFiles.map((media, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden bg-background border border-border">
                    {media.type === "image" ? <img src={media.url} alt={`Media ${index + 1}`} className="w-full h-20 md:h-24 object-cover" /> : <video src={media.url} className="w-full h-20 md:h-24 object-cover" />}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {media.type === "image" ? <ImageIcon className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                    </div>
                    <button onClick={() => removeMedia(index)} className="absolute top-1 right-1 bg-negative rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-remove-media-${index}`}>
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 md:gap-3 justify-end pt-3 md:pt-4">
            <Button variant="outline" onClick={onClose} className="text-xs md:text-sm min-h-[44px] md:h-auto" data-testid="button-cancel">{t.cancel}</Button>
            <Button onClick={handleSubmit} disabled={!text.trim()} className={`${isPositive ? "bg-positive hover:bg-positive/90" : "bg-negative hover:bg-negative/90"} text-xs md:text-sm min-h-[44px] md:h-auto`} data-testid="button-submit-news">{t.add}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
