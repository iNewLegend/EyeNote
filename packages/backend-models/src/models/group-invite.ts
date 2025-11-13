import mongoose, { type Document, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

export interface GroupInviteEntity {
    groupId : string;
    code : string;
    status : "active" | "revoked";
    expiresAt ?: Date | null;
    maxUses ?: number | null;
    uses : number;
    createdBy : string;
    revokedAt ?: Date | null;
}

export type GroupInviteDocument = Document<unknown, unknown, GroupInviteEntity> & GroupInviteEntity & {
    createdAt : Date;
    updatedAt : Date;
};

const groupInviteSchema = new Schema<GroupInviteDocument>(
    {
        groupId: { type: String, required: true, index: true },
        code: { type: String, required: true, unique: true },
        status: { type: String, enum: [ "active", "revoked" ], default: "active", index: true },
        expiresAt: { type: Date, default: null },
        maxUses: { type: Number, default: null },
        uses: { type: Number, default: 0 },
        createdBy: { type: String, required: true },
        revokedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

groupInviteSchema.index( { groupId: 1, status: 1 } );

export function getGroupInviteModel () : Model<GroupInviteDocument> {
    return models.GroupInvite || model<GroupInviteDocument>( "GroupInvite", groupInviteSchema );
}
