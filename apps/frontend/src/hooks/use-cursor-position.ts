import { useEffect } from "react";
import { useCursorStore } from "../stores/use-cursor-store";

export const useCursorPosition = () => {
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            useCursorStore.getState().setPosition(e.clientX, e.clientY);
        };

        document.addEventListener("mousemove", handleMouseMove);
        return () => document.removeEventListener("mousemove", handleMouseMove);
    }, []);
};
