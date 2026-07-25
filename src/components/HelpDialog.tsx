import { useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Button } from "./Button";
import { useTranslation } from "../context/LanguageContext";

/**
 * Small round "?" button that opens a dialog with flashing instructions.
 * Place next to a flash button; pass the instructions as children.
 */
export function HelpButton({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        aria-label={`${t("common.help")}: ${title}`}
        onClick={() => setOpen(true)}
        className="focus-visible:ring-fri3d-purple-light shrink-0 text-sm font-bold underline underline-offset-4 hover:no-underline focus-visible:ring-3 focus-visible:outline-none"
      >
        {t("common.help")}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="shadow-hard max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-md border-4 border-black bg-white p-8 text-black">
            <DialogTitle className="font-display text-xl font-bold uppercase">{title}</DialogTitle>
            <div className="space-y-3">{children}</div>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>{t("common.close")}</Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2">{children}</ul>;
}

const imgClassName = "mt-2 w-full rounded-md border-4 border-black";

/** Instructions for flashing the ESP32 badge over USB serial. */
export function BadgeInstructions({ badge }: { badge: string }) {
  const { language } = useTranslation();

  if (badge === "2024") {
    if (language === "en") {
      return (
        <>
          <Steps>
            <li>Turn the badge over.</li>
            <li>Connect the badge to a USB-C cable.</li>
            <li>
              Make sure the bottom switch is set to <strong>ON</strong>. The top switch only turns on the screen.
            </li>
            <li>
              You are ready to flash! Press the <strong>flash</strong> button and pick the badge's serial port.
            </li>
          </Steps>
          <img src={`${import.meta.env.BASE_URL}badge_2024.webp`} alt="Badge 2024 with the switches marked" className={imgClassName} />
        </>
      );
    }
    return (
      <>
        <Steps>
          <li>Draai de badge om.</li>
          <li>Sluit de badge aan op een USB-C kabel.</li>
          <li>
            Zorg er voor dat de onderste schakelaar op <strong>ON</strong> staat. De bovenste schakelaar zet enkel het scherm aan.
          </li>
          <li>
            Je bent klaar om te flashen! Druk op de <strong>flash</strong> knop en kies de seriële poort van de badge.
          </li>
        </Steps>
        <img src={`${import.meta.env.BASE_URL}badge_2024.webp`} alt="Badge 2024 met de schakelaars gemarkeerd" className={imgClassName} />
      </>
    );
  }

  // Badge 2026 (default)
  if (language === "en") {
    return (
      <>
        <Steps>
          <li>Turn the badge over.</li>
          <li>Connect the badge to a USB-C cable.</li>
          <li>
            Make sure the badge is turned <strong>on</strong>.
          </li>
          <li>
            You are ready to flash! Press the <strong>flash</strong> button and pick the badge's serial port.
          </li>
        </Steps>
        <p>
          <strong>Already plugged in and it won't connect?</strong> Hold down the <strong>S</strong> button (the boot button) and then press{" "}
          <strong>reset</strong>. That boots the badge into flash mode without replugging the cable.
        </p>
        <img
          src={`${import.meta.env.BASE_URL}badge_2026_S.webp`}
          alt="Badge 2026: location of the S (boot) button"
          className={imgClassName}
        />
        <img
          src={`${import.meta.env.BASE_URL}badge_2026_reset.webp`}
          alt="Badge 2026: location of the reset pin"
          className={imgClassName}
        />
      </>
    );
  }
  return (
    <>
      <Steps>
        <li>Draai de badge om.</li>
        <li>Sluit de badge aan op een USB-C kabel.</li>
        <li>
          Zorg er voor dat de badge <strong>aan</strong> staat.
        </li>
        <li>
          Je bent klaar om te flashen! Druk op de <strong>flash</strong> knop en kies de seriële poort van de badge.
        </li>
      </Steps>
      <p>
        <strong>Al aangesloten en verbindt het niet?</strong> Hou de <strong>S</strong> knop (de boot knop) ingedrukt en druk dan op{" "}
        <strong>reset</strong>. Zo start de badge op in flash modus zonder de kabel opnieuw in te steken.
      </p>
      <img src={`${import.meta.env.BASE_URL}badge_2026_S.webp`} alt="Badge 2026: locatie van de S (boot) knop" className={imgClassName} />
      <img src={`${import.meta.env.BASE_URL}badge_2026_reset.webp`} alt="Badge 2026: locatie van de reset pin" className={imgClassName} />
    </>
  );
}

/**
 * Instructions for flashing peripherals. All peripherals (Communicator, DJ
 * addon, ...) use the same Lana board, so the explanation is shared.
 */
export function PeripheralInstructions() {
  const { language } = useTranslation();

  if (language === "en") {
    return (
      <>
        <Steps>
          <li>
            Do <strong>not</strong> plug the device into the USB-C cable yet.
          </li>
          <li>Hold down the top button while plugging in the USB-C cable.</li>
          <li>Release the button once the cable is plugged in.</li>
          <li>
            You are ready to flash! Press the <strong>flash</strong> button and pick the USB device.
          </li>
        </Steps>
        <img src={`${import.meta.env.BASE_URL}lana.webp`} alt="Lana board with the boot button marked" className={imgClassName} />
      </>
    );
  }
  return (
    <>
      <Steps>
        <li>
          Sluit het toestel <strong>nog niet</strong> aan op de USB-C kabel.
        </li>
        <li>Hou de bovenste knop ingedrukt terwijl je de USB-C kabel insteekt.</li>
        <li>Wanneer de kabel insteekt, laat je de knop los.</li>
        <li>
          Je bent klaar om te flashen! Druk op de <strong>flash</strong> knop en kies het USB toestel.
        </li>
      </Steps>
      <img src={`${import.meta.env.BASE_URL}lana.webp`} alt="Lana bordje met de boot knop gemarkeerd" className={imgClassName} />
    </>
  );
}
