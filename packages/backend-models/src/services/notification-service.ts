import type { NotificationMetadata, NotificationRecord } from "@eye-note/definitions";
import { getGroupModel } from "../models/group";
import { getNotificationModel, type NotificationDocument } from "../models/notification";

export function serializeNotification ( doc : NotificationDocument ) : NotificationRecord {
    const id = typeof doc.id === "string"
        ? doc.id
        : ( ( doc._id as { toString : () => string } ).toString() );
    return {
        id,
        userId: doc.userId,
        type: doc.type,
        title: doc.title,
        body: doc.body ?? null,
        data: doc.data,
        isRead: Boolean( doc.readAt ),
        readAt: doc.readAt ? doc.readAt.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}

interface CreateNotificationsParams {
    recipients : string[];
    type : NotificationRecord["type"];
    title : string;
    body ?: string | null;
    data ?: NotificationMetadata;
    sourceId ?: string;
}

export async function createNotifications ( {
    recipients,
    type,
    title,
    body,
    data,
    sourceId,
} : CreateNotificationsParams ) : Promise<NotificationDocument[]> {
    if ( recipients.length === 0 ) {
        return [];
    }

    const NotificationModel = getNotificationModel();
    const results : NotificationDocument[] = [];

    for ( const userId of recipients ) {
        const doc = await NotificationModel.findOneAndUpdate(
            {
                userId,
                type,
                ...( sourceId ? { sourceId } : {} ),
            },
            {
                $setOnInsert: {
                    userId,
                    type,
                    sourceId,
                    readAt: null,
                },
                $set: {
                    title,
                    body: body ?? null,
                    data,
                    updatedAt: new Date(),
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                timestamps: true,
            }
        ).exec();

        if ( doc ) {
            results.push( doc );
        }
    }

    return results;
}

interface NoteChatNotificationParams {
    messageId : string;
    noteId : string;
    groupId : string;
    actorId : string;
    noteOwnerId : string;
    content : string;
}

export async function createNoteChatMessageNotifications ( params : NoteChatNotificationParams ) : Promise<NotificationDocument[]> {
    const recipients = await resolveGroupRecipients( params.groupId );
    const uniqueRecipients = new Set( recipients );
    if ( params.noteOwnerId ) {
        uniqueRecipients.add( params.noteOwnerId );
    }
    uniqueRecipients.delete( params.actorId );

    if ( uniqueRecipients.size === 0 ) {
        return [];
    }

    const snippet = params.content.trim().slice( 0, 160 );

    return createNotifications( {
        recipients: Array.from( uniqueRecipients ),
        type: "note_chat_message",
        title: "New chat message",
        body: snippet,
        data: {
            noteId: params.noteId,
            groupId: params.groupId,
            messageId: params.messageId,
            senderId: params.actorId,
            snippet,
        },
        sourceId: params.messageId,
    } );
}

interface GroupJoinRequestNotificationParams {
    requestId : string;
    groupId : string;
    groupName : string;
    requesterId : string;
    requesterName ?: string;
    managerUserIds : string[];
}

export async function createGroupJoinRequestNotifications ( params : GroupJoinRequestNotificationParams ) : Promise<NotificationDocument[]> {
    const title = `${ params.requesterName ?? "Someone" } requested to join ${ params.groupName }`;
    const body = `${ params.groupName } has a new join request.`;

    return createNotifications( {
        recipients: params.managerUserIds.filter( ( id ) => id !== params.requesterId ),
        type: "group_join_request",
        title,
        body,
        data: {
            groupId: params.groupId,
            requestId: params.requestId,
            requesterId: params.requesterId,
            requesterName: params.requesterName,
        },
        sourceId: params.requestId,
    } );
}

interface GroupJoinDecisionNotificationParams {
    requestId : string;
    groupId : string;
    groupName : string;
    requesterId : string;
    decision : "approved" | "rejected";
    processedBy : string;
}

export async function createGroupJoinDecisionNotification ( params : GroupJoinDecisionNotificationParams ) : Promise<NotificationDocument[]> {
    const body = params.decision === "approved"
        ? `You're now a member of ${ params.groupName }`
        : `Your request to join ${ params.groupName } was declined.`;

    return createNotifications( {
        recipients: [ params.requesterId ],
        type: "group_join_decision",
        title: params.decision === "approved" ? "Request approved" : "Request declined",
        body,
        data: {
            groupId: params.groupId,
            requestId: params.requestId,
            decision: params.decision,
            processedBy: params.processedBy,
        },
        sourceId: params.requestId,
    } );
}

async function resolveGroupRecipients ( groupId : string ) : Promise<string[]> {
    const GroupModel = getGroupModel();
    const group = await GroupModel.findById( groupId ).lean<{
        memberIds : string[];
    }>().exec();

    if ( !group ) {
        return [];
    }

    return group.memberIds ?? [];
}
