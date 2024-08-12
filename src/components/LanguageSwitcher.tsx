import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";
import { Button } from "./Button";
import { Translate } from "./Translate";

export function LanguageSwitcher() {
  const { switchLanguage } = useContext(LanguageContext);

  return (
    <div className="sticky ml-2 mt-2">
      <Button onClick={switchLanguage} className="text-white text-lg px-4 py-2">
        <Translate item="changeToLanguage" />
      </Button>
    </div>
  );
}
