import ReactDOM from "react-dom/client";
import { App } from "./App.tsx";
import "./main.css";
import "react-toastify/dist/ReactToastify.css";
import { LanguageContextProvider } from "./context/LanguageContext.tsx";
import { EsptoolContextProvider } from "./context/EsptoolContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <LanguageContextProvider>
    <EsptoolContextProvider>
      <App />
    </EsptoolContextProvider>
  </LanguageContextProvider>,
);
