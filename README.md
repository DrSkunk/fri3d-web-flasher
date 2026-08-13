# Fri3d Web Flasher

Web flasher for the hardware of [Fri3d camp](https://fri3d.be), the biennial hacker family camp.
Every edition ships a main **badge** (ESP32-based, flashed over [WebSerial](https://web.dev/serial/)
with esptool-js) and optional **peripherals** (WCH-based, e.g. Communicator and DJ addon, flashed
over WebUSB with wchisp-web).

The app lists published firmware versions from [BadgeHub](https://badgehub.eu/). In simple mode you flash
the latest version with one click; advanced mode lets you pick a specific version, select a local firmware
file, erase flash, and inspect the connected chip. Downloads are verified against BadgeHub's size and SHA-256
metadata and cached in the browser so re-flashing doesn't re-download.

Requires a Chromium-based browser (Chrome, Edge, Brave, ...) or a recent Firefox browser for WebSerial/WebUSB.

Supported hardware:

- Badge 2026 and 2024 (separate full firmware images, flashed at 0x0)
- Communicator 2026 / 2024
- DJ Addon 2026

Hosted at https://fri3dcamp.github.io/fri3d-web-flasher/

## Firmware source and mirroring

The flasher does not fetch firmware directly from GitHub releases in the browser. It reads the published catalog from [BadgeHub](https://badgehub.eu/) and then downloads the actual binary files from the BadgeHub project entries.

The data flow is:

- the current Fri3d firmware projects are maintained under the GitHub account of Sebastiaan Jansen: https://github.com/drskunk/
- those project releases are mirrored into BadgeHub so they can be discovered and served through a stable API
- the web app queries BadgeHub for the latest available versions and revision metadata
- each downloaded file is validated against the BadgeHub-provided size and SHA-256 before flashing

The app specifically reads:

- `GET https://badgehub.eu/api/v3/projects/{slug}/versions` — the published versions for each firmware project
- `GET https://badgehub.eu/api/v3/projects/{slug}/rev{revision}` — the metadata and downloadable file list for a specific revision

This is why the browser-side flasher can show all releases without hardcoding nightly builds or ad-hoc download URLs.

## Architecture

- `src/lib/firmware.ts` — BadgeHub version/revision lookup, verified asset downloads, and Cache Storage caching
- `src/components/BadgeFlasher.tsx` — ESP32 badge flashing (esptool-js, WebSerial)
- `src/components/PeripheralFlasher.tsx` — WCH peripheral flashing (wchisp-web, WebUSB)
- `GET https://badgehub.eu/api/v3/projects/{slug}/versions` — published versions used to populate firmware choices
- `GET https://badgehub.eu/api/v3/projects/{slug}/rev{revision}` — revision metadata and downloadable files

BadgeHub projects:

| Project slug | Hardware | Notes |
| --- | --- | --- |
| `be.fri3d.badge_firmware_micropythonos` | Badge 2024 and 2026 | Main badge firmware images |
| `communicator_2026` | Communicator 2026 | Peripheral firmware |
| `communicator_2024` | Communicator 2024 | Peripheral firmware |
| `dj_2026` | DJ Addon 2026 | Peripheral firmware |

The projects on Badgehub are under the account of [Sebastiaan Jansen](https://github.com/drskunk/).

API schema: <https://badgehub.eu/api-docs/swagger.json>

## Development

Vite + React. To start the development server:

```bash
npm install
npm run dev
```
