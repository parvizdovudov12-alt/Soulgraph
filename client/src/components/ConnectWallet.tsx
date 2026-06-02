import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import bs58 from "bs58";
import { useLanguage } from "@/lib/i18n";

const copy = {
  ru: {
    phantomMissing: "Phantom не найден",
    phantomMissingDescription: "Пожалуйста, установите расширение Phantom Wallet",
    walletConnected: "Кошелёк подключён",
    walletConnectedDescription: "Кошелёк {{wallet}} подключён",
    walletRejected: "Подключение отменено",
    walletRejectedDescription: "Вы отклонили запрос на подключение кошелька",
    walletError: "Ошибка подключения",
    walletErrorDescription: "Не удалось подключить кошелёк",
    loggedOut: "Вы вышли из системы",
    loggedOutDescription: "Кошелёк отключён",
    connectWallet: "Подключить кошелёк",
    connecting: "Подключение...",
    twoFactorRequired: "Нужен код 2FA",
    twoFactorPrompt: "Введи 6-значный код из приложения-аутентификатора",
  },
  en: {
    phantomMissing: "Phantom not found",
    phantomMissingDescription: "Please install the Phantom Wallet extension",
    walletConnected: "Wallet connected",
    walletConnectedDescription: "Wallet {{wallet}} connected",
    walletRejected: "Connection cancelled",
    walletRejectedDescription: "You declined the wallet connection request",
    walletError: "Connection error",
    walletErrorDescription: "Could not connect wallet",
    loggedOut: "Signed out",
    loggedOutDescription: "Wallet disconnected",
    connectWallet: "Connect wallet",
    connecting: "Connecting...",
    twoFactorRequired: "2FA code required",
    twoFactorPrompt: "Enter the 6-digit code from your authenticator app",
  },
} as const;

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
  const { language } = useLanguage();
  const t = copy[language];
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);

      if (!window.solana?.isPhantom) {
        toast({ title: t.phantomMissing, description: t.phantomMissingDescription, variant: "destructive" });
        window.open("https://phantom.app/", "_blank");
        return;
      }

      const response = await window.solana.connect();
      const walletAddress = response.publicKey.toString();
      const nonceRes = await apiRequest("POST", "/api/auth/nonce", { walletAddress });
      const nonceResponse: { nonce: string } = await nonceRes.json();
      const message = `Sign this message to authenticate with Soulgraph: ${nonceResponse.nonce}`;
      const messageBytes = new TextEncoder().encode(message);
      const signedMessage = await window.solana.signMessage(messageBytes, "utf8");
      const signature = bs58.encode(signedMessage.signature);
      const verifyRes = await apiRequest("POST", "/api/auth/verify", { walletAddress, signature });
      const verifyResponse: { user?: unknown; requiresTwoFactor?: boolean; temporaryToken?: string } = await verifyRes.json();

      if (verifyResponse.requiresTwoFactor && verifyResponse.temporaryToken) {
        const code = window.prompt(t.twoFactorPrompt)?.trim();
        if (!code) {
          toast({ title: t.twoFactorRequired, description: t.twoFactorPrompt });
          return;
        }

        const twoFactorRes = await apiRequest("POST", "/api/auth/2fa/verify-login", {
          temporaryToken: verifyResponse.temporaryToken,
          code,
        });
        const twoFactorResult = await twoFactorRes.json();
        queryClient.setQueryData(["/api/auth/me"], twoFactorResult);
        toast({
          title: t.walletConnected,
          description: t.walletConnectedDescription.replace("{{wallet}}", `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`),
        });
        return;
      }

      queryClient.setQueryData(["/api/auth/me"], verifyResponse);
      toast({
        title: t.walletConnected,
        description: t.walletConnectedDescription.replace("{{wallet}}", `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`),
      });
    } catch (error: any) {
      if (error.code === 4001 || error.message?.includes("User rejected")) {
        toast({ title: t.walletRejected, description: t.walletRejectedDescription });
      } else {
        toast({ title: t.walletError, description: error.message || t.walletErrorDescription, variant: "destructive" });
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
      toast({ title: t.loggedOut, description: t.loggedOutDescription });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isAuthenticated && user) {
    let displayText = "";
    if (user.walletAddress) {
      displayText = `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`;
    } else if (user.email) {
      displayText = user.email.split("@")[0];
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-foreground" data-testid="text-user-display">
            {displayText}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={connectWallet} disabled={isConnecting} data-testid="button-connect-wallet">
      <Wallet className="w-4 h-4 mr-2" />
      {isConnecting ? t.connecting : t.connectWallet}
    </Button>
  );
}
