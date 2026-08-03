import { useEffect, useState } from "react";
import { Field, Label, Switch } from "@headlessui/react";
import { ToastContainer } from "./components/ToastContainer";
import { NoSerialOverlay } from "./components/NoSerialOverlay";
import { BadgeFlasher } from "./components/BadgeFlasher";
import { PeripheralFlasher } from "./components/PeripheralFlasher";
import { CompanionEraser } from "./components/CompanionEraser";
import { useTranslation } from "./context/LanguageContext";
import { useTransportSupport } from "./lib/browserCapabilities";

export function App() {
  const [advancedMode, setAdvancedMode] = useState(false);
  const { language, setLanguage, t } = useTranslation();
  const transportSupport = useTransportSupport();

  useEffect(() => {
    const stored = localStorage.getItem("advancedMode");
    if (stored) {
      setAdvancedMode(stored === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("advancedMode", advancedMode.toString());
  }, [advancedMode]);

  return (
    <>
      <NoSerialOverlay support={transportSupport} />
      <ToastContainer />
      <div className="grid min-h-screen grid-rows-[auto_1fr] bg-white text-black">
        <header className="flex items-center justify-between bg-black text-white">
          <div className="font-display flex items-center gap-3 px-4 py-3 text-xl font-bold uppercase">
            <img src={`${import.meta.env.BASE_URL}fri3d-logo-white.svg`} alt="Fri3d" className="h-8 w-auto" />
            <span className="text-fri3d-mint">Flasher</span>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setLanguage(language === "nl" ? "en" : "nl")}
              className="font-display px-3 py-1 text-xs font-bold tracking-wide text-white uppercase underline-offset-4 hover:underline"
            >
              {language === "nl" ? "English" : "Nederlands"}
            </button>
            <Field className="flex items-center gap-3 px-4">
              <Label className="font-display text-xs font-bold tracking-wide uppercase select-none">{t("app.advancedMode")}</Label>
              <Switch
                checked={advancedMode}
                onChange={setAdvancedMode}
                className="group bg-fri3d-darkgrey data-checked:bg-fri3d-mint-dark inline-flex h-7 w-12 items-center rounded-full border-4 border-white transition"
              >
                <span className="size-3 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
              </Switch>
            </Field>
          </div>
        </header>

        <main className="flex items-start justify-center px-4 py-6 sm:px-6">
          <div className="w-full max-w-4xl">
            <div className="mb-5">
              <h1 className="font-display text-2xl font-bold uppercase">{t("app.title")}</h1>
              <p className="mt-1 text-gray-600">{t("app.description")}</p>
            </div>
            <BadgeFlasher advanced={advancedMode} supported={transportSupport.serial} />
            <PeripheralFlasher advanced={advancedMode} supported={transportSupport.usb} />
            {advancedMode && <CompanionEraser supported={transportSupport.serial} />}
          </div>
        </main>
      </div>
    </>
  );
}
