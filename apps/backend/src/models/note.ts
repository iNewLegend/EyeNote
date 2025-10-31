import { Schema, model, models, type Document, type Model } from "mongoose";
import type { NoteBase, SerializedDOMRect, Vector2D, ElementScreenshot } from "@eye-note/definitions";

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

const screenshotSchema = new Schema<ElementScreenshot>(
    {
        dataUrl: { type: String, required: true },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        zoom: { type: Number, required: true },
    },
    { _id: false }
);

const noteSchema = new Schema<NoteDocument>(
    {
        userId: { type: String, required: true, index: true },
        elementPath: { type: String, required: true },
        content: { type: String, default: "" },
        url: { type: String, required: true, index: true },
        hostname: { type: String, default: null, index: true },
        pageId: { type: String, default: null, index: true },
        canonicalUrl: { type: String, default: null },
        normalizedUrl: { type: String, default: null },
        anchorHints: {
            tagName: { type: String, default: null },
            id: { type: String, default: null },
            classListSample: { type: [ String ], default: undefined },
            dataAttrs: { type: Schema.Types.Mixed, default: undefined },
            textHash: { type: String, default: null },
        },
        groupId: { type: String, default: null },
        elementRect: { type: rectSchema, default: null },
        elementOffset: { type: vectorSchema, default: null },
        scrollPosition: { type: vectorSchema, default: null },
        locationCapturedAt: { type: Number, default: null },
        screenshots: { type: [ screenshotSchema ], default: undefined },
    },
    {
        timestamps: true,
    }
);

// Prefer pageId; otherwise composite on hostname + normalizedUrl (only when both present)
noteSchema.index( { userId: 1, pageId: 1, updatedAt: -1 } );
noteSchema.index(
    { userId: 1, hostname: 1, normalizedUrl: 1, updatedAt: -1 },
    { partialFilterExpression: { hostname: { $type: "string" }, normalizedUrl: { $type: "string" } } }
);

export const NoteModel : Model<NoteDocument> =
    models.Note || model<NoteDocument>( "Note", noteSchema );
