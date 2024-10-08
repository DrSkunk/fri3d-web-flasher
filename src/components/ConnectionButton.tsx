import { useContext } from "react";
import { EsptoolContext } from "../context/EsptoolContext";
import { Button } from "./Button";

export function ConnectionButton() {
  const { isConnected, isConnecting, connect, disconnect, isFlashing } = useContext(EsptoolContext);

  if (isConnecting) {
    return <Button disabled={true}> Aan het verbinden ...</Button>;
  }

  if (isConnected) {
    return (
      <Button onClick={disconnect} disabled={isFlashing}>
        Verbinding verbreken
      </Button>
    );
  }

  return (
    <Button onClick={connect} disabled={isFlashing}>
      Verbinden
    </Button>
  );
}
