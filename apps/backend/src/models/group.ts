import { Schema, model, models, type Document, type Model } from "mongoose";

export interface GroupDocument extends Document {
    name : string;
    description ?: string | null;
    slug : string;
    inviteCode : string;
    ownerId : string;
    memberIds : string[];
    color : string;
    createdAt : Date;
    updatedAt : Date;
}

const groupSchema = new Schema<GroupDocument>(
    {
        name: { type: String, required: true },
        description: { type: String, default: null },
        slug: { type: String, required: true, unique: true },
        inviteCode: { type: String, required: true, unique: true },
        ownerId: { type: String, required: true, index: true },
        memberIds: { type: [ String ], required: true, index: true },
        color: { type: String, required: true, default: "#6366f1" },
    },
    {
        timestamps: true,
    }
);

groupSchema.index( { slug: 1 }, { unique: true } );
groupSchema.index( { inviteCode: 1 }, { unique: true } );
groupSchema.index( { memberIds: 1 } );

export const GroupModel : Model<GroupDocument> =
    models.Group || model<GroupDocument>( "Group", groupSchema );
