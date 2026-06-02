import speakeasy from "speakeasy";
import QRCode from "qrcode";

const issuer = "Soulgraph";

export interface TwoFactorSetupPayload {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export function generateTwoFactorSecret() {
  return speakeasy.generateSecret({ length: 20 }).base32;
}

export async function buildTwoFactorSetup(secret: string, label: string): Promise<TwoFactorSetupPayload> {
  const otpauthUrl = speakeasy.otpauthURL({
    secret,
    label,
    issuer,
    encoding: "base32",
    algorithm: "sha1",
    digits: 6,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 220,
    color: {
      dark: "#0f172a",
      light: "#f8fafc",
    },
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

export function verifyTwoFactorCode(secret: string, code: string) {
  return speakeasy.totp.verify({
    token: code.replace(/\s+/g, ""),
    secret,
    encoding: "base32",
    window: 1,
  });
}
