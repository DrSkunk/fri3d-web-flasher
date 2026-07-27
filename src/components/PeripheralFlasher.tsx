import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { WchIspFlasher, WebUsbTransport, type Progress } from "wchisp-web";
import { Button, ButtonType } from "./Button";
import { downloadAsset, fetchReleases, type FirmwareAsset } from "../lib/firmware";
import { selectPeripheralAsset, type PeripheralKey } from "../lib/firmwareSelection";
import { HelpButton, PeripheralInstructions } from "./HelpDialog";
import { useTranslation } from "../context/LanguageContext";
import { isWindowsPlatform } from "../lib/browserCapabilities";

type FirmwareSource = "release" | "local";
type Peripheral = { key: PeripheralKey; label: string };

const MAIN_PERIPHERALS: Peripheral[] = [
  { key: "communicator2026", label: "Communicator 2026" },
  { key: "dj2026", label: "DJ Addon 2026" },
];
const ADVANCED_EXTRA_PERIPHERALS: Peripheral[] = [
  { key: "communicator2024", label: "Communicator 2024" },
  { key: "blaster2024", label: "Blaster 2024 (Flamingo)" },
];

interface FlashableRelease {
  tag: string;
  name: string;
  prerelease: boolean;
  asset: FirmwareAsset;
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

function normalizeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function PeripheralFlasher({ advanced = false, supported = true }: { advanced?: boolean; supported?: boolean }) {
  const { t } = useTranslation();
  const showWindowsDriver = isWindowsPlatform();
  const peripherals = useMemo(() => (advanced ? [...MAIN_PERIPHERALS, ...ADVANCED_EXTRA_PERIPHERALS] : MAIN_PERIPHERALS), [advanced]);
  const [source, setSource] = useState<FirmwareSource>("release");
  const [localFirmware, setLocalFirmware] = useState<File | null>(null);
  const [selectedKey, setSelectedKey] = useState<PeripheralKey>(peripherals[0].key);
  const [releaseMap, setReleaseMap] = useState<Record<string, FlashableRelease[]>>({});
  const [selectedTagByKey, setSelectedTagByKey] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [operationError, setOperationError] = useState("");

  const loadAllReleases = useCallback(
    async (forceRefresh = false) => {
      setLoading(!forceRefresh);
      setRefreshing(forceRefresh);
      setCatalogError("");
      try {
        const all = await Promise.all(
          peripherals.map(async (peripheral) => {
            const data = await fetchReleases(peripheral.key, forceRefresh);
            const releases = data
              .map((release) => {
                const asset = selectPeripheralAsset(peripheral.key, release.assets);
                return asset
                  ? ({
                      tag: release.tag_name,
                      name: release.name || release.tag_name,
                      prerelease: release.prerelease,
                      asset,
                    } satisfies FlashableRelease)
                  : null;
              })
              .filter((release): release is FlashableRelease => release !== null);
            return [peripheral.key, releases] as const;
          }),
        );
        const nextMap: Record<string, FlashableRelease[]> = {};
        const nextSelected: Record<string, string> = {};
        for (const [key, releases] of all) {
          nextMap[key] = releases;
          if (releases.length > 0) nextSelected[key] = releases[0].tag;
        }
        setReleaseMap(nextMap);
        setSelectedTagByKey(nextSelected);
      } catch (loadError) {
        console.error(loadError);
        setReleaseMap({});
        setSelectedTagByKey({});
        setCatalogError(t("peripheral.fetchError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [peripherals, t],
  );

  useEffect(() => {
    void loadAllReleases();
  }, [loadAllReleases]);

  useEffect(() => {
    if (!advanced) setSource("release");
  }, [advanced]);

  const selectedPeripheral = peripherals.find((peripheral) => peripheral.key === selectedKey) ?? peripherals[0];
  const selectedReleases = releaseMap[selectedPeripheral.key] ?? [];
  const selectedTag = selectedTagByKey[selectedPeripheral.key] ?? "";
  const selectedRelease = selectedReleases.find((release) => release.tag === selectedTag) ?? selectedReleases[0];
  const canFlash = supported && !flashing && (source === "local" ? Boolean(localFirmware) : Boolean(selectedRelease));

  async function flashFirmware(peripheral: Peripheral, firmware: FlashableRelease | File) {
    const progress: Progress = (event) => {
      setStatusMessage(event.total > 0 ? `${event.phase}: ${Math.floor((event.done / event.total) * 100)}%` : event.phase);
    };
    setFlashing(true);
    setOperationError("");
    setStatusMessage(firmware instanceof File ? t("common.readingFirmware") : t("common.downloadingFirmware"));
    let isp: WchIspFlasher | null = null;
    try {
      const buffer = firmware instanceof File ? await firmware.arrayBuffer() : await downloadAsset(firmware.asset);
      setStatusMessage(t("peripheral.selectUsb"));
      const transport = await WebUsbTransport.request();
      isp = new WchIspFlasher(transport);
      setStatusMessage(t("peripheral.connecting"));
      await isp.connect(progress);
      await isp.flash(new Uint8Array(buffer), { erase: true, verify: true, reset: true, progress });
      setStatusMessage("");
      toast.success(t("peripheral.success", { label: peripheral.label, tag: firmware instanceof File ? firmware.name : firmware.tag }), {
        autoClose: false,
      });
    } catch (flashError) {
      console.error(flashError);
      const message = normalizeError(flashError, t("peripheral.flashFailed"));
      setOperationError(message);
      toast.error(message);
    } finally {
      if (isp) {
        try {
          await isp.close();
        } catch (closeError) {
          console.warn(t("peripheral.closeFailed"), closeError);
        }
      }
      setFlashing(false);
    }
  }

  async function handleAdvancedFlash() {
    const firmware = source === "local" ? localFirmware : selectedRelease;
    if (firmware) await flashFirmware(selectedPeripheral, firmware);
  }

  async function handleLatestFlash(peripheral: Peripheral) {
    const release = releaseMap[peripheral.key]?.[0];
    if (release) await flashFirmware(peripheral, release);
  }

  return (
    <section className="shadow-hard mb-6 w-full rounded-lg border-4 border-black bg-white">
      <header className="flex items-center justify-between gap-4 border-b-3 border-black px-5 py-4">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">{t("peripheral.titleShort")}</h2>
          <p className="text-sm text-gray-500">WCH · WebUSB</p>
        </div>
        {showWindowsDriver && (
          <a
            href="https://github.com/Fri3dCamp/blaster_2024#step-5a-install-zadig-windows-only"
            target="_blank"
            rel="noreferrer"
            className="font-display rounded-md border-2 border-black px-3 py-2 text-center text-sm font-bold uppercase hover:bg-gray-100"
          >
            {t("peripheral.windowsDriverButton")}
          </a>
        )}
      </header>

      <div className="p-5">
        {!supported && <p className="text-fri3d-red mb-4 font-semibold">{t("transport.usbUnsupported")}</p>}

        {advanced ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase">{t("peripheral.device")}</span>
                <select
                  className={selectClassName}
                  value={selectedPeripheral.key}
                  disabled={flashing || !supported}
                  onChange={(event) => setSelectedKey(event.target.value as PeripheralKey)}
                >
                  {peripherals.map((peripheral) => (
                    <option key={peripheral.key} value={peripheral.key}>
                      {peripheral.label}
                    </option>
                  ))}
                </select>
              </label>
              {source === "release" && (
                <label className="grid gap-1">
                  <span className="text-xs font-bold uppercase">{t("common.version")}</span>
                  <select
                    className={selectClassName}
                    value={selectedRelease?.tag ?? ""}
                    disabled={flashing || !supported || selectedReleases.length === 0}
                    onChange={(event) => setSelectedTagByKey((previous) => ({ ...previous, [selectedPeripheral.key]: event.target.value }))}
                  >
                    {selectedReleases.map((release) => (
                      <option key={release.tag} value={release.tag}>
                        {release.name}
                        {release.prerelease ? ` · ${t("common.prerelease")}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="my-5 flex gap-4 border-b-2 border-gray-200 text-sm font-bold">
              <button
                type="button"
                className={clsx("pb-2", source === "release" && "border-b-3 border-black")}
                onClick={() => setSource("release")}
                aria-pressed={source === "release"}
                disabled={flashing}
              >
                {t("common.officialRelease")}
              </button>
              <button
                type="button"
                className={clsx("pb-2", source === "local" && "border-b-3 border-black")}
                onClick={() => setSource("local")}
                aria-pressed={source === "local"}
                disabled={flashing}
              >
                {t("common.localFile")}
              </button>
            </div>

            {source === "release" ? (
              loading ? (
                <p className="text-gray-500">{t("common.loadingReleases")}</p>
              ) : catalogError ? (
                <div className="text-fri3d-red flex gap-3 text-sm">
                  <span>{catalogError}</span>
                  <button type="button" className="font-bold underline" onClick={() => loadAllReleases(true)}>
                    {t("common.retry")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {selectedRelease
                      ? `${selectedRelease.name} · ${formatBytes(selectedRelease.asset.size)}`
                      : t("common.noReleaseSelected")}
                  </span>
                  <button type="button" className="font-bold underline" onClick={() => loadAllReleases(true)} disabled={refreshing}>
                    {refreshing ? t("common.refreshing") : t("common.refreshReleases")}
                  </button>
                </div>
              )
            ) : (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border-2 border-dashed border-gray-400 px-4 py-3 hover:border-black">
                <input
                  type="file"
                  accept=".bin,.hex,.elf,application/octet-stream"
                  className="sr-only"
                  disabled={flashing || !supported}
                  onChange={(event) => setLocalFirmware(event.target.files?.[0] ?? null)}
                />
                <span className="truncate font-semibold">{localFirmware?.name || t("common.chooseFirmwareFile")}</span>
                <span className="shrink-0 text-sm text-gray-500">
                  {localFirmware ? formatBytes(localFirmware.size) : ".bin / .hex / .elf"}
                </span>
              </label>
            )}

            <footer className="mt-5 flex flex-col gap-3 border-t-2 border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                {selectedPeripheral.label} ·{" "}
                {source === "local"
                  ? localFirmware?.name || t("common.noFileSelected")
                  : selectedRelease?.name || t("common.noReleaseSelected")}
              </p>
              <div className="flex items-center gap-3">
                <HelpButton title={t("peripheral.helpTitleAdvanced")}>
                  <PeripheralInstructions />
                </HelpButton>
                <Button type={ButtonType.Primary} onClick={handleAdvancedFlash} disabled={!canFlash}>
                  {flashing ? t("common.flashing") : t("peripheral.selectAndFlash")}
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="divide-y-2 divide-gray-200">
            {loading && <p className="py-3 text-gray-500">{t("common.loadingReleases")}</p>}
            {!loading && catalogError && (
              <div className="text-fri3d-red flex gap-3 py-3 text-sm">
                <span>{catalogError}</span>
                <button type="button" className="font-bold underline" onClick={() => loadAllReleases(true)}>
                  {t("common.retry")}
                </button>
              </div>
            )}
            {!loading &&
              !catalogError &&
              MAIN_PERIPHERALS.map((peripheral) => {
                const release = releaseMap[peripheral.key]?.[0];
                return (
                  <div
                    key={peripheral.key}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-display font-bold uppercase">{peripheral.label}</h3>
                      <p className="text-sm text-gray-500">
                        {release ? `${release.name} · ${formatBytes(release.asset.size)}` : t("common.noReleaseSelected")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <HelpButton title={t("peripheral.helpTitle", { label: peripheral.label })}>
                        <PeripheralInstructions />
                      </HelpButton>
                      <Button
                        type={ButtonType.Primary}
                        onClick={() => handleLatestFlash(peripheral)}
                        disabled={flashing || !supported || !release}
                      >
                        {flashing ? t("common.flashing") : t("peripheral.flashLatestShort")}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {statusMessage && (
          <p className="text-fri3d-mint-dark mt-4 border-t-2 border-gray-200 pt-4 font-semibold" role="status">
            {statusMessage}
          </p>
        )}
        {operationError && <p className="text-fri3d-red mt-4 border-t-2 border-gray-200 pt-4 font-semibold">{operationError}</p>}
      </div>
    </section>
  );
}
