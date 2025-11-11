import { useEffect } from "react";

import { useModeStore, AppMode } from "@eye-note/ext/src/stores/use-mode-store";
import { useHighlightStore } from "@eye-note/ext/src/stores/highlight-store";

import type React from "react";

export function useElementSelectionListener (
    setLocalSelectedElement : React.Dispatch<React.SetStateAction<HTMLElement | null>>
) {
    useEffect( () => {
        const handleElementSelected = ( ( e : CustomEvent ) => {
            const element = e.detail.element;
            if ( element instanceof HTMLElement ) {
                const scrollX = window.scrollX;
                const scrollY = window.scrollY;

                setLocalSelectedElement( element );

                const modeStore = useModeStore.getState();
                const highlightStore = useHighlightStore.getState();

                modeStore.addMode( AppMode.NOTES_MODE );
                highlightStore.setSelectedElement( element );

                ( window as any ).updateOverlay?.( element );

                requestAnimationFrame( () => {
                    window.scrollTo( scrollX, scrollY );
                } );
            }
        } ) as EventListener;

        window.addEventListener( "eye-note:element-selected", handleElementSelected );

        return () => {
            window.removeEventListener( "eye-note:element-selected", handleElementSelected );
        };
    }, [ setLocalSelectedElement ] );
}
