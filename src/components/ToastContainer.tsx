import { useState, useEffect } from "react";
import { ToastContainer as ToastContainerUnthemed } from "react-toastify";

export function ToastContainer() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // set initial value
    const mediaWatcher = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(mediaWatcher.matches);

    //watch for updates
    function updateIsDarkMode(e: MediaQueryListEvent) {
      setIsDarkMode(e.matches);
      console.log("dark", e.matches);
    }
    mediaWatcher.addEventListener("change", updateIsDarkMode);

    // clean up after ourselves
    return () => {
      mediaWatcher.removeEventListener("change", updateIsDarkMode);
    };
  }, []);
  return <ToastContainerUnthemed theme={isDarkMode ? "dark" : "light"} />;
}
