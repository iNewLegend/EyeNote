import React from "react";
import { createRoot } from "react-dom/client";
import App from "../../app.tsx";
import { Toaster } from "../../components/ui/sonner.tsx";
import { ThemeProvider } from "../theme/theme-provider.tsx";

import contentStyles from "./content-script.css?inline";

// Ensure we don't inject multiple instances
if (!document.getElementById("eye-note-root")) {
    // Add highlight styles to main document
    const highlightStyles = document.createElement("style");
    highlightStyles.id = "eye-note-highlight-styles";
    highlightStyles.textContent = contentStyles;
    document.head.appendChild(highlightStyles);

    // Create cursor dot element
    const cursorDot = document.createElement("div");
    cursorDot.className = "cursor-dot";
    document.body.appendChild(cursorDot);

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

    // Create shadow root for style isolation
    const shadowRoot = root.attachShadow({ mode: "open" });

    // Create container for our app inside shadow root
    const container = document.createElement("div");
    container.className = "notes-plugin";
    shadowRoot.appendChild(container);

    // Add the root element to the page
    document.body.appendChild(root);

    // Initialize React app
    try {
        createRoot(container).render(
            <React.StrictMode>
                <ThemeProvider defaultTheme="dark">
                    <Toaster />
                    <App />
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
