import * as React from "react";
import { useThemeStore } from "../../stores/theme-store";

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: "dark" | "light";
}

export function ThemeProvider({ children, defaultTheme = "dark" }: ThemeProviderProps) {
    const { setTheme } = useThemeStore();

    // Set initial theme if provided
    React.useEffect(() => {
        if (defaultTheme) {
            setTheme(defaultTheme);
        }
    }, [defaultTheme, setTheme]);

    return <>{children}</>;
}

// Re-export the theme hook for convenience
export const useTheme = () => {
    const { theme, setTheme } = useThemeStore();
    return { theme, setTheme };
};
