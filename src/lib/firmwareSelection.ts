import type { FirmwareAsset } from "./firmware";

const BADGE_ASSET = /^full_\d+_firmware_for_(\d+)_badge\.bin$/;

export type PeripheralKey = "communicator2026" | "communicator2024" | "blaster2024" | "dj2026";

const EXPECTED_ASSETS: Record<PeripheralKey, RegExp> = {
  communicator2026: /^firmware\.bin$/,
  communicator2024: /^firmware\.bin$/,
  blaster2024: /^flamingo\.hex$/,
  dj2026: /^firmware\.bin$/,
};

export function badgeHardware(asset: FirmwareAsset): string | undefined {
  return asset.hardware ?? asset.name.match(BADGE_ASSET)?.[1];
}

export function selectPeripheralAsset(key: PeripheralKey, assets: FirmwareAsset[]): FirmwareAsset | undefined {
  return assets.find((asset) => EXPECTED_ASSETS[key].test(asset.name));
}
