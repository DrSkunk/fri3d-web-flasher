import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button, ButtonType } from "./Button";
import { ConnectionButton } from "./ConnectionButton";
import { EraseFlashButton } from "./EraseFlashButton";
import { BadgeInstructions, HelpButton } from "./HelpDialog";
import { useTranslation } from "../context/LanguageContext";
import { clearFirmwareCache, downloadAsset, fetchReleases, FirmwareAsset } from "../lib/firmware";

// The badge firmware releases ship one full flash image per badge generation:
// `full_<fw>_firmware_for_<badge>_badge.bin`, flashed at address 0x0.
const ASSET_REGEX = /^full_\d+_firmware_for_(\d+)_badge\.bin$/;
const DEFAULT_BADGE = "2026";

interface BadgeOption {
  badge: string;
  asset: FirmwareAsset;
}

interface FlashableRelease {
  tag: string;
  name: string;
  prerelease: boolean;
  badges: BadgeOption[];
}

const selectClassName = clsx(
  "rounded-md border-4 border-black bg-white px-3 py-2 font-display text-sm font-bold uppercase text-black shadow-hard-sm",
  "disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none",
);

export function BadgeFlasher({ advanced = false }: { advanced?: boolean }) {
  const { flash, isFlashing, flashProgress, deviceInfo } = useContext(EsptoolContext);
  const { t } = useTranslation();

  const [releases, setReleases] = useState<FlashableRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedBadge, setSelectedBadge] = useState<string>(DEFAULT_BADGE);

  const loadReleases = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(false);
      const data = await fetchReleases("badge", forceRefresh);
      const flashable: FlashableRelease[] = data
        .map((release) => ({
          tag: release.tag_name,
          name: release.name || release.tag_name,
          prerelease: release.prerelease,
          badges: release.assets
            .map((asset) => {
              const match = asset.name.match(ASSET_REGEX);
              return match ? ({ badge: match[1], asset } satisfies BadgeOption) : null;
            })
            .filter((badge): badge is BadgeOption => badge !== null)
            .sort((a, b) => b.badge.localeCompare(a.badge)),
        }))
        .filter((release) => release.badges.length > 0);

      setReleases(flashable);
      if (flashable.length > 0) {
        setSelectedTag(flashable[0].tag);
      }
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const selectedRelease = useMemo(() => releases.find((release) => release.tag === selectedTag), [releases, selectedTag]);

  // Keep the selected badge valid for the chosen release, preferring 2026.
  useEffect(() => {
    if (!selectedRelease) {
      return;
    }
    const hasSelected = selectedRelease.badges.some((badge) => badge.badge === selectedBadge);
    if (!hasSelected) {
      const preferred = selectedRelease.badges.find((badge) => badge.badge === DEFAULT_BADGE);
      setSelectedBadge((preferred ?? selectedRelease.badges[0]).badge);
    }
  }, [selectedRelease, selectedBadge]);

  const selectedAsset = useMemo(
    () => selectedRelease?.badges.find((badge) => badge.badge === selectedBadge)?.asset,
    [selectedRelease, selectedBadge],
  );

  async function handleFlash() {
    if (!selectedAsset || !selectedRelease) {
      return;
    }
    setDownloading(true);
    try {
      const buffer = await downloadAsset(selectedAsset);
      await flash({
        filename: selectedAsset.name,
        data: new Uint8Array(buffer),
      });
    } catch (e) {
      console.error(e);
      toast.error(t("badge.downloadOrFlashError"));
    } finally {
      setDownloading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await clearFirmwareCache();
      await loadReleases(true);
    } finally {
      setRefreshing(false);
    }
  }

  const busy = downloading || isFlashing;

  return (
    <div className="shadow-hard-sm mb-4 w-full max-w-4xl rounded-md border-4 border-black bg-white p-4">
      <h3 className="font-display mb-3 text-lg font-bold uppercase">{t("badge.title")}</h3>

      {advanced && (
        <div className="mb-4">
          <div className="flex gap-3">
            <ConnectionButton />
            <EraseFlashButton />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              {t("badge.chip")}: {deviceInfo.chipName || t("flash.unknown")}
            </div>
            <div>
              {t("badge.mac")}: {deviceInfo.mac || t("flash.unknown")}
            </div>
            <div>
              {t("badge.features")}:
              <ul>
                {deviceInfo.features.split(",").map((feature) => (
                  <li className="ml-8 list-disc" key={feature}>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              {t("badge.crystal")}: {deviceInfo.crystal || t("flash.unknown")}
            </div>
          </div>
        </div>
      )}

      {loading && <p className="font-display font-semibold">{t("common.loadingReleases")}</p>}
      {!loading && (error || releases.length === 0) && <p className="font-display text-fri3d-red font-semibold">{t("badge.fetchError")}</p>}

      {!loading && !error && releases.length > 0 && (
        <div className={clsx("flex gap-3", advanced ? "flex-row flex-wrap items-end" : "flex-col")}>
          {advanced && (
            <>
              <label className="flex flex-col gap-1">
                <span className="font-display text-xs font-bold tracking-wide uppercase">{t("common.version")}</span>
                <select
                  className={selectClassName}
                  value={selectedTag}
                  disabled={busy}
                  onChange={(event) => setSelectedTag(event.target.value)}
                >
                  {releases.map((release) => (
                    <option key={release.tag} value={release.tag}>
                      {release.name}
                      {release.prerelease ? " (pre-release)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-display text-xs font-bold tracking-wide uppercase">{t("badge.badge")}</span>
                <select
                  className={selectClassName}
                  value={selectedBadge}
                  disabled={busy || !selectedRelease}
                  onChange={(event) => setSelectedBadge(event.target.value)}
                >
                  {selectedRelease?.badges.map((badge) => (
                    <option key={badge.badge} value={badge.badge}>
                      {badge.badge} badge
                    </option>
                  ))}
                </select>
              </label>

              <Button type={ButtonType.Regular} onClick={handleRefresh} disabled={busy || refreshing}>
                {refreshing ? t("common.refreshing") : t("common.refreshReleases")}
              </Button>
            </>
          )}

          <div className="flex items-center gap-3">
            <Button type={ButtonType.Primary} onClick={handleFlash} disabled={busy || !selectedAsset} className="flex-1">
              {downloading && !isFlashing
                ? t("common.downloadingFirmware")
                : advanced
                  ? t("badge.downloadAndFlash")
                  : t("badge.flashLatest", { badge: selectedBadge })}
            </Button>
            <HelpButton title={t("badge.helpTitle", { badge: selectedBadge })}>
              <BadgeInstructions badge={selectedBadge} />
            </HelpButton>
          </div>
        </div>
      )}

      {isFlashing && (
        <div className="mt-3">
          <progress value={flashProgress} max="100" className="w-full" />
          <p className="font-display text-fri3d-red animate-pulse text-center font-bold uppercase">{t("flash.doNotUnplug")}</p>
        </div>
      )}
    </div>
  );
}
