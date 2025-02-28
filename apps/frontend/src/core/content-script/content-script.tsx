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

    // Track the currently inspected element
    let currentInspectedElement: HTMLElement | null = null;
    // Track the currently selected element (for note creation)
    let selectedElement: HTMLElement | null = null;
    // Track if we're in the process of adding a note
    let isAddingNote = false;

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

        // If we're not in inspector mode and not adding a note, clear the overlay
        if (!document.body.classList.contains("inspector-mode")) {
            if (currentInspectedElement && !isAddingNote) {
                currentInspectedElement.style.cursor = "";
                currentInspectedElement = null;

                // Only clear the overlay if we're not adding a note or if the selected element is different
                if (!isAddingNote || !selectedElement) {
                    updateOverlay(null);
                }
            }
            return;
        }

        // No need to hide the interaction blocker since it has pointer-events: none
        const element = document.elementFromPoint(x, y);

        if (
            !element ||
            element === currentInspectedElement ||
            element.closest("#eye-note-root") ||
            element.closest(".notes-plugin")
        ) {
            return;
        }

        if (element instanceof HTMLElement) {
            // Remove highlight from previous element if different
            if (currentInspectedElement && currentInspectedElement !== element) {
                currentInspectedElement.style.cursor = "";
            }

            // Update cursor style and highlight new element
            element.style.cursor = "none";
            currentInspectedElement = element;

            // Only update the overlay if we're not adding a note or if this is the selected element
            if (!isAddingNote || element === selectedElement) {
                updateOverlay(element);
            }

            // Log the element for debugging
            console.log("Inspected element", {
                element,
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                rect: element.getBoundingClientRect(),
            });
        }
    };

    // Handle shift key events to toggle inspector mode
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            document.body.classList.add("inspector-mode");

            // Make the interaction blocker visible but don't block pointer events
            interactionBlocker.style.display = "block";
            interactionBlocker.style.pointerEvents = "none";

            // Clear any existing text selection
            if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            // Only remove inspector mode class if we're not adding a note
            if (!isAddingNote) {
                document.body.classList.remove("inspector-mode");
                interactionBlocker.style.display = "none";

                if (currentInspectedElement) {
                    currentInspectedElement.style.cursor = "";
                    currentInspectedElement = null;
                    updateOverlay(null);
                }
            } else {
                // If we're adding a note, keep the inspector mode visual but disable the interaction blocker
                interactionBlocker.style.pointerEvents = "none";
            }
        }
    };

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // Create a custom event listener for note creation events
    window.addEventListener("eye-note:element-selected", ((e: CustomEvent) => {
        const element = e.detail.element;
        if (element instanceof HTMLElement) {
            selectedElement = element;
            isAddingNote = true;
            updateOverlay(element);
            document.body.classList.add("adding-note");
        }
    }) as EventListener);

    // Create a custom event listener for note dismissal events
    window.addEventListener("eye-note:note-dismissed", (() => {
        isAddingNote = false;
        selectedElement = null;
        document.body.classList.remove("adding-note");

        // If we're not in inspector mode, remove the inspector mode class and hide the overlay
        if (!document.body.classList.contains("inspector-mode") || !currentInspectedElement) {
            document.body.classList.remove("inspector-mode");
            updateOverlay(null);
        }
    }) as EventListener);

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
        interactionBlocker.remove();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("eye-note:element-selected", (() => {}) as EventListener);
        window.removeEventListener("eye-note:note-dismissed", (() => {}) as EventListener);
        root.remove();
    }
}
