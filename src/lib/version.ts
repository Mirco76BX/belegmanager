/**
 * App-Version + Build-Nummer.
 *
 * Bei jedem TestFlight/App-Store-Build:
 *   1. CURRENT_PROJECT_VERSION in ios/App/App.xcodeproj/project.pbxproj hochzählen
 *   2. BUILD hier auf den gleichen Wert setzen
 *
 * MARKETING_VERSION (User-sichtbare Version) wird nur bei Feature-Releases hochgezählt.
 */
export const APP_VERSION = "1.0.0";
export const APP_BUILD = 29;
export const VERSION_LABEL = `Version ${APP_VERSION} · Build ${APP_BUILD}`;
