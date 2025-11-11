import { Schema, model, models   } from "mongoose";

import { GroupPermission } from "@eye-note/definitions";

import type { Document, Model } from "mongoose";

export interface GroupRoleDocument extends Document {
    name : string;
    description ?: string | null;
    color : string;
    permissions : GroupPermission[];
    position : number;
    groupId : string;
    isDefault : boolean;
    createdAt : Date;
    updatedAt : Date;
}

const groupRoleSchema = new Schema<GroupRoleDocument>(
    {
        name: { type: String, required: true },
        description: { type: String, default: null },
        color: { type: String, required: true, default: "#6366f1" },
        permissions: {
            type: [ String ],
            required: true,
            enum: Object.values( GroupPermission ),
            default: [ GroupPermission.VIEW_NOTES ]
        },
        position: { type: Number, required: true, default: 0 },
        groupId: { type: String, required: true, index: true },
        isDefault: { type: Boolean, required: true, default: false },
    },
    {
        timestamps: true,
    }
);

groupRoleSchema.index( { groupId: 1, position: -1 } );
groupRoleSchema.index( { groupId: 1, isDefault: 1 } );

export const GroupRoleModel : Model<GroupRoleDocument> =
    models.GroupRole || model<GroupRoleDocument>( "GroupRole", groupRoleSchema );
