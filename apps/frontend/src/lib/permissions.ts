import { GroupPermission, type GroupWithRoles, type GroupMemberRole } from "@eye-note/definitions";

export interface UserPermissions {
    permissions : GroupPermission[];
    isOwner : boolean;
    roleIds : string[];
}

export function getUserPermissions (
    group : GroupWithRoles,
    userId : string
) : UserPermissions {
    const isOwner = group.ownerId === userId;
    
    if ( isOwner ) {
        return {
            permissions: Object.values( GroupPermission ),
            isOwner: true,
            roleIds: [],
        };
    }

    const userMemberRoles = group.memberRoles.filter( mr => mr.userId === userId );
    const roleIds = userMemberRoles.map( mr => mr.roleId );
    
    const userRoles = group.roles.filter( role => roleIds.includes( role.id ) );
    
    const permissions = new Set<GroupPermission>();
    userRoles.forEach( role => {
        role.permissions.forEach( permission => {
            permissions.add( permission );
        } );
    } );

    return {
        permissions: Array.from( permissions ),
        isOwner: false,
        roleIds,
    };
}

export function hasPermission (
    group : GroupWithRoles,
    userId : string,
    permission : GroupPermission
) : boolean {
    const userPermissions = getUserPermissions( group, userId );
    return userPermissions.permissions.includes( permission );
}

export function canManageRole (
    group : GroupWithRoles,
    managerUserId : string,
    targetRoleId : string
) : boolean {
    const managerPermissions = getUserPermissions( group, managerUserId );
    
    if ( !managerPermissions.permissions.includes( GroupPermission.MANAGE_ROLES ) ) {
        return false;
    }

    const targetRole = group.roles.find( role => role.id === targetRoleId );
    if ( !targetRole ) {
        return false;
    }

    const managerRoles = group.roles.filter( role => 
        managerPermissions.roleIds.includes( role.id )
    );

    const highestManagerPosition = Math.max(
        ...managerRoles.map( role => role.position ),
        managerPermissions.isOwner ? 1000 : 0
    );

    return highestManagerPosition > targetRole.position;
}
