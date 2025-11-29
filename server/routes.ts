import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNewsEventSchema, insertStateDataSchema, registerUserSchema, loginUserSchema, searchUsersSchema } from "@shared/schema";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import bcrypt from "bcryptjs";
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

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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

      // Create session
      req.session.userId = user.id;

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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
        user = await storage.createUser({
          walletAddress,
          email: null,
          password: null,
          tokenName: "SOUL",
        });
      }

      // Create session
      req.session.userId = user.id;

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
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

  // Auth: Update token name
  app.patch("/api/auth/token-name", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { tokenName } = req.body;
      if (!tokenName || typeof tokenName !== 'string') {
        return res.status(400).json({ message: "Token name is required" });
      }

      if (tokenName.length > 20) {
        return res.status(400).json({ message: "Token name must be 20 characters or less" });
      }

      const user = await storage.updateUserTokenName(req.session.userId, tokenName);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
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
      if (!avatarUrl.startsWith('data:image/')) {
        return res.status(400).json({ message: "Invalid image format" });
      }

      const sizeInBytes = (avatarUrl.length * 3) / 4;
      if (sizeInBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ message: "Avatar image must be less than 2MB" });
      }

      const user = await storage.updateUserAvatar(req.session.userId, avatarUrl);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
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

      const validatedData = insertNewsEventSchema.omit({ userId: true }).parse(req.body);
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

      const query = req.query.query as string;
      if (!query || query.length < 1) {
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

      const { displayName, bio, isPublic, allowEventSharing } = req.body;
      
      let profile = await storage.getUserProfile(req.session.userId);
      
      if (!profile) {
        profile = await storage.createUserProfile({
          userId: req.session.userId,
          displayName: displayName || null,
          bio: bio || null,
          isPublic: isPublic ?? true,
          allowEventSharing: allowEventSharing ?? false,
        });
      } else {
        profile = await storage.updateUserProfile(req.session.userId, {
          displayName,
          bio,
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

  // Follow a user
  app.post("/api/social/follow", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
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
