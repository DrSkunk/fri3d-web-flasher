import { useState } from "react";
import { Field, Label, Switch } from "@headlessui/react";
import { SimpleUpload } from "./components/SimpleUpload";
import { ToastContainer } from "./components/ToastContainer";
import { AdvancedUpload } from "./components/AdvancedUpload";

export function App() {
  const [advancedMode, setAdvancedMode] = useState(true);

  return (
    <>
      <ToastContainer />
      <div className="h-screen w-screen">
        <div className="absolute flex h-screen w-screen items-center justify-center">
          <div className="flex flex-col items-center justify-normal">
            <h1 className="mb-4 text-4xl">Fri3d Flasher</h1>
            {advancedMode && <AdvancedUpload />}
            {!advancedMode && <SimpleUpload />}
          </div>
        </div>
        <Field className="absolute right-2 top-2 flex justify-center gap-4">
          <Label className="select-none">Geavanceerde modus</Label>
          <Switch
            checked={advancedMode}
            onChange={setAdvancedMode}
            className="group inline-flex h-6 w-11 items-center rounded-full bg-slate-400 transition data-[checked]:bg-emerald-600"
          >
            <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
          </Switch>
        </Field>
      </div>
    </>
  );
}
