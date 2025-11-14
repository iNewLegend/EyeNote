import type { NoteChatMessageRecord } from "@eye-note/definitions";
import type { NoteChatMessageDocument } from "../models/note-chat-message";

export function serializeNoteChatMessage ( doc : NoteChatMessageDocument ) : NoteChatMessageRecord {
    const id = typeof ( doc._id as any )?.toHexString === "function"
        ? ( doc._id as any ).toHexString()
        : String( doc._id );

    return {
        id,
        noteId: doc.noteId,
        groupId: doc.groupId ?? null,
        userId: doc.userId,
        content: doc.content,
        clientMessageId: doc.clientMessageId ?? undefined,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
