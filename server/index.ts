import "dotenv/config";
import { createSoulgraphApp } from "./app";
import { log } from "./vite";

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

(async () => {
  const { server } = await createSoulgraphApp({ includeFrontend: true });
  const port = parseInt(process.env.PORT || "5000", 10);
  const isProduction = process.env.NODE_ENV === "production";

  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`Server started in ${isProduction ? "production" : "development"} mode on port ${port}`);
    if (isProduction) {
      log("Static files: serving from dist/public");
    }
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = `Port ${port}`;

    switch (error.code) {
      case "EACCES":
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
