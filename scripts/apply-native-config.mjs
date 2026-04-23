#!/usr/bin/env node
/**
 * apply-native-config.mjs
 *
 * Patches iOS Info.plist and Android AndroidManifest.xml after
 * `npx cap add ios` / `npx cap add android` so the native projects
 * declare the permissions and URL schemes BelegManager needs:
 *
 *   iOS:
 *     - NSCameraUsageDescription            (Beleg-Fotos)
 *     - NSPhotoLibraryUsageDescription      (Bestehende Fotos wählen)
 *     - NSPhotoLibraryAddUsageDescription   (PDFs/Bilder speichern)
 *     - CFBundleURLTypes.CFBundleURLSchemes = ["belegmanager"] (OAuth redirect)
 *
 *   Android:
 *     - <uses-permission android:name="android.permission.CAMERA" />
 *     - <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
 *     - <queries> for camera intents (Android 11+)
 *     - <intent-filter> with scheme="belegmanager" on the main activity
 *
 * Idempotent: safe to run repeatedly. No-ops gracefully if the native
 * platform folders don't exist yet. Exits 0 on missing platforms so the
 * script can run as `postinstall` without breaking CI on the web-only side.
 *
 * Usage:
 *   node scripts/apply-native-config.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const CAMERA_USAGE =
  "BelegManager nutzt die Kamera, um Quittungen und Rechnungen direkt zu scannen.";
const PHOTO_READ =
  "BelegManager liest vorhandene Fotos, um bestehende Belege hinzuzufügen.";
const PHOTO_ADD =
  "BelegManager speichert exportierte Belege und PDFs in deiner Foto-Mediathek.";
const URL_SCHEME = "belegmanager";

// ─────────────────────────── iOS ─────────────────────────── //

function patchInfoPlist() {
  const plistPath = join(ROOT, "ios", "App", "App", "Info.plist");
  if (!existsSync(plistPath)) {
    console.log("ℹ️  iOS Info.plist not found — skipping (run `npx cap add ios` first).");
    return;
  }

  let xml = readFileSync(plistPath, "utf8");
  let changed = false;

  const addStringKey = (key, value) => {
    if (xml.includes(`<key>${key}</key>`)) return;
    xml = xml.replace(
      /<\/dict>\s*<\/plist>\s*$/,
      `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>\n</plist>\n`,
    );
    changed = true;
    console.log(`  + Info.plist: added ${key}`);
  };

  addStringKey("NSCameraUsageDescription", CAMERA_USAGE);
  addStringKey("NSPhotoLibraryUsageDescription", PHOTO_READ);
  addStringKey("NSPhotoLibraryAddUsageDescription", PHOTO_ADD);

  // CFBundleURLTypes for custom scheme (OAuth redirect)
  if (!xml.includes("CFBundleURLTypes")) {
    const urlTypesBlock = `\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLName</key>\n\t\t\t<string>de.belegmanager.scanandlog</string>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${URL_SCHEME}</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>\n`;
    xml = xml.replace(/<\/dict>\s*<\/plist>\s*$/, `${urlTypesBlock}</dict>\n</plist>\n`);
    changed = true;
    console.log(`  + Info.plist: added CFBundleURLTypes (${URL_SCHEME})`);
  }

  if (changed) {
    writeFileSync(plistPath, xml, "utf8");
    console.log("✅ iOS Info.plist patched.");
  } else {
    console.log("✅ iOS Info.plist already up-to-date.");
  }
}

// ───────────────────────── Android ────────────────────────── //

function patchAndroidManifest() {
  const manifestPath = join(
    ROOT,
    "android",
    "app",
    "src",
    "main",
    "AndroidManifest.xml",
  );
  if (!existsSync(manifestPath)) {
    console.log(
      "ℹ️  AndroidManifest.xml not found — skipping (run `npx cap add android` first).",
    );
    return;
  }

  let xml = readFileSync(manifestPath, "utf8");
  let changed = false;

  const addPermission = (name) => {
    const tag = `<uses-permission android:name="android.permission.${name}" />`;
    if (xml.includes(`android.permission.${name}`)) return;
    xml = xml.replace(
      /<application\b/,
      `    ${tag}\n\n    <application`,
    );
    changed = true;
    console.log(`  + AndroidManifest: added ${name}`);
  };

  addPermission("CAMERA");
  addPermission("READ_MEDIA_IMAGES");

  // <queries> for camera intents (required since Android 11)
  if (!xml.includes("<queries>")) {
    const queriesBlock = `\n    <queries>\n        <intent>\n            <action android:name="android.media.action.IMAGE_CAPTURE" />\n        </intent>\n    </queries>\n`;
    xml = xml.replace(/<\/manifest>/, `${queriesBlock}</manifest>`);
    changed = true;
    console.log("  + AndroidManifest: added <queries> for IMAGE_CAPTURE");
  }

  // Custom URL scheme intent-filter on MainActivity
  if (!xml.includes(`android:scheme="${URL_SCHEME}"`)) {
    const intentFilter = `            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="${URL_SCHEME}" />\n            </intent-filter>\n`;

    // Insert before the closing </activity> of MainActivity
    xml = xml.replace(
      /(<activity[^>]*android:name="\.MainActivity"[\s\S]*?)(<\/activity>)/,
      `$1${intentFilter}        $2`,
    );
    changed = true;
    console.log(`  + AndroidManifest: added intent-filter for scheme "${URL_SCHEME}"`);
  }

  if (changed) {
    writeFileSync(manifestPath, xml, "utf8");
    console.log("✅ AndroidManifest.xml patched.");
  } else {
    console.log("✅ AndroidManifest.xml already up-to-date.");
  }
}

// ─────────────────────────── main ─────────────────────────── //

try {
  console.log("🔧 apply-native-config.mjs — patching native projects\n");
  patchInfoPlist();
  patchAndroidManifest();
  console.log("\nDone.");
} catch (err) {
  console.error("❌ apply-native-config.mjs failed:", err);
  // Exit 0 so `postinstall` doesn't break web-only installs.
  process.exit(0);
}
