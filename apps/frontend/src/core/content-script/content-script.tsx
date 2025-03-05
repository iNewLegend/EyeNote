import React from "react";
import { createRoot } from "react-dom/client";
import { ShadowDOM } from "../shadow-dom/shadow-dom";
import { UserlandDOM } from "../userland-dom/userland-dom";
import { useInspectorStore } from "../../stores/use-inspector-store";

import shadowDOMStyles from "../shadow-dom/shadow-dom.css?inline";

// Ensure we don't inject multiple instances
if (!document.getElementById("eye-not-shadow-dom")) {
    // Create containers
    const shadowDomContainer = document.createElement("div");
    shadowDomContainer.id = "eye-not-shadow-dom";

    const userlandContainer = document.createElement("div");
    userlandContainer.id = "eye-not-userland-container";

    // Create a shadow DOM to isolate our styles
    const shadowRoot = shadowDomContainer.attachShadow({ mode: "open" });

    // Add styles to shadow DOM
    const highlightStyles = document.createElement("style");
    highlightStyles.id = "eye-not-shadow-dom-styles";
    highlightStyles.textContent = shadowDOMStyles;
    shadowRoot.appendChild(highlightStyles);

    // Create app container in shadow DOM
    const appContainer = document.createElement("div");
    appContainer.id = "eye-note-app-container";
    appContainer.setAttribute("id", "eye-not-shadow-dom");
    shadowRoot.appendChild(appContainer);

    // Append containers to the body
    document.body.appendChild(shadowDomContainer);
    document.body.appendChild(userlandContainer);

    // Track the currently inspected element
    let currentInspectedElement: HTMLElement | null = null;
    // Track the currently selected element (for note creation)
    let selectedElement: HTMLElement | null = null;
    // Track if we're in the process of adding a note
    let isAddingNote = false;

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
                    (window as any).updateOverlay(null);
                }
            }
            return;
        }

        // No need to hide the interaction blocker since it has pointer-events: none
        const element = document.elementFromPoint(x, y);

        if (
            !element ||
            element === currentInspectedElement ||
            element.closest("#eye-not-shadow-dom") ||
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
                (window as any).updateOverlay(element);
            }
        }
    };

    // Handle shift key events
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            if (!isAddingNote) {
                currentInspectedElement = null;
                selectedElement = null;
            }

            document.body.classList.add("inspector-mode");
            useInspectorStore.getState().setIsActive(true);

            if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
            if (!isAddingNote) {
                document.body.classList.remove("inspector-mode");
                useInspectorStore.getState().setIsActive(false);

                if (currentInspectedElement) {
                    currentInspectedElement.style.cursor = "";
                    currentInspectedElement = null;
                    (window as any).updateOverlay(null);
                }
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
            (window as any).updateOverlay(element);
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
            useInspectorStore.getState().setIsActive(false);
            (window as any).updateOverlay(null);
        }
    }) as EventListener);

    // Render the React apps
    const root = createRoot(appContainer);
    root.render(
        <React.StrictMode>
            <ShadowDOM />
        </React.StrictMode>
    );

    const userlandRoot = createRoot(userlandContainer);
    userlandRoot.render(
        <React.StrictMode>
            <UserlandDOM />
        </React.StrictMode>
    );
}
