import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for BelegManager / Scan & Log.
 *
 * Toggle DEV_MODE via env var CAP_DEV=1 to load the hosted Lovable preview
 * instead of the locally-bundled dist. Useful when iterating in Lovable.
 *
 * Production builds (store release) MUST be built with CAP_DEV unset, so
 * the app loads `dist/` from inside the IPA/APK/AAB.
 */
const DEV_MODE = process.env.CAP_DEV === "1";

const config: CapacitorConfig = {
  appId: "de.belegmanager.scanandlog",
  appName: "BelegManager",
  webDir: "dist",
  // bundledWebRuntime: false,  // (Capacitor >=3 default)

  // --- iOS ---
  ios: {
    contentInset: "always",
    // Verhindert Browser-Bounce/Overscroll am Seitenende. Vertikales Scrollen
    // innerhalb der App bleibt davon unberührt.
    scrollEnabled: true,
    // For custom URL scheme (OAuth redirect), set in Info.plist:
    //   CFBundleURLSchemes = ["belegmanager"]
    scheme: "belegmanager",
  },

  // --- Android ---
  android: {
    // Keystore + signing configured in android/app/build.gradle at release time.
    allowMixedContent: false,
    captureInput: true,
  },

  // --- Plugin configuration ---
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0b1f3a",        // app brand navy
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0b1f3a",
    },
    Camera: {
      // permissions declared in native configs (Info.plist + AndroidManifest)
    },
  },

  // --- Dev-only: load from Lovable preview (do not ship to stores) ---
  ...(DEV_MODE
    ? {
        server: {
          url: "https://5196d375-f0b6-42d1-b73c-097cbd42414c.lovableproject.com?forceHideBadge=true",
          cleartext: true,
        },
      }
    : {}),
};

export default config;
