import "dotenv/config";
import { createSoulgraphApp } from "../server/app";

let appPromise: ReturnType<typeof createSoulgraphApp> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createSoulgraphApp({ includeFrontend: false });
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  const { app } = await getApp();
  return app(req, res);
}
