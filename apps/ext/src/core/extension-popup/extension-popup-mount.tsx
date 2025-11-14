import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@eye-note/ui";
import { ExtensionPopup } from "./extension-popup";
import { ensureGroupsConfigured } from "../../lib/groups/configure-groups";

ensureGroupsConfigured();

console.log( "Popup mounting..." );

try {
    const rootElement = document.getElementById( "root" );
    console.log( "Found root element:", rootElement );

    if ( !rootElement ) {
        throw new Error( "Root element not found" );
    }

    const root = createRoot( rootElement );
    console.log( "Created React root" );

    root.render(
        <React.StrictMode>
            <ExtensionPopup />
            <Toaster />
        </React.StrictMode>
    );

    console.log( "Rendered React app" );
} catch ( error ) {
    console.error( "Error mounting React app:", error );
}
