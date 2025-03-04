import React from "react";
import { useInspectorStore } from "../stores/use-inspector-store";
import { CursorDot } from "./cursor-dot";
import { useCursorPosition } from "../hooks/use-cursor-position";

export const CursorDotWrapper = () => {
    const isActive = useInspectorStore((state) => state.isActive);

    // Track cursor position
    useCursorPosition();

    return <CursorDot visible={isActive} />;
};
