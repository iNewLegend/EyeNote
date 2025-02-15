import { useState, useEffect } from "react";
import type { Note } from "./types";
import React from "react";

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true);
        document.body.style.cursor = 'crosshair';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
        setHoveredElement(null);
        document.body.style.cursor = '';
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.body.style.cursor = '';
    };
  }, []);

  useEffect(() => {
    if (!isShiftPressed) {
      if (hoveredElement) {
        hoveredElement.classList.remove('eye-note-highlight');
      }
      setHoveredElement(null);
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as Element;
      
      // Don't highlight if it's the same element
      if (target === hoveredElement) return;
      
      // Remove highlight from previous element
      if (hoveredElement) {
        hoveredElement.classList.remove('eye-note-highlight');
      }

      // Don't highlight our own UI elements
      if (target.closest('.notes-plugin')) return;
      if (target.classList.contains('eye-note-highlight')) return;

      // Add highlight to new element
      requestAnimationFrame(() => {
        target.classList.add('eye-note-highlight');
        setHoveredElement(target);
      });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target === hoveredElement) {
        target.classList.remove('eye-note-highlight');
        setHoveredElement(null);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      // Clean up highlight when effect is cleaned up
      if (hoveredElement) {
        hoveredElement.classList.remove('eye-note-highlight');
      }
    };
  }, [isShiftPressed, hoveredElement]);

  const handleClick = (event: React.MouseEvent) => {
    if (!isShiftPressed || !hoveredElement) return;

    const elementPath = getElementPath(hoveredElement);
    const rect = hoveredElement.getBoundingClientRect();

    const newNote: Note = {
      id: Date.now(),
      elementPath,
      content: '',
      url: window.location.href,
      groupId: '',
      createdAt: Date.now(),
      createdBy: 'current-user',
      comments: [],
      x: rect.right,
      y: rect.top,
      isEditing: true
    };

    setNotes([...notes, newNote]);
    hoveredElement.classList.remove('eye-note-highlight');
    setHoveredElement(null);
    event.preventDefault();
    event.stopPropagation();
  };

  const getElementPath = (element: Element): string => {
    const path: string[] = [];
    let currentElement: Element | null = element;

    while (currentElement && currentElement !== document.body) {
      let selector = currentElement.tagName.toLowerCase();
      
      if (currentElement.id) {
        selector += `#${currentElement.id}`;
      } else {
        const siblings = Array.from(currentElement.parentElement?.children || []);
        const sameTagSiblings = siblings.filter(
          (el) => el.tagName === currentElement?.tagName
        );
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(currentElement);
          selector += `:nth-of-type(${index + 1})`;
        }
      }

      path.unshift(selector);
      currentElement = currentElement.parentElement;
    }

    return path.join(" > ");
  };

  const updateNote = (id: number, content: string): void => {
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, content, isEditing: false } : note
      )
    );
  };

  return (
    <div className="notes-plugin" onMouseDown={handleClick}>
      {notes.map((note) => (
        <div key={note.id}>
          <div 
            className="note-marker" 
            style={{ 
              left: `${note.x ?? 0}px`, 
              top: `${note.y ?? 0}px` 
            }} 
          />
          {note.isEditing && (
            <div 
              className="note-content" 
              style={{ 
                left: `${note.x ?? 0}px`, 
                top: `${(note.y ?? 0) + 20}px` 
              }}
            >
              <textarea
                defaultValue={note.content}
                placeholder="Enter your note..."
                onBlur={(e) => updateNote(note.id, e.target.value)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
