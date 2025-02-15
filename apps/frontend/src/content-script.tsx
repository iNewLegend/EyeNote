import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { ToastContextProvider } from "./components/ui/toast-context";
import "./index.css";
import "./cursor.css";

// Add keyboard event handlers for cursor change
document.addEventListener("keydown", (e) => {
  if (e.key === "Shift") {
    document.body.classList.add("shift-pressed");
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Shift") {
    document.body.classList.remove("shift-pressed");
  }
});

// Add mouse move handler for glow effect
document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("shift-pressed")) {
    document.body.style.setProperty("--x", `${e.clientX}px`);
    document.body.style.setProperty("--y", `${e.clientY}px`);
  }
});

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
