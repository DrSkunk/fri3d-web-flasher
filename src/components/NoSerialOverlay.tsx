import { useTranslation } from "../context/LanguageContext";
import type { TransportSupport } from "../lib/browserCapabilities";

export function NoSerialOverlay({ support }: { support: TransportSupport }) {
  const { t } = useTranslation();

  if (support.serial || support.usb) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-white p-6">
      <div className="bg-fri3d-red font-display shadow-hard max-w-md border-4 border-black p-8 font-semibold text-white">
        {t("app.noSerial")}
      </div>
    </div>
  );
}
