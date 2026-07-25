import { useContext } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { useTranslation } from "../context/LanguageContext";
import { Button } from "./Button";

export function ConnectionButton({ disabled = false }: { disabled?: boolean }) {
  const { isConnected, isConnecting, connect, disconnect, isFlashing } = useContext(EsptoolContext);
  const { t } = useTranslation();

  if (isConnecting) {
    return <Button disabled={true}>{t("connect.connecting")}</Button>;
  }

  if (isConnected) {
    return (
      <Button onClick={() => void disconnect()} disabled={disabled || isFlashing}>
        {t("connect.disconnect")}
      </Button>
    );
  }

  return (
    <Button onClick={() => void connect()} disabled={disabled || isFlashing}>
      {t("connect.connect")}
    </Button>
  );
}
