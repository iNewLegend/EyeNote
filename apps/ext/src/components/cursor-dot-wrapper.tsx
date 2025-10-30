import { useModeStore, AppMode } from "../stores/use-mode-store";
import { CursorDot } from "./cursor-dot";
import { useCursorPosition } from "../hooks/use-cursor-position";

export const CursorDotWrapper = () => {
    const isInspectorMode = useModeStore( ( state ) => state.isMode( AppMode.INSPECTOR_MODE ) );
    const isNotesMode = useModeStore( ( state ) => state.isMode( AppMode.NOTES_MODE ) );

    // Track cursor position
    useCursorPosition();

    const shouldShowCursor = isInspectorMode && !isNotesMode;

    return <CursorDot visible={shouldShowCursor} />;
};
