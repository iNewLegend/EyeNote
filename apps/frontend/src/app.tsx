import { useState, useEffect } from "react";
import type { Note } from "./types";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { useToast } from "./components/ui/toast-context";

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        // Clear any existing highlights
        document.querySelectorAll('.eye-note-highlight').forEach(el => {
          el.classList.remove('eye-note-highlight');
        });
        setIsShiftPressed(true);
        document.body.classList.add("shift-pressed");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
        setHoveredElement(null);
        document.body.classList.remove("shift-pressed");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.body.classList.remove("shift-pressed");
    };
  }, []);

  useEffect(() => {
    if (!isShiftPressed) {
      if (hoveredElement) {
        // Only remove highlight if we're not creating a note
        const activeNotes = notes.filter(note => note.isEditing && note.highlightedElement === hoveredElement);
        if (activeNotes.length === 0) {
          hoveredElement.classList.remove('eye-note-highlight');
        }
      }
      setHoveredElement(null);
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as Element;
      
      // Don't highlight if it's the same element
      if (target === hoveredElement) return;
      
      // Remove highlight from previous element only if it's not being edited
      if (hoveredElement) {
        const activeNotes = notes.filter(note => note.isEditing && note.highlightedElement === hoveredElement);
        if (activeNotes.length === 0) {
          hoveredElement.classList.remove('eye-note-highlight');
        }
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
        // Only remove highlight if we're not creating a note
        const activeNotes = notes.filter(note => note.isEditing && note.highlightedElement === target);
        if (activeNotes.length === 0) {
          target.classList.remove('eye-note-highlight');
        }
        setHoveredElement(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!isShiftPressed || !hoveredElement) return;

      // Don't create notes on our own UI elements
      if ((e.target as Element).closest('.notes-plugin')) return;

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
        isEditing: true,
        highlightedElement: hoveredElement
      };

      setNotes(prevNotes => [...prevNotes, newNote]);
      setHoveredElement(null);
      e.preventDefault();
      e.stopPropagation();

      toast({
        title: "Note Created",
        description: "Click the marker to edit your note."
      });
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
      // Clean up highlight when effect is cleaned up
      if (hoveredElement) {
        hoveredElement.classList.remove('eye-note-highlight');
      }
    };
  }, [isShiftPressed, hoveredElement, toast, notes]);

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
      notes.map((note) => {
        if (note.id === id) {
          if (note.highlightedElement) {
            note.highlightedElement.classList.remove('eye-note-highlight');
          }
          return { ...note, content, isEditing: false, highlightedElement: null };
        }
        return note;
      })
    );
    toast({
      title: "Note Updated",
      description: "Your note has been saved."
    });
  };

  return (
    <div className="notes-plugin">
      {notes.map((note) => (
        <div key={note.id}>
          <div 
            className="note-marker" 
            style={{ 
              left: `${note.x ?? 0}px`, 
              top: `${note.y ?? 0}px` 
            }}
            onClick={() => setNotes(notes.map(n => 
              n.id === note.id ? { ...n, isEditing: true } : n
            ))}
          />
          <Dialog open={note.isEditing} onOpenChange={(open) => {
            if (!open) {
              if (note.highlightedElement) {
                note.highlightedElement.classList.remove('eye-note-highlight');
              }
              setNotes(notes.map(n => 
                n.id === note.id ? { ...n, isEditing: false, highlightedElement: null } : n
              ));
            }
          }}>
            <DialogContent 
              className="note-content" 
              style={{ 
                position: 'absolute',
                left: `${note.x ?? 0}px`, 
                top: `${(note.y ?? 0) + 20}px`,
                transform: 'none'
              }}
            >
              <DialogTitle className="sr-only">Add Note</DialogTitle>
              <DialogDescription className="sr-only">
                Add or edit your note for the selected element. Use the textarea below to write your note, then click Save to confirm or Delete to remove the note.
              </DialogDescription>
              <textarea
                className="w-full min-h-[100px] p-2 border border-border rounded resize-y font-sans"
                defaultValue={note.content}
                placeholder="Enter your note..."
                autoFocus
                onBlur={(e) => updateNote(note.id, e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setNotes(notes.filter(n => n.id !== note.id))}>
                  Delete
                </Button>
                <Button onClick={() => updateNote(note.id, note.content)}>
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}

export default App;
