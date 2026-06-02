const GA_MEASUREMENT_ID = "G-9XCPJ7PE8F";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __soulgraphGaInitialized?: boolean;
  }
}

export function initGoogleAnalytics() {
  if (typeof window === "undefined" || window.__soulgraphGaInitialized) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  const hasGtagScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`,
  );

  if (!hasGtagScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  window.__soulgraphGaInitialized = true;
}
