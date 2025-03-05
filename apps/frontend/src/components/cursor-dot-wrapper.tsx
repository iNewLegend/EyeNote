import { useModeStore, AppMode } from "../stores/use-mode-store";
import { CursorDot } from "./cursor-dot";
import { useCursorPosition } from "../hooks/use-cursor-position";

export const CursorDotWrapper = () => {
    const isInspectorMode = useModeStore((state) => state.isMode(AppMode.INSPECTOR_MODE));

    // Track cursor position
    useCursorPosition();

    return <CursorDot visible={isInspectorMode} />;
};
