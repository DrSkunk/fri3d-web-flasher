import { ESPLoader, FlashOptions, Transport } from "esptool-js";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";
import { Firmware } from "../interfaces/Firmware";
import { useTranslation } from "./LanguageContext";

const MAX_LOG_LINES = 500;

export type BadgePhase = "idle" | "connecting" | "erasing" | "writing" | "success" | "error";

interface EsptoolContextType {
  flash: (firmware: Firmware) => Promise<void>;
  logs: string[];
  connect: (baudrate?: number) => Promise<boolean>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  isFlashing: boolean;
  flashProgress: number;
  phase: BadgePhase;
  eraseFlash: () => Promise<void>;
  deviceInfo: { chipName: string; mac: string; features: string; crystal: string };
}

const emptyDeviceInfo = { chipName: "", mac: "", features: "", crystal: "" };

export const EsptoolContext = createContext<EsptoolContextType>({
  flash: async () => {},
  logs: [],
  connect: async () => false,
  disconnect: async () => {},
  isConnected: false,
  isConnecting: false,
  isFlashing: false,
  flashProgress: 0,
  phase: "idle",
  eraseFlash: async () => {},
  deviceInfo: emptyDeviceInfo,
});

function normalizeChipName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function EsptoolContextProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState<BadgePhase>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState(emptyDeviceInfo);

  const device = useRef<SerialPort | null>(null);
  const esploader = useRef<ESPLoader | null>(null);
  const transport = useRef<Transport | null>(null);
  const isConnecting = phase === "connecting";
  const isFlashing = phase === "writing";

  useEffect(() => {
    if (!isFlashing) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isFlashing]);

  function appendLog(data: string, continueLine = false) {
    setLogs((previous) => {
      let next: string[];
      if (continueLine && previous.length > 0) {
        next = [...previous.slice(0, -1), previous[previous.length - 1] + data];
      } else {
        next = [...previous, data];
      }
      return next.slice(-MAX_LOG_LINES);
    });
  }

  function captureInfo(data: string) {
    const entries = [
      { key: "Chip is ", value: "chipName" },
      { key: "MAC: ", value: "mac" },
      { key: "Features: ", value: "features" },
      { key: "Crystal is ", value: "crystal" },
    ] as const;
    for (const entry of entries) {
      if (data.startsWith(entry.key)) {
        setDeviceInfo((previous) => ({ ...previous, [entry.value]: data.replace(entry.key, "").replace("\r", "").trim() }));
        return;
      }
    }
  }

  const espLoaderTerminal = {
    clean() {
      setLogs([]);
    },
    writeLine(data: string) {
      captureInfo(data);
      console.log(data);
      appendLog(data);
    },
    write(data: string) {
      console.log(data);
      appendLog(data, true);
    },
  };

  const clearConnection = useCallback(() => {
    device.current = null;
    transport.current = null;
    esploader.current = null;
    setIsConnected(false);
    setDeviceInfo(emptyDeviceInfo);
    setPhase((current) => (current === "writing" ? "error" : "idle"));
  }, []);

  const disconnect = useCallback(async () => {
    const currentTransport = transport.current;
    try {
      currentTransport?.setDeviceLostCallback(null);
      if (currentTransport) await currentTransport.disconnect();
    } finally {
      clearConnection();
    }
  }, [clearConnection]);

  async function connect(baudrate = 115200): Promise<boolean> {
    if (phase === "connecting" || isConnected) return isConnected;
    if (!("serial" in navigator) || !navigator.serial) {
      toast.error(t("transport.serialUnsupported"));
      return false;
    }

    setPhase("connecting");
    let nextTransport: Transport | null = null;
    try {
      const port = await navigator.serial.requestPort();
      nextTransport = new Transport(port, false);
      nextTransport.setDeviceLostCallback(() => {
        clearConnection();
        toast.error(t("connect.disconnected"));
      });
      const nextLoader = new ESPLoader({
        transport: nextTransport,
        baudrate,
        terminal: espLoaderTerminal,
      });
      await nextLoader.main();
      device.current = port;
      transport.current = nextTransport;
      esploader.current = nextLoader;
      setIsConnected(true);
      setPhase("idle");
      return true;
    } catch (error) {
      console.error(error);
      if (error instanceof Error) appendLog(error.message);
      await nextTransport?.disconnect().catch(console.warn);
      clearConnection();
      setPhase("error");
      toast.error(error instanceof DOMException && error.name === "NotFoundError" ? t("connect.cancelled") : t("connect.error"));
      return false;
    }
  }

  async function flash(firmware: Firmware) {
    if (!esploader.current && !(await connect(firmware.baudrate))) throw new Error(t("connect.error"));
    const loader = esploader.current;
    if (!loader) throw new Error(t("connect.error"));

    if (firmware.expectedChip && normalizeChipName(loader.chip.CHIP_NAME) !== normalizeChipName(firmware.expectedChip)) {
      throw new Error(t("flash.wrongChip", { expected: firmware.expectedChip, actual: loader.chip.CHIP_NAME }));
    }

    setPhase("writing");
    setFlashProgress(0);
    try {
      const flashOptions: FlashOptions = {
        fileArray: [{ address: firmware.address, data: firmware.data }],
        flashSize: "16MB",
        flashMode: "dio",
        flashFreq: "80m",
        eraseAll: false,
        compress: true,
        reportProgress: (_fileIndex, written, total) => setFlashProgress((written / total) * 100),
        calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.lib.WordArray.create(image)).toString(),
      };
      await loader.writeFlash(flashOptions);
      setPhase("success");
      toast.success(t("flash.success"), { autoClose: false });
    } catch (error) {
      setPhase("error");
      throw error;
    } finally {
      setFlashProgress(0);
    }
  }

  async function eraseFlash() {
    if (!esploader.current) throw new Error(t("connect.error"));
    setPhase("erasing");
    try {
      await esploader.current.eraseFlash();
      setPhase("idle");
    } catch (error) {
      setPhase("error");
      throw error;
    }
  }

  return (
    <EsptoolContext.Provider
      value={{ flash, logs, connect, disconnect, eraseFlash, deviceInfo, isConnecting, isConnected, isFlashing, flashProgress, phase }}
    >
      {children}
    </EsptoolContext.Provider>
  );
}
