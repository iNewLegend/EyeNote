import { create } from "zustand";

interface HighlightStore {
    highlightedElements : Set<Element>;
    hoveredElement : Element | null;
    selectedElement : Element | null;
    addHighlight : ( element : Element ) => void;
    removeHighlight : ( element : Element ) => void;
    setHoveredElement : ( element : Element | null ) => void;
    setSelectedElement : ( element : Element | null ) => void;
    clearAllHighlights : () => void;
}

export const useHighlightStore = create<HighlightStore>( ( set ) => ( {
    highlightedElements: new Set(),
    hoveredElement: null,
    selectedElement: null,

    addHighlight: ( element : Element ) => {
        set( ( state ) => {
            const newHighlightedElements = new Set( state.highlightedElements );
            newHighlightedElements.add( element );
            return { highlightedElements: newHighlightedElements };
        } );
    },

    removeHighlight: ( element : Element ) => {
        set( ( state ) => {
            const newHighlightedElements = new Set( state.highlightedElements );
            newHighlightedElements.delete( element );
            return { highlightedElements: newHighlightedElements };
        } );
    },

    setHoveredElement: ( element : Element | null ) => {
        set( { hoveredElement: element } );
    },

    setSelectedElement: ( element : Element | null ) => {
        set( { selectedElement: element } );
    },

    clearAllHighlights: () => {
        set( { highlightedElements: new Set() } );
    },
} ) );
