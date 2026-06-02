import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  tokenName: string;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("File could not be read"));
    reader.readAsDataURL(file);
  });
}

function compressImage(file: File) {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const source = await readFileAsDataUrl(file);
      const image = new Image();

      image.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Image could not be prepared"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => reject(new Error("Image could not be processed"));
      image.src = source;
    } catch (error) {
      reject(error);
    }
  });
}

export default function AvatarUploader({
  currentAvatarUrl,
  tokenName,
  compact = false,
  title,
  subtitle,
}: AvatarUploaderProps) {
  const { language } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const t =
    language === "ru"
      ? {
          updated: "Фото обновлено",
          updatedDescription: "Новый аватар успешно сохранён.",
          uploadError: "Ошибка загрузки",
          invalidFile: "Неверный файл",
          chooseImage: "Выбери изображение.",
          fileTooLarge: "Файл слишком большой",
          fileTooLargeDescription: "Изображение должно быть меньше 2 МБ.",
          processingError: "Ошибка обработки",
          prepareImage: "Не удалось подготовить изображение.",
          uploading: "Загрузка...",
          updatePhoto: "Обновить фото",
          changePhoto: "Изменить фото",
          uploadPhoto: "Загрузить фото",
        }
      : {
          updated: "Photo updated",
          updatedDescription: "Your new avatar was saved successfully.",
          uploadError: "Upload error",
          invalidFile: "Invalid file",
          chooseImage: "Choose an image.",
          fileTooLarge: "File is too large",
          fileTooLargeDescription: "The image must be smaller than 2 MB.",
          processingError: "Processing error",
          prepareImage: "The image could not be prepared.",
          uploading: "Uploading...",
          updatePhoto: "Update photo",
          changePhoto: "Change photo",
          uploadPhoto: "Upload photo",
        };

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => apiRequest("PATCH", "/api/users/avatar", { avatarUrl }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: t.updated,
        description: t.updatedDescription,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.uploadError,
        description: error.message || t.uploadError,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t.invalidFile,
        description: t.chooseImage,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t.fileTooLarge,
        description: t.fileTooLargeDescription,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const avatarUrl = await compressImage(file);
      await updateAvatarMutation.mutateAsync(avatarUrl);
    } catch (error) {
      toast({
        title: t.processingError,
        description: error instanceof Error ? error.message : t.prepareImage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getInitials = () => (tokenName || "SG").substring(0, 2).toUpperCase();

  return (
    <>
      {compact ? (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-14 w-14 border border-border shadow-lg" data-testid="avatar-display">
              <AvatarImage src={currentAvatarUrl || undefined} alt={tokenName} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{getInitials()}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || updateAvatarMutation.isPending}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:bg-accent"
              data-testid="button-upload-avatar"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            {title && <p className="truncate text-sm font-semibold text-foreground">{title}</p>}
            {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || updateAvatarMutation.isPending}
              className="mt-1.5 h-7 px-0 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Upload className="mr-1.5 h-3 w-3" />
              {isUploading || updateAvatarMutation.isPending ? t.uploading : t.updatePhoto}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="group relative w-full max-w-[280px]">
            <AspectRatio ratio={1}>
              <Avatar className="h-full w-full border-2 border-border" data-testid="avatar-display">
                <AvatarImage src={currentAvatarUrl || undefined} alt={tokenName} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-6xl font-bold text-primary">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-12 w-12 text-white" />
                <span className="text-sm font-medium text-white">{t.changePhoto}</span>
              </div>
            </AspectRatio>
          </div>

          <Button
            variant="outline"
            size="default"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || updateAvatarMutation.isPending}
            className="flex w-full max-w-[200px] items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading || updateAvatarMutation.isPending ? t.uploading : t.uploadPhoto}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-avatar-file"
      />
    </>
  );
}
