import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@eye-note/ui";
import { GroupManagerWindow } from "./group-manager-window";

console.log( "Group manager window mounting..." );

try {
    const rootElement = document.getElementById( "root" );

    if ( !rootElement ) {
        throw new Error( "Root element not found" );
    }

    const root = createRoot( rootElement );

    root.render(
        <React.StrictMode>
            <GroupManagerWindow />
            <Toaster position="top-right" />
        </React.StrictMode>
    );
} catch ( error ) {
    console.error( "Failed to mount group manager window", error );
}
