import React from "react";
import ReactDOM from "react-dom/client";
import { Popup } from "./popup";
import { GoogleAuthProvider } from "./components/google-auth-provider";
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
      <GoogleAuthProvider>
        <Popup />
      </GoogleAuthProvider>
    </ToastContextProvider>
  </React.StrictMode>
);
