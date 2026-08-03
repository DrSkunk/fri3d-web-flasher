import { describe, expect, it } from "vitest";
import type { FirmwareAsset, FirmwareRelease } from "./firmware";
import { parseEraserOutput, selectCompanionEraserAsset, selectLatestBadge2026Asset } from "./companionEraser";

const asset = (name: string, hardware?: string): FirmwareAsset => ({
  name,
  hardware,
  browser_download_url: `https://firmware.test/${name}`,
  size: 1,
  sha256: "0".repeat(64),
});

const release = (...assets: FirmwareAsset[]): FirmwareRelease => ({
  tag_name: "rev1",
  name: "rev1",
  prerelease: false,
  publishedAt: "2026-08-03T08:30:01.525Z",
  assets,
});

describe("companion eraser firmware selection", () => {
  it("selects eraser binary instead of metadata", () => {
    expect(selectCompanionEraserAsset([release(asset("metadata.json"), asset("erase-tool.bin"))])?.name).toBe("erase-tool.bin");
  });

  it("selects Badge 2026 firmware from latest matching release", () => {
    expect(
      selectLatestBadge2026Asset([
        release(asset("full_1_firmware_for_2024_badge.bin")),
        release(asset("full_1_firmware_for_2026_badge.bin")),
      ])?.name,
    ).toBe("full_1_firmware_for_2026_badge.bin");
  });
});

describe("companion eraser UART output", () => {
  it("reads latest percentage and success marker", () => {
    expect(parseEraserOutput("example: 20%\nexample: 100%\nSuccesfully flashed the CH32X035 microcontroller")).toEqual({
      progress: 100,
      succeeded: true,
      failed: false,
    });
  });

  it("detects firmware failure marker", () => {
    expect(parseEraserOutput("example: 42%\nFailed to flash the CH32X035 microcontroller")).toEqual({
      progress: 42,
      succeeded: false,
      failed: true,
    });
  });
});
