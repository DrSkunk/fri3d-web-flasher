import { Input } from "@headlessui/react";
import clsx from "clsx";
import { useState, useContext } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button } from "./Button";

export function SimpleUpload() {
  const [fileIncoming, setFileIncoming] = useState(false);

  const { flash, uploadFirmware, firmware, isFlashing } = useContext(EsptoolContext);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    console.log("drop");
    event.preventDefault();
    console.log(event.dataTransfer.files);
    if (!event.dataTransfer.files) {
      return;
    }
    const file = event.dataTransfer.files[0];
    uploadFirmware(file);
    setFileIncoming(false);
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      return;
    }
    const file = e.target.files[0];
    uploadFirmware(file);
  }

  return (
    <>
      <div
        className={clsx(
          "relative h-48 w-96 rounded border border-dashed",
          !fileIncoming && "border-gray-400 bg-gray-100 dark:bg-slate-600",
          fileIncoming && "border-emerald-600 bg-emerald-100 dark:bg-emerald-600",
          "mb-4",
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDragEnter={() => setFileIncoming(true)}
        onDragLeave={() => setFileIncoming(false)}
      >
        <p className="p-4 text-center">
          {fileIncoming && !firmware && "Laat het vallen alsof het warm is."}
          {!fileIncoming && !firmware && "Klik hier om een firmware bestand op te laden of sleep hem in dit vakje."}
          {firmware && firmware.filename}
        </p>
        <Input type="file" className="absolute inset-0 block opacity-0" disabled={isFlashing} onChange={onFileSelect} />
      </div>
      <Button onClick={flash} disabled={!firmware || isFlashing}>
        Begin met flashen
      </Button>
      {isFlashing && <div className="animate-pulse text-5xl text-red-500">Aan het flashen, niet uittrekken!</div>}
    </>
  );
}
