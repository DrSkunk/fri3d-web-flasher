import { createContext, useContext, useEffect, useState } from "react";

export type Language = "nl" | "en";

// All UI strings, keyed per language. Keep the two dictionaries in sync;
// the `Dict` type enforces that `en` has exactly the keys of `nl`.
const nl = {
  // App shell
  "app.advancedMode": "Geavanceerde modus",
  "app.noSerial": "Je hebt een browser nodig die WebSerial of WebUSB ondersteunt, zoals Google Chrome, Edge, Brave of Opera.",
  "transport.serialUnsupported": "Deze browser ondersteunt geen WebSerial. Gebruik Chrome, Edge, Brave of Opera om badges te flashen.",
  "transport.usbUnsupported": "Deze browser ondersteunt geen WebUSB. Gebruik Chrome, Edge, Brave of Opera om peripherals te flashen.",

  // Generic
  "common.close": "Sluiten",
  "common.cancel": "Annuleren",
  "common.version": "Versie",
  "common.refreshReleases": "Refresh releases",
  "common.refreshing": "Vernieuwen...",
  "common.loadingReleases": "Releases worden geladen...",
  "common.flashing": "Aan het flashen...",
  "common.downloadingFirmware": "Firmware downloaden...",
  "common.help": "Hulp",
  "common.retry": "Opnieuw proberen",
  "common.downloadingProgress": "Downloaden... {progress}%",
  "common.downloadProgress": "Downloadvoortgang",

  // Connection
  "connect.connect": "Verbinden",
  "connect.connecting": "Aan het verbinden...",
  "connect.disconnect": "Verbinding verbreken",
  "connect.error": "Er is een fout opgetreden bij het verbinden met de badge",
  "connect.cancelled": "Toestelselectie geannuleerd",
  "connect.disconnected": "USB-toestel werd losgekoppeld",

  // Esptool / flashing
  "flash.success": "Firmware geflashed!",
  "flash.doNotUnplug": "Aan het flashen, niet uittrekken!",
  "flash.unknown": "onbekend",
  "flash.wrongChip": "Verkeerde chip: verwacht {expected}, gevonden {actual}",
  "flash.keepConnected": "Houd het toestel aangesloten tot verificatie klaar is.",
  "flash.progress": "Flashvoortgang",

  // Badge flasher
  "badge.title": "Badge (USB serieel)",
  "badge.fetchError": "Kon de releases niet ophalen van GitHub.",
  "badge.badge": "Badge",
  "badge.downloadAndFlash": "Download en flash",
  "badge.flashLatest": "Flash nieuwste firmware (badge {badge})",
  "badge.flashLatestVersion": "Flash {version} (badge {badge})",
  "badge.confirmation": "Badge {badge} · Firmware {version} · {size}",
  "badge.downloadOrFlashError": "Kon de firmware niet downloaden of flashen",
  "badge.helpTitle": "Badge {badge} flashen",
  "badge.chip": "Chip",
  "badge.mac": "MAC adres",
  "badge.features": "Features",
  "badge.crystal": "Kristal",

  // Peripheral flasher
  "peripheral.title": "Peripherals (WebUSB)",
  "peripheral.device": "Toestel",
  "peripheral.fetchError": "Kon de releases niet ophalen. Probeer later opnieuw.",
  "peripheral.fetchErrorDevice": "Kon releases voor {label} niet ophalen.",
  "peripheral.selectUsb": "WebUSB toestel selecteren...",
  "peripheral.connecting": "Verbinden met toestel...",
  "peripheral.flashFailed": "Flashen mislukt",
  "peripheral.closeFailed": "Kon de WebUSB sessie niet sluiten",
  "peripheral.flashViaUsb": "Flash via WebUSB",
  "peripheral.flashLatest": "Flash nieuwste {label}",
  "peripheral.flashLatestVersion": "Flash {label} {version}",
  "peripheral.confirmation": "{label} · Firmware {version} · {size}",
  "peripheral.noRelease": "Geen release beschikbaar voor {label}",
  "peripheral.success": "{label} succesvol geflashed ({tag})",
  "peripheral.helpTitle": "{label} flashen",
  "peripheral.helpTitleAdvanced": "Peripheral flashen (Lana bordje)",

  // Operation phases and diagnostics
  "phase.idle": "Klaar",
  "phase.loading-releases": "Releases laden...",
  "phase.refreshing": "Releases vernieuwen...",
  "phase.downloading": "Firmware downloaden...",
  "phase.awaiting-device": "Selecteer USB-toestel...",
  "phase.connecting": "Verbinden...",
  "phase.erasing": "Flash wissen...",
  "phase.writing": "Firmware schrijven...",
  "phase.verifying": "Firmware verifiëren...",
  "phase.resetting": "Toestel herstarten...",
  "phase.error": "Bewerking mislukt",
  "diagnostics.copy": "Diagnostiek kopiëren",
  "diagnostics.copied": "Diagnostiek gekopieerd",

  // Erase
  "erase.button": "Flash geheugen wissen",
  "erase.title": "Badge wissen",
  "erase.warningPrefix": "Dit zal",
  "erase.warningBold": "alle gegevens",
  "erase.warningSuffix": "op de badge wissen.",
  "erase.confirm": "Weet je zeker dat je de badge wilt wissen? Dit kan niet ongedaan worden gemaakt.",
  "erase.error": "Er is een fout opgetreden bij het wissen van het flash geheugen",
  "erase.success": "Flash geheugen gewist",
};

const en: Dict = {
  "app.advancedMode": "Advanced mode",
  "app.noSerial": "You need a browser that supports WebSerial or WebUSB, such as Google Chrome, Edge, Brave or Opera.",
  "transport.serialUnsupported": "This browser does not support WebSerial. Use Chrome, Edge, Brave or Opera to flash badges.",
  "transport.usbUnsupported": "This browser does not support WebUSB. Use Chrome, Edge, Brave or Opera to flash peripherals.",

  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.version": "Version",
  "common.refreshReleases": "Refresh releases",
  "common.refreshing": "Refreshing...",
  "common.loadingReleases": "Loading releases...",
  "common.flashing": "Flashing...",
  "common.downloadingFirmware": "Downloading firmware...",
  "common.help": "Help",
  "common.retry": "Retry",
  "common.downloadingProgress": "Downloading... {progress}%",
  "common.downloadProgress": "Download progress",

  "connect.connect": "Connect",
  "connect.connecting": "Connecting...",
  "connect.disconnect": "Disconnect",
  "connect.error": "An error occurred while connecting to the badge",
  "connect.cancelled": "Device selection cancelled",
  "connect.disconnected": "USB device disconnected",

  "flash.success": "Firmware flashed!",
  "flash.doNotUnplug": "Flashing, do not unplug!",
  "flash.unknown": "unknown",
  "flash.wrongChip": "Wrong chip: expected {expected}, found {actual}",
  "flash.keepConnected": "Keep the device connected until verification finishes.",
  "flash.progress": "Flash progress",

  "badge.title": "Badge (USB serial)",
  "badge.fetchError": "Could not fetch the releases from GitHub.",
  "badge.badge": "Badge",
  "badge.downloadAndFlash": "Download and flash",
  "badge.flashLatest": "Flash latest firmware (badge {badge})",
  "badge.flashLatestVersion": "Flash {version} (badge {badge})",
  "badge.confirmation": "Badge {badge} · Firmware {version} · {size}",
  "badge.downloadOrFlashError": "Could not download or flash the firmware",
  "badge.helpTitle": "Flashing badge {badge}",
  "badge.chip": "Chip",
  "badge.mac": "MAC address",
  "badge.features": "Features",
  "badge.crystal": "Crystal",

  "peripheral.title": "Peripherals (WebUSB)",
  "peripheral.device": "Device",
  "peripheral.fetchError": "Could not fetch the releases. Try again later.",
  "peripheral.fetchErrorDevice": "Could not fetch releases for {label}.",
  "peripheral.selectUsb": "Select the WebUSB device...",
  "peripheral.connecting": "Connecting to device...",
  "peripheral.flashFailed": "Flashing failed",
  "peripheral.closeFailed": "Could not close the WebUSB session",
  "peripheral.flashViaUsb": "Flash via WebUSB",
  "peripheral.flashLatest": "Flash latest {label}",
  "peripheral.flashLatestVersion": "Flash {label} {version}",
  "peripheral.confirmation": "{label} · Firmware {version} · {size}",
  "peripheral.noRelease": "No release available for {label}",
  "peripheral.success": "{label} flashed successfully ({tag})",
  "peripheral.helpTitle": "Flashing {label}",
  "peripheral.helpTitleAdvanced": "Flashing a peripheral (Lana board)",

  "phase.idle": "Ready",
  "phase.loading-releases": "Loading releases...",
  "phase.refreshing": "Refreshing releases...",
  "phase.downloading": "Downloading firmware...",
  "phase.awaiting-device": "Select USB device...",
  "phase.connecting": "Connecting...",
  "phase.erasing": "Erasing flash...",
  "phase.writing": "Writing firmware...",
  "phase.verifying": "Verifying firmware...",
  "phase.resetting": "Resetting device...",
  "phase.error": "Operation failed",
  "diagnostics.copy": "Copy diagnostics",
  "diagnostics.copied": "Diagnostics copied",

  "erase.button": "Erase flash memory",
  "erase.title": "Erase badge",
  "erase.warningPrefix": "This will erase",
  "erase.warningBold": "all data",
  "erase.warningSuffix": "on the badge.",
  "erase.confirm": "Are you sure you want to erase the badge? This cannot be undone.",
  "erase.error": "An error occurred while erasing the flash memory",
  "erase.success": "Flash memory erased",
};

type Dict = typeof nl;
export type TranslationKey = keyof Dict;

const dictionaries: Record<Language, Dict> = { nl, en };

const STORAGE_KEY = "language";

function detectLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "nl" || stored === "en") {
    return stored;
  }
  return navigator.language?.toLowerCase().startsWith("nl") ? "nl" : "en";
}

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: "nl",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageContextProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(detectLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  function t(key: TranslationKey, params?: Record<string, string>): string {
    let text: string = dictionaries[language][key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, value);
      }
    }
    return text;
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
