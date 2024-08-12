import { useState } from "react";
import { Field, Label, Switch } from "@headlessui/react";
import clsx from "clsx";
import { SimpleUpload } from "./components/SimpleUpload";
import { ToastContainer } from "./components/ToastContainer";

export function App() {
  const [advancedMode, setAdvancedMode] = useState(true);

  return (
    <>
      <ToastContainer />
      <div className="h-screen w-screen">
        <div className="absolute w-screen h-screen flex justify-center items-center">
          <div className="flex flex-col justify-normal items-center">
            <h1 className="text-4xl mb-4">Fri3d Flasher</h1>
            <SimpleUpload />
          </div>
        </div>
        <Field className="flex justify-center gap-4 absolute right-2 top-2">
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
