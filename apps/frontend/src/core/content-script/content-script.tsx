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

    // Create an interaction blocker overlay
    const interactionBlocker = document.createElement("div");
    interactionBlocker.id = "eye-note-interaction-blocker";
    interactionBlocker.style.position = "fixed";
    interactionBlocker.style.top = "0";
    interactionBlocker.style.left = "0";
    interactionBlocker.style.width = "100%";
    interactionBlocker.style.height = "100%";
    interactionBlocker.style.zIndex = "2147483644"; // Just below the highlight overlay
    interactionBlocker.style.display = "none";
    interactionBlocker.style.cursor = "none";
    interactionBlocker.style.pointerEvents = "none"; // Allow clicks to pass through
    interactionBlocker.style.userSelect = "none"; // Prevent text selection
    (interactionBlocker.style as any).webkitUserSelect = "none"; // For Safari
    (interactionBlocker.style as any).msUserSelect = "none"; // For IE/Edge
    (interactionBlocker.style as any).mozUserSelect = "none"; // For Firefox

    // Add click event listener to the interaction blocker
    interactionBlocker.addEventListener("click", (e) => {
        // Let the click event pass through to the app's click handler
        // by not calling preventDefault or stopPropagation
        console.log("Interaction blocker clicked", e);
    });

    document.body.appendChild(interactionBlocker);

    // Create root element for the app
    const root = document.createElement("div");
    root.id = "eye-note-root";

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
        interactionBlocker.remove();
        cursorDot.remove();
        root.remove();
    }
}
