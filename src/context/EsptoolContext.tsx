import { ESPLoader, FlashOptions, Transport } from "esptool-js";
import { useState, createContext, useRef } from "react";
import { parseUpload } from "../lib/parseUpload";
import { Firmware } from "../interfaces/Firmware";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";

interface EsptoolContextType {
  firmware: Firmware | null;
  loadFirmware: (file: File) => void;
  flash: (file: File) => void;
  logs: string[];
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  updateProgress: (partitionIndex: number, progress: number) => void;
  deviceInfo: {
    chipName: string;
    mac: string;
    features: string;
    crystal: string;
  };
}

export const EsptoolContext = createContext<EsptoolContextType>({
  firmware: null,
  loadFirmware: () => {},
  flash: () => {},
  logs: [],
  connect: () => {},
  disconnect: () => {},
  isConnected: false,
  isConnecting: false,
  updateProgress: () => {},
  deviceInfo: {
    chipName: "onbekend",
    mac: "onbekend",
    features: "onbekend",
    crystal: "onbekend",
  },
});

export function EsptoolContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logs, setLogs] = useState<string[]>([]);
  const [baudrate, setBaudrate] = useState(115200);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

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

  async function disconnect() {
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

    const fileArray = firmware.partitions.map(({ address, data }) => ({
      address,
      data,
    }));

    console.log("fileArray", fileArray);

    console.log("Flashing", file);
    const flashOptions: FlashOptions = {
      // fileArray,
      flashSize: "16MB",
      flashMode: "dio",
      flashFreq: "80m",
      // eraseAll: true,
      // compress: true,
      // reportProgress(fileIndex, written, total) {
      //   console.log("Progress", fileIndex, written, total);
      // },
      fileArray: fileArray,
      // flashSize: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        // progressBars[fileIndex].value = (written / total) * 100;
        console.log("Progress", fileIndex, written, total);
        updateProgress(fileIndex, (written / total) * 100);
      },
      calculateMD5Hash: (image) =>
        CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString(),
    };
    esploader.current.writeFlash(flashOptions);
  }

  async function loadFirmware(file: File) {
    try {
      const firmware = await parseUpload(file);
      setFirmware(firmware);
    } catch (error) {
      toast.error("Ongeldig zip bestand");
    }
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
        loadFirmware,
        firmware,
        flash,
        logs,
        connect,
        disconnect,
        updateProgress,
        deviceInfo,
        isConnecting,
        isConnected,
      }}
    >
      {children}
    </EsptoolContext.Provider>
  );
}
