import type { Note } from "../../types";
import { getElementPath } from "../../utils/element-path";

export class NoteManager {
  private static instance: NoteManager;
  private notes: Note[] = [];

  private constructor() {}

  static getInstance(): NoteManager {
    if (!NoteManager.instance) {
      NoteManager.instance = new NoteManager();
    }
    return NoteManager.instance;
  }

  createNote(element: Element): Note {
    const elementPath = getElementPath(element);
    const rect = element.getBoundingClientRect();

    const newNote: Note = {
      id: Date.now(),
      elementPath,
      content: "",
      url: window.location.href,
      groupId: "",
      createdAt: Date.now(),
      createdBy: "current-user",
      comments: [],
      x: rect.right,
      y: rect.top,
      isEditing: true,
      highlightedElement: element,
    };

    this.notes.push(newNote);
    return newNote;
  }

  updateNote(id: number, content: string): void {
    this.notes = this.notes.map((note) => {
      if (note.id === id) {
        return { ...note, content, isEditing: false };
      }
      return note;
    });
  }

  deleteNote(id: number): void {
    this.notes = this.notes.filter((note) => note.id !== id);
  }

  getNotes(): Note[] {
    return [...this.notes];
  }

  setNoteEditing(id: number, isEditing: boolean): void {
    this.notes = this.notes.map((note) => {
      if (note.id === id) {
        return { ...note, isEditing };
      }
      return note;
    });
  }

  hasNoteForElement(element: Element): boolean {
    return this.notes.some((note) => note.highlightedElement === element);
  }
}
