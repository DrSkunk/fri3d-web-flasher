import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadAsset, sha256Hex, sortCatalogReleases, validateFirmwareCatalog, verifyFirmware, type FirmwareAsset } from "./firmware";

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

describe("catalog validation", () => {
  it("orders releases newest first", () => {
    const releases = sortCatalogReleases([
      { version: "1.0.0", publishedAt: "2026-01-01T00:00:00Z" },
      { version: "1.2.0", publishedAt: "2026-03-01T00:00:00Z" },
      { version: "1.1.0", publishedAt: "2026-02-01T00:00:00Z" },
    ]);
    expect(releases.map((release) => release.version)).toEqual(["1.2.0", "1.1.0", "1.0.0"]);
  });

  it("rejects missing artifact metadata", () => {
    expect(() =>
      validateFirmwareCatalog({
        schemaVersion: 1,
        devices: {
          badge: {
            flash: { tool: "esptool", chip: "esp32s3" },
            releases: [{ version: "1.0.0", name: "1.0.0", prerelease: false, artifacts: [{ filename: "firmware.bin", url: "https://x" }] }],
          },
        },
      }),
    ).toThrow("artifact.sha256");
  });
});
