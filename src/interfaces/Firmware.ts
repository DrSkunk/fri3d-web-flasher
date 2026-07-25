// Firmware image and catalog-derived flash settings.
export interface Firmware {
  filename: string;
  data: Uint8Array;
  address: number;
  expectedChip?: string;
  baudrate?: number;
}
