import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Calendar, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { NewsEvent } from "./LifeChart";
import { formatMoscowDateTime, formatMoscowTime } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NewsPopupProps {
  events: NewsEvent[];
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onDeleteAll?: () => void;
  isDeleting?: boolean;
  position: { x: number; y: number };
}

const impactLabels = {
  ru: {
    mental: "Ментальное",
    physical: "Физическое",
    moral: "Душевное",
    financial: "Финансовое",
  },
  en: {
    mental: "Mental",
    physical: "Physical",
    moral: "Spiritual",
    financial: "Financial",
  },
} as const;

const impactColors = {
  mental: "#B388FF",
  physical: "#2EC5FF",
  moral: "#F7C948",
  financial: "#00C076",
} as const;

export default function NewsPopup({
  events,
  onClose,
  onDelete,
  onDeleteAll,
  isDeleting = false,
  position,
}: NewsPopupProps) {
  const { language } = useLanguage();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [popupPosition, setPopupPosition] = useState(position);
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    setPopupPosition(position);
  }, [position.x, position.y]);

  if (!events || events.length === 0) return null;

  const labels = impactLabels[language];
  const popupWidth = Math.min(384, Math.max(320, window.innerWidth - 24));
  const popupHeight = Math.min(512, window.innerHeight - 24);
  const clampX = (value: number) => Math.max(12, Math.min(value, window.innerWidth - popupWidth - 12));
  const clampY = (value: number) => Math.max(12, Math.min(value, window.innerHeight - popupHeight - 12));

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    setPopupPosition({
      x: clampX(event.clientX - dragState.offsetX),
      y: clampY(event.clientY - dragState.offsetY),
    });
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleDeleteAll = () => {
    if (onDeleteAll) {
      onDeleteAll();
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div
        className="fixed z-50 max-h-[32rem] overflow-auto rounded-[24px] border shadow-2xl"
        style={{
          left: `${clampX(popupPosition.x)}px`,
          top: `${clampY(popupPosition.y)}px`,
          width: `${popupWidth}px`,
          backgroundColor: "rgba(20, 23, 30, 0.98)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        }}
        data-testid="popup-news"
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div
          className="sticky top-0 z-10 flex cursor-move touch-none select-none items-center justify-between border-b px-4 py-3 backdrop-blur-xl"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(20, 23, 30, 0.96)" }}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button")) return;

            const popupRect = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!popupRect) return;

            dragStateRef.current = {
              pointerId: event.pointerId,
              offsetX: event.clientX - popupRect.left,
              offsetY: event.clientY - popupRect.top,
            };
            event.currentTarget.parentElement?.setPointerCapture(event.pointerId);
          }}
          data-testid="popup-news-drag-handle"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#F7A600]" />
            <h3 className="font-semibold text-white">{language === "ru" ? "События дня" : "Day events"}</h3>
            <span className="text-xs text-[#8D94A5]">({events.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {onDeleteAll && events.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[#F6465D] hover:text-[#F6465D]"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                data-testid="button-delete-all-events"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {isDeleting ? (language === "ru" ? "Удаление..." : "Deleting...") : language === "ru" ? "Удалить день" : "Delete day"}
              </Button>
            )}
            <button
              onClick={onClose}
              className="text-[#8D94A5] transition-colors hover:text-white"
              data-testid="button-close-popup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-xs text-[#8D94A5]">
            <Calendar className="h-3 w-3" />
            {formatMoscowDateTime(events[0].time as number, language)}
          </div>

          {events.map((event, eventIndex) => {
            const isPositive = event.type === "positive";
            const impactEntries = Object.entries(event.impact) as Array<[keyof typeof labels, number]>;

            return (
              <div
                key={eventIndex}
                className="rounded-[20px] border p-4"
                style={{ borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.02)" }}
                data-testid={`event-item-${eventIndex}`}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-[#00C076]" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-[#F6465D]" />
                    )}
                    <h4 className="text-sm font-medium" style={{ color: isPositive ? "#00C076" : "#F6465D" }}>
                      {isPositive ? (language === "ru" ? "Позитивное" : "Positive") : language === "ru" ? "Негативное" : "Negative"}
                    </h4>
                    <span className="text-xs text-[#8D94A5]">{formatMoscowTime(event.time as number)} MSK</span>
                  </div>
                  {event.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-[#F6465D] hover:text-[#F6465D]"
                      onClick={() => onDelete(event.id!)}
                      data-testid={`button-delete-event-${eventIndex}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <p className="mb-3 text-sm leading-6 text-white">{event.text}</p>

                {event.media && event.media.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#8D94A5]">{language === "ru" ? "Медиа" : "Media"}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {event.media.map((media, index) => (
                        <div key={index} className="overflow-hidden rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                          {media.type === "image" ? (
                            <img
                              src={media.url}
                              alt={`Event media ${index + 1}`}
                              className="max-h-48 w-full object-cover"
                              data-testid={`image-event-${eventIndex}-${index}`}
                            />
                          ) : (
                            <video
                              src={media.url}
                              controls
                              className="max-h-48 w-full object-cover"
                              data-testid={`video-event-${eventIndex}-${index}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#8D94A5]">{language === "ru" ? "Влияние" : "Impact"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {impactEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-xl px-3 py-2"
                        style={{ backgroundColor: "rgba(255,255,255,0.035)" }}
                      >
                        <span className="text-xs" style={{ color: impactColors[key] }}>
                          {labels[key]}
                        </span>
                        <span className="text-xs font-mono font-semibold" style={{ color: impactColors[key] }}>
                          {value > 0 ? "+" : ""}
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-all">
          <AlertDialogHeader>
            <AlertDialogTitle>{language === "ru" ? "Удалить все события?" : "Delete all events?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ru"
                ? `Будут удалены все события за этот день: ${events.length}. Это действие необратимо.`
                : `All events for this day will be deleted: ${events.length}. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-all">{language === "ru" ? "Отмена" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-all"
            >
              {language === "ru" ? "Удалить" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
