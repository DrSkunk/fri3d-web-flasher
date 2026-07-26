// Shared helpers for fetching Fri3d firmware releases from BadgeHub.
// Firmware downloads are validated and cached in Cache Storage so re-flashing
// does not download the same artifact again.

const BADGEHUB_API_URL = "https://badgehub.eu/api/v3";
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

interface BadgeHubVersion {
  version?: string;
  latestRevision: number;
  latestPublishDate: string;
}

interface BadgeHubFile {
  full_path: string;
  url: string;
  size_of_content: number;
  sha256: string;
}

interface BadgeHubProject {
  version: {
    revision: number;
    files: BadgeHubFile[];
    published_at: string;
  };
}

const PROJECT_BY_KEY: Record<string, string> = {
  badge: "com.micropythonos.esp32s3",
  communicator2026: "communicator_2026",
  communicator2024: "communicator_2024",
  dj2026: "dj_2026",
};

const releasePromises = new Map<string, Promise<FirmwareRelease[]>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireField(condition: boolean, field: string): asserts condition {
  if (!condition) throw new Error(`Invalid BadgeHub response: ${field}`);
}

export function validateBadgeHubVersions(value: unknown): asserts value is BadgeHubVersion[] {
  requireField(Array.isArray(value), "versions");
  for (const [index, version] of value.entries()) {
    const path = `versions[${index}]`;
    requireField(isRecord(version), path);
    requireField(version.version === undefined || typeof version.version === "string", `${path}.version`);
    requireField(Number.isSafeInteger(version.latestRevision) && Number(version.latestRevision) >= 0, `${path}.latestRevision`);
    requireField(
      typeof version.latestPublishDate === "string" && !Number.isNaN(Date.parse(version.latestPublishDate)),
      `${path}.latestPublishDate`,
    );
  }
}

export function validateBadgeHubProject(value: unknown): asserts value is BadgeHubProject {
  requireField(isRecord(value), "project");
  requireField(isRecord(value.version), "project.version");
  requireField(Number.isSafeInteger(value.version.revision) && Number(value.version.revision) >= 0, "project.version.revision");
  requireField(Array.isArray(value.version.files), "project.version.files");
  requireField(
    typeof value.version.published_at === "string" && !Number.isNaN(Date.parse(value.version.published_at)),
    "project.version.published_at",
  );

  for (const [index, file] of value.version.files.entries()) {
    const path = `project.version.files[${index}]`;
    requireField(isRecord(file), path);
    requireField(typeof file.full_path === "string" && file.full_path.length > 0, `${path}.full_path`);
    requireField(typeof file.url === "string" && file.url.length > 0, `${path}.url`);
    requireField(Number.isSafeInteger(file.size_of_content) && Number(file.size_of_content) >= 0, `${path}.size_of_content`);
    requireField(typeof file.sha256 === "string" && /^[a-f\d]{64}$/i.test(file.sha256), `${path}.sha256`);
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

/** Reject firmware whose downloaded bytes do not match BadgeHub metadata. */
export async function verifyFirmware(asset: FirmwareAsset, buffer: ArrayBuffer): Promise<void> {
  if (buffer.byteLength !== asset.size) {
    throw new Error(`Firmware size mismatch: expected ${asset.size} bytes, received ${buffer.byteLength}`);
  }

  const actualSha256 = await sha256Hex(buffer);
  if (actualSha256.toLowerCase() !== asset.sha256.toLowerCase()) {
    throw new Error(`Firmware SHA-256 mismatch: expected ${asset.sha256}, received ${actualSha256}`);
  }
}

async function requestJson(url: string, forceRefresh: boolean): Promise<unknown> {
  const response = await fetch(url, forceRefresh ? { cache: "reload" } : undefined);
  if (!response.ok) throw new Error(`BadgeHub request failed (HTTP ${response.status})`);
  return response.json();
}

async function requestReleases(projectSlug: string, forceRefresh: boolean): Promise<FirmwareRelease[]> {
  const suffix = forceRefresh ? `?t=${Date.now()}` : "";
  const versionsValue = await requestJson(
    `${BADGEHUB_API_URL}/projects/${encodeURIComponent(projectSlug)}/versions${suffix}`,
    forceRefresh,
  );
  validateBadgeHubVersions(versionsValue);

  const releases = await Promise.all(
    versionsValue.map(async (version) => {
      const projectValue = await requestJson(
        `${BADGEHUB_API_URL}/projects/${encodeURIComponent(projectSlug)}/rev${version.latestRevision}${suffix}`,
        forceRefresh,
      );
      validateBadgeHubProject(projectValue);
      requireField(projectValue.version.revision === version.latestRevision, "project.version.revision mismatch");

      const tag = version.version?.trim() || `rev${version.latestRevision}`;
      return {
        tag_name: tag,
        name: tag,
        prerelease: false,
        publishedAt: version.latestPublishDate,
        assets: projectValue.version.files.map((file) => ({
          name: file.full_path,
          browser_download_url: file.url,
          size: file.size_of_content,
          sha256: file.sha256,
        })),
      } satisfies FirmwareRelease;
    }),
  );

  return sortCatalogReleases(releases);
}

/** Fetch all published metadata versions for one supported BadgeHub project. */
export async function fetchReleases(deviceKey: string, forceRefresh = false): Promise<FirmwareRelease[]> {
  const projectSlug = PROJECT_BY_KEY[deviceKey];
  if (!projectSlug) throw new Error(`Unknown firmware device key: ${deviceKey}`);

  if (forceRefresh) {
    return requestReleases(projectSlug, true).then((releases) => {
      releasePromises.set(deviceKey, Promise.resolve(releases));
      return releases;
    });
  }

  let releases = releasePromises.get(deviceKey);
  if (!releases) {
    releases = requestReleases(projectSlug, false).catch((error) => {
      releasePromises.delete(deviceKey);
      throw error;
    });
    releasePromises.set(deviceKey, releases);
  }
  return releases;
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
