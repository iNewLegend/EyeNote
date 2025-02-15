import { NoteMarkerProps } from "../types";

const NoteMarker = ({ x, y }: NoteMarkerProps) => {
  return (
    <div
      className="note-marker"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
};

export default NoteMarker;
