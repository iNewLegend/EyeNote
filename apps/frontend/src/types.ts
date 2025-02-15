export interface Note {
  id: number;
  elementPath: string;
  content: string;
  url: string;
  groupId: string;
  createdAt: number;
  createdBy: string;
  comments: NoteComment[];
  isEditing?: boolean;
  x?: number;
  y?: number;
}

export interface NoteComment {
  id: number;
  content: string;
  createdAt: number;
  createdBy: string;
}

export interface NoteMarkerProps {
  x: number;
  y: number;
}

export interface NoteContentProps {
  x: number;
  y: number;
  content: string;
  onSave: (content: string) => void;
}
