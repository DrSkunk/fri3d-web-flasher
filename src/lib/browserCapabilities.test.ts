import { afterEach, describe, expect, it, vi } from "vitest";
import { detectTransportSupport, isWindowsPlatform } from "./browserCapabilities";

afterEach(() => vi.unstubAllGlobals());

describe("transport capability detection", () => {
  it("detects WebSerial and WebUSB independently", () => {
    vi.stubGlobal("navigator", { serial: {}, usb: undefined });
    expect(detectTransportSupport()).toEqual({ serial: true, usb: false });

    vi.stubGlobal("navigator", { serial: undefined, usb: {} });
    expect(detectTransportSupport()).toEqual({ serial: false, usb: true });
  });

  it("reports neither transport when navigator lacks both", () => {
    vi.stubGlobal("navigator", {});
    expect(detectTransportSupport()).toEqual({ serial: false, usb: false });
  });
});

describe("platform detection", () => {
  it("detects Windows from the user agent", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32" });
    expect(isWindowsPlatform()).toBe(true);
  });

  it("does not match non-Windows platforms", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "MacIntel" });
    expect(isWindowsPlatform()).toBe(false);
  });
});
