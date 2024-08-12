import { unzip as unzipCB } from "fflate";
import { Firmware } from "../interfaces/Firmware";
import { toast } from "react-toastify";

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

export async function parseUpload(file: File): Promise<Firmware> {
  const buffer = await file.arrayBuffer();

  const zip = new Uint8Array(buffer);
  const unzipped = await unzip(zip);
  const textDecoder = new TextDecoder();

  const flashArgsFile = textDecoder.decode(unzipped.flash_args);
  // Example flash_args file:
  // --before=default_reset --after=hard_reset write_flash --flash_mode dio --flash_freq 40m --flash_size 16MB
  // 0x1000 bootloader.bin
  // 0x10000 micropython.bin
  // 0x8000 partition-table.bin
  const [flashArgs, ...partitionsStrings] = flashArgsFile.split("\n");
  const partitions = partitionsStrings.map((partition) => {
    const [address, filename] = partition.split(" ");
    return { address, data: unzipped[filename] };
  });
  return {
    filename: file.name,
    flashArgs,
    partitions,
  };
}
