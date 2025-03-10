import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeStore {
    theme : Theme;
    setTheme : ( theme : Theme ) => void;
}

export const useThemeStore = create<ThemeStore>( ( set ) => ( {
    theme: "dark",
    setTheme: ( theme : Theme ) => {
        set( { theme } );
        const root = window.document.documentElement;
        root.classList.remove( "light", "dark" );
        root.classList.add( theme );
    },
} ) );
