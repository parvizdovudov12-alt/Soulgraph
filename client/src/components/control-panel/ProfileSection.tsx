import { ChevronDown, ChevronUp } from "lucide-react";
import AvatarUploader from "@/components/AvatarUploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ControlPanelText } from "./types";
import type { useTwoFactor } from "./useTwoFactor";

type TwoFactorState = ReturnType<typeof useTwoFactor>;

interface ProfileSectionProps {
  t: ControlPanelText;
  avatarUrl?: string | null;
  tokenName: string;
  profileDisplayName?: string | null;
  profileBio?: string | null;
  draftDisplayName: string;
  setDraftDisplayName: (value: string) => void;
  draftBio: string;
  setDraftBio: (value: string) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onProfileSave: (profile: { displayName: string; bio: string }) => void;
  isSavingProfile: boolean;
  twoFactor: TwoFactorState;
}

export function ProfileSection({
  t,
  avatarUrl,
  tokenName,
  profileDisplayName,
  profileBio,
  draftDisplayName,
  setDraftDisplayName,
  draftBio,
  setDraftBio,
  isExpanded,
  onToggleExpanded,
  isEditing,
  onEdit,
  onCancelEdit,
  onProfileSave,
  isSavingProfile,
  twoFactor,
}: ProfileSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.profile}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.workspace}</p>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="rounded-full border border-white/10 bg-white/5 p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          data-testid="button-toggle-profile-section"
          aria-label={isExpanded ? t.collapse : t.expand}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-3">
        <AvatarUploader currentAvatarUrl={avatarUrl} tokenName={tokenName} compact title={tokenName || "Soulgraph"} />
      </div>
      {isExpanded ? (
        <>
          {!isEditing ? (
            <div className="mt-3 space-y-1.5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.displayName}</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{draftDisplayName.trim() || tokenName || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.about}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{draftBio.trim() || "-"}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                {t.editProfile}
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.displayName}</p>
                <input
                  value={draftDisplayName}
                  onChange={(event) => setDraftDisplayName(event.target.value)}
                  placeholder={t.displayNamePlaceholder}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                  data-testid="input-profile-display-name"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.bio}</p>
                <Textarea
                  value={draftBio}
                  onChange={(event) => setDraftBio(event.target.value)}
                  placeholder={t.bioPlaceholder}
                  className="min-h-[96px]"
                  data-testid="textarea-profile-bio"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    onProfileSave({ displayName: draftDisplayName.trim(), bio: draftBio.trim() });
                    onCancelEdit();
                  }}
                  disabled={isSavingProfile}
                  data-testid="button-save-profile"
                >
                  {isSavingProfile ? t.saving : t.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraftDisplayName(profileDisplayName ?? "");
                    setDraftBio(profileBio ?? "");
                    onCancelEdit();
                  }}
                  data-testid="button-cancel-profile"
                >
                  {t.cancel}
                </Button>
              </div>
            </div>
          )}
          <TwoFactorPanel t={t} twoFactor={twoFactor} />
        </>
      ) : null}
    </section>
  );
}

function TwoFactorPanel({ t, twoFactor }: { t: ControlPanelText; twoFactor: ProfileSectionProps["twoFactor"] }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.security}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{t.twoFactor}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${twoFactor.currentTwoFactorEnabled ? "border border-[#36C98B]/30 bg-[#36C98B]/10 text-[#8ef0bb]" : "border border-[#8F2334]/30 bg-[#8F2334]/10 text-[#f1a7b3]"}`}>
          {twoFactor.currentTwoFactorEnabled ? t.twoFactorOn : t.twoFactorOff}
        </span>
      </div>

      {!twoFactor.currentTwoFactorEnabled ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">{t.twoFactorSetupHint}</p>
          {!twoFactor.twoFactorSetup ? (
            <Button type="button" size="sm" variant="outline" onClick={twoFactor.handleStartTwoFactorSetup} disabled={twoFactor.isLoadingTwoFactor}>
              {t.twoFactorSetupStart}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-border bg-white p-2">
                <img src={twoFactor.twoFactorSetup.qrCodeDataUrl} alt="2FA QR" className="mx-auto h-36 w-36 rounded-md" />
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.twoFactorSecret}</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">{twoFactor.twoFactorSetup.secret}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.twoFactorCodeLabel}</p>
                <input
                  value={twoFactor.twoFactorCode}
                  onChange={(event) => twoFactor.setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={t.twoFactorCodePlaceholder}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={twoFactor.handleEnableTwoFactor} disabled={twoFactor.isLoadingTwoFactor || twoFactor.twoFactorCode.length !== 6}>
                  {t.twoFactorEnable}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={twoFactor.cancelTwoFactorSetup} disabled={twoFactor.isLoadingTwoFactor}>
                  {t.cancel}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t.twoFactorCodeLabel}</p>
            <input
              value={twoFactor.twoFactorDisableCode}
              onChange={(event) => twoFactor.setTwoFactorDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t.twoFactorCodePlaceholder}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={twoFactor.handleDisableTwoFactor} disabled={twoFactor.isLoadingTwoFactor || twoFactor.twoFactorDisableCode.length !== 6}>
            {t.twoFactorDisable}
          </Button>
        </div>
      )}
    </div>
  );
}
