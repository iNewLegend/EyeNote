import React from "react";
import ReactDOM from "react-dom/client";
import { Popup } from "./popup";
import { ToastContextProvider } from "./components/ui/toast-context";
import "./index.css";
import "./popup.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ToastContextProvider>
      <Popup />
    </ToastContextProvider>
  </React.StrictMode>
);
