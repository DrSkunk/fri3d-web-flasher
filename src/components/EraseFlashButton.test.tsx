// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EsptoolContext } from "../context/EsptoolContext";
import { EraseFlashButton } from "./EraseFlashButton";

const mocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: mocks }));

function renderButton(eraseFlash: () => Promise<void>) {
  return render(
    <EsptoolContext.Provider
      value={{
        flash: async () => {},
        logs: [],
        connect: async () => true,
        disconnect: async () => {},
        isConnected: true,
        isConnecting: false,
        isFlashing: false,
        flashProgress: 0,
        phase: "idle",
        eraseFlash,
        deviceInfo: { chipName: "", mac: "", features: "", crystal: "" },
      }}
    >
      <EraseFlashButton />
    </EsptoolContext.Provider>,
  );
}

async function confirmErase() {
  fireEvent.click(screen.getByText("erase.button"));
  const eraseButtons = await screen.findAllByText("erase.button");
  fireEvent.click(eraseButtons[eraseButtons.length - 1]);
}

describe("erase notifications", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("reports success only after erase succeeds", async () => {
    renderButton(vi.fn().mockResolvedValue(undefined));
    await confirmErase();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("erase.success"));
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("does not report success when erase fails", async () => {
    renderButton(vi.fn().mockRejectedValue(new Error("erase failed")));
    await confirmErase();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("erase.error"));
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
