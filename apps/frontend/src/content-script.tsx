import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { ToastContextProvider } from "./components/ui/toast-context";
import "./index.css";

// Ensure we don't inject multiple instances
if (!document.getElementById("eye-note-root")) {
  // Create root element for the app
  const root = document.createElement("div");
  root.id = "eye-note-root";
  root.className = "notes-plugin";
  document.body.appendChild(root);

  // Initialize React app
  try {
    createRoot(root).render(
      <React.StrictMode>
        <ToastContextProvider>
          <App />
        </ToastContextProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to initialize EyeNote:", error);
    // Clean up if initialization fails
    root.remove();
  }
}
