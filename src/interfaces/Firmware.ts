export interface Firmware {
  filename: string;
  flashArgs: string;
  partitions: {
    address: number;
    name: string;
    data: string;
    progress: number;
  }[];
}
