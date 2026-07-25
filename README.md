# Fri3d Web Flasher

Web flasher for the hardware of [Fri3d camp](https://fri3d.be), the biennial hacker family camp.
Every edition ships a main **badge** (ESP32-based, flashed over [WebSerial](https://web.dev/serial/)
with esptool-js) and optional **peripherals** (WCH-based, e.g. Communicator and DJ addon, flashed
over WebUSB with wchisp-web).

The app lists firmware releases from `https://fri3d-firmware.drskunk.be/api.json`. In simple mode you flash
the latest release with one click; advanced mode lets you pick a specific release/hardware version,
select a local firmware file, erase flash, and inspect the connected chip. Downloads are cached in the browser so re-flashing
doesn't re-download.

Requires a Chromium-based browser (Chrome, Edge, Brave, ...) for WebSerial/WebUSB.

Supported hardware:

- Badge 2026 and 2024 (full firmware image, flashed at 0x0)
- Communicator 2026 / 2024
- DJ Addon 2026

Hosted at https://fri3dcamp.github.io/fri3d-web-flasher/

## Architecture

- `src/lib/firmware.ts` — firmware catalog + direct asset downloads with Cache Storage caching
- `src/components/BadgeFlasher.tsx` — ESP32 badge flashing (esptool-js, WebSerial)
- `src/components/PeripheralFlasher.tsx` — WCH peripheral flashing (wchisp-web, WebUSB)
- `https://fri3d-firmware.drskunk.be/api.json` — central firmware catalog

## Development

Vite + React. To start the development server:

```bash
npm install
npm run dev
```
