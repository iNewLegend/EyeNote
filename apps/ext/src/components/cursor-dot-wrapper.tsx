import { useCursorPosition } from "@eye-note/ext/src/hooks/use-cursor-position";

import { CursorDot } from "@eye-note/ext/src/components/cursor-dot";

import { useModeStore, AppMode } from "@eye-note/ext/src/stores/use-mode-store";

export const CursorDotWrapper = () => {
    const isInspectorMode = useModeStore( ( state ) => state.isMode( AppMode.INSPECTOR_MODE ) );
    const isNotesMode = useModeStore( ( state ) => state.isMode( AppMode.NOTES_MODE ) );

    // Track cursor position
    useCursorPosition();

    const shouldShowCursor = isInspectorMode && !isNotesMode;

    return <CursorDot visible={ shouldShowCursor } />;
};
