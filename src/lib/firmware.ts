// Shared helpers for fetching Fri3d firmware releases from the firmware catalog.
// Firmware downloads are validated and cached in Cache Storage so re-flashing
// does not download the same artifact again.

const FIRMWARE_API_URL = "https://fri3d-firmware.drskunk.be/api.json";
const FIRMWARE_CACHE_NAME = "firmware-downloads";

export interface FirmwareAsset {
  name: string;
  browser_download_url: string;
  size: number;
  sha256: string;
  hardware?: string;
  offset?: number;
}

export interface FirmwareRelease {
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  publishedAt: string;
  assets: FirmwareAsset[];
}

interface CatalogArtifact {
  filename: string;
  url: string;
  size: number;
  sha256: string;
  hardware?: string;
  offset?: number;
}

interface CatalogRelease {
  version: string;
  name: string;
  publishedAt: string;
  prerelease: boolean;
  artifacts: CatalogArtifact[];
}

interface CatalogDevice {
  releases: CatalogRelease[];
}

interface FirmwareCatalog {
  schemaVersion: number;
  devices: Record<string, CatalogDevice>;
}

const DEVICE_BY_KEY: Record<string, string> = {
  badge: "badge",
  communicator2026: "communicator-2026",
  communicator2024: "communicator-2024",
  dj2026: "dj-2026",
};

let catalogPromise: Promise<FirmwareCatalog> | undefined;
let refreshPromise: Promise<FirmwareCatalog> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireField(condition: boolean, field: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid firmware catalog: ${field}`);
  }
}

/** Validate untrusted catalog JSON before any metadata is used for flashing. */
export function validateFirmwareCatalog(value: unknown): asserts value is FirmwareCatalog {
  requireField(isRecord(value), "catalog");
  requireField(value.schemaVersion === 1, "schemaVersion");
  requireField(isRecord(value.devices), "devices");

  for (const [deviceKey, deviceValue] of Object.entries(value.devices)) {
    requireField(isRecord(deviceValue), `devices.${deviceKey}`);
    requireField(Array.isArray(deviceValue.releases), `devices.${deviceKey}.releases`);

    for (const [releaseIndex, releaseValue] of deviceValue.releases.entries()) {
      const releasePath = `devices.${deviceKey}.releases[${releaseIndex}]`;
      requireField(isRecord(releaseValue), releasePath);
      requireField(typeof releaseValue.version === "string" && releaseValue.version.length > 0, `${releasePath}.version`);
      requireField(typeof releaseValue.name === "string", `${releasePath}.name`);
      requireField(typeof releaseValue.prerelease === "boolean", `${releasePath}.prerelease`);
      requireField(Array.isArray(releaseValue.artifacts), `${releasePath}.artifacts`);

      for (const [artifactIndex, artifactValue] of releaseValue.artifacts.entries()) {
        const artifactPath = `${releasePath}.artifacts[${artifactIndex}].artifact`;
        requireField(isRecord(artifactValue), artifactPath);
        requireField(typeof artifactValue.filename === "string" && artifactValue.filename.length > 0, `${artifactPath}.filename`);
        requireField(typeof artifactValue.url === "string" && artifactValue.url.length > 0, `${artifactPath}.url`);
        requireField(typeof artifactValue.sha256 === "string" && /^[a-f\d]{64}$/i.test(artifactValue.sha256), `${artifactPath}.sha256`);
        requireField(
          typeof artifactValue.size === "number" && Number.isSafeInteger(artifactValue.size) && artifactValue.size >= 0,
          `${artifactPath}.size`,
        );
        requireField(artifactValue.hardware === undefined || typeof artifactValue.hardware === "string", `${artifactPath}.hardware`);
        requireField(
          artifactValue.offset === undefined ||
            (typeof artifactValue.offset === "number" && Number.isSafeInteger(artifactValue.offset) && artifactValue.offset >= 0),
          `${artifactPath}.offset`,
        );
      }

      requireField(
        typeof releaseValue.publishedAt === "string" && !Number.isNaN(Date.parse(releaseValue.publishedAt)),
        `${releasePath}.publishedAt`,
      );
    }
  }
}

/** Return a copy ordered from newest publication date to oldest. */
export function sortCatalogReleases<T extends { publishedAt: string }>(releases: T[]): T[] {
  return [...releases].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Reject firmware whose downloaded bytes do not match catalog metadata. */
export async function verifyFirmware(asset: FirmwareAsset, buffer: ArrayBuffer): Promise<void> {
  if (buffer.byteLength !== asset.size) {
    throw new Error(`Firmware size mismatch: expected ${asset.size} bytes, received ${buffer.byteLength}`);
  }

  const actualSha256 = await sha256Hex(buffer);
  if (actualSha256.toLowerCase() !== asset.sha256.toLowerCase()) {
    throw new Error(`Firmware SHA-256 mismatch: expected ${asset.sha256}, received ${actualSha256}`);
  }
}

async function requestCatalog(forceRefresh: boolean): Promise<FirmwareCatalog> {
  const url = forceRefresh ? `${FIRMWARE_API_URL}?t=${Date.now()}` : FIRMWARE_API_URL;
  const response = await fetch(url, forceRefresh ? { cache: "reload" } : undefined);
  if (!response.ok) {
    throw new Error(`Firmware catalog request failed (HTTP ${response.status})`);
  }

  const catalog: unknown = await response.json();
  validateFirmwareCatalog(catalog);
  for (const device of Object.values(catalog.devices)) {
    device.releases = sortCatalogReleases(device.releases);
  }
  return catalog;
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
    publishedAt: release.publishedAt,
    assets: release.artifacts.map((artifact) => ({
      name: artifact.filename,
      browser_download_url: artifact.url,
      size: artifact.size,
      sha256: artifact.sha256,
      hardware: artifact.hardware,
      offset: artifact.offset,
    })),
  }));
}

async function readResponse(response: Response, expectedSize: number, onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress?.(100);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (expectedSize > 0) {
      onProgress?.(Math.min(100, Math.floor((received / expectedSize) * 100)));
    }
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress?.(100);
  return bytes.buffer;
}

/** Download, verify, and cache an artifact. */
export async function downloadAsset(
  asset: FirmwareAsset,
  forceRefresh = false,
  onProgress?: (progress: number) => void,
): Promise<ArrayBuffer> {
  const url = asset.browser_download_url;
  let cache: Cache | undefined;

  if (typeof caches !== "undefined") {
    try {
      cache = await caches.open(FIRMWARE_CACHE_NAME);
      if (!forceRefresh) {
        const cached = await cache.match(url);
        if (cached) {
          const buffer = await readResponse(cached, asset.size, onProgress);
          try {
            await verifyFirmware(asset, buffer);
            return buffer;
          } catch (error) {
            await cache.delete(url);
            console.warn("Discarding invalid cached firmware", error);
          }
        }
      }
    } catch (error) {
      console.warn("Firmware cache unavailable, downloading directly", error);
      cache = undefined;
    }
  }

  const response = await fetch(url, forceRefresh ? { cache: "reload" } : undefined);
  if (!response.ok) {
    throw new Error(`Firmware download failed (HTTP ${response.status})`);
  }

  const buffer = await readResponse(response, asset.size, onProgress);
  await verifyFirmware(asset, buffer);

  if (cache) {
    try {
      await cache.put(url, new Response(buffer, { headers: response.headers }));
    } catch (error) {
      console.warn("Could not store firmware in cache", error);
    }
  }

  return buffer;
}

export async function clearFirmwareCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await caches.delete(FIRMWARE_CACHE_NAME);
  } catch (error) {
    console.warn("Could not clear firmware cache", error);
  }
}
