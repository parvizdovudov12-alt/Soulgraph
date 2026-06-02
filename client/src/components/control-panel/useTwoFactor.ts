import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ControlPanelText, TwoFactorSetupResponse } from "./types";

export function useTwoFactor(twoFactorEnabled: boolean, t: ControlPanelText) {
  const { toast } = useToast();
  const [currentTwoFactorEnabled, setCurrentTwoFactorEnabled] = useState(twoFactorEnabled);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState("");
  const [isLoadingTwoFactor, setIsLoadingTwoFactor] = useState(false);

  useEffect(() => {
    setCurrentTwoFactorEnabled(twoFactorEnabled);
  }, [twoFactorEnabled]);

  const refreshAuthUser = async (userPayload?: unknown) => {
    if (userPayload) {
      queryClient.setQueryData(["/api/auth/me"], { user: userPayload });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const handleStartTwoFactorSetup = async () => {
    try {
      setIsLoadingTwoFactor(true);
      const response = await apiRequest("POST", "/api/auth/2fa/setup", {});
      const payload = (await response.json()) as TwoFactorSetupResponse;
      setTwoFactorSetup(payload);
      setTwoFactorCode("");
    } catch (error: any) {
      toast({
        title: t.twoFactorError,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingTwoFactor(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    try {
      setIsLoadingTwoFactor(true);
      const response = await apiRequest("POST", "/api/auth/2fa/enable", { code: twoFactorCode });
      const payload = await response.json();
      setCurrentTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      await refreshAuthUser(payload.user);
      toast({
        title: t.twoFactorSaved,
        description: t.twoFactorSavedDescription,
      });
    } catch (error: any) {
      toast({
        title: t.twoFactorError,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingTwoFactor(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    try {
      setIsLoadingTwoFactor(true);
      const response = await apiRequest("POST", "/api/auth/2fa/disable", { code: twoFactorDisableCode });
      const payload = await response.json();
      setCurrentTwoFactorEnabled(false);
      setTwoFactorDisableCode("");
      await refreshAuthUser(payload.user);
      toast({
        title: t.twoFactorDisabled,
        description: t.twoFactorDisabledDescription,
      });
    } catch (error: any) {
      toast({
        title: t.twoFactorError,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingTwoFactor(false);
    }
  };

  return {
    currentTwoFactorEnabled,
    twoFactorSetup,
    twoFactorCode,
    setTwoFactorCode,
    twoFactorDisableCode,
    setTwoFactorDisableCode,
    isLoadingTwoFactor,
    handleStartTwoFactorSetup,
    handleEnableTwoFactor,
    handleDisableTwoFactor,
    cancelTwoFactorSetup: () => setTwoFactorSetup(null),
  };
}
