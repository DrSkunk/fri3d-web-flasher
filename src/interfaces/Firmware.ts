export interface Firmware {
  filename: string;
  flashArgs: string;
  partitions: { address: string; data: Uint8Array }[];
}
