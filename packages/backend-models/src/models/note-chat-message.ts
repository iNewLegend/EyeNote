import mongoose, { type Document, type Model } from "mongoose";
const { Schema, model, models } = mongoose;
import type { NoteChatMessageBase } from "@eye-note/definitions";

export type NoteChatMessageDocument = Document<unknown, unknown, NoteChatMessageBase> &
    NoteChatMessageBase & {
        createdAt : Date;
        updatedAt : Date;
    };

const noteChatSchemaDefinition : Record<string, unknown> = {
    noteId: { type: String, required: true, index: true },
    groupId: { type: String, default: null, index: true },
    userId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    clientMessageId: { type: String, default: null },
};

const noteChatMessageSchema = new Schema<NoteChatMessageDocument>(
    noteChatSchemaDefinition,
    {
        timestamps: true,
    }
);

noteChatMessageSchema.index( { noteId: 1, createdAt: -1 } );
noteChatMessageSchema.index(
    { noteId: 1, clientMessageId: 1 },
    { partialFilterExpression: { clientMessageId: { $type: "string" } }, unique: true }
);

export function getNoteChatMessageModel () : Model<NoteChatMessageDocument> {
    return models.NoteChatMessage || model<NoteChatMessageDocument>( "NoteChatMessage", noteChatMessageSchema );
}
