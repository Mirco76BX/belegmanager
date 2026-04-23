import { useEffect, useState } from "react";

/**
 * Bridge page for native (Capacitor) OAuth flow.
 *
 * Flow:
 *  1. Native app opens this URL in the system browser as the OAuth redirect target.
 *  2. The Lovable / Supabase OAuth flow finishes here with tokens in the URL hash
 *     (or a `code` query param for PKCE).
 *  3. We forward everything to the app via the custom scheme `belegmanager://auth/callback`.
 *  4. The app's deep-link listener (see App.tsx) picks it up and finalizes the session.
 *
 * This page is only meant for the native flow. On the web, OAuth completes directly
 * on /auth without ever hitting this route.
 */
const NativeAuthCallback = () => {
  const [status, setStatus] = useState<"forwarding" | "manual">("forwarding");

  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const target = `belegmanager://auth/callback${search}${hash}`;

    // Try to redirect to the app
    window.location.href = target;

    // If the app didn't open within 2s, show a manual fallback
    const timeout = setTimeout(() => setStatus("manual"), 2000);
    return () => clearTimeout(timeout);
  }, []);

  const manualOpen = () => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    window.location.href = `belegmanager://auth/callback${search}${hash}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-primary/20" />
        <h1 className="text-lg font-semibold text-foreground">
          {status === "forwarding" ? "App wird geöffnet…" : "Bitte App öffnen"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status === "forwarding"
            ? "Sie werden zurück in die BelegManager-App geleitet."
            : "Falls die App sich nicht automatisch öffnet, tippen Sie auf den Button:"}
        </p>
        {status === "manual" && (
          <button
            onClick={manualOpen}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Zurück zur App
          </button>
        )}
      </div>
    </div>
  );
};

export default NativeAuthCallback;
