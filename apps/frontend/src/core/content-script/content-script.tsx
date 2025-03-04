import React from "react";
import { createRoot } from "react-dom/client";
import App from "../../app.tsx";
import { Toaster } from "../../components/ui/sonner.tsx";
import { ThemeProvider } from "../theme/theme-provider.tsx";
import CursorDot from "../../components/CursorDot.tsx";

import contentStyles from "./content-script.css?inline";

// Ensure we don't inject multiple instances
if (!document.getElementById("eye-note-root")) {
    // Create a container for our extension UI
    const container = document.createElement("div");
    container.id = "eye-note-root";

    // Create a shadow DOM to isolate our styles
    const shadowRoot = container.attachShadow({ mode: "open" });

    // Add highlight styles to shadow DOM instead of main document
    const highlightStyles = document.createElement("style");
    highlightStyles.id = "eye-note-highlight-styles";
    highlightStyles.textContent = contentStyles;
    shadowRoot.appendChild(highlightStyles);

    // Create app container in shadow DOM
    const appContainer = document.createElement("div");
    appContainer.id = "eye-note-app-container";
    shadowRoot.appendChild(appContainer);

    // Append the container to the body
    document.body.appendChild(container);

    // Create a container for the cursor dot
    const cursorDotContainer = document.createElement("div");
    cursorDotContainer.id = "eye-note-cursor-dot-container";
    document.body.appendChild(cursorDotContainer);

    // Create highlight overlay element - this needs to be in the main DOM
    const overlay = document.createElement("div");
    overlay.id = "eye-note-highlight-overlay";
    overlay.style.position = "fixed";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2147483645";
    overlay.style.border = "2px solid var(--primary-color, #7c3aed)";
    overlay.style.backgroundColor = "rgba(124, 58, 237, 0.1)";
    overlay.style.transition = "all 0.2s ease";
    overlay.style.boxSizing = "border-box";
    overlay.style.display = "none";
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
    document.body.appendChild(interactionBlocker);

    // Add click event listener to the interaction blocker
    interactionBlocker.addEventListener("click", (e) => {
        // Let the click event pass through to the app's click handler
        // by not calling preventDefault or stopPropagation
        console.log("Interaction blocker clicked", e);
    });

    // Track the currently inspected element
    let currentInspectedElement: HTMLElement | null = null;
    // Track the currently selected element (for note creation)
    let selectedElement: HTMLElement | null = null;
    // Track if we're in the process of adding a note
    let isAddingNote = false;
    // Track if the cursor dot is visible
    let isCursorDotVisible = false;

    // Update overlay position
    const updateOverlay = (element: Element | null) => {
        if (!element) {
            overlay.style.display = "none";
            return;
        }

        // Store current scroll position
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        const rect = element.getBoundingClientRect();
        overlay.style.display = "block";
        overlay.style.top = rect.top + "px";
        overlay.style.left = rect.left + "px";
        overlay.style.width = rect.width + "px";
        overlay.style.height = rect.height + "px";

        // Restore scroll position to prevent unwanted scrolling
        requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
        });
    };

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
        const x = e.clientX;
        const y = e.clientY;

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
            // If we're not adding a note, reset the state
            if (!isAddingNote) {
                // Reset any lingering state
                currentInspectedElement = null;
                selectedElement = null;
            }

            document.body.classList.add("inspector-mode");

            // Apply cursor style directly to body when in inspector mode
            document.body.style.cursor = "none";

            // Make the interaction blocker visible but don't block pointer events
            interactionBlocker.style.display = "block";
            interactionBlocker.style.pointerEvents = "none";

            // Show cursor dot
            isCursorDotVisible = true;
            renderCursorDot();

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
                document.body.style.cursor = ""; // Reset cursor style
                interactionBlocker.style.display = "none";

                // Hide cursor dot
                isCursorDotVisible = false;
                renderCursorDot();

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
            // Store current scroll position
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            selectedElement = element;
            isAddingNote = true;
            updateOverlay(element);
            document.body.classList.add("adding-note");

            // Restore scroll position to prevent unwanted scrolling
            requestAnimationFrame(() => {
                window.scrollTo(scrollX, scrollY);
            });
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
            document.body.style.cursor = ""; // Reset cursor style

            // Hide cursor dot
            isCursorDotVisible = false;
            renderCursorDot();

            updateOverlay(null);
        } else {
            // If we're still in inspector mode (shift key is still pressed),
            // make sure the interaction blocker is properly set up
            interactionBlocker.style.display = "block";
        }
    }) as EventListener);

    // Function to render the cursor dot component
    const renderCursorDot = () => {
        const cursorDotRoot = createRoot(cursorDotContainer);
        cursorDotRoot.render(
            <React.StrictMode>
                <CursorDot visible={isCursorDotVisible} />
            </React.StrictMode>
        );
    };

    // Initial render of the cursor dot
    renderCursorDot();

    // Render the React app into the shadow DOM
    const root = createRoot(appContainer);
    root.render(
        <React.StrictMode>
            <ThemeProvider>
                <App />
                <Toaster />
            </ThemeProvider>
        </React.StrictMode>
    );
}
