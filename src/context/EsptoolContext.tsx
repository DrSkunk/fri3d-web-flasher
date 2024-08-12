import { ESPLoader, Transport } from "esptool-js";
import { useState, createContext, useRef } from "react";
import { parseUpload } from "../lib/parseUpload";
import { Firmware } from "../interfaces/Firmware";
import { toast } from "react-toastify";

interface EsptoolContextType {
  firmware: Firmware | null;
  loadFirmware: (file: File) => void;
  flash: (file: File) => void;
  logs: string[];
}

export const EsptoolContext = createContext<EsptoolContextType>({
  firmware: null,
  loadFirmware: () => {},
  flash: () => {},
  logs: [],
});

export function EsptoolContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logs, setLogs] = useState<string[]>([]);
  const [baudrate, setBaudrate] = useState(115200);

  const device = useRef<SerialPort | null>(null);
  const esploader = useRef<ESPLoader | null>(null);
  const transport = useRef<Transport | null>(null);
  const [firmware, setFirmware] = useState<Firmware | null>(null);
  // const [connected, setConnected] = useState(false);

  const espLoaderTerminal = {
    clean() {
      setLogs([]);
    },
    writeLine(data: string) {
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

  async function connect() {
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

      const chip = await esploader.current.main();
      espLoaderTerminal.writeLine(`Reading chip ${chip}`);

      // setConnected(true);
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
    console.log("Flashing", file);
  }

  async function loadFirmware(file: File) {
    try {
      const firmware = await parseUpload(file);
      setFirmware(firmware);
    } catch (error) {
      toast.error("Ongeldig zip bestand");
    }
  }

  return (
    <EsptoolContext.Provider
      value={{
        loadFirmware,
        firmware,
        flash,
        logs,
      }}
    >
      {children}
    </EsptoolContext.Provider>
  );
}
