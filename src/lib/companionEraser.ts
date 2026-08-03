import type { FirmwareAsset, FirmwareRelease } from "./firmware";
import { badgeHardware } from "./firmwareSelection";

export interface EraserOutputStatus {
  progress: number | null;
  succeeded: boolean;
  failed: boolean;
}

/** Pick executable image, excluding project metadata. */
export function selectCompanionEraserAsset(releases: FirmwareRelease[]): FirmwareAsset | undefined {
  return releases.flatMap((release) => release.assets).find((asset) => /\.bin$/i.test(asset.name));
}

/** Releases arrive newest-first from BadgeHub. */
export function selectLatestBadge2026Asset(releases: FirmwareRelease[]): FirmwareAsset | undefined {
  return releases.flatMap((release) => release.assets).find((asset) => badgeHardware(asset) === "2026");
}

/** Interpret progress emitted by badge_2026_expander_eraser over USB UART. */
export function parseEraserOutput(output: string): EraserOutputStatus {
  const percentages = [...output.matchAll(/(?:^|\D)(\d{1,3})%/g)].map((match) => Number(match[1]));
  const progress = percentages.length > 0 ? Math.min(100, percentages[percentages.length - 1]) : null;

  return {
    progress,
    succeeded: output.includes("Succesfully flashed the CH32X035 microcontroller"),
    failed: output.includes("Failed to flash the CH32X035 microcontroller"),
  };
}
