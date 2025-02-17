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
    #eye-note-highlight-overlay {
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      border: 2px solid #55006a;
      background: rgba(85, 0, 106, 0.1);
      transition: all 0.2s ease;
      box-sizing: border-box;
      display: none;
    }

    body.shift-pressed {
      cursor: none !important;
    }

    .eye-note-highlight {
      outline: 2px solid #55006a !important;
      outline-offset: 2px !important;
      background: rgba(85, 0, 106, 0.1) !important;
      cursor: none !important;
    }

    .cursor-dot {
      width: 8px;
      height: 8px;
      background: #4804ad;
      border-radius: 50%;
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(-50%, -50%);
    }
  `;
  document.head.appendChild(highlightStyles);

  // Create cursor dot element
  const cursorDot = document.createElement("div");
  cursorDot.className = "cursor-dot";
  document.body.appendChild(cursorDot);

  // Create cursor glow element
  const cursorGlow = document.createElement("div");
  cursorGlow.className = "cursor-glow";
  cursorGlow.innerHTML =
    '<span class="absolute inset-0 rounded-full animate-ping bg-primary-glow/20"></span>';
  document.body.appendChild(cursorGlow);

  // Create highlight overlay element
  const overlay = document.createElement("div");
  overlay.id = "eye-note-highlight-overlay";
  document.body.appendChild(overlay);

  // Track the currently highlighted element
  let currentHighlightedElement: HTMLElement | null = null;

  // Update overlay position
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

  // Handle mouse movement
  const handleMouseMove = (e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    requestAnimationFrame(() => {
      // Update cursor dot position
      if (cursorDot) {
        cursorDot.style.left = `${x}px`;
        cursorDot.style.top = `${y}px`;
      }

      // Update cursor glow position
      if (cursorGlow) {
        cursorGlow.style.left = `${x}px`;
        cursorGlow.style.top = `${y}px`;
      }
    });

    if (!document.body.classList.contains("shift-pressed")) {
      if (currentHighlightedElement) {
        currentHighlightedElement.style.cursor = "";
        currentHighlightedElement = null;
        updateOverlay(null);
      }
      return;
    }

    const element = document.elementFromPoint(x, y);
    if (
      !element ||
      element === currentHighlightedElement ||
      element.closest("#eye-note-root")
    ) {
      return;
    }

    if (element instanceof HTMLElement) {
      // Remove highlight from previous element if different
      if (currentHighlightedElement && currentHighlightedElement !== element) {
        currentHighlightedElement.style.cursor = "";
      }

      // Update cursor style and highlight new element
      element.style.cursor = "none";
      currentHighlightedElement = element;
      updateOverlay(element);
    }
  };

  // Handle shift key events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Shift") {
      document.body.classList.add("shift-pressed");
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Shift") {
      document.body.classList.remove("shift-pressed");
      if (currentHighlightedElement) {
        currentHighlightedElement.style.cursor = "";
        currentHighlightedElement = null;
        updateOverlay(null);
      }
    }
  };

  // Add event listeners
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  // Create root element for the app
  const root = document.createElement("div");
  root.id = "eye-note-root";
  root.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483646;
  `;

  // Create shadow root for style isolation
  const shadowRoot = root.attachShadow({ mode: "open" });

  // Create container for our app inside shadow root
  const container = document.createElement("div");
  container.className = "notes-plugin";
  shadowRoot.appendChild(container);

  // Add app styles to shadow root
  const styles = document.createElement("style");
  styles.textContent = `
    :host {
      all: initial;
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483646;
      contain: strict;
    }

    .notes-plugin {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .notes-plugin * {
      box-sizing: border-box;
    }

    /* Make sure interactive elements can receive pointer events */
    .note-marker,
    .note-content,
    button,
    input,
    textarea {
      pointer-events: auto;
    }
  `;
  shadowRoot.appendChild(styles);

  // Add the root element to the page
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
  } catch (error) {
    console.error("Failed to initialize EyeNote:", error);
    // Clean up if initialization fails
    highlightStyles.remove();
    overlay.remove();
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    root.remove();
  }
}
