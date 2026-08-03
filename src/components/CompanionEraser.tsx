import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { EsptoolContext } from "../context/EsptoolContext";
import { useTranslation } from "../context/LanguageContext";
import { parseEraserOutput, selectCompanionEraserAsset, selectLatestBadge2026Asset } from "../lib/companionEraser";
import { downloadAsset, fetchReleases, type FirmwareAsset } from "../lib/firmware";
import { Button, ButtonType } from "./Button";

const UART_BAUD_RATE = 115200;
const MAX_UART_OUTPUT = 20_000;

type RecoveryStage = "erase" | "monitor" | "restore" | "done";

function Step({ number, active, complete, label }: { number: number; active: boolean; complete: boolean; label: string }) {
  return (
    <li className="flex min-w-0 flex-1 items-center gap-2">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-black font-bold ${
          complete ? "bg-fri3d-mint" : active ? "bg-fri3d-purple-light" : "bg-gray-200 text-gray-500"
        }`}
      >
        {complete ? "✓" : number}
      </span>
      <span className={`font-display hidden text-xs font-bold uppercase sm:block ${active ? "text-black" : "text-gray-500"}`}>{label}</span>
    </li>
  );
}

export function CompanionEraser({ supported = true }: { supported?: boolean }) {
  const { flash, disconnect, isFlashing, flashProgress } = useContext(EsptoolContext);
  const { t } = useTranslation();
  const [stage, setStage] = useState<RecoveryStage>("erase");
  const [eraserAsset, setEraserAsset] = useState<FirmwareAsset>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [monitorConnected, setMonitorConnected] = useState(false);
  const [uartOutput, setUartOutput] = useState("");
  const [eraseProgress, setEraseProgress] = useState<number | null>(null);
  const [monitorFailure, setMonitorFailure] = useState(false);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readTaskRef = useRef<Promise<void> | null>(null);
  const outputRef = useRef("");
  const closingMonitorRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetchReleases("companionEraser2026")
      .then((releases) => {
        if (!cancelled) setEraserAsset(selectCompanionEraserAsset(releases));
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) toast.error(t("eraser.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const closeMonitor = useCallback(async (updateState = true) => {
    closingMonitorRef.current = true;
    await readerRef.current?.cancel().catch(() => undefined);
    await readTaskRef.current?.catch(() => undefined);
    readerRef.current = null;
    readTaskRef.current = null;

    const port = portRef.current;
    portRef.current = null;
    if (port) await port.close().catch(() => undefined);
    if (updateState) setMonitorConnected(false);
    closingMonitorRef.current = false;
  }, []);

  useEffect(() => () => void closeMonitor(false), [closeMonitor]);

  async function handleFlashEraser() {
    if (!eraserAsset || busy || isFlashing) return;
    setBusy(true);
    setDownloadProgress(null);
    setMonitorFailure(false);
    setUartOutput("");
    outputRef.current = "";
    try {
      const buffer = await downloadAsset(eraserAsset, false, setDownloadProgress);
      await flash({
        filename: eraserAsset.name,
        data: new Uint8Array(buffer),
        address: eraserAsset.offset ?? 0,
        expectedChip: "ESP32-S3",
      });
      await disconnect();
      setStage("monitor");
    } catch (error) {
      console.error(error);
      toast.error(t("eraser.flashError"));
    } finally {
      setBusy(false);
      setDownloadProgress(null);
    }
  }

  async function connectMonitor() {
    if (!supported || monitorConnected) return;
    setBusy(true);
    setMonitorFailure(false);
    try {
      await closeMonitor();
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: UART_BAUD_RATE });
      const reader = port.readable?.getReader();
      if (!reader) throw new Error("USB UART is not readable");

      portRef.current = port;
      readerRef.current = reader;
      setMonitorConnected(true);

      const decoder = new TextDecoder();
      const readTask = (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            outputRef.current = `${outputRef.current}${text}`.slice(-MAX_UART_OUTPUT);
            setUartOutput(outputRef.current);
            const status = parseEraserOutput(outputRef.current);
            setEraseProgress(status.progress);
            if (status.failed) setMonitorFailure(true);
            if (status.succeeded) setStage("restore");
          }
        } catch (error) {
          if (!closingMonitorRef.current) {
            console.error(error);
            toast.error(t("eraser.monitorDisconnected"));
          }
        } finally {
          reader.releaseLock();
          if (!closingMonitorRef.current) setMonitorConnected(false);
        }
      })();
      readTaskRef.current = readTask;
    } catch (error) {
      console.error(error);
      if (!(error instanceof DOMException && error.name === "NotFoundError")) toast.error(t("eraser.monitorError"));
    } finally {
      setBusy(false);
    }
  }

  async function restartRecovery() {
    setBusy(true);
    await closeMonitor();
    outputRef.current = "";
    setUartOutput("");
    setEraseProgress(null);
    setMonitorFailure(false);
    setStage("erase");
    setBusy(false);
  }

  async function handleRestoreBadge() {
    if (busy || isFlashing) return;
    setBusy(true);
    setDownloadProgress(null);
    try {
      await closeMonitor();
      const releases = await fetchReleases("badge");
      const asset = selectLatestBadge2026Asset(releases);
      if (!asset) throw new Error("Badge 2026 firmware is unavailable");
      const buffer = await downloadAsset(asset, false, setDownloadProgress);
      await flash({
        filename: asset.name,
        data: new Uint8Array(buffer),
        address: asset.offset ?? 0,
        expectedChip: "ESP32-S3",
      });
      setStage("done");
    } catch (error) {
      console.error(error);
      toast.error(t("eraser.restoreError"));
    } finally {
      setBusy(false);
      setDownloadProgress(null);
    }
  }

  const activeStep = stage === "erase" ? 1 : stage === "monitor" ? 2 : 3;
  const actionProgress = isFlashing ? Math.round(flashProgress) : downloadProgress;

  return (
    <section className="shadow-hard mb-6 w-full rounded-lg border-4 border-black bg-white">
      <header className="flex items-center justify-between border-b-3 border-black px-5 py-4">
        <div>
          <h2 className="font-display text-xl font-bold uppercase">{t("eraser.title")}</h2>
          <p className="text-sm text-gray-500">ESP32-S3 → CH32 · WebSerial</p>
        </div>
        <span className="bg-fri3d-purple-light rounded-full px-3 py-1 text-xs font-bold uppercase">{t("app.advancedMode")}</span>
      </header>

      <div className="p-5">
        {!supported && <p className="text-fri3d-red mb-4 font-semibold">{t("transport.serialUnsupported")}</p>}

        <ol className="mb-6 flex gap-2 border-b-2 border-gray-200 pb-5">
          <Step number={1} active={activeStep === 1} complete={activeStep > 1} label={t("eraser.stepFlashShort")} />
          <Step number={2} active={activeStep === 2} complete={activeStep > 2} label={t("eraser.stepMonitorShort")} />
          <Step number={3} active={activeStep === 3} complete={stage === "done"} label={t("eraser.stepRestoreShort")} />
        </ol>

        {stage === "erase" && (
          <div>
            <h3 className="font-display text-lg font-bold uppercase">{t("eraser.stepFlashTitle")}</h3>
            <p className="mt-2">{t("eraser.stepFlashBody")}</p>
            <p className="text-fri3d-red mt-3 font-bold">{t("eraser.warning")}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-gray-200 pt-4">
              <a
                href="https://badgehub.eu/page/project/badge_2026_expander_eraser"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold underline underline-offset-4"
              >
                {t("eraser.source")}
              </a>
              <Button
                type={ButtonType.Danger}
                onClick={handleFlashEraser}
                disabled={!supported || loading || !eraserAsset || busy || isFlashing}
              >
                {loading
                  ? t("common.loadingReleases")
                  : actionProgress !== null
                    ? t("eraser.progressAction", { progress: String(actionProgress) })
                    : t("eraser.flashAction")}
              </Button>
            </div>
          </div>
        )}

        {stage === "monitor" && (
          <div>
            <h3 className="font-display text-lg font-bold uppercase">{t("eraser.stepMonitorTitle")}</h3>
            {!monitorConnected ? (
              <>
                <p className="mt-2">{t("eraser.stepMonitorConnectBody")}</p>
                <Button className="mt-4" type={ButtonType.Primary} onClick={connectMonitor} disabled={!supported || busy}>
                  {busy ? t("phase.connecting") : t("eraser.connectMonitorAction")}
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 font-bold">{t("eraser.stepMonitorRebootBody")}</p>
                <p className="mt-1 text-sm text-gray-600">{t("eraser.stepMonitorWaitBody")}</p>
                <div className="mt-4 overflow-hidden rounded-md border-2 border-black bg-black text-green-300">
                  <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2 text-xs font-bold uppercase">
                    <span>{t("eraser.monitorTitle")}</span>
                    <span>{eraseProgress === null ? t("eraser.monitorWaiting") : `${eraseProgress}%`}</span>
                  </div>
                  <pre className="h-52 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap">
                    {uartOutput || t("eraser.monitorEmpty")}
                  </pre>
                </div>
                {eraseProgress !== null && <progress value={eraseProgress} max="100" className="accent-fri3d-purple mt-3 h-2 w-full" />}
                {monitorFailure && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-fri3d-red font-bold">{t("eraser.detectedFailure")}</p>
                    <Button onClick={restartRecovery} disabled={busy}>
                      {t("common.retry")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {stage === "restore" && (
          <div>
            <h3 className="font-display text-lg font-bold uppercase">{t("eraser.stepRestoreTitle")}</h3>
            <p className="text-fri3d-mint-dark mt-2 font-bold">✓ {t("eraser.eraseComplete")}</p>
            <p className="mt-2">{t("eraser.stepRestoreBody")}</p>
            <div className="mt-4 overflow-hidden rounded-md border-2 border-black bg-black text-green-300">
              <pre className="max-h-36 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap">{uartOutput}</pre>
            </div>
            <div className="mt-5 flex justify-end border-t-2 border-gray-200 pt-4">
              <Button type={ButtonType.Primary} onClick={handleRestoreBadge} disabled={busy || isFlashing}>
                {actionProgress !== null
                  ? t("eraser.restoreProgressAction", { progress: String(actionProgress) })
                  : t("eraser.restoreAction")}
              </Button>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="py-4 text-center">
            <div className="bg-fri3d-mint mx-auto flex size-12 items-center justify-center rounded-full border-2 border-black text-2xl font-bold">
              ✓
            </div>
            <h3 className="font-display mt-3 text-lg font-bold uppercase">{t("eraser.doneTitle")}</h3>
            <p className="mt-1 text-gray-600">{t("eraser.doneBody")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
