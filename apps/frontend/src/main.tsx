import React from "react";
import { createRoot } from "react-dom/client";
import { ExtensionPopup } from "./core/extension-popup/extension-popup.tsx";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./core/theme/theme-provider.tsx";
import "./styles/index.css";
import "./core/extension-popup/extension-popup.css";

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme="dark">
            <Toaster />
            <ExtensionPopup />
        </ThemeProvider>
    </React.StrictMode>
);
