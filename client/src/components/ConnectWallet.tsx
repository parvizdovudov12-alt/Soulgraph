import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import bs58 from 'bs58';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      publicKey?: { toString: () => string };
    };
  }
}

export default function ConnectWallet() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);

      // Check if Phantom is installed
      if (!window.solana?.isPhantom) {
        toast({
          title: 'Phantom не найден',
          description: 'Пожалуйста, установите расширение Phantom Wallet',
          variant: 'destructive',
        });
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Connect to Phantom
      const response = await window.solana.connect();
      const walletAddress = response.publicKey.toString();

      // Request nonce from server
      const nonceRes = await apiRequest('POST', '/api/auth/nonce', { walletAddress });
      const nonceResponse: { nonce: string } = await nonceRes.json();

      // Create message to sign
      const message = `Sign this message to authenticate with Soulgraph: ${nonceResponse.nonce}`;
      const messageBytes = new TextEncoder().encode(message);

      // Sign message with Phantom
      const signedMessage = await window.solana.signMessage(messageBytes, 'utf8');
      const signature = bs58.encode(signedMessage.signature);

      // Verify signature on server
      const verifyRes = await apiRequest('POST', '/api/auth/verify', { walletAddress, signature });
      const verifyResponse: { user: any } = await verifyRes.json();

      // Update auth state
      queryClient.setQueryData(['/api/auth/me'], verifyResponse);

      toast({
        title: 'Успешно подключено',
        description: `Кошелек ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)} подключен`,
      });
    } catch (error: any) {
      console.error('Connection error:', error);
      
      // Handle user rejection gracefully
      if (error.code === 4001 || error.message?.includes('User rejected')) {
        toast({
          title: 'Подключение отменено',
          description: 'Вы отклонили запрос на подключение кошелька',
        });
      } else {
        toast({
          title: 'Ошибка подключения',
          description: error.message || 'Не удалось подключить кошелек',
          variant: 'destructive',
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (window.solana) {
        await window.solana.disconnect();
      }
      logout();
      toast({
        title: 'Вышли из системы',
        description: 'Кошелек отключен',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isAuthenticated && user) {
    // Display wallet address for wallet users, email for email users
    let displayText = '';
    if (user.walletAddress) {
      displayText = `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`;
    } else if (user.email) {
      displayText = user.email.split('@')[0];
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-foreground" data-testid="text-user-display">
            {displayText}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      data-testid="button-connect-wallet"
    >
      <Wallet className="w-4 h-4 mr-2" />
      {isConnecting ? 'Подключение...' : 'Подключить кошелек'}
    </Button>
  );
}
