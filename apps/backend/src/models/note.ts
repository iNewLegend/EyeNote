import { Schema, model, models, type Document, type Model } from "mongoose";
import type { NoteBase, SerializedDOMRect, Vector2D } from "@eye-note/definitions";

export interface NoteDocument extends NoteBase, Document {
    userId : string;
    createdAt : Date;
    updatedAt : Date;
}

const vectorSchema = new Schema<Vector2D>(
    {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
    },
    { _id: false }
);

const rectSchema = new Schema<SerializedDOMRect>(
    {
        top: { type: Number, required: true },
        right: { type: Number, required: true },
        bottom: { type: Number, required: true },
        left: { type: Number, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
    },
    { _id: false }
);

const noteSchema = new Schema<NoteDocument>(
    {
        userId: { type: String, required: true, index: true },
        elementPath: { type: String, required: true },
        content: { type: String, default: "" },
        url: { type: String, required: true, index: true },
        groupId: { type: String, default: null },
        x: { type: Number, default: null },
        y: { type: Number, default: null },
        elementRect: { type: rectSchema, default: null },
        elementOffset: { type: vectorSchema, default: null },
        elementOffsetRatio: { type: vectorSchema, default: null },
        scrollPosition: { type: vectorSchema, default: null },
        locationCapturedAt: { type: Number, default: null },
    },
    {
        timestamps: true,
    }
);

export const NoteModel : Model<NoteDocument> =
    models.Note || model<NoteDocument>( "Note", noteSchema );
