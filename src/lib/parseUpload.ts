import { unzip as unzipCB } from "fflate";
import { Firmware } from "../interfaces/Firmware";

function unzip(raw: Uint8Array): Promise<{ [key: string]: Uint8Array }> {
  return new Promise((resolve, reject) => {
    unzipCB(raw, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function uint8ArrayToBinaryString(uint8Array: Uint8Array): string {
  return Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join("");
}

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  return uint8ArrayToBinaryString(new Uint8Array(buffer));
}

export async function parseUpload(file: File | ArrayBuffer, filenameOverride?: string): Promise<Firmware> {
  let buffer;
  let filename = "onbekend bestand";
  if (file instanceof ArrayBuffer) {
    buffer = file;
  } else {
    filename = file.name;
    buffer = await file.arrayBuffer();
  }

  if (filenameOverride) {
    filename = filenameOverride;
  }

  const zip = new Uint8Array(buffer);
  let unzipped;
  try {
    unzipped = await unzip(zip);
  } catch (error) {
    console.log("not a zip file, trying to flash as single file");
    return {
      filename,
      flashArgs: "",
      partitions: [
        {
          address: 0,
          name: filename,
          data: arrayBufferToBinaryString(buffer),
          progress: 0,
        },
      ],
    };
  }
  // const unzipped = await unzip(zip);
  const textDecoder = new TextDecoder();

  const flashArgsFile = textDecoder.decode(unzipped.flash_args);
  // Example flash_args file:
  // --before=default_reset --after=hard_reset write_flash --flash_mode dio --flash_freq 40m --flash_size 16MB
  // 0x1000 bootloader.bin
  // 0x10000 micropython.bin
  // 0x8000 partition-table.bin
  const [flashArgs, ...partitionsStrings] = flashArgsFile.split("\n").filter(Boolean);
  const partitions = partitionsStrings.map((partition) => {
    const [address, name] = partition.split(" ");
    const data = uint8ArrayToBinaryString(unzipped[name]);
    return { address: parseInt(address, 16), name, data, progress: 0 };
  });
  return {
    filename,
    flashArgs,
    partitions,
  };
}
