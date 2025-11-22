import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className="h-12 w-12" data-testid="avatar-display">
          <AvatarImage src={currentAvatarUrl || undefined} alt={tokenName} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        {!currentAvatarUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full bg-black/50">
            <Camera className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        disabled={isUploading || updateAvatarMutation.isPending}
        className="flex items-center gap-2"
        data-testid="button-upload-avatar"
      >
        <Upload className="w-3 h-3" />
        {isUploading || updateAvatarMutation.isPending ? "Загрузка..." : "Загрузить"}
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
