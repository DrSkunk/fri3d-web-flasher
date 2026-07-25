// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { useContext, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EsptoolContext, EsptoolContextProvider } from "./EsptoolContext";

const mocks = vi.hoisted(() => ({
  main: vi.fn(),
  disconnect: vi.fn(),
  setDeviceLostCallback: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("esptool-js", () => ({
  Transport: class {
    setDeviceLostCallback = mocks.setDeviceLostCallback;
    disconnect = mocks.disconnect;
  },
  ESPLoader: class {
    main = mocks.main;
    chip = { CHIP_NAME: "ESP32-S3" };
  },
}));

vi.mock("react-toastify", () => ({
  toast: { error: mocks.toastError, success: vi.fn() },
}));

let context: React.ContextType<typeof EsptoolContext>;

function Probe() {
  const value = useContext(EsptoolContext);
  useEffect(() => {
    context = value;
  }, [value]);
  return null;
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "serial", { configurable: true, value: { requestPort: vi.fn() } });
});

describe("serial lifecycle", () => {
  it("clears connecting state when chooser is cancelled", async () => {
    vi.mocked(navigator.serial.requestPort).mockRejectedValue(new DOMException("cancelled", "NotFoundError"));
    render(
      <EsptoolContextProvider>
        <Probe />
      </EsptoolContextProvider>,
    );

    await act(async () => expect(await context.connect()).toBe(false));

    expect(context.isConnecting).toBe(false);
    expect(context.isConnected).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith("connect.cancelled");
  });

  it("closes transport and clears state on disconnect", async () => {
    vi.mocked(navigator.serial.requestPort).mockResolvedValue({} as SerialPort);
    mocks.main.mockResolvedValue(undefined);
    mocks.disconnect.mockResolvedValue(undefined);
    render(
      <EsptoolContextProvider>
        <Probe />
      </EsptoolContextProvider>,
    );

    await act(async () => expect(await context.connect()).toBe(true));
    expect(context.isConnected).toBe(true);

    await act(async () => context.disconnect());
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(context.isConnected).toBe(false);
  });
});
