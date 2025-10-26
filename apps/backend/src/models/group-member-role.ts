import { Schema, model, models, type Document, type Model } from "mongoose";

export interface GroupMemberRoleDocument extends Document {
    userId : string;
    roleId : string;
    groupId : string;
    assignedAt : Date;
    assignedBy : string;
}

const groupMemberRoleSchema = new Schema<GroupMemberRoleDocument>(
    {
        userId: { type: String, required: true, index: true },
        roleId: { type: String, required: true, index: true },
        groupId: { type: String, required: true, index: true },
        assignedAt: { type: Date, required: true, default: Date.now },
        assignedBy: { type: String, required: true },
    },
    {
        timestamps: false,
    }
);

groupMemberRoleSchema.index({ userId: 1, groupId: 1 });
groupMemberRoleSchema.index({ roleId: 1, groupId: 1 });

export const GroupMemberRoleModel : Model<GroupMemberRoleDocument> =
    models.GroupMemberRole || model<GroupMemberRoleDocument>( "GroupMemberRole", groupMemberRoleSchema );
