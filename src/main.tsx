import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Lock orientation to portrait across web, PWA and native (Capacitor)
const lockPortrait = async () => {
  try {
    const anyScreen = window.screen as any;
    if (anyScreen?.orientation?.lock) {
      await anyScreen.orientation.lock("portrait").catch(() => {});
    }
  } catch {
    // ignore — not supported (e.g. iOS Safari)
  }

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor?.isNativePlatform?.()) {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.lock({ orientation: "portrait" }).catch(() => {});
    }
  } catch {
    // plugin not installed in this environment
  }
};

lockPortrait();

createRoot(document.getElementById("root")!).render(<App />);
