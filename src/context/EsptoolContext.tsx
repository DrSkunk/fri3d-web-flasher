import { ESPLoader, FlashOptions, Transport } from "esptool-js";
import { useState, createContext, useRef } from "react";
import { parseUpload } from "../lib/parseUpload";
import { Firmware } from "../interfaces/Firmware";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";

interface EsptoolContextType {
  firmware: Firmware | null;
  uploadFirmware: (file: File) => Promise<void>;
  loadFirmwareFromUrl: (url: string) => Promise<void>;
  flash: (file: File) => Promise<void>;
  logs: string[];
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  isFlashing: boolean;
  updateProgress: (partitionIndex: number, progress: number) => void;
  eraseFlash: () => Promise<void>;
  deviceInfo: {
    chipName: string;
    mac: string;
    features: string;
    crystal: string;
  };
}

export const EsptoolContext = createContext<EsptoolContextType>({
  firmware: null,
  uploadFirmware: async () => {},
  loadFirmwareFromUrl: async () => {},
  flash: async () => {},
  logs: [],
  connect: async () => {},
  disconnect: () => {},
  isConnected: false,
  isConnecting: false,
  isFlashing: false,
  updateProgress: () => {},
  eraseFlash: async () => {},
  deviceInfo: {
    chipName: "onbekend",
    mac: "onbekend",
    features: "onbekend",
    crystal: "onbekend",
  },
});

export function EsptoolContextProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [baudrate, setBaudrate] = useState(115200);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const device = useRef<SerialPort | null>(null);
  const esploader = useRef<ESPLoader | null>(null);
  const transport = useRef<Transport | null>(null);
  const [firmware, setFirmware] = useState<Firmware | null>(null);

  const [deviceInfo, setDeviceInfo] = useState<{
    chipName: string;
    mac: string;
    features: string;
    crystal: string;
  }>({
    chipName: "onbekend",
    mac: "onbekend",
    features: "onbekend",
    crystal: "onbekend",
  });
  // const [connected, setConnected] = useState(false);

  function captureInfo(data: string) {
    const entries = [
      {
        key: "Chip is ",
        value: "chipName",
      },
      {
        key: "MAC: ",
        value: "mac",
      },
      {
        key: "Features: ",
        value: "features",
      },
      {
        key: "Crystal is ",
        value: "crystal",
      },
    ];
    for (const entry of entries) {
      if (data.startsWith(entry.key)) {
        setDeviceInfo((previous) => ({
          ...previous,
          [entry.value]: data.replace(entry.key, "").replace("\r", "").trim(),
        }));
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
      setLogs((prev) => {
        return [...prev, data];
      });
    },
    write(data: string) {
      console.log(data);
      setLogs((prev) => {
        const lastLine = prev?.[prev.length - 1];
        if (lastLine) {
          return [...prev.slice(0, prev.length - 1), lastLine + data];
        }
        return [data];
      });
    },
  };

  function disconnect() {
    device.current = null;
    transport.current = null;
    esploader.current = null;
    setIsConnected(false);
  }

  async function connect() {
    if (isConnecting) {
      return;
    }
    setIsConnecting(true);
    device.current = await navigator.serial.requestPort();
    transport.current = new Transport(device.current, false);

    try {
      const flashOptions = {
        transport: transport.current,
        baudrate,
        romBaudrate: baudrate,
        terminal: espLoaderTerminal,
      };
      esploader.current = new ESPLoader(flashOptions);

      await esploader.current.main();
      setIsConnecting(false);
      setIsConnected(true);
    } catch (error) {
      toast.error("Er is een fout opgetreden bij het verbinden met de badge");
      if (typeof error === "string") {
        espLoaderTerminal.writeLine(error);
      } else if (error instanceof Error) {
        espLoaderTerminal.writeLine(error.message);
      }
    }
  }

  async function flash(file: File) {
    if (!esploader.current) {
      // throw new Error("No device connected");
      await connect();
    }
    if (!esploader.current || !firmware) {
      return;
    }
    setIsFlashing(true);
    const fileArray = firmware.partitions.map(({ address, data }) => ({
      address,
      data,
    }));

    console.log("Flashing", file);
    const flashOptions: FlashOptions = {
      fileArray: fileArray,
      flashSize: "16MB",
      flashMode: "dio",
      flashFreq: "80m",
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        console.log("Progress", fileIndex, written, total);
        updateProgress(fileIndex, (written / total) * 100);
      },
      calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString(),
    };
    await esploader.current.writeFlash(flashOptions);
    setIsFlashing(false);
    toast.success("Firmware geflashed!");
  }

  async function loadFirmwareFromUrl(url: string) {
    const response = await fetch("http://localhost:5173/github_api/repos/tomvanbraeckel/retro-go-fri3d/releases/assets/185561939", {
      headers: {
        Accept: "application/octet-stream",
      },
    });
    const buffer = await response.arrayBuffer();
    const firmware = await parseUpload(buffer);
    setFirmware(firmware);
  }

  async function uploadFirmware(file: File) {
    try {
      const firmware = await parseUpload(file);
      setFirmware(firmware);
    } catch (error) {
      toast.error("Ongeldig zip bestand");
    }
  }

  async function eraseFlash() {
    if (!esploader.current) {
      return;
    }
    await esploader.current.eraseFlash();
  }

  function updateProgress(partitionIndex: number, progress: number) {
    if (!firmware) {
      return;
    }
    setFirmware((previous) => {
      if (!previous) {
        return null;
      }
      const partitions = previous.partitions.map((partition, index) => {
        if (index === partitionIndex) {
          return { ...partition, progress };
        }
        return partition;
      });
      return { ...previous, partitions };
    });
  }

  return (
    <EsptoolContext.Provider
      value={{
        uploadFirmware,
        loadFirmwareFromUrl,
        firmware,
        flash,
        logs,
        connect,
        disconnect,
        updateProgress,
        eraseFlash,
        deviceInfo,
        isConnecting,
        isConnected,
        isFlashing,
      }}
    >
      {children}
    </EsptoolContext.Provider>
  );
}
