// Shared helpers for fetching Fri3d firmware releases from the firmware catalog.
// Firmware downloads are cached in Cache Storage so re-flashing does not
// download the same artifact again.

const FIRMWARE_API_URL = "https://fri3d-firmware.drskunk.be/api.json";
const FIRMWARE_CACHE_NAME = "firmware-downloads";

export interface FirmwareAsset {
  name: string;
  browser_download_url: string;
}

export interface FirmwareRelease {
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  assets: FirmwareAsset[];
}

interface CatalogArtifact {
  filename: string;
  url: string;
}

interface CatalogRelease {
  version: string;
  name: string;
  prerelease: boolean;
  artifacts: CatalogArtifact[];
}

interface FirmwareCatalog {
  devices: Record<string, { releases: CatalogRelease[] }>;
}

const DEVICE_BY_KEY: Record<string, string> = {
  badge: "badge",
  communicator2026: "communicator-2026",
  communicator2024: "communicator-2024",
  dj2026: "dj-2026",
};

let catalogPromise: Promise<FirmwareCatalog> | undefined;
let refreshPromise: Promise<FirmwareCatalog> | undefined;

async function requestCatalog(forceRefresh: boolean): Promise<FirmwareCatalog> {
  const url = forceRefresh ? `${FIRMWARE_API_URL}?t=${Date.now()}` : FIRMWARE_API_URL;
  const response = await fetch(url, forceRefresh ? { cache: "reload" } : undefined);
  if (!response.ok) {
    throw new Error(`Firmware catalog request failed (HTTP ${response.status})`);
  }
  return response.json();
}

async function fetchCatalog(forceRefresh: boolean): Promise<FirmwareCatalog> {
  if (forceRefresh) {
    if (!refreshPromise) {
      refreshPromise = requestCatalog(true)
        .then((catalog) => {
          catalogPromise = Promise.resolve(catalog);
          return catalog;
        })
        .finally(() => {
          refreshPromise = undefined;
        });
    }
    return refreshPromise;
  }

  catalogPromise ??= requestCatalog(false).catch((error) => {
    catalogPromise = undefined;
    throw error;
  });
  return catalogPromise;
}

/** Fetch releases for one supported device from the central firmware catalog. */
export async function fetchReleases(deviceKey: string, forceRefresh = false): Promise<FirmwareRelease[]> {
  const catalogKey = DEVICE_BY_KEY[deviceKey];
  if (!catalogKey) {
    throw new Error(`Unknown firmware device key: ${deviceKey}`);
  }

  const catalog = await fetchCatalog(forceRefresh);
  const device = catalog.devices[catalogKey];
  if (!device) {
    throw new Error(`Firmware catalog has no device: ${catalogKey}`);
  }

  return device.releases.map((release) => ({
    tag_name: release.version,
    name: release.name || release.version,
    prerelease: release.prerelease,
    assets: release.artifacts.map((artifact) => ({
      name: artifact.filename,
      browser_download_url: artifact.url,
    })),
  }));
}

/** Download an artifact directly, reusing a persistent cached copy when available. */
export async function downloadAsset(asset: FirmwareAsset, forceRefresh = false): Promise<ArrayBuffer> {
  const url = asset.browser_download_url;

  let cache: Cache | undefined;
  if (typeof caches !== "undefined") {
    try {
      cache = await caches.open(FIRMWARE_CACHE_NAME);
      if (!forceRefresh) {
        const cached = await cache.match(url);
        if (cached) {
          return await cached.arrayBuffer();
        }
      }
    } catch (error) {
      console.warn("Firmware cache unavailable, downloading directly", error);
      cache = undefined;
    }
  }

  const response = await fetch(url, forceRefresh ? { cache: "reload" } : undefined);
  if (!response.ok) {
    throw new Error(`Download mislukt (HTTP ${response.status})`);
  }

  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch (error) {
      console.warn("Could not store firmware in cache", error);
    }
  }

  return await response.arrayBuffer();
}

export async function clearFirmwareCache(): Promise<void> {
  if (typeof caches === "undefined") {
    return;
  }
  try {
    await caches.delete(FIRMWARE_CACHE_NAME);
  } catch (error) {
    console.warn("Could not clear firmware cache", error);
  }
}
