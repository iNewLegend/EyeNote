import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupPermission, type GroupRoleRecord } from "@eye-note/definitions";

interface RoleListProps {
    roles : GroupRoleRecord[];
    onEditRole ?: ( role : GroupRoleRecord ) => void;
    onDeleteRole ?: ( roleId : string ) => void;
    canManageRoles ?: boolean;
}

const permissionLabels : Record<GroupPermission, string> = {
    [GroupPermission.MANAGE_GROUP]: "Manage Group",
    [GroupPermission.MANAGE_ROLES]: "Manage Roles",
    [GroupPermission.MANAGE_MEMBERS]: "Manage Members",
    [GroupPermission.MODERATE_CONTENT]: "Moderate Content",
    [GroupPermission.CREATE_NOTES]: "Create Notes",
    [GroupPermission.EDIT_NOTES]: "Edit Notes",
    [GroupPermission.DELETE_NOTES]: "Delete Notes",
    [GroupPermission.VIEW_NOTES]: "View Notes",
};

export function RoleList ( { roles, onEditRole, onDeleteRole, canManageRoles = false } : RoleListProps ) {
    const sortedRoles = [ ...roles ].sort( ( a, b ) => b.position - a.position );

    return (
        <div className="space-y-4">
            {sortedRoles.map( ( role ) => (
                <Card key={role.id} className="relative">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: role.color }}
                                />
                                <CardTitle className="text-lg">{role.name}</CardTitle>
                                {role.isDefault && (
                                    <Badge variant="secondary" className="text-xs">
                                        Default
                                    </Badge>
                                )}
                            </div>
                            {canManageRoles && !role.isDefault && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEditRole?.( role )}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => onDeleteRole?.( role.id )}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                        {role.description && (
                            <p className="text-sm text-muted-foreground">
                                {role.description}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {role.permissions.map( ( permission ) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                    {permissionLabels[permission]}
                                </Badge>
                            ) )}
                        </div>
                    </CardContent>
                </Card>
            ) )}
        </div>
    );
}
