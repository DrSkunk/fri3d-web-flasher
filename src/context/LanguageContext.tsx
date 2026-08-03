import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Language = "nl" | "en";

// All UI strings, keyed per language. Keep the two dictionaries in sync;
// the `Dict` type enforces that `en` has exactly the keys of `nl`.
const nl = {
  // App shell
  "app.advancedMode": "Geavanceerde modus",
  "app.eyebrow": "Fri3d Camp hardware",
  "app.title": "Flash je Fri3d hardware",
  "app.description": "Kies een badge of peripheral en installeer firmware.",
  "app.advancedHint": "Geavanceerde opties actief",
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
  "common.readingFirmware": "Firmwarebestand lezen...",
  "common.localFirmware": "Eigen firmwarebestand",
  "common.help": "Hulp",
  "common.retry": "Opnieuw proberen",
  "common.downloadingProgress": "Downloaden... {progress}%",
  "common.downloadProgress": "Downloadvoortgang",
  "common.prerelease": "testversie",
  "common.firmwareSource": "Firmwarebron",
  "common.officialRelease": "Officiële release",
  "common.localFile": "Eigen bestand",
  "common.chooseFirmwareFile": "Kies een firmwarebestand",
  "common.noFileSelected": "Nog geen bestand gekozen",
  "common.noReleaseSelected": "Geen release beschikbaar",

  // Connection
  "connect.connect": "Verbinden",
  "connect.connecting": "Aan het verbinden...",
  "connect.disconnect": "Verbinding verbreken",
  "connect.error": "Er is een fout opgetreden bij het verbinden met de badge",
  "connect.cancelled": "Toestelselectie geannuleerd",
  "connect.disconnected": "USB-toestel werd losgekoppeld",
  "connect.connected": "Verbonden",
  "connect.notConnected": "Niet verbonden",

  // Esptool / flashing
  "flash.success": "Firmware geflashed!",
  "flash.doNotUnplug": "Aan het flashen, niet uittrekken!",
  "flash.unknown": "onbekend",
  "flash.wrongChip": "Verkeerde chip: verwacht {expected}, gevonden {actual}",
  "flash.keepConnected": "Houd het toestel aangesloten tot verificatie klaar is.",
  "flash.progress": "Flashvoortgang",

  // Badge flasher
  "badge.title": "Badge (USB serieel)",
  "badge.titleShort": "Badge flashen",
  "badge.stepConnectTitle": "Verbind je badge (2024 of 2026)",
  "badge.stepConnectDescription": "Selecteer de seriële poort en controleer of het juiste toestel verbonden is.",
  "badge.connectHint": "Je kunt nu al firmware kiezen. De browser vraagt ook om je badge wanneer je op flashen klikt.",
  "badge.stepFirmwareTitle": "Kies firmware",
  "badge.flashFirmwareTitle": "Flash firmware op je badge",
  "badge.stepFirmwareDescription": "Gebruik een gecontroleerde officiële release of kies in geavanceerde modus je eigen bestand.",
  "badge.badgeGeneration": "Badge {badge}",
  "badge.latestReady": "Nieuwste versie {version} voor badge {badge}",
  "badge.localFileHint": "Volledig .bin flashbestand, geschreven vanaf adres 0x0",
  "badge.targetBadge": "Doelbadge",
  "badge.stepFlashTitle": "Controleer en flash",
  "badge.stepFlashDescription": "Houd de badge aangesloten tot schrijven volledig klaar is.",
  "badge.targetSummary": "Doel: badge {badge}",
  "badge.fetchError": "Kon de releases niet ophalen.",
  "badge.badge": "Badge",
  "badge.downloadAndFlash": "Download en flash",
  "badge.flashLocalFile": "Flash eigen bestand",
  "badge.flashLatest": "Flash nieuwste firmware (badge {badge})",
  "badge.flashLatestVersion": "Flash {version} (badge {badge})",
  "badge.confirmation": "Badge {badge} · Firmware {version} · {size}",
  "badge.downloadOrFlashError": "Kon de firmware niet downloaden of flashen",
  "badge.helpTitle": "Badge {badge} flashen",
  "badge.helpButton": "Hulp {badge}",
  "badge.chip": "Chip",
  "badge.mac": "MAC adres",
  "badge.features": "Features",
  "badge.crystal": "Kristal",
  // Badge 2026 companion MCU recovery
  "eraser.title": "Badge 2026 companion MCU eraser",
  "eraser.stepFlashShort": "Wisprogramma",
  "eraser.stepMonitorShort": "Voortgang",
  "eraser.stepRestoreShort": "Badge herstellen",
  "eraser.stepFlashTitle": "1. Flash het CH32-wisprogramma",
  "eraser.stepFlashBody":
    "Zet de badge aan en sluit hem aan via USB-C. Het wisprogramma vervangt tijdelijk MicroPythonOS op de ESP32-S3 en wist daarna de vastgelopen companion MCU / IO-expander.",
  "eraser.warning": "Start alleen wanneer de companion MCU vastgelopen is. Stop niet voordat Badge 2026 firmware in stap 3 is teruggezet.",
  "eraser.source": "Bekijk wisfirmware op BadgeHub",
  "eraser.flashAction": "Flash companion MCU eraser",
  "eraser.progressAction": "Bezig... {progress}%",
  "eraser.stepMonitorTitle": "2. Verbind met de USB UART / REPL",
  "eraser.stepMonitorConnectBody":
    "Het wisprogramma staat nu op de badge. Verbind met dezelfde seriële poort om de live voortgang te volgen.",
  "eraser.connectMonitorAction": "Verbind met voortgangsconsole",
  "eraser.stepMonitorRebootBody": "Laat de USB-C kabel zitten. Zet de badge nu uit en opnieuw aan met de aan-uitschakelaar.",
  "eraser.stepMonitorWaitBody":
    "Het wissen start automatisch. Onderbreek de stroom niet. Deze pagina gaat vanzelf naar stap 3 wanneer de firmware succes meldt.",
  "eraser.monitorTitle": "USB UART · 115200 baud",
  "eraser.monitorWaiting": "Wachten",
  "eraser.monitorEmpty": "Verbonden. Herstart de badge om het wissen te starten...",
  "eraser.detectedFailure": "Het wisprogramma meldde een fout. Controleer de uitvoer en probeer opnieuw.",
  "eraser.stepRestoreTitle": "3. Flash Badge 2026 firmware opnieuw",
  "eraser.eraseComplete": "Companion MCU succesvol gewist.",
  "eraser.stepRestoreBody":
    "Sluit de voortgangsconsole af door hieronder verder te gaan. Hou S ingedrukt en druk op reset om de badge in flashmodus te zetten. Klik daarna op herstellen en kies de seriële poort van de badge.",
  "eraser.restoreAction": "Flash Badge 2026 firmware",
  "eraser.restoreProgressAction": "Badge herstellen... {progress}%",
  "eraser.doneTitle": "Herstel voltooid",
  "eraser.doneBody": "Companion MCU is gewist en nieuwste Badge 2026 MicroPythonOS-firmware is opnieuw geflashed.",
  "eraser.loadError": "Kon het companion MCU-wisprogramma niet laden",
  "eraser.flashError": "Kon het companion MCU-wisprogramma niet flashen",
  "eraser.monitorError": "Kon niet met de USB UART verbinden",
  "eraser.monitorDisconnected": "USB UART-verbinding verbroken. Verbind opnieuw om verder te volgen.",
  "eraser.restoreError": "Kon Badge 2026 firmware niet herstellen",

  // Peripheral flasher
  "peripheral.title": "Peripherals (WebUSB)",
  "peripheral.titleShort": "Peripheral flashen",
  "peripheral.connectOnFlash": "Verbinden bij flashen",
  "peripheral.communicatorDescription": "Firmware voor het Fri3d Communicator-bordje.",
  "peripheral.djDescription": "Firmware voor de Fri3d DJ Addon.",
  "peripheral.stepDeviceTitle": "Kies je toestel",
  "peripheral.stepDeviceDescription": "Selecteer exact het bordje dat je wilt bijwerken.",
  "peripheral.stepFirmwareTitle": "Kies firmware",
  "peripheral.stepFirmwareDescription": "Gebruik een officiële release of laad een eigen firmwarebestand.",
  "peripheral.localFileHint": ".bin, .hex of .elf firmwarebestand",
  "peripheral.stepFlashTitle": "Start WebUSB flash",
  "peripheral.stepFlashDescription": "Zet het bordje in bootmodus; daarna opent de browser de USB-kiezer.",
  "peripheral.selectAndFlash": "Selecteer USB en flash",
  "peripheral.chooseDeviceTitle": "Wat wil je flashen?",
  "peripheral.chooseDeviceDescription": "Kies je toestel. Wij gebruiken automatisch de nieuwste officiële firmware.",
  "peripheral.flashLatestShort": "Flash nieuwste",
  "peripheral.usbHint": "Na je klik vraagt de browser welk USB-toestel je wilt gebruiken. Zet het bordje eerst in bootmodus.",
  "peripheral.operationInProgress": "Flashbewerking bezig",
  "peripheral.device": "Toestel",
  "peripheral.fetchError": "Kon de releases niet ophalen. Probeer later opnieuw.",
  "peripheral.fetchErrorDevice": "Kon releases voor {label} niet ophalen.",
  "peripheral.selectUsb": "WebUSB toestel selecteren...",
  "peripheral.connecting": "Verbinden met toestel...",
  "peripheral.flashFailed": "Flashen mislukt",
  "peripheral.closeFailed": "Kon de WebUSB sessie niet sluiten",
  "peripheral.flashViaUsb": "Flash via WebUSB",
  "peripheral.flashLocalFile": "Flash eigen bestand via WebUSB",
  "peripheral.flashLatest": "Flash nieuwste {label}",
  "peripheral.flashLatestVersion": "Flash {label} {version}",
  "peripheral.confirmation": "{label} · Firmware {version} · {size}",
  "peripheral.noRelease": "Geen release beschikbaar voor {label}",
  "peripheral.success": "{label} succesvol geflashed ({tag})",
  "peripheral.helpTitle": "{label} flashen",
  "peripheral.helpTitleAdvanced": "Peripheral flashen (Lana bordje)",
  "peripheral.windowsDriverButton": "Windows USB-driver instellen",

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
  "app.eyebrow": "Fri3d Camp hardware",
  "app.title": "Flash your Fri3d hardware",
  "app.description": "Choose a badge or peripheral and install firmware.",
  "app.advancedHint": "Advanced options enabled",
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
  "common.readingFirmware": "Reading firmware file...",
  "common.localFirmware": "Custom firmware file",
  "common.help": "Help",
  "common.retry": "Retry",
  "common.downloadingProgress": "Downloading... {progress}%",
  "common.downloadProgress": "Download progress",
  "common.prerelease": "pre-release",
  "common.firmwareSource": "Firmware source",
  "common.officialRelease": "Official release",
  "common.localFile": "Custom file",
  "common.chooseFirmwareFile": "Choose a firmware file",
  "common.noFileSelected": "No file selected yet",
  "common.noReleaseSelected": "No release available",

  "connect.connect": "Connect",
  "connect.connecting": "Connecting...",
  "connect.disconnect": "Disconnect",
  "connect.error": "An error occurred while connecting to the badge",
  "connect.cancelled": "Device selection cancelled",
  "connect.disconnected": "USB device disconnected",
  "connect.connected": "Connected",
  "connect.notConnected": "Not connected",

  "flash.success": "Firmware flashed!",
  "flash.doNotUnplug": "Flashing, do not unplug!",
  "flash.unknown": "unknown",
  "flash.wrongChip": "Wrong chip: expected {expected}, found {actual}",
  "flash.keepConnected": "Keep the device connected until verification finishes.",
  "flash.progress": "Flash progress",

  "badge.title": "Badge (USB serial)",
  "badge.titleShort": "Flash a badge",
  "badge.stepConnectTitle": "Connect your badge (2024 or 2026)",
  "badge.stepConnectDescription": "Select its serial port and confirm the correct device is connected.",
  "badge.connectHint": "You can choose firmware now. Your browser can also ask for the badge when you press flash.",
  "badge.stepFirmwareTitle": "Choose firmware",
  "badge.flashFirmwareTitle": "Flash firmware on your badge",
  "badge.stepFirmwareDescription": "Use a verified official release or select your own file in advanced mode.",
  "badge.badgeGeneration": "Badge {badge}",
  "badge.latestReady": "Latest version {version} for badge {badge}",
  "badge.localFileHint": "Full .bin flash image, written from address 0x0",
  "badge.targetBadge": "Target badge",
  "badge.stepFlashTitle": "Review and flash",
  "badge.stepFlashDescription": "Keep the badge connected until writing has completely finished.",
  "badge.targetSummary": "Target: badge {badge}",
  "badge.fetchError": "Could not fetch the releases.",
  "badge.badge": "Badge",
  "badge.downloadAndFlash": "Download and flash",
  "badge.flashLocalFile": "Flash custom file",
  "badge.flashLatest": "Flash latest firmware (badge {badge})",
  "badge.flashLatestVersion": "Flash {version} (badge {badge})",
  "badge.confirmation": "Badge {badge} · Firmware {version} · {size}",
  "badge.downloadOrFlashError": "Could not download or flash the firmware",
  "badge.helpTitle": "Flashing badge {badge}",
  "badge.helpButton": "Help {badge}",
  "badge.chip": "Chip",
  "badge.mac": "MAC address",
  "badge.features": "Features",
  "badge.crystal": "Crystal",
  "eraser.title": "Badge 2026 companion MCU eraser",
  "eraser.stepFlashShort": "Flash eraser",
  "eraser.stepMonitorShort": "Watch progress",
  "eraser.stepRestoreShort": "Restore badge",
  "eraser.stepFlashTitle": "1. Flash CH32 eraser",
  "eraser.stepFlashBody":
    "Turn badge on and connect it over USB-C. Eraser temporarily replaces MicroPythonOS on ESP32-S3, then erases frozen companion MCU / IO expander.",
  "eraser.warning": "Start only when companion MCU has frozen. Do not stop before restoring Badge 2026 firmware in step 3.",
  "eraser.source": "View eraser firmware on BadgeHub",
  "eraser.flashAction": "Flash companion MCU eraser",
  "eraser.progressAction": "Working... {progress}%",
  "eraser.stepMonitorTitle": "2. Connect to USB UART / REPL",
  "eraser.stepMonitorConnectBody": "Eraser is now installed on badge. Connect to same serial port to watch live progress.",
  "eraser.connectMonitorAction": "Connect progress console",
  "eraser.stepMonitorRebootBody": "Keep USB-C cable connected. Turn badge off and on now with power switch.",
  "eraser.stepMonitorWaitBody":
    "Erase starts automatically. Do not interrupt power. This page advances to step 3 when firmware reports success.",
  "eraser.monitorTitle": "USB UART · 115200 baud",
  "eraser.monitorWaiting": "Waiting",
  "eraser.monitorEmpty": "Connected. Reboot badge to start erase...",
  "eraser.detectedFailure": "Eraser reported an error. Check output and retry.",
  "eraser.stepRestoreTitle": "3. Flash Badge 2026 firmware again",
  "eraser.eraseComplete": "Companion MCU erased successfully.",
  "eraser.stepRestoreBody":
    "Continue below to close progress console. Hold S and press reset to put badge in flash mode. Then click restore and choose badge serial port.",
  "eraser.restoreAction": "Flash Badge 2026 firmware",
  "eraser.restoreProgressAction": "Restoring badge... {progress}%",
  "eraser.doneTitle": "Recovery complete",
  "eraser.doneBody": "Companion MCU was erased and latest Badge 2026 MicroPythonOS firmware was flashed again.",
  "eraser.loadError": "Could not load companion MCU eraser",
  "eraser.flashError": "Could not flash companion MCU eraser",
  "eraser.monitorError": "Could not connect to USB UART",
  "eraser.monitorDisconnected": "USB UART disconnected. Reconnect to continue watching.",
  "eraser.restoreError": "Could not restore Badge 2026 firmware",

  "peripheral.title": "Peripherals (WebUSB)",
  "peripheral.titleShort": "Flash a peripheral",
  "peripheral.connectOnFlash": "Connect when flashing",
  "peripheral.communicatorDescription": "Firmware for the Fri3d Communicator board.",
  "peripheral.djDescription": "Firmware for the Fri3d DJ Addon.",
  "peripheral.stepDeviceTitle": "Choose your device",
  "peripheral.stepDeviceDescription": "Select the exact board you want to update.",
  "peripheral.stepFirmwareTitle": "Choose firmware",
  "peripheral.stepFirmwareDescription": "Use an official release or load your own firmware file.",
  "peripheral.localFileHint": ".bin, .hex, or .elf firmware file",
  "peripheral.stepFlashTitle": "Start WebUSB flash",
  "peripheral.stepFlashDescription": "Put the board in boot mode; your browser will then open the USB picker.",
  "peripheral.selectAndFlash": "Select USB and flash",
  "peripheral.chooseDeviceTitle": "What do you want to flash?",
  "peripheral.chooseDeviceDescription": "Choose your device. We automatically use the latest verified firmware.",
  "peripheral.flashLatestShort": "Flash latest",
  "peripheral.usbHint": "After clicking, your browser asks which USB device to use. Put the board in boot mode first.",
  "peripheral.operationInProgress": "Flash operation in progress",
  "peripheral.device": "Device",
  "peripheral.fetchError": "Could not fetch the releases. Try again later.",
  "peripheral.fetchErrorDevice": "Could not fetch releases for {label}.",
  "peripheral.selectUsb": "Select the WebUSB device...",
  "peripheral.connecting": "Connecting to device...",
  "peripheral.flashFailed": "Flashing failed",
  "peripheral.closeFailed": "Could not close the WebUSB session",
  "peripheral.flashViaUsb": "Flash via WebUSB",
  "peripheral.flashLocalFile": "Flash custom file via WebUSB",
  "peripheral.flashLatest": "Flash latest {label}",
  "peripheral.flashLatestVersion": "Flash {label} {version}",
  "peripheral.confirmation": "{label} · Firmware {version} · {size}",
  "peripheral.noRelease": "No release available for {label}",
  "peripheral.success": "{label} flashed successfully ({tag})",
  "peripheral.helpTitle": "Flashing {label}",
  "peripheral.helpTitleAdvanced": "Flashing a peripheral (Lana board)",
  "peripheral.windowsDriverButton": "Set up Windows USB driver",

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

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string>): string => {
      let text: string = dictionaries[language][key] ?? key;
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replaceAll(`{${name}}`, value);
        }
      }
      return text;
    },
    [language],
  );

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  return useContext(LanguageContext);
}
