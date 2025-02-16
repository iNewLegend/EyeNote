import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { ToastContextProvider } from "./components/ui/toast-context";
import { ThemeProvider } from "./components/theme-provider";
import "./styles/index.css";
import "./styles/cursor.css";

// Ensure we don't inject multiple instances
if (!document.getElementById("eye-note-root")) {
  // Add highlight styles to main document
  const highlightStyles = document.createElement("style");
  highlightStyles.id = "eye-note-highlight-styles";
  highlightStyles.textContent = `
    .eye-note-highlight {
      cursor: crosshair !important;
    }

    .eye-note-highlight * {
      cursor: crosshair !important;
    }

    #eye-note-highlight-overlay {
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      border: 2px solid #4804ad;
      background: rgba(72, 4, 173, 0.1);
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(highlightStyles);

  // Create highlight overlay element
  const overlay = document.createElement("div");
  overlay.id = "eye-note-highlight-overlay";
  document.body.appendChild(overlay);

  // Add mutation observer to update overlay position
  const updateOverlay = (element: Element | null) => {
    if (!element) {
      overlay.style.display = "none";
      return;
    }
    const rect = element.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
  };

  // Create root element for the app
  const root = document.createElement("div");
  root.id = "eye-note-root";

  // Create shadow root for style isolation
  const shadowRoot = root.attachShadow({ mode: "open" });

  // Create container for our app inside shadow root
  const container = document.createElement("div");
  container.className = "notes-plugin";
  shadowRoot.appendChild(container);

  // Add app styles to shadow root
  const styles = document.createElement("style");
  styles.textContent = `
    @import url('${chrome.runtime.getURL("style.css")}');
    
    /* Ensure our styles only affect elements within our shadow DOM */
    :host {
      all: initial;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      pointer-events: none;
    }

    .notes-plugin {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
  `;
  shadowRoot.appendChild(styles);

  document.body.appendChild(root);

  // Initialize React app
  try {
    createRoot(container).render(
      <React.StrictMode>
        <ThemeProvider defaultTheme="dark">
          <ToastContextProvider>
            <App />
          </ToastContextProvider>
        </ThemeProvider>
      </React.StrictMode>
    );

    // Set up mutation observer to watch for highlight class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const element = mutation.target as Element;
          if (element.classList.contains("eye-note-highlight")) {
            updateOverlay(element);
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });
  } catch (error) {
    console.error("Failed to initialize EyeNote:", error);
    // Clean up if initialization fails
    highlightStyles.remove();
    overlay.remove();
    root.remove();
  }
}
