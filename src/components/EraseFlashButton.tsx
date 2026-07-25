import { Dialog, DialogPanel, DialogTitle, Description, DialogBackdrop } from "@headlessui/react";
import { Button, ButtonType } from "./Button";
import { useContext, useState } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { useTranslation } from "../context/LanguageContext";
import { toast } from "react-toastify";

function Spinner() {
  return <div className="border-fri3d-purple mx-auto h-8 w-8 animate-spin rounded-full border-b-4" />;
}

export function EraseFlashButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  const { isConnected, eraseFlash, isFlashing } = useContext(EsptoolContext);
  const { t } = useTranslation();

  async function startErase() {
    setIsErasing(true);
    try {
      await eraseFlash();
      toast.success(t("erase.success"));
      setShowDialog(false);
    } catch (error) {
      console.error("Failed to erase flash memory", error);
      toast.error(t("erase.error"));
    } finally {
      setIsErasing(false);
    }
  }

  function closeDialog() {
    if (isErasing) {
      return;
    }
    setShowDialog(false);
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)} disabled={!isConnected || isFlashing}>
        {t("erase.button")}
      </Button>
      <Dialog open={showDialog} onClose={closeDialog}>
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="shadow-hard max-w-lg space-y-4 rounded-md border-4 border-black bg-white p-12 text-black">
            <DialogTitle className="font-display text-xl font-bold uppercase">{t("erase.title")}</DialogTitle>

            {isErasing && <Spinner />}
            {!isErasing && (
              <>
                <Description>
                  {t("erase.warningPrefix")} <strong>{t("erase.warningBold")}</strong> {t("erase.warningSuffix")}
                </Description>
                <p>{t("erase.confirm")}</p>
              </>
            )}
            {!isErasing && (
              <div className="flex justify-between">
                <Button onClick={() => setShowDialog(false)}>{t("common.cancel")}</Button>
                <Button onClick={startErase} type={ButtonType.Danger}>
                  {t("erase.button")}
                </Button>
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
