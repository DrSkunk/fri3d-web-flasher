import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { WchIspFlasher, WebUsbTransport, type Progress } from "wchisp-web";
import { Button, ButtonType } from "./Button";
import { downloadAsset, fetchReleases, FirmwareAsset } from "../lib/firmware";
import { HelpButton, PeripheralInstructions } from "./HelpDialog";
import { useTranslation } from "../context/LanguageContext";

// Peripherals (Communicator, DJ addon, ...) use WCH chips flashed over WebUSB.
// Each peripheral has its own firmware repo; the release asset is a raw
// .bin/.hex/.elf file.
type Peripheral = {
  key: "communicator2026" | "communicator2024" | "dj2026";
  label: string;
};

const MAIN_PERIPHERALS: Peripheral[] = [
  { key: "communicator2026", label: "Communicator 2026" },
  { key: "dj2026", label: "DJ Addon 2026" },
];

const ADVANCED_EXTRA_PERIPHERALS: Peripheral[] = [{ key: "communicator2024", label: "Communicator 2024" }];

interface FlashableRelease {
  tag: string;
  name: string;
  prerelease: boolean;
  asset: FirmwareAsset;
}

const selectClassName = clsx(
  "rounded-md border-4 border-black bg-white px-3 py-2 font-display text-sm font-bold uppercase text-black shadow-hard-sm",
  "disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none",
);

function isFlashableAsset(name: string): boolean {
  return /\.(bin|hex|elf)$/i.test(name);
}

function normalizeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

export function PeripheralFlasher({ advanced = false }: { advanced?: boolean }) {
  const { t } = useTranslation();
  const peripherals = useMemo(() => (advanced ? [...MAIN_PERIPHERALS, ...ADVANCED_EXTRA_PERIPHERALS] : MAIN_PERIPHERALS), [advanced]);

  const [selectedKey, setSelectedKey] = useState<Peripheral["key"]>(peripherals[0].key);
  const [releaseMap, setReleaseMap] = useState<Record<string, FlashableRelease[]>>({});
  const [selectedTagByKey, setSelectedTagByKey] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadAllReleases = useCallback(
    async (forceRefresh = false) => {
      setLoading(!forceRefresh);
      setRefreshing(forceRefresh);
      setErrorMessage("");

      try {
        const all = await Promise.all(
          peripherals.map(async (peripheral) => {
            const data = await fetchReleases(peripheral.key, forceRefresh);
            const releases = data
              .map((release) => {
                const asset = release.assets.find((candidate) => isFlashableAsset(candidate.name));
                if (!asset) {
                  return null;
                }
                return {
                  tag: release.tag_name,
                  name: release.name || release.tag_name,
                  prerelease: release.prerelease,
                  asset,
                } satisfies FlashableRelease;
              })
              .filter((release): release is FlashableRelease => release !== null);
            return [peripheral.key, releases] as const;
          }),
        );

        const nextMap: Record<string, FlashableRelease[]> = {};
        const nextSelected: Record<string, string> = {};
        for (const [key, releases] of all) {
          nextMap[key] = releases;
          if (releases.length > 0) {
            nextSelected[key] = releases[0].tag;
          }
        }
        setReleaseMap(nextMap);
        setSelectedTagByKey(nextSelected);
      } catch (error) {
        console.error(error);
        setReleaseMap({});
        setSelectedTagByKey({});
        setErrorMessage(t("peripheral.fetchError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [peripherals],
  );

  useEffect(() => {
    loadAllReleases();
  }, [loadAllReleases]);

  const selectedPeripheral = peripherals.find((peripheral) => peripheral.key === selectedKey) ?? peripherals[0];
  const selectedReleases = releaseMap[selectedPeripheral.key] ?? [];
  const selectedTag = selectedTagByKey[selectedPeripheral.key] ?? "";
  const selectedRelease = selectedReleases.find((release) => release.tag === selectedTag) ?? selectedReleases[0];

  async function flashRelease(peripheral: Peripheral, release: FlashableRelease) {
    const progress: Progress = (event) => {
      if (event.total > 0) {
        const percent = Math.floor((event.done / event.total) * 100);
        setStatusMessage(`${event.phase}: ${percent}%`);
        return;
      }
      setStatusMessage(event.phase);
    };

    setFlashing(true);
    setErrorMessage("");
    setStatusMessage(t("common.downloadingFirmware"));
    let isp: WchIspFlasher | null = null;

    try {
      const bytes = new Uint8Array(await downloadAsset(release.asset));

      setStatusMessage(t("peripheral.selectUsb"));
      const transport = await WebUsbTransport.request();
      isp = new WchIspFlasher(transport);

      setStatusMessage(t("peripheral.connecting"));
      await isp.connect(progress);

      await isp.flash(bytes, {
        erase: true,
        verify: true,
        reset: true,
        progress,
      });
      setStatusMessage("");
      toast.success(t("peripheral.success", { label: peripheral.label, tag: release.tag }), { autoClose: false });
    } catch (error) {
      console.error(error);
      const message = normalizeError(error, t("peripheral.flashFailed"));
      setErrorMessage(message);
      toast.error(message);
    } finally {
      if (isp) {
        try {
          await isp.close();
        } catch (error) {
          console.warn("Could not close the WebUSB session", error);
        }
      }
      setFlashing(false);
    }
  }

  async function handleMainFlash(peripheral: Peripheral) {
    const latest = (releaseMap[peripheral.key] ?? [])[0];
    if (!latest) {
      toast.error(t("peripheral.noRelease", { label: peripheral.label }));
      return;
    }
    await flashRelease(peripheral, latest);
  }

  async function handleAdvancedFlash() {
    if (!selectedRelease) {
      return;
    }
    await flashRelease(selectedPeripheral, selectedRelease);
  }

  if (loading) {
    return <p className="font-display mb-4 text-center font-semibold">{t("common.loadingReleases")}</p>;
  }

  if (advanced) {
    return (
      <div className="shadow-hard-sm mb-4 w-full max-w-4xl rounded-md border-4 border-black bg-white p-4">
        <h3 className="font-display mb-3 text-lg font-bold uppercase">{t("peripheral.title")}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-display text-xs font-bold tracking-wide uppercase">{t("peripheral.device")}</span>
            <select
              className={selectClassName}
              value={selectedPeripheral.key}
              disabled={flashing}
              onChange={(event) => setSelectedKey(event.target.value as Peripheral["key"])}
            >
              {peripherals.map((peripheral) => (
                <option key={peripheral.key} value={peripheral.key}>
                  {peripheral.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-display text-xs font-bold tracking-wide uppercase">{t("common.version")}</span>
            <select
              className={selectClassName}
              value={selectedRelease?.tag ?? ""}
              disabled={flashing || selectedReleases.length === 0}
              onChange={(event) =>
                setSelectedTagByKey((previous) => ({
                  ...previous,
                  [selectedPeripheral.key]: event.target.value,
                }))
              }
            >
              {selectedReleases.map((release) => (
                <option key={release.tag} value={release.tag}>
                  {release.name}
                  {release.prerelease ? " (pre-release)" : ""}
                </option>
              ))}
            </select>
          </label>

          <Button type={ButtonType.Regular} onClick={() => loadAllReleases(true)} disabled={flashing || refreshing}>
            {refreshing ? t("common.refreshing") : t("common.refreshReleases")}
          </Button>

          <Button type={ButtonType.Primary} onClick={handleAdvancedFlash} disabled={flashing || !selectedRelease}>
            {flashing ? t("common.flashing") : t("peripheral.flashViaUsb")}
          </Button>

          <HelpButton title={t("peripheral.helpTitleAdvanced")}>
            <PeripheralInstructions />
          </HelpButton>
        </div>
        {errorMessage && <p className="font-display text-fri3d-red mt-3 text-sm font-semibold">{errorMessage}</p>}
        {statusMessage && <p className="font-display text-fri3d-mint-dark mt-3 text-sm font-semibold">{statusMessage}</p>}
      </div>
    );
  }

  return (
    <div className="shadow-hard-sm mb-4 w-full max-w-4xl rounded-md border-4 border-black bg-white p-4">
      <h3 className="font-display mb-3 text-lg font-bold uppercase">{t("peripheral.title")}</h3>
      <div className="grid gap-3">
        {MAIN_PERIPHERALS.map((peripheral) => (
          <div key={peripheral.key} className="flex items-center gap-3">
            <Button type={ButtonType.Primary} onClick={() => handleMainFlash(peripheral)} disabled={flashing} className="flex-1">
              {flashing ? t("common.flashing") : t("peripheral.flashLatest", { label: peripheral.label })}
            </Button>
            <HelpButton title={t("peripheral.helpTitle", { label: peripheral.label })}>
              <PeripheralInstructions />
            </HelpButton>
          </div>
        ))}
      </div>
      {errorMessage && <p className="font-display text-fri3d-red mt-3 text-center text-sm font-semibold">{errorMessage}</p>}
      {statusMessage && <p className="font-display text-fri3d-mint-dark mt-3 text-center text-sm font-semibold">{statusMessage}</p>}
    </div>
  );
}
