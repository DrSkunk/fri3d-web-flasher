import { describe, expect, it } from "vitest";
import type { FirmwareAsset } from "./firmware";
import { badgeHardware, selectPeripheralAsset } from "./firmwareSelection";

function asset(name: string, hardware?: string): FirmwareAsset {
  return { name, hardware, browser_download_url: `https://test/${name}`, size: 1, sha256: "0".repeat(64) };
}

describe("badge artifact hardware", () => {
  it("uses catalog metadata before filename parsing", () => {
    expect(badgeHardware(asset("unexpected.bin", "2026"))).toBe("2026");
  });

  it("parses legacy full-image filenames", () => {
    expect(badgeHardware(asset("full_2026_firmware_for_2024_badge.bin"))).toBe("2024");
  });

  it("rejects unrelated filenames", () => {
    expect(badgeHardware(asset("bootloader.bin"))).toBeUndefined();
  });
});

describe("peripheral artifact selection", () => {
  it("selects only exact production filename among multiple binaries", () => {
    const selected = selectPeripheralAsset("dj2026", [asset("bootloader.bin"), asset("firmware-debug.bin"), asset("firmware.bin")]);
    expect(selected?.name).toBe("firmware.bin");
  });

  it("does not choose vague bin/hex/elf matches", () => {
    expect(selectPeripheralAsset("communicator2026", [asset("bootloader.bin"), asset("firmware.hex")])).toBeUndefined();
  });
});
