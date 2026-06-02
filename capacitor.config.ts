import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.soulgraph.app",
  appName: "Soulgraph",
  webDir: "dist/public",
  ios: {
    contentInset: "automatic",
  },
};

export default config;
