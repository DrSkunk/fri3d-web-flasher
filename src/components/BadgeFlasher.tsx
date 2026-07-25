import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button, ButtonType } from "./Button";
import { ConnectionButton } from "./ConnectionButton";
import { EraseFlashButton } from "./EraseFlashButton";
import { BadgeInstructions, HelpButton } from "./HelpDialog";
import { useTranslation } from "../context/LanguageContext";
import { clearFirmwareCache, downloadAsset, fetchReleases, type FirmwareAsset } from "../lib/firmware";

const ASSET_REGEX = /^full_\d+_firmware_for_(\d+)_badge\.bin$/;
const DEFAULT_BADGE = "2026";
const BADGE_GENERATIONS = ["2026", "2024"];

type FirmwareSource = "release" | "local";

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
  "w-full rounded-md border-2 border-black bg-white px-3 py-2 font-display text-sm font-bold text-black",
  "focus:outline-none focus:ring-3 focus:ring-fri3d-purple-light disabled:border-gray-300 disabled:text-gray-400",
);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BadgeFlasher({ advanced = false, supported = true }: { advanced?: boolean; supported?: boolean }) {
  const { flash, isConnected, isFlashing, flashProgress, deviceInfo } = useContext(EsptoolContext);
  const { t } = useTranslation();

  const [releases, setReleases] = useState<FlashableRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<FirmwareSource>("release");
  const [localFirmware, setLocalFirmware] = useState<File | null>(null);
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedBadge, setSelectedBadge] = useState(DEFAULT_BADGE);

  const loadReleases = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(false);
      const data = await fetchReleases("badge", forceRefresh);
      const flashable = data
        .map((release) => ({
          tag: release.tag_name,
          name: release.name || release.tag_name,
          prerelease: release.prerelease,
          badges: release.assets
            .map((asset) => {
              const badge = asset.hardware ?? asset.name.match(ASSET_REGEX)?.[1];
              return badge ? ({ badge, asset } satisfies BadgeOption) : null;
            })
            .filter((badge): badge is BadgeOption => badge !== null)
            .sort((left, right) => right.badge.localeCompare(left.badge)),
        }))
        .filter((release) => release.badges.length > 0);

      setReleases(flashable);
      if (flashable.length > 0) setSelectedTag(flashable[0].tag);
    } catch (loadError) {
      console.error(loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReleases();
  }, [loadReleases]);

  useEffect(() => {
    if (!advanced) setSource("release");
  }, [advanced]);

  const availableBadges = useMemo(
    () =>
      [...new Set(releases.flatMap((release) => release.badges.map((badge) => badge.badge)))].sort((left, right) =>
        right.localeCompare(left),
      ),
    [releases],
  );
  const releasesForBadge = useMemo(
    () => releases.filter((release) => release.badges.some((badge) => badge.badge === selectedBadge)),
    [releases, selectedBadge],
  );
  const selectedRelease = useMemo(
    () => releasesForBadge.find((release) => release.tag === selectedTag) ?? releasesForBadge[0],
    [releasesForBadge, selectedTag],
  );

  useEffect(() => {
    if (availableBadges.length > 0 && !availableBadges.includes(selectedBadge)) {
      setSelectedBadge(availableBadges.includes(DEFAULT_BADGE) ? DEFAULT_BADGE : availableBadges[0]);
      return;
    }
    if (releasesForBadge.length > 0 && !releasesForBadge.some((release) => release.tag === selectedTag)) {
      setSelectedTag(releasesForBadge[0].tag);
    }
  }, [availableBadges, releasesForBadge, selectedBadge, selectedTag]);

  const selectedAsset = useMemo(
    () => selectedRelease?.badges.find((badge) => badge.badge === selectedBadge)?.asset,
    [selectedRelease, selectedBadge],
  );

  const busy = downloading || isFlashing;
  const canFlash = supported && !busy && (source === "local" ? Boolean(localFirmware) : Boolean(selectedAsset));

  function selectLocalFile(file: File | null) {
    setLocalFirmware(file);
    const generation = file?.name.match(ASSET_REGEX)?.[1];
    if (generation) setSelectedBadge(generation);
  }

  async function handleFlash() {
    if (!canFlash) return;
    setDownloading(true);
    setDownloadProgress(null);
    try {
      const buffer =
        source === "local"
          ? await localFirmware!.arrayBuffer()
          : await downloadAsset(selectedAsset!, false, (progress) => setDownloadProgress(progress));
      await flash({
        filename: source === "local" ? localFirmware!.name : selectedAsset!.name,
        data: new Uint8Array(buffer),
        address: source === "local" ? 0 : (selectedAsset!.offset ?? 0),
      });
    } catch (flashError) {
      console.error(flashError);
      toast.error(t("badge.downloadOrFlashError"));
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
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

  return (
    <section className="shadow-hard mb-6 w-full rounded-lg border-4 border-black bg-white">
      <header className="flex items-center justify-between border-b-3 border-black px-5 py-4">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">{t("badge.titleShort")}</h2>
          <p className="text-sm text-gray-500">ESP32 · WebSerial</p>
        </div>
        {advanced && (
          <span className={clsx("text-sm font-bold", isConnected ? "text-fri3d-mint-dark" : "text-gray-500")}>
            {isConnected ? t("connect.connected") : t("connect.notConnected")}
          </span>
        )}
      </header>

      <div className="p-5">
        {!supported && <p className="text-fri3d-red mb-4 font-semibold">{t("transport.serialUnsupported")}</p>}

        {advanced && (
          <div className="mb-6 border-b-2 border-gray-200 pb-5">
            <h3 className="font-display mb-3 font-bold uppercase">{t("badge.stepConnectTitle")}</h3>
            <div className="flex flex-wrap gap-3">
              <ConnectionButton disabled={!supported} />
              {isConnected && <EraseFlashButton />}
            </div>
            {isConnected && (
              <dl className="mt-4 grid gap-x-5 gap-y-3 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-bold text-gray-500 uppercase">{t("badge.chip")}</dt>
                  <dd className="font-semibold">{deviceInfo.chipName || t("flash.unknown")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-gray-500 uppercase">{t("badge.mac")}</dt>
                  <dd className="font-mono text-sm">{deviceInfo.mac || t("flash.unknown")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-gray-500 uppercase">{t("badge.crystal")}</dt>
                  <dd className="font-semibold">{deviceInfo.crystal || t("flash.unknown")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-gray-500 uppercase">{t("badge.features")}</dt>
                  <dd className="text-sm">{deviceInfo.features || t("flash.unknown")}</dd>
                </div>
              </dl>
            )}
          </div>
        )}

        <div className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display font-bold uppercase">{t("badge.stepFirmwareTitle")}</h3>
            {advanced && (
              <div className="flex gap-4 border-b-2 border-gray-200 text-sm font-bold">
                <button
                  type="button"
                  className={clsx("pb-2", source === "release" && "border-b-3 border-black")}
                  onClick={() => setSource("release")}
                  aria-pressed={source === "release"}
                  disabled={busy}
                >
                  {t("common.officialRelease")}
                </button>
                <button
                  type="button"
                  className={clsx("pb-2", source === "local" && "border-b-3 border-black")}
                  onClick={() => setSource("local")}
                  aria-pressed={source === "local"}
                  disabled={busy}
                >
                  {t("common.localFile")}
                </button>
              </div>
            )}
          </div>

          {source === "release" ? (
            <div>
              {loading && <p className="text-gray-500">{t("common.loadingReleases")}</p>}
              {!loading && error && (
                <div className="text-fri3d-red flex items-center gap-3 text-sm">
                  <span>{t("badge.fetchError")}</span>
                  <button type="button" className="font-bold underline" onClick={handleRefresh}>
                    {t("common.retry")}
                  </button>
                </div>
              )}
              {!loading &&
                !error &&
                selectedRelease &&
                (advanced ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                    <label className="grid gap-1">
                      <span className="text-xs font-bold uppercase">{t("badge.badge")}</span>
                      <select
                        className={selectClassName}
                        value={selectedBadge}
                        disabled={busy || !supported}
                        onChange={(event) => setSelectedBadge(event.target.value)}
                      >
                        {availableBadges.map((badge) => (
                          <option key={badge} value={badge}>
                            {t("badge.badgeGeneration", { badge })}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold uppercase">{t("common.version")}</span>
                      <select
                        className={selectClassName}
                        value={selectedRelease?.tag ?? ""}
                        disabled={busy || !supported || releasesForBadge.length === 0}
                        onChange={(event) => setSelectedTag(event.target.value)}
                      >
                        {releasesForBadge.map((release) => (
                          <option key={release.tag} value={release.tag}>
                            {release.name}
                            {release.prerelease ? ` · ${t("common.prerelease")}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="text-left text-sm font-bold underline lg:pb-2"
                      onClick={handleRefresh}
                      disabled={busy || refreshing}
                    >
                      {refreshing ? t("common.refreshing") : t("common.refreshReleases")}
                    </button>
                  </div>
                ) : (
                  <p>
                    <strong>{selectedRelease.name}</strong> · {t("badge.badgeGeneration", { badge: selectedBadge })} ·{" "}
                    {selectedAsset ? formatBytes(selectedAsset.size) : ""}
                  </p>
                ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border-2 border-dashed border-gray-400 px-4 py-3 hover:border-black">
                <input
                  type="file"
                  accept=".bin,application/octet-stream"
                  className="sr-only"
                  disabled={busy || !supported}
                  onChange={(event) => selectLocalFile(event.target.files?.[0] ?? null)}
                />
                <span className="truncate font-semibold">{localFirmware?.name || t("common.chooseFirmwareFile")}</span>
                <span className="shrink-0 text-sm text-gray-500">{localFirmware ? formatBytes(localFirmware.size) : ".bin"}</span>
              </label>
              <select
                aria-label={t("badge.targetBadge")}
                className={selectClassName}
                value={selectedBadge}
                disabled={busy || !supported}
                onChange={(event) => setSelectedBadge(event.target.value)}
              >
                {BADGE_GENERATIONS.map((badge) => (
                  <option key={badge} value={badge}>
                    {t("badge.badgeGeneration", { badge })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <footer
          className={clsx(
            "flex flex-col gap-3 border-t-2 border-gray-200 pt-4 sm:flex-row sm:items-center",
            advanced ? "sm:justify-between" : "sm:justify-end",
          )}
        >
          {advanced && (
            <p className="min-w-0 truncate text-sm text-gray-600">
              {source === "local"
                ? localFirmware?.name || t("common.noFileSelected")
                : selectedRelease?.name || t("common.noReleaseSelected")}{" "}
              · {t("badge.badgeGeneration", { badge: selectedBadge })}
            </p>
          )}
          <div className="flex shrink-0 items-center gap-3">
            <HelpButton title={t("badge.helpTitle", { badge: selectedBadge })}>
              <BadgeInstructions badge={selectedBadge} />
            </HelpButton>
            <Button type={ButtonType.Primary} onClick={handleFlash} disabled={!canFlash}>
              {isFlashing
                ? t("common.flashing")
                : downloading
                  ? downloadProgress === null
                    ? t("common.readingFirmware")
                    : t("common.downloadingProgress", { progress: String(downloadProgress) })
                  : source === "local"
                    ? t("badge.flashLocalFile")
                    : t("badge.downloadAndFlash")}
            </Button>
          </div>
        </footer>

        {isFlashing && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-sm font-bold">
              <span>{t("flash.progress")}</span>
              <span>{Math.round(flashProgress)}%</span>
            </div>
            <progress value={flashProgress} max="100" className="accent-fri3d-purple h-2 w-full" />
            <p className="text-fri3d-red mt-1 text-center text-sm font-bold uppercase">{t("flash.doNotUnplug")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
