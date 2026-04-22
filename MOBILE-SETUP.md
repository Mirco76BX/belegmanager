# BelegManager — Mobile Setup

Vollständige Anleitung, wie du aus diesem Repo eine store-ready iOS- und Android-App baust.

- **Bundle-ID iOS:** `de.bakerix.scanandlog`
- **Package-Name Android:** `de.bakerix.scanandlog`
- **App-Name:** `BelegManager`
- **Branding-Farbe:** `#0b1f3a` (Navy)

---

## 0. Voraussetzungen

**Mac (iOS + Android):**
- macOS 14+
- Xcode 15+ &amp; Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods` (oder `brew install cocoapods`)
- Apple Developer Account ($99/Jahr)

**Android (funktioniert auch auf Windows/Linux):**
- Android Studio (Giraffe oder neuer)
- JDK 17
- Google Play Developer Account ($25 einmalig)

**Allgemein:**
- Node.js 20 LTS (`nvm install 20`)
- Git
- `npm install` im Repo einmal ausgeführt

---

## 1. Native Plattformen anlegen

```sh
# Vom Repo-Root:
npm install                    # installiert u.a. @capacitor/ios, @capacitor/android
npm run build                  # erzeugt dist/ (Capacitor liest daraus)
npm run cap:add:platforms      # cap add ios + cap add android + Native-Config-Patcher
```

Das erzeugt die Ordner `ios/` und `android/`. Unser Script
`scripts/apply-native-config.mjs` patcht danach automatisch:

**iOS `Info.plist`**
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`
- `CFBundleURLTypes` mit Scheme `belegmanager` (OAuth-Redirect)

**Android `AndroidManifest.xml`**
- `android.permission.CAMERA`
- `android.permission.READ_MEDIA_IMAGES`
- `<queries>` für `IMAGE_CAPTURE`-Intent (Android 11+)
- `<intent-filter>` mit `android:scheme="belegmanager"`

> Wenn du später weitere Permissions brauchst, erweitere den Patcher — nicht
> direkt Info.plist / AndroidManifest, sonst wird es nach jedem `cap sync` überschrieben.

---

## 2. Icons &amp; Splash Screens generieren

Die Source-Assets liegen in `resources/`:

- `icon.png` (1024×1024) — App-Icon
- `icon-foreground.png` + `icon-background.png` — Android Adaptive Icon
- `splash.png` (2732×2732) — Splash Screen

Generieren:

```sh
npm run cap:assets
```

Das schreibt alle benötigten Größen direkt in `ios/App/App/Assets.xcassets` und
`android/app/src/main/res/`. Danach einmal `cap sync` aufrufen.

Icons austauschen: einfach die Dateien in `resources/` ersetzen und
`npm run cap:assets` erneut laufen lassen.

---

## 3. Development-Workflow

**Web-Dev:**
```sh
npm run dev         # http://localhost:8080
```

**Native-Dev (Simulator/Emulator):**
```sh
npm run cap:run:ios        # baut Web, syncs, startet iOS-Simulator
npm run cap:run:android    # dito für Android
```

**Live-Reload aus Lovable-Preview (nur Dev):**
```sh
npm run cap:dev:ios        # setzt CAP_DEV=1, WebView lädt Lovable-URL
npm run cap:dev:android
```

In `capacitor.config.ts` wird der `server.url`-Block nur aktiv, wenn `CAP_DEV=1`.
Für Store-Builds **immer ohne** `CAP_DEV` bauen.

---

## 4. iOS — Signing &amp; TestFlight

### 4.1 Projekt in Xcode öffnen

```sh
npm run cap:open:ios
```

### 4.2 Team &amp; Bundle-ID

1. Linke Seitenleiste: `App` → `TARGETS: App` → Tab **Signing &amp; Capabilities**.
2. **Team:** dein Apple-Developer-Team wählen.
3. **Bundle Identifier:** `de.bakerix.scanandlog` (oder wähle einen eigenen, z. B. `de.bakerix.belegmanager` — dann musst du den auch in `capacitor.config.ts` ändern).
4. **Automatically manage signing:** aktiviert lassen (Xcode erstellt Provisioning-Profile).

### 4.3 Capabilities (optional, je nach Feature)

- **Push Notifications** (falls du später Supabase Push via APNs brauchst)
- **Sign in with Apple** (falls OAuth-Button genutzt wird)

### 4.4 App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+ → New App**.
2. **Platform:** iOS, **Primary Language:** German, **Bundle ID:** `de.bakerix.scanandlog`, **SKU:** `belegmanager-ios-001`.
3. **App Information:** Kategorie „Finanzen" oder „Wirtschaft", Privacy Policy URL (Pflicht — siehe §7).
4. **App Privacy:** Deklariere mindestens
   - *Kontaktinfos:* E-Mail (Login)
   - *Identifiers:* User-ID
   - *Nutzungsdaten:* Scans/Belege (optional)

### 4.5 Archive → TestFlight

1. In Xcode: Scheme auf **Any iOS Device (arm64)** stellen.
2. **Product → Archive**.
3. Nach ~2 Min öffnet sich der Organizer → **Distribute App → App Store Connect → Upload**.
4. Warten bis der Build in TestFlight „processed" ist (~15 Min).
5. In App Store Connect → TestFlight → interne Tester einladen (deine Apple-ID).
6. Nach Tests: **Submit for Review** (Dauer: 24–72 h).

---

## 5. Android — Signing &amp; Play Store

### 5.1 Projekt in Android Studio öffnen

```sh
npm run cap:open:android
```

Beim ersten Öffnen synct Gradle — kann 2–10 Min dauern.

### 5.2 Release-Keystore erzeugen

```sh
# In einem Ordner AUSSERHALB des Repos speichern!
keytool -genkey -v -keystore ~/keys/belegmanager-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias belegmanager
```

Passwort + Alias merken. Keystore-Datei niemals committen.

### 5.3 `android/key.properties` anlegen (nicht committen)

```properties
storePassword=DEIN_PASSWORT
keyPassword=DEIN_PASSWORT
keyAlias=belegmanager
storeFile=/Users/mirco/keys/belegmanager-release.jks
```

### 5.4 `android/app/build.gradle` anpassen

Am Anfang der Datei, noch vor `android { ... }`:

```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Im `android { ... }`-Block:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### 5.5 AAB bauen

```sh
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 5.6 Play Console

1. [play.google.com/console](https://play.google.com/console) → **Create app**.
2. Name: `BelegManager`, Default language: Deutsch, App/Game: App, Free/Paid: Free.
3. Dashboard → **Internal testing → Create new release**.
4. AAB hochladen, Release Notes schreiben, **Review &amp; release**.
5. Parallel: **Data safety**, **Content rating** (IARC-Fragebogen), **Target audience**,
   **App content** (alle grünen Haken bevor Public Release).
6. **Production → Create new release** → Rollout 20 % → später 100 %.

---

## 6. Datenschutz &amp; Store-Pflichten

Apple **und** Google verlangen (Stand 2026):

- **Privacy Policy URL** (Pflichtfeld, muss öffentlich erreichbar sein)
- **Datenschutz-Deklaration** (welche Daten werden erfasst: E-Mail, Belege, Gerätedaten)
- **Impressum** (DE-Pflicht — direkt in der App oder auf der Landing-Page)
- **Löschpfad für Nutzerdaten** (Apple-Richtlinie 5.1.1(v) — Account-Löschung in der App erforderlich)

Für BelegManager: Stelle sicher, dass
1. Nutzer in **Profil → Konto löschen** eine Löschfunktion haben, die via Supabase das User-Row und alle Storage-Objekte entfernt.
2. `https://bakerix.de/privacy` (oder Subdomain) erreichbar ist mit aktueller DSGVO-konformer Datenschutzerklärung.
3. Das Impressum verlinkt ist.

---

## 7. Store-Listing Checkliste

**Vor erstem Submit brauchst du:**

| Asset | iOS | Android |
| --- | --- | --- |
| App-Icon 1024×1024 | ✅ (aus `resources/icon.png`) | ✅ |
| Screenshots 6.7" iPhone (mind. 3) | ✅ | — |
| Screenshots 6.1" iPhone (optional) | ✅ | — |
| Screenshots iPad 12.9" (wenn iPad unterstützt) | ✅ | — |
| Phone-Screenshots (1080×1920 o. ä.) | — | ✅ (mind. 2) |
| Tablet-Screenshots (optional) | — | ✅ |
| Feature Graphic 1024×500 | — | ✅ |
| Kurzbeschreibung (80 Zeichen) | ✅ | ✅ |
| Lange Beschreibung (4000 Zeichen) | ✅ | ✅ |
| Keywords (iOS, 100 Zeichen) | ✅ | — |
| Support-URL | ✅ | ✅ |
| Marketing-URL (optional) | ✅ | ✅ |
| Privacy Policy URL | ✅ | ✅ |

**Screenshots erzeugen:** In Xcode-Simulator / Android-Emulator die App laufen
lassen, jeweils `Cmd+S` / Screenshot-Button. Für mehr Punch evtl. mit
[Fastlane Frameit](https://docs.fastlane.tools/actions/frameit/) rahmen.

---

## 8. CI/CD (später)

Wenn du Releases nicht manuell machen willst, siehe z. B.:
- GitHub Actions + Fastlane (iOS: `gym`+`pilot`; Android: `supply`)
- Expo-Alternative: Bitrise oder Codemagic (beide unterstützen Capacitor nativ)

Dafür werden Secrets (App Store Connect API-Key als `.p8`, Play Console Service
Account JSON, Keystore als Base64) als GitHub Secrets hinterlegt.

---

## 9. Troubleshooting

**Xcode: „No signing certificate found"**
→ Xcode → Settings → Accounts → Apple ID hinzufügen → Team neu laden.

**`cap sync` überschreibt Info.plist / Manifest**
→ Unser `apply-native-config.mjs` ist idempotent und wird als `postinstall` +
in `cap:add:platforms` aufgerufen. Wenn du direkt `npx cap sync` machst, führe
danach `node scripts/apply-native-config.mjs` aus. Oder nutze `npm run cap:sync`.

**iOS-Build: „NSCameraUsageDescription missing"**
→ `node scripts/apply-native-config.mjs` noch einmal ausführen.

**Android: Gradle-Fehler „SDK location not found"**
→ `android/local.properties` erzeugen mit `sdk.dir=/Users/DU/Library/Android/sdk`.

**Supabase-Auth-Callback kommt nicht zurück in die App**
→ Im Supabase-Dashboard bei Auth → URL Config → **Redirect URLs** eintragen:
`belegmanager://auth/callback` (oder deine tatsächliche Callback-URL).

**App zeigt „Website nicht erreichbar" statt UI**
→ Du hast vermutlich mit `CAP_DEV=1` gebaut, aber der Lovable-Preview ist offline.
Neu bauen mit `npm run build && npm run cap:sync` (ohne `CAP_DEV`).

---

## 10. Quick-Reference Befehle

```sh
# Dev-Loop (Simulator)
npm run cap:run:ios
npm run cap:run:android

# Release-Build vorbereiten
npm run build
npm run cap:sync
npm run cap:open:ios      # dann in Xcode: Product → Archive
npm run cap:open:android  # dann in Android Studio: Build → Generate Signed Bundle
```
