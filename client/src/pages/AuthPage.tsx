import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import bs58 from 'bs58';

const registerSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
  confirmPassword: z.string(),
  tokenName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

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

export default function AuthPage() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'wallet'>('email');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      tokenName: 'SOUL',
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleRegister = async (data: RegisterFormData) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', {
        email: data.email,
        password: data.password,
        tokenName: data.tokenName || 'SOUL',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка регистрации');
      }

      const result = await response.json();
      queryClient.setQueryData(['/api/auth/me'], result);

      toast({
        title: 'Регистрация успешна',
        description: 'Добро пожаловать в Soulgraph!',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка регистрации',
        description: error.message || 'Не удалось создать аккаунт',
        variant: 'destructive',
      });
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login-email', {
        email: data.email,
        password: data.password,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка входа');
      }

      const result = await response.json();
      queryClient.setQueryData(['/api/auth/me'], result);

      toast({
        title: 'Вход выполнен',
        description: 'Добро пожаловать!',
      });
    } catch (error: any) {
      toast({
        title: 'Ошибка входа',
        description: error.message || 'Неверный email или пароль',
        variant: 'destructive',
      });
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);

      if (!window.solana?.isPhantom) {
        toast({
          title: 'Phantom не найден',
          description: 'Пожалуйста, установите расширение Phantom Wallet',
          variant: 'destructive',
        });
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const response = await window.solana.connect();
      const walletAddress = response.publicKey.toString();

      const nonceRes = await apiRequest('POST', '/api/auth/nonce', { walletAddress });
      const nonceResponse: { nonce: string } = await nonceRes.json();

      const message = `Sign this message to authenticate with Soulgraph: ${nonceResponse.nonce}`;
      const messageBytes = new TextEncoder().encode(message);

      const signedMessage = await window.solana.signMessage(messageBytes, 'utf8');
      const signature = bs58.encode(signedMessage.signature);

      const verifyRes = await apiRequest('POST', '/api/auth/verify', { walletAddress, signature });
      const verifyResponse: { user: any } = await verifyRes.json();

      queryClient.setQueryData(['/api/auth/me'], verifyResponse);

      toast({
        title: 'Успешно подключено',
        description: `Кошелек ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)} подключен`,
      });
    } catch (error: any) {
      console.error('Connection error:', error);
      
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Soulgraph</CardTitle>
          <CardDescription className="text-base">
            Трекинг жизненных показателей
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'wallet')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" data-testid="tab-email-auth">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="wallet" data-testid="tab-wallet-auth">
                <Wallet className="w-4 h-4 mr-2" />
                Phantom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-6">
              {authMode === 'register' ? (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="ваш@email.com"
                              data-testid="input-register-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Минимум 8 символов"
                              data-testid="input-register-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Подтвердите пароль</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Повторите пароль"
                              data-testid="input-register-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="tokenName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Имя токена (опционально)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SOUL"
                              data-testid="input-register-token-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerForm.formState.isSubmitting}
                      data-testid="button-register-submit"
                    >
                      {registerForm.formState.isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="ваш@email.com"
                              data-testid="input-login-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Введите пароль"
                              data-testid="input-login-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginForm.formState.isSubmitting}
                      data-testid="button-login-submit"
                    >
                      {loginForm.formState.isSubmitting ? 'Вход...' : 'Войти'}
                    </Button>
                  </form>
                </Form>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-primary hover:underline"
                  data-testid="button-toggle-auth-mode"
                >
                  {authMode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
                </button>
              </div>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-4 mt-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Подключите Phantom кошелек для входа через Solana
                </p>
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="w-full"
                  data-testid="button-connect-wallet-auth"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isConnecting ? 'Подключение...' : 'Подключить Phantom'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
