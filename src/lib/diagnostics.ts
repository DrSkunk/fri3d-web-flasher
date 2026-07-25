const MAC_ADDRESS = /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi;
const LABELED_IDENTIFIER = /\b(serial(?: number)?|mac(?: address)?)\s*[:=]\s*\S+/gi;

export function sanitizeDiagnosticLine(line: string): string {
  return line.replace(MAC_ADDRESS, "[redacted-mac]").replace(LABELED_IDENTIFIER, "$1=[redacted]");
}
