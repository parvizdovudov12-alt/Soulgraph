import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import bs58 from "bs58";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const r = decodeURIComponent;

const copy = {
  ru: {
    title: r("Soulgraph"),
    subtitle: "Личный график роста без лишнего шума",
    headline: "Операционная система человека",
    eyebrow: "SOULGRAPH OS",
    badges: ["Состояние", "Цель", "Прогресс"],
    emailTab: r("Email"),
    walletTab: r("Phantom"),
    register: r("%D0%A0%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B0%D1%86%D0%B8%D1%8F"),
    login: r("%D0%92%D0%BE%D0%B9%D1%82%D0%B8"),
    registerAction: r("%D0%97%D0%B0%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D1%82%D1%8C%D1%81%D1%8F"),
    loginAction: r("%D0%92%D0%BE%D0%B9%D1%82%D0%B8"),
    email: r("Email"),
    password: r("%D0%9F%D0%B0%D1%80%D0%BE%D0%BB%D1%8C"),
    confirmPassword: r("%D0%9F%D0%BE%D0%B4%D1%82%D0%B2%D0%B5%D1%80%D0%B4%D0%B8%D1%82%D0%B5%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C"),
    tokenName: r("%D0%98%D0%BC%D1%8F%20%D1%82%D0%BE%D0%BA%D0%B5%D0%BD%D0%B0%20(%D0%BE%D0%BF%D1%86%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE)"),
    emailPlaceholder: r("you%40email.com"),
    passwordPlaceholder: r("%D0%9C%D0%B8%D0%BD%D0%B8%D0%BC%D1%83%D0%BC%208%20%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB%D0%BE%D0%B2"),
    passwordLoginPlaceholder: r("%D0%92%D0%B2%D0%B5%D0%B4%D0%B8%D1%82%D0%B5%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C"),
    confirmPasswordPlaceholder: r("%D0%9F%D0%BE%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D1%82%D0%B5%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C"),
    tokenNamePlaceholder: r("SOUL"),
    toggleToRegister: r("%D0%9D%D0%B5%D1%82%20%D0%B0%D0%BA%D0%BA%D0%B0%D1%83%D0%BD%D1%82%D0%B0%3F%20%D0%97%D0%B0%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B8%D1%80%D1%83%D0%B9%D1%82%D0%B5%D1%81%D1%8C"),
    toggleToLogin: r("%D0%A3%D0%B6%D0%B5%20%D0%B5%D1%81%D1%82%D1%8C%20%D0%B0%D0%BA%D0%BA%D0%B0%D1%83%D0%BD%D1%82%3F%20%D0%92%D0%BE%D0%B9%D0%B4%D0%B8%D1%82%D0%B5"),
    phantomHint: r("%D0%9F%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B8%D1%82%D0%B5%20Phantom%20%D0%BA%D0%BE%D1%88%D0%B5%D0%BB%D0%B5%D0%BA%20%D0%B4%D0%BB%D1%8F%20%D0%B2%D1%85%D0%BE%D0%B4%D0%B0%20%D1%87%D0%B5%D1%80%D0%B5%D0%B7%20Solana"),
    connectPhantom: r("%D0%9F%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B8%D1%82%D1%8C%20Phantom"),
    connecting: r("%D0%9F%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5..."),
    registrationSuccess: r("%D0%A0%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B0%D1%86%D0%B8%D1%8F%20%D1%83%D1%81%D0%BF%D0%B5%D1%88%D0%BD%D0%B0"),
    registrationSuccessDescription: r("%D0%94%D0%BE%D0%B1%D1%80%D0%BE%20%D0%BF%D0%BE%D0%B6%D0%B0%D0%BB%D0%BE%D0%B2%D0%B0%D1%82%D1%8C%20%D0%B2%20Soulgraph!"),
    registrationError: r("%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%20%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B0%D1%86%D0%B8%D0%B8"),
    registrationErrorDescription: r("%D0%9D%D0%B5%20%D1%83%D0%B4%D0%B0%D0%BB%D0%BE%D1%81%D1%8C%20%D1%81%D0%BE%D0%B7%D0%B4%D0%B0%D1%82%D1%8C%20%D0%B0%D0%BA%D0%BA%D0%B0%D1%83%D0%BD%D1%82"),
    accountExists: r("%D0%90%D0%BA%D0%BA%D0%B0%D1%83%D0%BD%D1%82%20%D1%83%D0%B6%D0%B5%20%D1%81%D1%83%D1%89%D0%B5%D1%81%D1%82%D0%B2%D1%83%D0%B5%D1%82"),
    accountExistsDescription: r("%D0%AD%D1%82%D0%BE%D1%82%20email%20%D1%83%D0%B6%D0%B5%20%D0%B7%D0%B0%D1%80%D0%B5%D0%B3%D0%B8%D1%81%D1%82%D1%80%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD.%20%D0%AF%20%D0%BF%D0%B5%D1%80%D0%B5%D0%BA%D0%BB%D1%8E%D1%87%D0%B8%D0%BB%20%D0%B2%D0%B0%D1%81%20%D0%BD%D0%B0%20%D0%B2%D1%85%D0%BE%D0%B4%20-%20%D0%BE%D1%81%D1%82%D0%B0%D0%BB%D0%BE%D1%81%D1%8C%20%D0%B2%D0%B2%D0%B5%D1%81%D1%82%D0%B8%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C."),
    loginSuccess: r("%D0%92%D1%85%D0%BE%D0%B4%20%D0%B2%D1%8B%D0%BF%D0%BE%D0%BB%D0%BD%D0%B5%D0%BD"),
    loginSuccessDescription: r("%D0%94%D0%BE%D0%B1%D1%80%D0%BE%20%D0%BF%D0%BE%D0%B6%D0%B0%D0%BB%D0%BE%D0%B2%D0%B0%D1%82%D1%8C!"),
    loginError: r("%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%20%D0%B2%D1%85%D0%BE%D0%B4%D0%B0"),
    loginErrorDescription: r("%D0%9D%D0%B5%D0%B2%D0%B5%D1%80%D0%BD%D1%8B%D0%B9%20email%20%D0%B8%D0%BB%D0%B8%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C"),
    phantomMissing: r("Phantom%20%D0%BD%D0%B5%20%D0%BD%D0%B0%D0%B9%D0%B4%D0%B5%D0%BD"),
    phantomMissingDescription: r("%D0%9F%D0%BE%D0%B6%D0%B0%D0%BB%D1%83%D0%B9%D1%81%D1%82%D0%B0%2C%20%D1%83%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%B8%D1%82%D0%B5%20%D1%80%D0%B0%D1%81%D1%88%D0%B8%D1%80%D0%B5%D0%BD%D0%B8%D0%B5%20Phantom%20Wallet"),
    walletConnected: r("%D0%9A%D0%BE%D1%88%D0%B5%D0%BB%D0%B5%D0%BA%20%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD"),
    walletConnectedDescription: r("%D0%9A%D0%BE%D1%88%D0%B5%D0%BB%D0%B5%D0%BA%20%7B%7Bwallet%7D%7D%20%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD"),
    walletRejected: r("%D0%9F%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BE%D1%82%D0%BC%D0%B5%D0%BD%D0%B5%D0%BD%D0%BE"),
    walletRejectedDescription: r("%D0%92%D1%8B%20%D0%BE%D1%82%D0%BA%D0%BB%D0%BE%D0%BD%D0%B8%D0%BB%D0%B8%20%D0%B7%D0%B0%D0%BF%D1%80%D0%BE%D1%81%20%D0%BD%D0%B0%20%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BA%D0%BE%D1%88%D0%B5%D0%BB%D1%8C%D0%BA%D0%B0"),
    walletError: r("%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%20%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B8%D1%8F"),
    walletErrorDescription: r("%D0%9D%D0%B5%20%D1%83%D0%B4%D0%B0%D0%BB%D0%BE%D1%81%D1%8C%20%D0%BF%D0%BE%D0%B4%D0%BA%D0%BB%D1%8E%D1%87%D0%B8%D1%82%D1%8C%20%D0%BA%D0%BE%D1%88%D0%B5%D0%BB%D0%B5%D0%BA"),
    emailValidation: r("%D0%92%D0%B2%D0%B5%D0%B4%D0%B8%D1%82%D0%B5%20%D0%BA%D0%BE%D1%80%D1%80%D0%B5%D0%BA%D1%82%D0%BD%D1%8B%D0%B9%20email"),
    passwordValidation: r("%D0%9F%D0%B0%D1%80%D0%BE%D0%BB%D1%8C%20%D0%B4%D0%BE%D0%BB%D0%B6%D0%B5%D0%BD%20%D1%81%D0%BE%D0%B4%D0%B5%D1%80%D0%B6%D0%B0%D1%82%D1%8C%20%D0%BC%D0%B8%D0%BD%D0%B8%D0%BC%D1%83%D0%BC%208%20%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB%D0%BE%D0%B2"),
    passwordRequired: r("%D0%92%D0%B2%D0%B5%D0%B4%D0%B8%D1%82%D0%B5%20%D0%BF%D0%B0%D1%80%D0%BE%D0%BB%D1%8C"),
    passwordsDoNotMatch: r("%D0%9F%D0%B0%D1%80%D0%BE%D0%BB%D0%B8%20%D0%BD%D0%B5%20%D1%81%D0%BE%D0%B2%D0%BF%D0%B0%D0%B4%D0%B0%D1%8E%D1%82"),
    twoFactorTitle: r("%D0%94%D0%B2%D1%83%D1%85%D1%84%D0%B0%D0%BA%D1%82%D0%BE%D1%80%D0%BD%D0%B0%D1%8F%20%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0"),
    twoFactorDescription: r("%D0%92%D0%B2%D0%B5%D0%B4%D0%B8%D1%82%D0%B5%206-%D0%B7%D0%BD%D0%B0%D1%87%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BE%D0%B4%20%D0%B8%D0%B7%20%D0%BF%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F-%D0%B0%D1%83%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D0%B8%D0%BA%D0%B0%D1%82%D0%BE%D1%80%D0%B0."),
    twoFactorCode: r("%D0%9A%D0%BE%D0%B4%202FA"),
    twoFactorPlaceholder: r("123456"),
    verifyCode: r("%D0%9F%D0%BE%D0%B4%D1%82%D0%B2%D0%B5%D1%80%D0%B4%D0%B8%D1%82%D1%8C%20%D0%BA%D0%BE%D0%B4"),
    backToLogin: r("%D0%9D%D0%B0%D0%B7%D0%B0%D0%B4%20%D0%BA%D0%BE%20%D0%B2%D1%85%D0%BE%D0%B4%D1%83"),
    twoFactorRequired: r("%D0%9D%D1%83%D0%B6%D0%B5%D0%BD%20%D0%B2%D1%82%D0%BE%D1%80%D0%BE%D0%B9%20%D1%84%D0%B0%D0%BA%D1%82%D0%BE%D1%80"),
    twoFactorRequiredDescription: r("%D0%94%D0%BB%D1%8F%20%D1%8D%D1%82%D0%BE%D0%B3%D0%BE%20%D0%B0%D0%BA%D0%BA%D0%B0%D1%83%D0%BD%D1%82%D0%B0%20%D0%B2%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%B0%20%D0%B4%D0%BE%D0%BF%D0%BE%D0%BB%D0%BD%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F%20%D0%B7%D0%B0%D1%89%D0%B8%D1%82%D0%B0."),
    twoFactorError: r("%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%202FA"),
    twoFactorErrorDescription: r("%D0%9D%D0%B5%20%D1%83%D0%B4%D0%B0%D0%BB%D0%BE%D1%81%D1%8C%20%D0%BF%D0%BE%D0%B4%D1%82%D0%B2%D0%B5%D1%80%D0%B4%D0%B8%D1%82%D1%8C%20%D0%BA%D0%BE%D0%B4."),
  },
  en: {
    title: "Soulgraph",
    subtitle: "A personal growth graph without noise",
    headline: "Human Operating System",
    eyebrow: "SOULGRAPH OS",
    badges: ["State", "Goal", "Progress"],
    emailTab: "Email",
    walletTab: "Phantom",
    register: "Register",
    login: "Login",
    registerAction: "Create account",
    loginAction: "Sign in",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    tokenName: "Token name (optional)",
    emailPlaceholder: "you@email.com",
    passwordPlaceholder: "At least 8 characters",
    passwordLoginPlaceholder: "Enter password",
    confirmPasswordPlaceholder: "Repeat password",
    tokenNamePlaceholder: "SOUL",
    toggleToRegister: "No account yet? Register",
    toggleToLogin: "Already have an account? Sign in",
    phantomHint: "Connect your Phantom wallet to sign in with Solana",
    connectPhantom: "Connect Phantom",
    connecting: "Connecting...",
    registrationSuccess: "Registration successful",
    registrationSuccessDescription: "Welcome to Soulgraph!",
    registrationError: "Registration error",
    registrationErrorDescription: "Could not create account",
    accountExists: "Account already exists",
    accountExistsDescription: "This email is already registered. I switched you to login - just enter your password.",
    loginSuccess: "Signed in",
    loginSuccessDescription: "Welcome back!",
    loginError: "Login error",
    loginErrorDescription: "Incorrect email or password",
    phantomMissing: "Phantom not found",
    phantomMissingDescription: "Please install the Phantom Wallet extension",
    walletConnected: "Wallet connected",
    walletConnectedDescription: "Wallet {{wallet}} connected",
    walletRejected: "Connection cancelled",
    walletRejectedDescription: "You declined the wallet connection request",
    walletError: "Connection error",
    walletErrorDescription: "Could not connect wallet",
    emailValidation: "Enter a valid email",
    passwordValidation: "Password must be at least 8 characters",
    passwordRequired: "Enter password",
    passwordsDoNotMatch: "Passwords do not match",
    twoFactorTitle: "Two-factor verification",
    twoFactorDescription: "Enter the 6-digit code from your authenticator app.",
    twoFactorCode: "2FA code",
    twoFactorPlaceholder: "123456",
    verifyCode: "Verify code",
    backToLogin: "Back to sign in",
    twoFactorRequired: "Second factor required",
    twoFactorRequiredDescription: "This account has extra protection enabled.",
    twoFactorError: "2FA error",
    twoFactorErrorDescription: "Could not verify the code.",
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

export default function AuthPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = copy[language];
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "wallet">("email");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [pendingTwoFactor, setPendingTwoFactor] = useState<{ temporaryToken: string; email?: string | null } | null>(null);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerTokenName, setRegisterTokenName] = useState("");

  const registerSchema = z
    .object({
      email: z.string().email(t.emailValidation),
      password: z.string().min(8, t.passwordValidation),
      confirmPassword: z.string(),
      tokenName: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t.passwordsDoNotMatch,
      path: ["confirmPassword"],
    });

  const loginSchema = z.object({
    email: z.string().email(t.emailValidation),
    password: z.string().min(1, t.passwordRequired),
  });

  type RegisterFormData = z.infer<typeof registerSchema>;
  type LoginFormData = z.infer<typeof loginSchema>;
  const twoFactorSchema = z.object({
    code: z.string().regex(/^\d{6}$/, language === "ru" ? r("%D0%92%D0%B2%D0%B5%D0%B4%D0%B8%D1%82%D0%B5%206%20%D1%86%D0%B8%D1%84%D1%80") : "Enter 6 digits"),
  });
  type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      tokenName: "",
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
    },
  });
  const mobileInputClass = "h-11 text-base text-foreground caret-primary selection:bg-primary/25 md:h-9 md:text-sm";

  const handleToggleAuthMode = () => {
    const newMode = authMode === "login" ? "register" : "login";
    setAuthMode(newMode);
    if (newMode === "login") {
      loginForm.reset();
    } else {
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setRegisterTokenName("");
    }
  };

  const handleRegisterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = {
      email: registerEmail.trim(),
      password: registerPassword,
      confirmPassword: registerConfirmPassword,
      tokenName: registerTokenName.trim(),
    };
    const parsed = registerSchema.safeParse(data);

    if (!parsed.success) {
      toast({
        title: t.registrationError,
        description: parsed.error.issues[0]?.message || t.registrationErrorDescription,
        variant: "destructive",
      });
      return;
    }

    void handleRegister(parsed.data);
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email: data.email,
        password: data.password,
        tokenName: data.tokenName || "SOUL",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t.registrationErrorDescription);
      }

      const result = await response.json();

      if (result.requiresTwoFactor && result.temporaryToken) {
        setPendingTwoFactor({ temporaryToken: result.temporaryToken, email: data.email });
        twoFactorForm.reset({ code: "" });
        toast({
          title: t.twoFactorRequired,
          description: t.twoFactorRequiredDescription,
        });
        return;
      }

      queryClient.setQueryData(["/api/auth/me"], result);

      toast({
        title: t.registrationSuccess,
        description: t.registrationSuccessDescription,
      });
    } catch (error: any) {
      if (typeof error?.message === "string" && error.message.toLowerCase().includes("already exists")) {
        setAuthMode("login");
        setActiveTab("email");
        loginForm.reset({ email: data.email, password: "" });
        toast({
          title: t.accountExists,
          description: t.accountExistsDescription,
        });
        return;
      }

      toast({
        title: t.registrationError,
        description: error.message || t.registrationErrorDescription,
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login-email", {
        email: data.email,
        password: data.password,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t.loginErrorDescription);
      }

      const result = await response.json();

      if (result.requiresTwoFactor && result.temporaryToken) {
        setPendingTwoFactor({ temporaryToken: result.temporaryToken, email: data.email });
        twoFactorForm.reset({ code: "" });
        toast({
          title: t.twoFactorRequired,
          description: t.twoFactorRequiredDescription,
        });
        return;
      }

      queryClient.setQueryData(["/api/auth/me"], result);

      toast({
        title: t.loginSuccess,
        description: t.loginSuccessDescription,
      });
    } catch (error: any) {
      toast({
        title: t.loginError,
        description: error.message || t.loginErrorDescription,
        variant: "destructive",
      });
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);

      if (!window.solana?.isPhantom) {
        toast({
          title: t.phantomMissing,
          description: t.phantomMissingDescription,
          variant: "destructive",
        });
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
        setPendingTwoFactor({ temporaryToken: verifyResponse.temporaryToken, email: walletAddress });
        twoFactorForm.reset({ code: "" });
        toast({
          title: t.twoFactorRequired,
          description: t.twoFactorRequiredDescription,
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
        toast({
          title: t.walletRejected,
          description: t.walletRejectedDescription,
        });
      } else {
        toast({
          title: t.walletError,
          description: error.message || t.walletErrorDescription,
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleVerifyTwoFactor = async (data: TwoFactorFormData) => {
    if (!pendingTwoFactor) {
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/auth/2fa/verify-login", {
        temporaryToken: pendingTwoFactor.temporaryToken,
        code: data.code,
      });

      const result = await response.json();
      queryClient.setQueryData(["/api/auth/me"], result);
      setPendingTwoFactor(null);
      twoFactorForm.reset({ code: "" });

      toast({
        title: t.loginSuccess,
        description: t.loginSuccessDescription,
      });
    } catch (error: any) {
      toast({
        title: t.twoFactorError,
        description: error.message || t.twoFactorErrorDescription,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative min-h-dvh overflow-y-auto bg-[#090c0f] px-4 py-[max(1rem,env(safe-area-inset-top))] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(54,201,139,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:auto,auto,64px_64px,64px_64px]" />
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-6xl items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_27rem] lg:py-0">
        <section className="space-y-7">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white shadow-[0_18px_55px_rgba(54,201,139,0.16)]">
            <img src="/assets/soulgraph-logo.png" alt="Soulgraph" className="h-full w-full object-cover" />
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9AF6C2]">
            {t.eyebrow}
          </div>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-5xl font-semibold leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {t.headline}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/64 sm:text-lg">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {t.badges.map((badge) => (
              <span key={badge} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-medium text-white/78">
                {badge}
              </span>
            ))}
          </div>
        </section>

      <Card className="w-full border-white/10 bg-[#171312]/88 shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <CardHeader className="space-y-2 text-left">
          <CardTitle className="text-2xl font-semibold tracking-tight text-white">{t.title}</CardTitle>
          <CardDescription className="text-sm text-white/58">{authMode === "login" ? t.login : t.register}</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTwoFactor ? (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">{t.twoFactorTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.twoFactorDescription}</p>
              </div>
              <Form {...twoFactorForm}>
                <form onSubmit={twoFactorForm.handleSubmit(handleVerifyTwoFactor)} className="space-y-4">
                  <FormField
                    control={twoFactorForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.twoFactorCode}</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder={t.twoFactorPlaceholder}
                            data-testid="input-two-factor-code"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={twoFactorForm.formState.isSubmitting} data-testid="button-verify-two-factor">
                    {twoFactorForm.formState.isSubmitting ? t.connecting : t.verifyCode}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPendingTwoFactor(null);
                      twoFactorForm.reset({ code: "" });
                    }}
                    data-testid="button-back-login"
                  >
                    {t.backToLogin}
                  </Button>
                </form>
              </Form>
            </div>
          ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "wallet")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" data-testid="tab-email-auth">
                <Mail className="w-4 h-4 mr-2" />
                {t.emailTab}
              </TabsTrigger>
              <TabsTrigger value="wallet" data-testid="tab-wallet-auth">
                <Wallet className="w-4 h-4 mr-2" />
                {t.walletTab}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-6">
              {authMode === "register" ? (
                <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground" htmlFor="register-email">{t.email}</label>
                    <Input
                      id="register-email"
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={t.emailPlaceholder}
                      className={mobileInputClass}
                      data-testid="input-register-email"
                      value={registerEmail}
                      onChange={(event) => setRegisterEmail(event.target.value)}
                      onInput={(event) => setRegisterEmail(event.currentTarget.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground" htmlFor="register-password">{t.password}</label>
                    <Input
                      id="register-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t.passwordPlaceholder}
                      className={mobileInputClass}
                      data-testid="input-register-password"
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                      onInput={(event) => setRegisterPassword(event.currentTarget.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground" htmlFor="register-confirm-password">{t.confirmPassword}</label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t.confirmPasswordPlaceholder}
                      className={mobileInputClass}
                      data-testid="input-register-confirm-password"
                      value={registerConfirmPassword}
                      onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                      onInput={(event) => setRegisterConfirmPassword(event.currentTarget.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none text-foreground" htmlFor="register-token-name">{t.tokenName}</label>
                    <Input
                      id="register-token-name"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={t.tokenNamePlaceholder}
                      className={mobileInputClass}
                      data-testid="input-register-token-name"
                      value={registerTokenName}
                      onChange={(event) => setRegisterTokenName(event.target.value)}
                      onInput={(event) => setRegisterTokenName(event.currentTarget.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-register-submit">
                    {t.registerAction}
                  </Button>
                </form>
              ) : (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" noValidate>
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.email}</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="email"
                              autoComplete="email"
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder={t.emailPlaceholder}
                              className={mobileInputClass}
                              data-testid="input-login-email"
                              name={field.name}
                              ref={field.ref}
                              value={field.value ?? ""}
                              onBlur={field.onBlur}
                              onChange={(event) => field.onChange(event.target.value)}
                              onInput={(event) => field.onChange(event.currentTarget.value)}
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
                          <FormLabel>{t.password}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              autoComplete="current-password"
                              placeholder={t.passwordLoginPlaceholder}
                              className={mobileInputClass}
                              data-testid="input-login-password"
                              name={field.name}
                              ref={field.ref}
                              value={field.value ?? ""}
                              onBlur={field.onBlur}
                              onChange={(event) => field.onChange(event.target.value)}
                              onInput={(event) => field.onChange(event.currentTarget.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting} data-testid="button-login-submit">
                      {loginForm.formState.isSubmitting ? t.connecting : t.loginAction}
                    </Button>
                  </form>
                </Form>
              )}

              <div className="text-center">
                <button type="button" onClick={handleToggleAuthMode} className="text-sm text-primary hover:underline" data-testid="button-toggle-auth-mode">
                  {authMode === "login" ? t.toggleToRegister : t.toggleToLogin}
                </button>
              </div>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-4 mt-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">{t.phantomHint}</p>
                <Button onClick={connectWallet} disabled={isConnecting} className="w-full" data-testid="button-connect-wallet-auth">
                  <Wallet className="w-4 h-4 mr-2" />
                  {isConnecting ? t.connecting : t.connectPhantom}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
