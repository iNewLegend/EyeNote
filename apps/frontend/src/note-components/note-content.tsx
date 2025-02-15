import type { NoteContentProps } from "../types";

const NoteContent = ({ x, y, content, onSave }: NoteContentProps) => {
  return (
    <div className="note-content" style={{ left: `${x}px`, top: `${y}px` }}>
      <textarea
        defaultValue={content}
        placeholder="Enter your note..."
        onBlur={(e) => onSave(e.target.value)}
      />
    </div>
  );
};

export default NoteContent;
