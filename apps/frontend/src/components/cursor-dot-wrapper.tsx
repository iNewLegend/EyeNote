import { useModeStore } from "../stores/use-mode-store";
import { CursorDot } from "./cursor-dot";
import { useCursorPosition } from "../hooks/use-cursor-position";

export const CursorDotWrapper = () => {
    const isInspectorMode = useModeStore((state) => state.isInspectorMode);

    // Track cursor position
    useCursorPosition();

    return <CursorDot visible={isInspectorMode} />;
};
