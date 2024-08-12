import { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext";

import english from "../../public/translation.en.json";
import dutch from "../../public/translation.nl.json";

export function Translate({ item }: { item: string }) {
  const { currentLanguage } = useContext(LanguageContext);

  if (currentLanguage === "en") {
    return <>{english[item as keyof typeof english]}</>;
  } else {
    return <>{dutch[item as keyof typeof dutch]}</>;
  }
}
