import { afterEach, describe, expect, it, vi } from "vitest";
import { detectTransportSupport } from "./browserCapabilities";

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
