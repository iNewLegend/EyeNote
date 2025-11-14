import mongoose, { type Document, type Model } from "mongoose";
const { Schema, model, models } = mongoose;
import type { GroupJoinRequestStatus } from "@eye-note/definitions";

export interface GroupJoinRequestEntity {
    groupId : string;
    groupName : string;
    userId : string;
    userName ?: string | null;
    inviteCode : string;
    status : GroupJoinRequestStatus;
    processedBy ?: string | null;
    processedAt ?: Date | null;
}

export type GroupJoinRequestDocument = Document<unknown, unknown, GroupJoinRequestEntity> & GroupJoinRequestEntity & {
    createdAt : Date;
    updatedAt : Date;
};

const groupJoinRequestSchema = new Schema<GroupJoinRequestDocument>(
    {
        groupId: { type: String, required: true, index: true },
        groupName: { type: String, required: true },
        userId: { type: String, required: true, index: true },
        userName: { type: String, default: null },
        inviteCode: { type: String, required: true },
        status: { type: String, enum: [ "pending", "approved", "rejected" ], default: "pending", index: true },
        processedBy: { type: String, default: null },
        processedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

groupJoinRequestSchema.index( { groupId: 1, userId: 1, status: 1 } );

export function getGroupJoinRequestModel () : Model<GroupJoinRequestDocument> {
    return models.GroupJoinRequest || model<GroupJoinRequestDocument>( "GroupJoinRequest", groupJoinRequestSchema );
}
