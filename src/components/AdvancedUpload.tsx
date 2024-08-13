import { Input } from "@headlessui/react";
import clsx from "clsx";
import { useState, useContext } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button } from "./Button";
import { ConnectionButton } from "./ConnectionButton";

function TH({ children }: { children: React.ReactNode }) {
  return <th className="border px-4 py-2">{children}</th>;
}

function TD({ children }: { children: React.ReactNode }) {
  return <td className="border px-4 py-2">{children}</td>;
}

export function AdvancedUpload() {
  const { flash, loadFirmware, firmware, deviceInfo, isConnected } =
    useContext(EsptoolContext);

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) {
      return;
    }
    const file = e.target.files[0];
    loadFirmware(file);
  }

  return (
    <>
      <ConnectionButton />
      <div className="grid grid-cols-2 mt-2">
        <div>Chip: {deviceInfo.chipName}</div>
        <div>MAC adres: {deviceInfo.mac}</div>
        <div>Features: {deviceInfo.features}</div>
        <div>Kristal: {deviceInfo.crystal}</div>
      </div>
      <table className="table-auto  mt-2">
        <thead>
          <tr className="dark:bg-slate-900">
            <TH>Adres</TH>
            <TH>Lengte</TH>
            <TH>Naam</TH>
            <TH>Vooruitgang</TH>
          </tr>
        </thead>
        <tbody className="font-mono">
          {firmware &&
            firmware.partitions.map((partition) => (
              <tr key={partition.address + partition.name}>
                <TD>0x{partition.address.toString(16)}</TD>
                <TD>{partition.data.length}</TD>
                <TD>{partition.name}</TD>
                <TD>
                  <progress
                    value={partition.progress}
                    max="100"
                    className="w-full"
                  />
                </TD>
              </tr>
            ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-4">
        <div
          className={clsx(
            "relative border px-4 py-2 rounded",
            "text-black bg-white hover:bg-gray-100",
            "disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-300",
            "dark:text-white dark:bg-slate-800 dark:hover:bg-slate-600",
            "dark:disabled:bg-slate-900 dark:disabled:text-slate-500 dark:disabled:border-slate-800"
          )}
        >
          Selecteer firmware
          <Input
            type="file"
            className="opacity-0 block absolute inset-0"
            onChange={onFileSelect}
          />
        </div>
        <Button onClick={flash} disabled={!firmware || !isConnected}>
          Upload firmware
        </Button>
      </div>
    </>
  );
}
