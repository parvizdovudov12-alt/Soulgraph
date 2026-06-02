import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { storage, storageReady } from "./storage";
import "./types";
import { setupVite, serveStatic, log } from "./vite";

export interface SoulgraphAppOptions {
  includeFrontend?: boolean;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const prefix = `${cookieName}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
}

function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix ?? req.path}:${req.ip}`;
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (existing.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    existing.count += 1;
    next();
  };
}

function setSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === "production";
  const csp = [
    "default-src 'self'",
      "img-src 'self' data: blob: https://www.google-analytics.com https://stats.g.doubleclick.net",
    "media-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "script-src 'self' https://www.googletagmanager.com",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://stats.g.doubleclick.net",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  next();
}

function isSameOrigin(candidate: string, req: Request) {
  try {
    const candidateUrl = new URL(candidate);
    const host = req.get("host");
    const protocol = req.secure || req.get("x-forwarded-proto") === "https" ? "https:" : "http:";
    return candidateUrl.host === host && candidateUrl.protocol === protocol;
  } catch {
    return false;
  }
}

function enforceSameOriginOnMutations(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api") || safeMethods.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const origin = req.get("origin");
  const referer = req.get("referer");

  if (origin && !isSameOrigin(origin, req)) {
    res.status(403).json({ message: "Cross-site requests are not allowed" });
    return;
  }

  if (!origin && referer && !isSameOrigin(referer, req)) {
    res.status(403).json({ message: "Cross-site requests are not allowed" });
    return;
  }

  next();
}

export async function createSoulgraphApp(options: SoulgraphAppOptions = {}) {
  const { includeFrontend = false } = options;
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const useSecureCookies = process.env.COOKIE_SECURE === "true";
  const authCookieName = "soulgraph_auth";

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(setSecurityHeaders);
  app.use(enforceSameOriginOnMutations);
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: false, limit: "5mb" }));

  const apiRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 300, keyPrefix: "api" });
  const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15 });
  const aiRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 40 });
  const paymentRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });
  const uploadRateLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

  app.use("/api", apiRateLimiter);
  app.use("/api/auth/register", authRateLimiter);
  app.use("/api/auth/login-email", authRateLimiter);
  app.use("/api/auth/verify", authRateLimiter);
  app.use("/api/auth/2fa/verify-login", authRateLimiter);
  app.use("/api/auth/2fa/setup", authRateLimiter);
  app.use("/api/auth/2fa/enable", authRateLimiter);
  app.use("/api/auth/2fa/disable", authRateLimiter);
  app.use("/api/auth/nonce", authRateLimiter);
  app.use("/api/payments/telegram/create-invoice", paymentRateLimiter);
  app.use("/api/payments/telegram/webhook", paymentRateLimiter);
  app.use("/api/goal-analysis/ai", aiRateLimiter);
  app.use("/api/users/avatar", uploadRateLimiter);

  app.use(async (req, res, next) => {
    const token = getCookieValue(req.headers.cookie, authCookieName);
    req.session = {
      destroy: (callback) => {
        if (!token) {
          res.clearCookie(authCookieName, {
            httpOnly: true,
            sameSite: "lax",
            secure: useSecureCookies,
            path: "/",
          });
          callback();
          return;
        }

        storage.deleteAuthSession(token)
          .then(() => {
            req.session.userId = undefined;
            res.clearCookie(authCookieName, {
              httpOnly: true,
              sameSite: "lax",
              secure: useSecureCookies,
              path: "/",
            });
            callback();
          })
          .catch((error) => callback(error instanceof Error ? error : new Error("Failed to destroy session")));
      },
    };

    if (!token) {
      next();
      return;
    }

    try {
      const user = await storage.getUserBySessionToken(token);
      if (!user) {
        res.clearCookie(authCookieName, {
          httpOnly: true,
          sameSite: "lax",
          secure: useSecureCookies,
          path: "/",
        });
        next();
        return;
      }

      req.session.userId = user.id;
      next();
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res, next) => {
    const start = Date.now();
    const pathName = req.path;
    let capturedJsonResponse: unknown;

    const originalResJson = res.json.bind(res);
    res.json = function patchedJson(bodyJson: unknown) {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson);
    } as typeof res.json;

    res.on("finish", () => {
      if (!pathName.startsWith("/api")) {
        return;
      }

      const duration = Date.now() - start;
      let logLine = `${req.method} ${pathName} ${res.statusCode} in ${duration}ms`;

      if (
        res.statusCode >= 400 &&
        capturedJsonResponse &&
        typeof capturedJsonResponse === "object" &&
        "message" in (capturedJsonResponse as Record<string, unknown>)
      ) {
        logLine += ` :: ${(capturedJsonResponse as Record<string, unknown>).message}`;
      }

      log(logLine);
    });

    next();
  });

  await storageReady;
  const server = await registerRoutes(app);

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = isProduction ? "Internal Server Error" : err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    console.error(err);
  });

  if (includeFrontend) {
    if (isProduction) {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }
  }

  return { app, server };
}
