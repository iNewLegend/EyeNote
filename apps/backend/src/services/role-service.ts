import { GroupPermission } from "@eye-note/definitions";

import { GroupModel } from "@eye-note/backend/src/models/group";

import { GroupRoleModel  } from "@eye-note/backend/src/models/group-role";

import { GroupMemberRoleModel  } from "@eye-note/backend/src/models/group-member-role";

import type { GroupRoleDocument } from "@eye-note/backend/src/models/group-role";
import type { GroupMemberRoleDocument } from "@eye-note/backend/src/models/group-member-role";

export interface UserRoleInfo {
    userId : string;
    roleIds : string[];
    permissions : GroupPermission[];
    isOwner : boolean;
}

export class RoleService {
    public static async createDefaultRoles ( groupId : string, ownerId : string ) : Promise<void> {
        const defaultRoles = [
            {
                name: "Owner",
                description: "Full control over the group",
                color: "#ef4444",
                permissions: Object.values( GroupPermission ),
                position: 1000,
                isDefault: true,
            },
            {
                name: "Admin",
                description: "Manage group settings and members",
                color: "#f59e0b",
                permissions: [
                    GroupPermission.MANAGE_GROUP,
                    GroupPermission.MANAGE_ROLES,
                    GroupPermission.MANAGE_MEMBERS,
                    GroupPermission.MODERATE_CONTENT,
                    GroupPermission.CREATE_NOTES,
                    GroupPermission.EDIT_NOTES,
                    GroupPermission.DELETE_NOTES,
                    GroupPermission.VIEW_NOTES,
                ],
                position: 800,
                isDefault: true,
            },
            {
                name: "Moderator",
                description: "Moderate content and help manage the group",
                color: "#3b82f6",
                permissions: [
                    GroupPermission.MODERATE_CONTENT,
                    GroupPermission.CREATE_NOTES,
                    GroupPermission.EDIT_NOTES,
                    GroupPermission.DELETE_NOTES,
                    GroupPermission.VIEW_NOTES,
                ],
                position: 600,
                isDefault: true,
            },
            {
                name: "Member",
                description: "Basic group participation",
                color: "#6366f1",
                permissions: [
                    GroupPermission.CREATE_NOTES,
                    GroupPermission.EDIT_NOTES,
                    GroupPermission.VIEW_NOTES,
                ],
                position: 400,
                isDefault: true,
            },
        ];

        const roles = await GroupRoleModel.insertMany(
            defaultRoles.map( role => ( {
                ...role,
                groupId,
            } ) )
        );

        const ownerRole = roles.find( role => role.name === "Owner" );
        if ( ownerRole ) {
            await GroupMemberRoleModel.create( {
                userId: ownerId,
                roleId: ownerRole._id.toHexString(),
                groupId,
                assignedBy: ownerId,
            } );
        }
    }

    public static async getUserRoles ( groupId : string, userId : string ) : Promise<UserRoleInfo> {
        const group = await GroupModel.findById( groupId );
        if ( !group ) {
            throw new Error( "Group not found" );
        }

        const isOwner = group.ownerId === userId;

        const memberRoles = await GroupMemberRoleModel.find( {
            userId,
            groupId,
        } );

        const roleIds = memberRoles.map( mr => mr.roleId );

        const roles = await GroupRoleModel.find( {
            _id: { $in: roleIds },
            groupId,
        } );

        const permissions = new Set<GroupPermission>();

        if ( isOwner ) {
            Object.values( GroupPermission ).forEach( permission => {
                permissions.add( permission );
            } );
        } else {
            roles.forEach( role => {
                role.permissions.forEach( permission => {
                    permissions.add( permission );
                } );
            } );
        }

        return {
            userId,
            roleIds,
            permissions: Array.from( permissions ),
            isOwner,
        };
    }

    public static async hasPermission (
        groupId : string,
        userId : string,
        permission : GroupPermission
    ) : Promise<boolean> {
        const userRoles = await this.getUserRoles( groupId, userId );
        return userRoles.permissions.includes( permission );
    }

    public static async canManageRole (
        groupId : string,
        managerUserId : string,
        targetRoleId : string
    ) : Promise<boolean> {
        const managerRoles = await this.getUserRoles( groupId, managerUserId );

        if ( !managerRoles.permissions.includes( GroupPermission.MANAGE_ROLES ) ) {
            return false;
        }

        const targetRole = await GroupRoleModel.findOne( {
            _id: targetRoleId,
            groupId,
        } );

        if ( !targetRole ) {
            return false;
        }

        const managerRolePositions = await GroupRoleModel.find( {
            _id: { $in: managerRoles.roleIds },
            groupId,
        } ).select( "position" );

        const highestManagerPosition = Math.max(
            ...managerRolePositions.map( role => role.position ),
            managerRoles.isOwner ? 1000 : 0
        );

        return highestManagerPosition > targetRole.position;
    }

    public static async assignRole (
        groupId : string,
        userId : string,
        roleId : string,
        assignedBy : string
    ) : Promise<void> {
        const group = await GroupModel.findById( groupId );
        if ( !group ) {
            throw new Error( "Group not found" );
        }

        if ( !group.memberIds.includes( userId ) ) {
            throw new Error( "User is not a member of this group" );
        }

        const role = await GroupRoleModel.findOne( {
            _id: roleId,
            groupId,
        } );

        if ( !role ) {
            throw new Error( "Role not found" );
        }

        await GroupMemberRoleModel.findOneAndUpdate(
            { userId, roleId, groupId },
            {
                userId,
                roleId,
                groupId,
                assignedBy,
                assignedAt: new Date(),
            },
            { upsert: true }
        );
    }

    public static async removeRole (
        groupId : string,
        userId : string,
        roleId : string
    ) : Promise<void> {
        await GroupMemberRoleModel.deleteOne( {
            userId,
            roleId,
            groupId,
        } );
    }

    public static async getGroupRoles ( groupId : string ) : Promise<GroupRoleDocument[]> {
        return GroupRoleModel.find( { groupId } ).sort( { position: -1 } );
    }

    public static async getGroupMemberRoles ( groupId : string ) : Promise<GroupMemberRoleDocument[]> {
        return GroupMemberRoleModel.find( { groupId } );
    }
}
