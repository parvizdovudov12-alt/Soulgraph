import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TokenNameEditorProps {
  currentTokenName: string;
  onUpdate: (newTokenName: string) => void;
}

export default function TokenNameEditor({ currentTokenName, onUpdate }: TokenNameEditorProps) {
  const [open, setOpen] = useState(false);
  const [tokenName, setTokenName] = useState(currentTokenName);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Название токена не может быть пустым',
        variant: 'destructive',
      });
      return;
    }

    if (tokenName.length > 20) {
      toast({
        title: 'Ошибка',
        description: 'Название токена должно быть не длиннее 20 символов',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest('PATCH', '/api/auth/token-name', {
        tokenName: tokenName.trim().toUpperCase(),
      });

      const data = await response.json();

      onUpdate(data.user.tokenName);
      setOpen(false);
      toast({
        title: 'Успешно',
        description: `Название токена изменено на ${data.user.tokenName}`,
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить название токена',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="ml-2 p-1 rounded hover-elevate opacity-50 hover:opacity-100 transition-opacity"
          data-testid="button-edit-token-name"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-edit-token-name">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Изменить название токена</DialogTitle>
            <DialogDescription>
              Введите новое название для вашего токена (до 20 символов)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="token-name">Название токена</Label>
              <Input
                id="token-name"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value.toUpperCase())}
                placeholder="SOUL"
                maxLength={20}
                disabled={isLoading}
                data-testid="input-token-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              data-testid="button-cancel-token-name"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="button-save-token-name"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
