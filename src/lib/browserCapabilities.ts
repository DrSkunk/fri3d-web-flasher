import { useEffect, useState } from "react";

export interface TransportSupport {
  serial: boolean;
  usb: boolean;
}

export function detectTransportSupport(): TransportSupport {
  return {
    serial: typeof navigator !== "undefined" && "serial" in navigator && Boolean(navigator.serial),
    usb: typeof navigator !== "undefined" && "usb" in navigator && Boolean(navigator.usb),
  };
}

export function isWindowsPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Windows|Win32|Win64|WOW64/i.test(`${navigator.userAgent} ${navigator.platform}`);
}

export function useTransportSupport(): TransportSupport {
  const [support, setSupport] = useState(detectTransportSupport);
  useEffect(() => setSupport(detectTransportSupport()), []);
  return support;
}
