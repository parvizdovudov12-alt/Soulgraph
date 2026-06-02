import type { Express, Request } from "express";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { IStorage } from "../storage";

const PREMIUM_PRICE_STARS = 500;
const PREMIUM_DAYS = 30;
const PREMIUM_PLAN = "premium_monthly";
const PROVIDER = "telegram_stars";

interface TelegramInitUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}

interface TelegramUpdate {
  update_id: number;
  pre_checkout_query?: {
    id: string;
    from: { id: number };
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
  message?: {
    from?: { id: number };
    successful_payment?: TelegramSuccessfulPayment;
  };
}

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

function getBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") || "";
}

function getPublicAppUrl(req: Request) {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const protocol = req.secure || req.get("x-forwarded-proto") === "https" ? "https" : "http";
  return `${protocol}://${req.get("host")}`;
}

function timingSafeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getPayloadSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
    || process.env.SESSION_SECRET?.trim()
    || getBotToken();
}

export function verifyTelegramInitData(initData: string, botToken = getBotToken()): TelegramInitUser | null {
  if (!initData || !botToken) {
    return null;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date") || 0);

  if (!hash || !Number.isFinite(authDate)) {
    return null;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds < 0 || ageSeconds > 24 * 60 * 60) {
    return null;
  }

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  if (!timingSafeHexEqual(expectedHash, hash)) {
    return null;
  }

  const rawUser = params.get("user");
  if (!rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser) as TelegramInitUser;
    return typeof user.id === "number" ? user : null;
  } catch {
    return null;
  }
}

function serializeSubscription(subscription: Awaited<ReturnType<IStorage["getActiveSubscription"]>>) {
  const isActive = !!subscription && subscription.status === "active" && subscription.expiresAt.getTime() > Date.now();
  return {
    isPremium: isActive,
    subscription: subscription
      ? {
          id: subscription.id,
          provider: subscription.provider,
          plan: subscription.plan,
          status: isActive ? "active" : subscription.status,
          startsAt: subscription.startsAt.toISOString(),
          expiresAt: subscription.expiresAt.toISOString(),
        }
      : null,
  };
}

async function answerPreCheckoutQuery(queryId: string, ok: boolean, errorMessage?: string) {
  const botToken = getBotToken();
  if (!botToken) {
    return;
  }

  await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pre_checkout_query_id: queryId,
      ok,
      error_message: ok ? undefined : errorMessage || "Payment cannot be processed right now.",
    }),
  });
}

function createPayload(userId: string, telegramId?: string | null) {
  const nonce = randomBytes(8).toString("hex");
  const telegramPart = telegramId ?? "pending";
  const unsignedPayload = `sg-premium-v2:${userId}:${telegramPart}:${nonce}`;
  const signature = createHmac("sha256", getPayloadSecret()).update(unsignedPayload).digest("hex").slice(0, 32);
  return `${unsignedPayload}:${signature}`;
}

function parsePayload(payload: string) {
  const parts = payload.split(":");

  if (parts[0] === "sg-premium-v2") {
    const [prefix, userId, telegramId, nonce, signature] = parts;
    if (!prefix || !userId || !nonce || !signature || !/^[a-f0-9]{16}$/i.test(nonce) || !/^[a-f0-9]{32}$/i.test(signature)) {
      return null;
    }

    const unsignedPayload = `${prefix}:${userId}:${telegramId}:${nonce}`;
    const expectedSignature = createHmac("sha256", getPayloadSecret()).update(unsignedPayload).digest("hex").slice(0, 32);
    if (!timingSafeHexEqual(expectedSignature.padEnd(64, "0"), signature.padEnd(64, "0"))) {
      return null;
    }

    return {
      userId,
      telegramId: telegramId && telegramId !== "pending" ? telegramId : null,
    };
  }

  const [prefix, userId, telegramId] = parts;
  if (prefix !== "sg-premium" || !userId || process.env.NODE_ENV === "production") {
    return null;
  }

  return {
    userId,
    telegramId: telegramId && telegramId !== "pending" ? telegramId : null,
  };
}

async function createInvoiceLink(input: {
  userId: string;
  telegramId?: string | null;
  appUrl: string;
}) {
  const botToken = getBotToken();
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const payload = createPayload(input.userId, input.telegramId);
  const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "SoulGraph Premium",
      description: `${PREMIUM_DAYS} days of Premium access for SoulGraph.`,
      payload,
      currency: "XTR",
      prices: [{ label: "SoulGraph Premium", amount: PREMIUM_PRICE_STARS }],
      start_parameter: "soulgraph-premium",
      suggested_tip_amounts: [],
      protect_content: true,
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      is_flexible: false,
    }),
  });
  const data = await response.json() as { ok: boolean; result?: string; description?: string };
  if (!response.ok || !data.ok || !data.result) {
    throw new Error(data.description || "Telegram invoice creation failed");
  }

  return {
    invoiceUrl: data.result,
    payload,
    returnUrl: `${input.appUrl}/?premium=return`,
  };
}

export function registerTelegramStarsPaymentRoutes(app: Express, storage: IStorage) {
  app.get("/api/me/subscription", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const subscription = await storage.getActiveSubscription(req.session.userId);
      res.json(serializeSubscription(subscription));
    } catch (error) {
      console.error("Subscription lookup error:", error);
      res.status(500).json({ message: "Failed to get subscription" });
    }
  });

  app.post("/api/payments/telegram/create-invoice", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      let telegramId: string | null = null;
      const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
      if (initData) {
        const telegramUser = verifyTelegramInitData(initData);
        if (!telegramUser) {
          return res.status(401).json({ message: "Invalid Telegram initData" });
        }

        telegramId = String(telegramUser.id);
        await storage.updateUserTelegramId(req.session.userId, telegramId);
      } else {
        const user = await storage.getUser(req.session.userId);
        telegramId = user?.telegramId ?? null;
      }

      const botUsername = getBotUsername();
      if (!getBotToken()) {
        if (!botUsername) {
          return res.status(503).json({ message: "Telegram bot is not configured" });
        }

        return res.json({
          invoiceUrl: `https://t.me/${botUsername}?start=soulgraph-premium`,
          botUrl: `https://t.me/${botUsername}`,
          isInvoiceReady: false,
        });
      }

      const invoice = await createInvoiceLink({
        userId: req.session.userId,
        telegramId,
        appUrl: getPublicAppUrl(req),
      });

      res.json({
        ...invoice,
        botUrl: botUsername ? `https://t.me/${botUsername}` : null,
        isInvoiceReady: true,
      });
    } catch (error) {
      console.error("Telegram invoice error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create invoice" });
    }
  });

  app.post("/api/payments/telegram/webhook", async (req, res) => {
    try {
      const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
      if (!webhookSecret && process.env.NODE_ENV === "production") {
        console.error("Telegram webhook rejected: TELEGRAM_WEBHOOK_SECRET is not configured");
        return res.status(503).json({ message: "Telegram webhook is not configured" });
      }

      if (webhookSecret && req.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
        return res.status(403).json({ message: "Invalid webhook secret" });
      }

      const update = req.body as TelegramUpdate;

      if (update.pre_checkout_query) {
        const query = update.pre_checkout_query;
        const payload = parsePayload(query.invoice_payload);
        const expectedTelegramId = payload?.telegramId;
        const ok = query.currency === "XTR"
          && query.total_amount === PREMIUM_PRICE_STARS
          && !!payload
          && (!expectedTelegramId || expectedTelegramId === String(query.from.id));
        await answerPreCheckoutQuery(query.id, ok, "Invalid SoulGraph Premium invoice.");
        return res.json({ ok: true });
      }

      const payment = update.message?.successful_payment;
      if (!payment) {
        return res.json({ ok: true, ignored: true });
      }

      if (payment.currency !== "XTR" || payment.total_amount !== PREMIUM_PRICE_STARS) {
        console.warn("Rejected Telegram payment with unexpected amount or currency", {
          currency: payment.currency,
          totalAmount: payment.total_amount,
        });
        return res.status(400).json({ message: "Unexpected payment currency or amount" });
      }

      const payload = parsePayload(payment.invoice_payload);
      if (!payload) {
        return res.status(400).json({ message: "Invalid invoice payload" });
      }

      const telegramId = update.message?.from?.id ? String(update.message.from.id) : payload.telegramId;
      if (payload.telegramId && telegramId && payload.telegramId !== telegramId) {
        console.warn("Rejected Telegram payment with mismatched telegram_id", {
          payloadTelegramId: payload.telegramId,
          updateTelegramId: telegramId,
        });
        return res.status(400).json({ message: "Invalid payment owner" });
      }

      let user = telegramId ? await storage.getUserByTelegramId(telegramId) : undefined;
      if (!user && payload.userId) {
        user = await storage.getUser(payload.userId);
        if (user && telegramId && !user.telegramId) {
          user = await storage.updateUserTelegramId(user.id, telegramId);
        }
      }

      if (!user) {
        console.error("Telegram payment confirmed but user was not found", {
          telegramId,
          payloadUserId: payload.userId,
        });
        return res.status(404).json({ message: "User not found for payment" });
      }

      const subscription = await storage.activateTelegramStarsSubscription({
        userId: user.id,
        telegramPaymentChargeId: payment.telegram_payment_charge_id,
        providerPaymentChargeId: payment.provider_payment_charge_id ?? null,
      });

      console.log("Telegram Stars Premium activated", {
        userId: user.id,
        telegramId,
        expiresAt: subscription.expiresAt.toISOString(),
      });

      res.json({ ok: true });
    } catch (error) {
      console.error("Telegram webhook error:", error);
      res.status(500).json({ message: "Failed to process Telegram webhook" });
    }
  });
}

export async function userHasActivePremium(storage: IStorage, userId: string) {
  const subscription = await storage.getActiveSubscription(userId);
  return !!subscription;
}

export const telegramStarsPremium = {
  provider: PROVIDER,
  plan: PREMIUM_PLAN,
  priceStars: PREMIUM_PRICE_STARS,
  days: PREMIUM_DAYS,
};
