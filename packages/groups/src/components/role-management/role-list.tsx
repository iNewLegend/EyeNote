import { Badge, Button } from "@eye-note/ui";
import { GroupPermission, type GroupRoleRecord } from "@eye-note/definitions";
import { Crown, Pencil, Shield } from "lucide-react";

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

    if ( sortedRoles.length === 0 ) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
                No roles yet. Create your first tier to unlock permissions.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sortedRoles.map( ( role ) => (
                <div
                    key={role.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                >
                    <span
                        className="absolute inset-y-0 left-0 w-1.5"
                        style={{ background: role.color || "#6366f1" }}
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-8 w-8 rounded-full border-2 border-white/40"
                                    style={{ background: role.color || "#6366f1" }}
                                />
                                <div>
                                    <p className="text-base font-semibold text-white">{role.name}</p>
                                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                                        Position #{role.position}
                                    </p>
                                </div>
                                {role.isDefault && (
                                    <Badge className="flex items-center gap-1 rounded-full bg-white/15 text-[10px] uppercase tracking-widest text-white">
                                        <Crown className="h-3 w-3" /> Default
                                    </Badge>
                                )}
                            </div>
                            {role.description ? (
                                <p className="text-sm text-white/70">{role.description}</p>
                            ) : null}
                        </div>
                        {canManageRoles && !role.isDefault && (
                            <div className="flex flex-shrink-0 items-center gap-2 self-end lg:self-start">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-full border border-white/20 text-white hover:bg-white/15"
                                    onClick={() => onEditRole?.( role )}
                                >
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Button>
                                {onDeleteRole && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 rounded-full"
                                        onClick={() => onDeleteRole( role.id )}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {role.permissions.map( ( permission ) => (
                            <Badge
                                key={permission}
                                variant="outline"
                                className="flex items-center gap-1 rounded-full border-white/30 text-[11px] text-white/80"
                            >
                                <Shield className="h-3 w-3 text-white/50" /> {permissionLabels[permission]}
                            </Badge>
                        ) )}
                    </div>
                </div>
            ) )}
        </div>
    );
}
