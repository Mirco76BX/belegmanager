# BelegManager — Scan &amp; Log

Beleg-Scanner für iOS, Android und Web. Quittungen und Rechnungen per Kamera erfassen,
strukturiert ablegen und für die Buchhaltung bzw. Steuer exportieren.

- **Web:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui
- **Backend:** Supabase (Auth, Datenbank, Storage, Edge Functions)
- **Mobile:** Capacitor 8 (iOS + Android)
- **Bundle-ID:** `de.bakerix.scanandlog`

## Setup

```sh
# Dependencies
npm install

# Web-Dev-Server (http://localhost:8080)
npm run dev

# Supabase-Credentials: .env.example -> .env und ausfüllen
cp .env.example .env
```

## Mobile builds

Ausführliche Anleitung inkl. Xcode-, Android-Studio-, TestFlight- und Play-Console-Walkthrough:
**[`MOBILE-SETUP.md`](./MOBILE-SETUP.md)**.

Kurzfassung:

```sh
# 1) Plattformen einmalig hinzufügen (benötigt Mac für iOS)
npm run cap:add:platforms

# 2) App-Icons + Splash Screens generieren
npm run cap:assets

# 3) Dev-Build in Simulator / Emulator laufen lassen
npm run cap:run:ios
npm run cap:run:android

# 4) Native Projekte in Xcode / Android Studio öffnen (für Release-Builds)
npm run cap:open:ios
npm run cap:open:android
```

## Scripts

| Script | Zweck |
| --- | --- |
| `dev` | Vite Dev-Server |
| `build` | Production-Web-Build (`dist/`) |
| `test` | Vitest |
| `lint` | ESLint |
| `cap:sync` | Web-Build + `cap sync` (iOS &amp; Android) |
| `cap:add:platforms` | `cap add ios/android` + Native-Config patchen |
| `cap:assets` | Icons + Splash Screens aus `resources/` generieren |
| `cap:run:ios` / `cap:run:android` | Dev-Build in Device/Simulator |
| `cap:dev:ios` / `cap:dev:android` | WebView lädt Lovable-Preview (via `CAP_DEV=1`) |

## Project structure

```
belegmanager/
├── src/                   # React-App
├── supabase/              # Edge Functions, Migrations
├── resources/             # Icon- &amp; Splash-Source-PNGs (1024x / 2732x)
├── scripts/
│   └── apply-native-config.mjs   # patcht Info.plist + AndroidManifest
├── capacitor.config.ts    # iOS/Android Konfiguration
├── MOBILE-SETUP.md        # komplette Native-Build-Anleitung
└── .env.example
```

## Secrets

**Niemals** `.env`, Signing-Keys (`*.p8`, `*.p12`, `*.keystore`, `*.mobileprovision`)
oder `google-services.json` committen. `.gitignore` deckt die üblichen Fälle ab.
