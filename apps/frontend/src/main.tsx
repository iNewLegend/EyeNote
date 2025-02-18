import React from "react";
import { createRoot } from "react-dom/client";
import { ExtensionPopup } from "./core/extension-popup/extension-popup.tsx";
import { ToastContextProvider } from "./components/ui/toast-context";
import { ThemeProvider } from "./core/theme/theme-provider.tsx";
import "./styles/index.css";
import "./core/extension-popup/extension-popup.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark">
      <ToastContextProvider>
        <ExtensionPopup />
      </ToastContextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
