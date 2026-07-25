import { describe, expect, it } from "vitest";
import { sanitizeDiagnosticLine } from "./diagnostics";

describe("diagnostic sanitization", () => {
  it("redacts MAC addresses and labeled serial numbers", () => {
    expect(sanitizeDiagnosticLine("MAC: aa:bb:cc:dd:ee:ff Serial Number=ABC123 stage=write")).toBe(
      "MAC=[redacted] Serial Number=[redacted] stage=write",
    );
  });
});
