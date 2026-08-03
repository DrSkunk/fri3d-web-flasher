import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadAsset,
  fetchReleases,
  sha256Hex,
  sortCatalogReleases,
  validateBadgeHubProject,
  validateBadgeHubVersions,
  verifyFirmware,
  type FirmwareAsset,
} from "./firmware";

function bytes(...values: number[]): ArrayBuffer {
  return Uint8Array.from(values).buffer;
}

async function assetFor(buffer: ArrayBuffer): Promise<FirmwareAsset> {
  return {
    name: "firmware.bin",
    browser_download_url: "https://firmware.test/firmware.bin",
    size: buffer.byteLength,
    sha256: await sha256Hex(buffer),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("firmware integrity", () => {
  it("accepts matching size and SHA-256", async () => {
    const buffer = bytes(1, 2, 3, 4);
    await expect(verifyFirmware(await assetFor(buffer), buffer)).resolves.toBeUndefined();
  });

  it("rejects a size mismatch", async () => {
    const buffer = bytes(1, 2, 3);
    const asset = await assetFor(buffer);
    await expect(verifyFirmware({ ...asset, size: 4 }, buffer)).rejects.toThrow("Firmware size mismatch");
  });

  it("rejects a checksum mismatch", async () => {
    const buffer = bytes(1, 2, 3);
    const asset = await assetFor(buffer);
    await expect(verifyFirmware({ ...asset, sha256: "0".repeat(64) }, buffer)).rejects.toThrow("SHA-256 mismatch");
  });

  it("reports download progress and verifies before returning", async () => {
    const buffer = bytes(1, 2, 3, 4);
    const asset = await assetFor(buffer);
    vi.stubGlobal("caches", undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(buffer, { status: 200 })));
    const progress: number[] = [];

    await expect(downloadAsset(asset, false, (value) => progress.push(value))).resolves.toEqual(buffer);
    expect(progress[progress.length - 1]).toBe(100);
  });
});

describe("BadgeHub metadata", () => {
  it("orders releases newest first", () => {
    const releases = sortCatalogReleases([
      { version: "1.0.0", publishedAt: "2026-01-01T00:00:00Z" },
      { version: "1.2.0", publishedAt: "2026-03-01T00:00:00Z" },
      { version: "1.1.0", publishedAt: "2026-02-01T00:00:00Z" },
    ]);
    expect(releases.map((release) => release.version)).toEqual(["1.2.0", "1.1.0", "1.0.0"]);
  });

  it("rejects malformed version metadata", () => {
    expect(() => validateBadgeHubVersions([{ version: "1.0.0", latestRevision: 1 }])).toThrow("latestPublishDate");
  });

  it("rejects missing file integrity metadata", () => {
    expect(() =>
      validateBadgeHubProject({
        version: {
          revision: 1,
          published_at: "2026-01-01T00:00:00Z",
          files: [{ full_path: "firmware.bin", url: "https://badgehub.eu/firmware.bin", size_of_content: 10 }],
        },
      }),
    ).toThrow("sha256");
  });

  it("uses the companion MCU eraser BadgeHub project", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/versions")) {
        return Response.json([{ latestRevision: 1, latestPublishDate: "2026-08-03T08:30:01.525Z" }]);
      }
      return Response.json({
        version: {
          revision: 1,
          published_at: "2026-08-03T08:30:01.525Z",
          files: [
            {
              full_path: "fri3d_badge_2026_fw_erase_tool.bin",
              url: `${url}/files/fri3d_badge_2026_fw_erase_tool.bin`,
              size_of_content: 309808,
              sha256: "d8b4658c94919b933d75bcc5771f2baf9c3749be3375b3ef5451fd8f5ecd3415",
            },
          ],
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const releases = await fetchReleases("companionEraser2026");

    expect(releases[0].assets[0].name).toBe("fri3d_badge_2026_fw_erase_tool.bin");
    expect(fetchMock).toHaveBeenCalledWith("https://badgehub.eu/api/v3/projects/badge_2026_expander_eraser/versions", undefined);
  });

  it("loads every version and maps its revision files", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/versions")) {
        return Response.json([
          { version: "1.0.0", latestRevision: 1, latestPublishDate: "2026-01-01T00:00:00Z" },
          { version: "1.1.0", latestRevision: 3, latestPublishDate: "2026-03-01T00:00:00Z" },
        ]);
      }
      const revision = url.endsWith("rev3") ? 3 : 1;
      return Response.json({
        version: {
          revision,
          published_at: revision === 3 ? "2026-03-01T00:00:00Z" : "2026-01-01T00:00:00Z",
          files: [
            {
              full_path: "firmware.bin",
              url: `${url}/files/firmware.bin`,
              size_of_content: revision,
              sha256: String(revision).repeat(64),
            },
          ],
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const releases = await fetchReleases("dj2026");

    expect(releases.map((release) => release.tag_name)).toEqual(["1.1.0", "1.0.0"]);
    expect(releases.map((release) => release.assets[0].size)).toEqual([3, 1]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
