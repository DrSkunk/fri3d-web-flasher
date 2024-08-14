import { Dialog, DialogPanel, DialogTitle, Description, DialogBackdrop } from "@headlessui/react";
import { Button, ButtonType } from "./Button";
import { useContext, useState } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { toast } from "react-toastify";

function Spinner() {
  return <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white" />;
}

export function EraseFlashButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const { isConnected, eraseFlash } = useContext(EsptoolContext);

  async function startErase() {
    setIsFlashing(true);
    try {
      await eraseFlash();
    } catch (error) {
      console.error("Failed to erase flash memory", error);
      toast.error("Er is een fout opgetreden bij het wissen van het flash geheugen");
    } finally {
      setIsFlashing(false);
      setShowDialog(false);
      toast.success("Flash geheugen gewist");
    }
  }

  function closeDialog() {
    if (isFlashing) {
      return;
    }
    setShowDialog(false);
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)} disabled={!isConnected}>
        Flash geheugen wissen
      </Button>
      <Dialog open={showDialog} onClose={closeDialog}>
        <DialogBackdrop className="absolute inset-0 backdrop-blur-sm" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel className="max-w-lg space-y-4 rounded border bg-gray-50 p-12 dark:bg-slate-900 dark:text-white">
            <DialogTitle className="font-bold">Badge wissen</DialogTitle>

            {isFlashing && <Spinner />}
            {!isFlashing && (
              <>
                <Description>
                  Dit zal <strong>alle gegevens</strong> op de badge wissen.
                </Description>
                <p>Weet je zeker dat je de badge wilt wissen? Dit kan niet ongedaan worden gemaakt.</p>
              </>
            )}
            {!isFlashing && (
              <div className="flex justify-between">
                <Button onClick={() => setShowDialog(false)}>Annuleren</Button>
                <Button onClick={startErase} type={ButtonType.Primary}>
                  Flash geheugen wissen
                </Button>
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
