import { Types } from "mongoose";
import { getNoteModel } from "../models/note";
import { getGroupModel } from "../models/group";

export type NoteGroupAccessError =
    | "invalid_note_id"
    | "note_not_found"
    | "note_missing_group"
    | "invalid_group_id"
    | "group_not_found"
    | "forbidden";

export interface NoteGroupAccessSuccess {
    noteId : string;
    groupId : string;
    ownerId : string;
}

export type NoteGroupAccessResult =
    | { error : NoteGroupAccessError }
    | NoteGroupAccessSuccess;

export async function ensureNoteGroupAccess ( noteId : string, userId : string ) : Promise<NoteGroupAccessResult> {
    if ( !Types.ObjectId.isValid( noteId ) ) {
        return { error: "invalid_note_id" };
    }

    const NoteModel = getNoteModel();
    const note = await NoteModel.findById( noteId ).lean<{
        userId : string;
        groupId ?: string | null;
    }>().exec();

    if ( !note ) {
        return { error: "note_not_found" };
    }

    if ( !note.groupId ) {
        return { error: "note_missing_group" };
    }

    if ( !Types.ObjectId.isValid( note.groupId ) ) {
        return { error: "invalid_group_id" };
    }

    const GroupModel = getGroupModel();
    const group = await GroupModel.findById( note.groupId ).lean<{
        memberIds : string[];
    }>().exec();

    if ( !group ) {
        return { error: "group_not_found" };
    }

    const isMember = group.memberIds.includes( userId );
    const isOwner = note.userId === userId;

    if ( !isMember && !isOwner ) {
        return { error: "forbidden" };
    }

    return {
        noteId,
        groupId: note.groupId,
        ownerId: note.userId,
    };
}

export function getAccessErrorStatus ( error : NoteGroupAccessError | string ) {
    const map : Record<NoteGroupAccessError, number> = {
        invalid_note_id: 400,
        note_not_found: 404,
        note_missing_group: 409,
        invalid_group_id: 400,
        group_not_found: 404,
        forbidden: 403,
    };

    if ( error in map ) {
        return map[ error as NoteGroupAccessError ];
    }
    return 400;
}
