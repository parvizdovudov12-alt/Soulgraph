import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNewsEventSchema, insertStateDataSchema } from "@shared/schema";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import "./types";

// Temporary storage for nonces (in production, use Redis or database)
const nonces = new Map<string, { nonce: string; timestamp: number }>();

// Clean up old nonces (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [address, data] of Array.from(nonces.entries())) {
    if (data.timestamp < fiveMinutesAgo) {
      nonces.delete(address);
    }
  }
}, 60 * 1000); // Run every minute

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth: Generate nonce for wallet signature
  app.post("/api/auth/nonce", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Generate a random nonce
      const nonce = Math.random().toString(36).substring(2, 15);
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
      const publicKey = new PublicKey(walletAddress);
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
        user = await storage.createUser({ walletAddress });
      }

      // Create session
      req.session.userId = user.id;
      req.session.walletAddress = user.walletAddress;

      res.json({ user });
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

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to get current user" });
    }
  });

  // Auth: Logout
  app.post("/api/auth/logout", async (req, res) => {
    try {
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

  // Get all news events
  app.get("/api/news-events", async (req, res) => {
    try {
      const events = await storage.getAllNewsEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news events" });
    }
  });

  // Create a news event
  app.post("/api/news-events", async (req, res) => {
    try {
      const validatedData = insertNewsEventSchema.parse(req.body);
      const event = await storage.createNewsEvent(validatedData);
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid news event data" });
    }
  });

  // Get all state data
  app.get("/api/state-data", async (req, res) => {
    try {
      const data = await storage.getAllStateData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch state data" });
    }
  });

  // Create state data
  app.post("/api/state-data", async (req, res) => {
    try {
      const validatedData = insertStateDataSchema.parse(req.body);
      const data = await storage.createStateData(validatedData);
      res.json(data);
    } catch (error) {
      res.status(400).json({ message: "Invalid state data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
