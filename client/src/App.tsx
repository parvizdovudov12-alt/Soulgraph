import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/AuthPage";
import Friends from "@/pages/Friends";
import ViewUser from "@/pages/ViewUser";
import { useAuth } from "@/hooks/useAuth";

type AppView = "dashboard" | "friends" | { type: "viewUser"; userId: string };

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>("dashboard");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (currentView === "friends") {
    return (
      <Friends 
        onBack={() => setCurrentView("dashboard")}
        onViewUser={(userId) => setCurrentView({ type: "viewUser", userId })}
      />
    );
  }

  if (typeof currentView === "object" && currentView.type === "viewUser") {
    return (
      <ViewUser 
        userId={currentView.userId}
        onBack={() => setCurrentView("friends")}
      />
    );
  }

  return <Dashboard onOpenFriends={() => setCurrentView("friends")} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
