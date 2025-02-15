import { useState, useEffect } from "react";
import type { Note } from "./types";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { useToast } from "./components/ui/toast-context";

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !isShiftPressed) {
        // Only clear highlights if we're not already in shift mode
        document.querySelectorAll('.eye-note-highlight').forEach(el => {
          if (!notes.some(note => note.highlightedElement === el)) {
            el.classList.remove('eye-note-highlight');
          }
        });
        setSelectedElement(null);  // Clear selected element
        setIsShiftPressed(true);
        document.body.classList.add("shift-pressed");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
        // Only clear hover highlight if it's not associated with a note
        if (hoveredElement && !notes.some(note => note.highlightedElement === hoveredElement)) {
          hoveredElement.classList.remove('eye-note-highlight');
        }
        setHoveredElement(null);
        document.body.classList.remove("shift-pressed");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      // Only remove shift-pressed class, don't remove highlights
      document.body.classList.remove("shift-pressed");
    };
  }, [hoveredElement, isShiftPressed, notes]);  // Add isShiftPressed and notes to dependencies

  useEffect(() => {
    if (!isShiftPressed) {
      if (hoveredElement && !notes.some(note => note.highlightedElement === hoveredElement)) {
        requestAnimationFrame(() => {
          hoveredElement.classList.remove('eye-note-highlight');
        });
      }
      setHoveredElement(null);
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as Element;
      
      // Don't highlight if it's the same element
      if (target === hoveredElement) return;
      
      // Remove highlight from previous element only if it's not associated with a note
      if (hoveredElement && !notes.some(note => note.highlightedElement === hoveredElement)) {
        requestAnimationFrame(() => {
          hoveredElement.classList.remove('eye-note-highlight');
        });
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
      if (target === hoveredElement && !notes.some(note => note.highlightedElement === target)) {
        requestAnimationFrame(() => {
          target.classList.remove('eye-note-highlight');
          setHoveredElement(null);
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!isShiftPressed || !hoveredElement) return;

      // Don't create notes on our own UI elements
      if ((e.target as Element).closest('.notes-plugin')) return;

      const elementPath = getElementPath(hoveredElement);
      const rect = hoveredElement.getBoundingClientRect();

      // Save the selected element and ensure highlight
      const element = hoveredElement;
      requestAnimationFrame(() => {
        setSelectedElement(element);
        element.classList.add('eye-note-highlight');
      });

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
        highlightedElement: element
      };

      setNotes(prevNotes => [...prevNotes, newNote]);
      setHoveredElement(null);
      setIsShiftPressed(false);
      document.body.classList.remove("shift-pressed");
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
      // Only remove highlight from hovered element if it's not associated with any note
      if (hoveredElement && hoveredElement !== selectedElement && !notes.some(note => note.highlightedElement === hoveredElement)) {
        hoveredElement.classList.remove('eye-note-highlight');
      }
    };
  }, [isShiftPressed, hoveredElement, toast, notes, selectedElement]);

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
          return { ...note, content, isEditing: false };
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
            onClick={() => {
              // When reopening, set the selected element and highlight it
              const element = note.highlightedElement;
              if (element) {
                requestAnimationFrame(() => {
                  setSelectedElement(element);
                  element.classList.add('eye-note-highlight');
                });
              }
              setNotes(notes.map(n => 
                n.id === note.id ? { ...n, isEditing: true } : n
              ));
            }}
          />
          <Dialog open={note.isEditing} onOpenChange={(open) => {
            if (!open) {  // Only when closing the dialog
              // Remove highlight when dialog closes
              const element = note.highlightedElement;
              if (element) {
                requestAnimationFrame(() => {
                  element.classList.remove('eye-note-highlight');
                  setSelectedElement(null);
                });
              }
              setNotes(notes.map(n => 
                n.id === note.id ? { ...n, isEditing: false } : n
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
                <Button variant="outline" onClick={() => {
                  const element = note.highlightedElement;
                  if (element) {
                    requestAnimationFrame(() => {
                      element.classList.remove('eye-note-highlight');
                      setSelectedElement(null);
                    });
                  }
                  setNotes(notes.filter(n => n.id !== note.id));
                }}>
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
