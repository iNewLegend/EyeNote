import { useModeStore, AppMode } from "../stores/use-mode-store";
import { CursorDot } from "./cursor-dot";
import { useCursorPosition } from "../hooks/use-cursor-position";

export const CursorDotWrapper = () => {
    const isInspectorMode = useModeStore((state) => state.isMode(AppMode.INSPECTOR_MODE));
    const hasBothModes = useModeStore((state) =>
        state.isModes([AppMode.INSPECTOR_MODE, AppMode.NOTES_MODE])
    );

    // Track cursor position
    useCursorPosition();

    // Hide cursor dot if both modes are active
    const shouldShowCursor = isInspectorMode && !hasBothModes;

    return <CursorDot visible={shouldShowCursor} />;
};
