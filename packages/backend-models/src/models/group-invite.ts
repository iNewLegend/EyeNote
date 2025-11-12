import mongoose, { type Document, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

export interface GroupInviteEntity {
    groupId : string;
    email : string;
    code : string;
    status : "pending" | "used";
    expiresAt ?: Date | null;
    usedAt ?: Date | null;
    usedBy ?: string | null;
}

export type GroupInviteDocument = Document<unknown, unknown, GroupInviteEntity> & GroupInviteEntity & {
    createdAt : Date;
    updatedAt : Date;
};

const groupInviteSchema = new Schema<GroupInviteDocument>(
    {
        groupId: { type: String, required: true, index: true },
        email: { type: String, required: true },
        code: { type: String, required: true, unique: true },
        status: { type: String, enum: [ "pending", "used" ], default: "pending", index: true },
        expiresAt: { type: Date, default: null },
        usedAt: { type: Date, default: null },
        usedBy: { type: String, default: null },
    },
    {
        timestamps: true,
    }
);

groupInviteSchema.index( { groupId: 1, email: 1, status: 1 } );

export function getGroupInviteModel () : Model<GroupInviteDocument> {
    return models.GroupInvite || model<GroupInviteDocument>( "GroupInvite", groupInviteSchema );
}
