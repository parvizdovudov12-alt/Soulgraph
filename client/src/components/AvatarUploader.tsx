import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Camera, Upload } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  tokenName: string;
}

export default function AvatarUploader({ currentAvatarUrl, tokenName }: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      return await apiRequest('PATCH', '/api/users/avatar', { avatarUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: "Аватар обновлен",
        description: "Ваш аватар успешно загружен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить аватар",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Выберите изображение",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер изображения должен быть меньше 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateAvatarMutation.mutate(base64String);
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast({
          title: "Ошибка",
          description: "Не удалось прочитать файл",
          variant: "destructive",
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать изображение",
        variant: "destructive",
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = () => {
    return tokenName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Large Avatar */}
      <div className="w-full max-w-[280px] relative group">
        <AspectRatio ratio={1}>
          <Avatar className="w-full h-full border-2 border-border" data-testid="avatar-display">
            <AvatarImage src={currentAvatarUrl || undefined} alt={tokenName} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-6xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {/* Hover overlay for upload prompt */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/60">
            <Camera className="w-12 h-12 text-white" />
            <span className="text-white text-sm font-medium">Изменить фото</span>
          </div>
        </AspectRatio>
      </div>
      
      {/* Upload Button */}
      <Button
        variant="outline"
        size="default"
        onClick={handleButtonClick}
        disabled={isUploading || updateAvatarMutation.isPending}
        className="flex items-center gap-2 w-full max-w-[200px]"
        data-testid="button-upload-avatar"
      >
        <Upload className="w-4 h-4" />
        {isUploading || updateAvatarMutation.isPending ? "Загрузка..." : "Загрузить фото"}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-avatar-file"
      />
    </div>
  );
}
