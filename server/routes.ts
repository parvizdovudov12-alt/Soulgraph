import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNewsEventSchema, insertStateDataSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
