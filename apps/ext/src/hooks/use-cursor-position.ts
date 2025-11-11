import { useEffect } from "react";

import { useCursorStore } from "@eye-note/ext/src/stores/use-cursor-store";

export const useCursorPosition = () => {
    useEffect( () => {
        const handleMouseMove = ( e : MouseEvent ) => {
            useCursorStore.getState().setPosition( e.clientX, e.clientY );
        };

        document.addEventListener( "mousemove", handleMouseMove );

        return () => {
            document.removeEventListener( "mousemove", handleMouseMove );
            // Reset cursor position on cleanup
            useCursorStore.getState().setPosition( 0, 0 );
        };
    }, [] );
};
