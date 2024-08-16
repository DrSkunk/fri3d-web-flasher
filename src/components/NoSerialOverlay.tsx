import { useEffect, useState } from "react";

export function NoSerialOverlay() {
  const [hasSerialSupport, setHasSerialSupport] = useState(true);

  useEffect(() => {
    if (!navigator.serial) {
      setHasSerialSupport(false);
    }
  }, []);

  if (hasSerialSupport) {
    return null;
  }

  return (
    <div className="absolute z-10 flex h-screen w-screen items-center justify-center bg-white">
      <div>Dit werkt enkel onder Google Chrome, Brave, Opera en andere webkit browsers.</div>
    </div>
  );
}
