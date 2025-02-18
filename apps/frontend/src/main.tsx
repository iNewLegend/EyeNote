import React from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./popup";
import { ToastContextProvider } from "./components/ui/toast-context";
import { ThemeProvider } from "./core/theme/theme-provider.tsx";
import "./styles/index.css";
import "./styles/popup.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark">
      <ToastContextProvider>
        <Popup />
      </ToastContextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
