import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDailyTaskSchema, insertNewsEventSchema, insertStateDataSchema, portfolioAssetInputSchema, portfolioPriceUpdateSchema, registerUserSchema, loginUserSchema, searchUsersSchema, updateProfileSchema } from "@shared/schema";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { Response } from "express";
import "./types";
import { analyzeGoalWithAi } from "./goalAi";
import { registerTelegramStarsPaymentRoutes, userHasActivePremium } from "./payments/telegramStars";
import { buildTwoFactorSetup, generateTwoFactorSecret, verifyTwoFactorCode } from "./twoFactor";

// Temporary storage for nonces (in production, use Redis or database)
const nonces = new Map<string, { nonce: string; timestamp: number }>();
const pendingTwoFactorSetup = new Map<string, { secret: string; expiresAt: number }>();
const pendingLoginChallenges = new Map<string, { userId: string; expiresAt: number }>();
const authCookieName = "soulgraph_auth";
const authCookieMaxAge = 1000 * 60 * 60 * 24 * 30;
const allowedAvatarMimePrefixes = ["data:image/png", "data:image/jpeg", "data:image/webp", "data:image/gif"];
const twoFactorChallengeTtlMs = 1000 * 60 * 10;
const uuidLikePattern = /^[a-zA-Z0-9_-]{8,80}$/;

function isValidEntityId(value: unknown) {
  return typeof value === "string" && uuidLikePattern.test(value);
}

function isSafeScore(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= -100 && value <= 100;
}

function parseSafeNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");
    return Number(normalized);
  }
  return Number(value);
}

function isSafeEventMediaItem(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as { type?: unknown; url?: unknown };
  return (item.type === "image" || item.type === "video")
    && typeof item.url === "string"
    && item.url.length <= 2_800
    && (item.url.startsWith("data:image/") || item.url.startsWith("data:video/") || item.url.startsWith("blob:"));
}

function getAuthCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: authCookieMaxAge,
    path: "/",
  };
}

async function attachPersistentAuth(res: Response, userId: string) {
  const expiresAt = new Date(Date.now() + authCookieMaxAge);
  const authSession = await storage.createAuthSession(userId, expiresAt);
  res.cookie(authCookieName, authSession.token, getAuthCookieOptions());
}

function clearPersistentAuth(res: Response) {
  res.clearCookie(authCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
  });
}

function sanitizeUser(user: any) {
  const { password, twoFactorSecret, ...safeUser } = user;
  return safeUser;
}

function createPendingLoginChallenge(userId: string) {
  const token = randomBytes(24).toString("hex");
  pendingLoginChallenges.set(token, {
    userId,
    expiresAt: Date.now() + twoFactorChallengeTtlMs,
  });
  return token;
}

// Clean up old nonces (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [address, data] of Array.from(nonces.entries())) {
    if (data.timestamp < fiveMinutesAgo) {
      nonces.delete(address);
    }
  }

  const now = Date.now();
  for (const [userId, data] of Array.from(pendingTwoFactorSetup.entries())) {
    if (data.expiresAt <= now) {
      pendingTwoFactorSetup.delete(userId);
    }
  }

  for (const [token, challenge] of Array.from(pendingLoginChallenges.entries())) {
    if (challenge.expiresAt <= now) {
      pendingLoginChallenges.delete(token);
    }
  }
}, 60 * 1000); // Run every minute

export async function registerRoutes(app: Express): Promise<Server> {
  registerTelegramStarsPaymentRoutes(app, storage);

  // Auth: Register with email/password
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
        tokenName: validatedData.tokenName || "SOUL",
        walletAddress: null,
      });

      // Create session
      req.session.userId = user.id;
      await attachPersistentAuth(res, user.id);

      // Return user without password
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Failed to register" });
    }
  });

  // Auth: Login with email/password
  app.post("/api/auth/login-email", async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        const temporaryToken = createPendingLoginChallenge(user.id);
        return res.json({
          requiresTwoFactor: true,
          temporaryToken,
        });
      }

      req.session.userId = user.id;
      await attachPersistentAuth(res, user.id);

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Failed to login" });
    }
  });

  // Auth: Generate nonce for wallet signature
  app.post("/api/auth/nonce", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Generate a cryptographically strong nonce
      const nonce = randomBytes(16).toString("hex");
      nonces.set(walletAddress, { nonce, timestamp: Date.now() });

      res.json({ nonce });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate nonce" });
    }
  });

  // Auth: Verify signature and create session
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { walletAddress, signature } = req.body;

      if (!walletAddress || !signature) {
        return res.status(400).json({ message: "Wallet address and signature are required" });
      }

      // Get the nonce
      const nonceData = nonces.get(walletAddress);
      if (!nonceData) {
        return res.status(400).json({ message: "Nonce not found or expired" });
      }

      // Verify the signature
      const message = `Sign this message to authenticate with Soulgraph: ${nonceData.nonce}`;
      const messageBytes = new TextEncoder().encode(message);
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(walletAddress);
      } catch {
        return res.status(400).json({ message: "Invalid wallet address" });
      }
      const signatureBytes = bs58.decode(signature);

      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      if (!verified) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Delete the used nonce
      nonces.delete(walletAddress);

      // Find or create user
      let user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        user = await storage.createUser({
          walletAddress,
          email: null,
          password: null,
          tokenName: "SOUL",
        });
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        const temporaryToken = createPendingLoginChallenge(user.id);
        return res.json({
          requiresTwoFactor: true,
          temporaryToken,
        });
      }

      req.session.userId = user.id;
      await attachPersistentAuth(res, user.id);

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Failed to verify signature" });
    }
  });

  // Auth: Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(500).json({ message: "Failed to get current user" });
    }
  });

  app.get("/api/auth/2fa/status", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        enabled: !!user.twoFactorEnabled,
      });
    } catch (error) {
      console.error("2FA status error:", error);
      res.status(500).json({ message: "Failed to get 2FA status" });
    }
  });

  app.post("/api/auth/2fa/setup", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const label = user.email || user.walletAddress || user.tokenName || "Soulgraph";
      const secret = generateTwoFactorSecret();
      pendingTwoFactorSetup.set(user.id, {
        secret,
        expiresAt: Date.now() + twoFactorChallengeTtlMs,
      });

      const setup = await buildTwoFactorSetup(secret, label);
      res.json(setup);
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ message: "Failed to start 2FA setup" });
    }
  });

  app.post("/api/auth/2fa/enable", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: "Enter a valid 6-digit code" });
      }

      const pending = pendingTwoFactorSetup.get(req.session.userId);
      if (!pending || pending.expiresAt <= Date.now()) {
        pendingTwoFactorSetup.delete(req.session.userId);
        return res.status(400).json({ message: "2FA setup expired. Start setup again." });
      }

      if (!verifyTwoFactorCode(pending.secret, code)) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const user = await storage.updateUserTwoFactor(req.session.userId, {
        enabled: true,
        secret: pending.secret,
      });
      pendingTwoFactorSetup.delete(req.session.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        enabled: true,
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error("2FA enable error:", error);
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  app.post("/api/auth/2fa/disable", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: "Enter a valid 6-digit code" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA is not enabled" });
      }

      if (!verifyTwoFactorCode(user.twoFactorSecret, code)) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const updatedUser = await storage.updateUserTwoFactor(req.session.userId, {
        enabled: false,
        secret: null,
      });

      res.json({
        enabled: false,
        user: updatedUser ? sanitizeUser(updatedUser) : null,
      });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  app.post("/api/auth/2fa/verify-login", async (req, res) => {
    try {
      const temporaryToken = typeof req.body?.temporaryToken === "string" ? req.body.temporaryToken.trim() : "";
      const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

      if (!temporaryToken || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: "Temporary token and valid code are required" });
      }

      const challenge = pendingLoginChallenges.get(temporaryToken);
      if (!challenge || challenge.expiresAt <= Date.now()) {
        pendingLoginChallenges.delete(temporaryToken);
        return res.status(401).json({ message: "2FA challenge expired. Sign in again." });
      }

      const user = await storage.getUser(challenge.userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        pendingLoginChallenges.delete(temporaryToken);
        return res.status(400).json({ message: "2FA is not available for this account" });
      }

      if (!verifyTwoFactorCode(user.twoFactorSecret, code)) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      pendingLoginChallenges.delete(temporaryToken);
      req.session.userId = user.id;
      await attachPersistentAuth(res, user.id);

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("2FA login verification error:", error);
      res.status(500).json({ message: "Failed to verify 2FA code" });
    }
  });

  // Auth: Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = req.headers.cookie
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${authCookieName}=`))
        ?.slice(`${authCookieName}=`.length);

      if (token) {
        await storage.deleteAuthSession(decodeURIComponent(token));
      }

      clearPersistentAuth(res);

      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Auth: Update token name
  app.patch("/api/auth/token-name", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const rawTokenName = req.body?.tokenName;
      if (typeof rawTokenName !== 'string') {
        return res.status(400).json({ message: "Token name is required" });
      }

      const tokenName = rawTokenName.trim().toUpperCase();
      if (!tokenName) {
        return res.status(400).json({ message: "Token name cannot be empty" });
      }

      if (tokenName.length > 20) {
        return res.status(400).json({ message: "Token name must be 20 characters or less" });
      }

      if (!/^[A-Z0-9 _.-]+$/.test(tokenName)) {
        return res.status(400).json({ message: "Token name contains invalid characters" });
      }

      const user = await storage.updateUserTokenName(req.session.userId, tokenName);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(500).json({ message: "Failed to update token name" });
    }
  });

  // Update user's avatar
  app.patch("/api/users/avatar", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { avatarUrl } = req.body;
      if (!avatarUrl || typeof avatarUrl !== 'string') {
        return res.status(400).json({ message: "Avatar URL is required" });
      }

      // Validate base64 image data URL (max 2MB)
      if (!allowedAvatarMimePrefixes.some((prefix) => avatarUrl.startsWith(prefix))) {
        return res.status(400).json({ message: "Invalid image format" });
      }

      const [, base64Payload = ""] = avatarUrl.split(",", 2);
      const sizeInBytes = Buffer.byteLength(base64Payload, "base64");
      if (sizeInBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ message: "Avatar image must be less than 2MB" });
      }

      const user = await storage.updateUserAvatar(req.session.userId, avatarUrl);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // Get user's news events
  app.get("/api/news-events", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const events = await storage.getUserNewsEvents(req.session.userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news events" });
    }
  });

  // Create a news event
  app.post("/api/news-events", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertNewsEventSchema.omit({ userId: true }).parse({
        ...req.body,
        text: typeof req.body?.text === "string" ? req.body.text.trim() : req.body?.text,
      });
      if (!["positive", "negative"].includes(validatedData.type)) {
        return res.status(400).json({ message: "Invalid event type" });
      }
      if (!validatedData.text || validatedData.text.length > 500) {
        return res.status(400).json({ message: "Event text must be 1-500 characters" });
      }
      if (![validatedData.impactMental, validatedData.impactPhysical, validatedData.impactMoral, validatedData.impactFinancial].every(isSafeScore)) {
        return res.status(400).json({ message: "Event impact values are invalid" });
      }
      if (validatedData.media && (
        !Array.isArray(validatedData.media)
        || validatedData.media.length > 4
        || validatedData.media.some((item) => !isSafeEventMediaItem(item))
      )) {
        return res.status(400).json({ message: "Invalid event media" });
      }
      const event = await storage.createNewsEvent(req.session.userId, validatedData);
      res.json(event);
    } catch (error) {
      console.error("Failed to create news event:", error);
      res.status(400).json({ message: "Invalid news event data" });
    }
  });

  // Delete a single news event
  app.delete("/api/news-events/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id } = req.params;
      if (!isValidEntityId(id)) {
        return res.status(400).json({ message: "Invalid event id" });
      }
      await storage.deleteNewsEvent(req.session.userId, id);
      res.json({ success: true, message: "Event deleted" });
    } catch (error) {
      console.error("Failed to delete news event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Delete all user's news events
  app.delete("/api/news-events", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      await storage.deleteAllUserNewsEvents(req.session.userId);
      res.json({ success: true, message: "All events deleted" });
    } catch (error) {
      console.error("Failed to delete news events:", error);
      res.status(500).json({ message: "Failed to delete events" });
    }
  });

  app.get("/api/portfolio", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const portfolio = await storage.getUserPortfolio(req.session.userId);
      res.json(portfolio);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  app.post("/api/portfolio/assets", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const input = portfolioAssetInputSchema.parse({
        ...req.body,
        symbol: typeof req.body?.symbol === "string" ? req.body.symbol.trim().toUpperCase() : req.body?.symbol,
        name: typeof req.body?.name === "string" ? req.body.name.trim() : req.body?.name,
        quantity: parseSafeNumber(req.body?.quantity),
        entryPrice: parseSafeNumber(req.body?.entryPrice),
        currentPrice: parseSafeNumber(req.body?.currentPrice),
      });
      const result = await storage.createPortfolioAsset(req.session.userId, input);
      res.json(result);
    } catch (error) {
      console.error("Failed to add portfolio asset:", error);
      res.status(400).json({ message: "Invalid portfolio asset data" });
    }
  });

  app.post("/api/portfolio/movements", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const direction = req.body?.direction === "loss" ? "loss" : req.body?.direction === "profit" ? "profit" : null;
      const amount = parseSafeNumber(req.body?.amount);
      if (!direction || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
        return res.status(400).json({ message: "Invalid portfolio movement data" });
      }

      const result = await storage.createPortfolioMovement(req.session.userId, direction, amount);
      res.json(result);
    } catch (error) {
      console.error("Failed to add portfolio movement:", error);
      res.status(400).json({ message: "Invalid portfolio movement data" });
    }
  });

  app.patch("/api/portfolio/assets/:id/price", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!isValidEntityId(req.params.id)) {
        return res.status(400).json({ message: "Invalid asset id" });
      }

      const input = portfolioPriceUpdateSchema.parse({
        currentPrice: parseSafeNumber(req.body?.currentPrice),
      });
      const result = await storage.updatePortfolioAssetPrice(req.session.userId, req.params.id, input.currentPrice);
      if (!result) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Failed to update portfolio price:", error);
      res.status(400).json({ message: "Invalid portfolio price data" });
    }
  });

  app.delete("/api/portfolio/assets/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!isValidEntityId(req.params.id)) {
        return res.status(400).json({ message: "Invalid asset id" });
      }

      await storage.deletePortfolioAsset(req.session.userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete portfolio asset:", error);
      res.status(500).json({ message: "Failed to delete portfolio asset" });
    }
  });

  app.get("/api/daily-tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const tasks = await storage.getUserDailyTasks(req.session.userId);
      res.json(tasks);
    } catch (error) {
      console.error("Failed to fetch daily tasks:", error);
      res.status(500).json({ message: "Failed to fetch daily tasks" });
    }
  });

  app.post("/api/daily-tasks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedTask = insertDailyTaskSchema.parse({
        ...req.body,
        text: typeof req.body?.text === "string" ? req.body.text.trim() : req.body?.text,
      });
      if (!validatedTask.text) {
        return res.status(400).json({ message: "Task text is required" });
      }
      if (validatedTask.text.length > 160) {
        return res.status(400).json({ message: "Task text is too long" });
      }
      if (!validatedTask.impact || !Object.values(validatedTask.impact).every((value) => typeof value === "number" && isSafeScore(value))) {
        return res.status(400).json({ message: "Task impact values are invalid" });
      }

      const task = await storage.createDailyTask(req.session.userId, validatedTask);
      res.json(task);
    } catch (error) {
      console.error("Failed to create daily task:", error);
      res.status(400).json({ message: "Invalid daily task data" });
    }
  });

  app.patch("/api/daily-tasks/:id/complete", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const dayKey = typeof req.body?.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.dayKey)
        ? req.body.dayKey
        : null;
      if (!dayKey) {
        return res.status(400).json({ message: "Valid dayKey is required" });
      }

      if (!isValidEntityId(req.params.id)) {
        return res.status(400).json({ message: "Invalid task id" });
      }

      const task = await storage.completeDailyTask(req.session.userId, req.params.id, dayKey);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Failed to complete daily task:", error);
      res.status(500).json({ message: "Failed to complete daily task" });
    }
  });

  app.patch("/api/daily-tasks/:id/pin", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!isValidEntityId(req.params.id)) {
        return res.status(400).json({ message: "Invalid task id" });
      }

      const pinned = req.body?.pinned === true;
      const task = await storage.updateDailyTaskPinned(req.session.userId, req.params.id, pinned);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Failed to update daily task pin:", error);
      res.status(500).json({ message: "Failed to update daily task" });
    }
  });

  app.patch("/api/daily-tasks/reorder", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const taskIds: string[] = Array.isArray(req.body?.taskIds)
        ? req.body.taskIds.filter((taskId: unknown): taskId is string => isValidEntityId(taskId))
        : [];
      if (taskIds.length === 0 || taskIds.length > 200) {
        return res.status(400).json({ message: "Valid taskIds are required" });
      }

      const uniqueTaskIds = Array.from(new Set(taskIds));
      const tasks = await storage.reorderDailyTasks(req.session.userId, uniqueTaskIds);
      res.json(tasks);
    } catch (error) {
      console.error("Failed to reorder daily tasks:", error);
      res.status(500).json({ message: "Failed to reorder daily tasks" });
    }
  });

  app.delete("/api/daily-tasks/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!isValidEntityId(req.params.id)) {
        return res.status(400).json({ message: "Invalid task id" });
      }

      await storage.deleteDailyTask(req.session.userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete daily task:", error);
      res.status(500).json({ message: "Failed to delete daily task" });
    }
  });

  // Get user's state data
  app.get("/api/state-data", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const data = await storage.getUserStateData(req.session.userId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch state data" });
    }
  });

  // Create state data
  app.post("/api/state-data", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertStateDataSchema.omit({ userId: true }).parse(req.body);
      if (![validatedData.mental, validatedData.physical, validatedData.moral, validatedData.financial].every(isSafeScore)) {
        return res.status(400).json({ message: "State values are invalid" });
      }
      const data = await storage.createStateData(req.session.userId, validatedData);
      res.json(data);
    } catch (error) {
      console.error("Failed to create state data:", error);
      res.status(400).json({ message: "Invalid state data" });
    }
  });

  // ====== SOCIAL FEATURES ======

  // Search users
  app.get("/api/social/search", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parsedQuery = searchUsersSchema.safeParse({ query: req.query.query });
      if (!parsedQuery.success) {
        return res.json([]);
      }

      const query = parsedQuery.data.query.trim();
      if (!query) {
        return res.json([]);
      }

      const results = await storage.searchUsers(query, req.session.userId);
      
      // Remove sensitive data
      const sanitizedResults = results.map(user => ({
        id: user.id,
        tokenName: user.tokenName,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
        isFollowing: user.isFollowing,
      }));

      res.json(sanitizedResults);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get current user's profile
  app.get("/api/social/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      let profile = await storage.getUserProfile(req.session.userId);
      
      // Create default profile if doesn't exist
      if (!profile) {
        const user = await storage.getUser(req.session.userId);
        profile = await storage.createUserProfile({
          userId: req.session.userId,
          displayName: user?.tokenName || null,
          bio: null,
          goal: null,
          isPublic: true,
          allowEventSharing: false,
        });
      }

      res.json(profile);
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Update current user's profile
  app.patch("/api/social/profile", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedProfile = updateProfileSchema.parse(req.body);
      const { displayName, bio, goal, isPublic, allowEventSharing } = validatedProfile;
      
      let profile = await storage.getUserProfile(req.session.userId);
      
      if (!profile) {
        profile = await storage.createUserProfile({
          userId: req.session.userId,
          displayName: displayName || null,
          bio: bio || null,
          goal: goal || null,
          isPublic: isPublic ?? true,
          allowEventSharing: allowEventSharing ?? false,
        });
      } else {
        profile = await storage.updateUserProfile(req.session.userId, {
          displayName,
          bio,
          goal,
          isPublic,
          allowEventSharing,
        });
      }

      res.json(profile);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/goal-analysis/ai", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const goal = typeof req.body?.goal === "string" ? req.body.goal.trim() : "";
      const timeframe = typeof req.body?.timeframe === "string" ? req.body.timeframe : "1D";
      const language = req.body?.language === "en" ? "en" : "ru";
      const events = Array.isArray(req.body?.events) ? req.body.events : [];

      if (!goal) {
        return res.status(400).json({ message: "Goal is required" });
      }

      if (goal.length > 500) {
        return res.status(400).json({ message: "Goal is too long" });
      }

      if (!(await userHasActivePremium(storage, req.session.userId))) {
        return res.status(402).json({ message: "Premium is required for AI goal analysis" });
      }

      if (!["30S", "1M", "30M", "1H", "4H", "1D"].includes(timeframe)) {
        return res.status(400).json({ message: "Invalid timeframe" });
      }

      const safeEvents = events
        .map((event: any) => ({
          id: typeof event?.id === "string" ? event.id : undefined,
          time: Number(event?.time),
          type: event?.type === "negative" ? "negative" : "positive",
          text: typeof event?.text === "string" ? event.text.slice(0, 400) : "",
          impact: {
            mental: Number(event?.impact?.mental ?? 0),
            physical: Number(event?.impact?.physical ?? 0),
            moral: Number(event?.impact?.moral ?? 0),
            financial: Number(event?.impact?.financial ?? 0),
          },
        }))
        .filter((event: { time: number; text: string }) => Number.isFinite(event.time) && event.text.trim().length > 0);

      const analysis = await analyzeGoalWithAi({
        goal,
        timeframe,
        language,
        events: safeEvents,
      });

      res.json(analysis);
    } catch (error) {
      console.error("AI goal analysis error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to generate AI analysis",
      });
    }
  });

  // Follow a user
  app.post("/api/social/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { userId } = req.body;
      if (!isValidEntityId(userId)) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const relationship = await storage.followUser(req.session.userId, userId);
      res.json(relationship);
    } catch (error) {
      console.error("Follow error:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  // Unfollow a user
  app.delete("/api/social/follow/:userId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { userId } = req.params;
      if (!isValidEntityId(userId)) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      await storage.unfollowUser(req.session.userId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unfollow error:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Get users I'm following
  app.get("/api/social/following", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const following = await storage.getFollowing(req.session.userId);
      
      // Remove sensitive data
      const sanitizedFollowing = following.map(user => ({
        id: user.id,
        tokenName: user.tokenName,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
      }));

      res.json(sanitizedFollowing);
    } catch (error) {
      console.error("Following error:", error);
      res.status(500).json({ message: "Failed to get following" });
    }
  });

  // Get my followers
  app.get("/api/social/followers", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const followers = await storage.getFollowers(req.session.userId);
      
      // Remove sensitive data
      const sanitizedFollowers = followers.map(user => ({
        id: user.id,
        tokenName: user.tokenName,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
      }));

      res.json(sanitizedFollowers);
    } catch (error) {
      console.error("Followers error:", error);
      res.status(500).json({ message: "Failed to get followers" });
    }
  });

  // Get another user's public data (for viewing their graph)
  app.get("/api/social/users/:userId", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { userId } = req.params;
      if (!isValidEntityId(userId)) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      const publicData = await storage.getPublicUserData(userId, req.session.userId);

      if (!publicData) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove sensitive data
      const sanitizedData = {
        user: {
          id: publicData.user.id,
          tokenName: publicData.user.tokenName,
          avatarUrl: publicData.user.avatarUrl,
        },
        profile: publicData.profile,
        stateData: publicData.stateData,
        events: publicData.events,
        isFollowing: publicData.isFollowing,
      };

      res.json(sanitizedData);
    } catch (error) {
      console.error("User data error:", error);
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}






