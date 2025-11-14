import mongoose, { type Document, type Model } from "mongoose";
const { Schema, model, models } = mongoose;
import type { NotificationMetadata, NotificationType } from "@eye-note/definitions";

export type NotificationDocument = Document<unknown, unknown, NotificationEntity> & NotificationEntity & {
    createdAt : Date;
    updatedAt : Date;
};

export interface NotificationEntity {
    userId : string;
    type : NotificationType;
    title : string;
    body ?: string | null;
    data ?: NotificationMetadata;
    sourceId ?: string | null;
    readAt ?: Date | null;
}

const notificationSchema = new Schema<NotificationDocument>(
    {
        userId: { type: String, required: true, index: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        body: { type: String, default: null },
        data: { type: Schema.Types.Mixed, default: undefined },
        sourceId: { type: String, default: undefined },
        readAt: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

notificationSchema.index( { userId: 1, createdAt: -1 } );
notificationSchema.index( { userId: 1, readAt: 1 } );
notificationSchema.index( { userId: 1, type: 1, sourceId: 1 }, { unique: true, sparse: true } );

export function getNotificationModel () : Model<NotificationDocument> {
    return models.Notification || model<NotificationDocument>( "Notification", notificationSchema );
}
