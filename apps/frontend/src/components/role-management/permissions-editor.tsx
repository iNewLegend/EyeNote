import React, { useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { GroupPermission, type GroupRoleRecord } from "@eye-note/definitions";
import { Info, Shield, Users, FileText, Settings, Zap } from "lucide-react";
import { PermissionValidator } from "./permission-validator";

interface PermissionsEditorProps {
    permissions : GroupPermission[];
    onPermissionsChange : ( permissions : GroupPermission[] ) => void;
    disabled ?: boolean;
    className ?: string;
    existingRoles ?: GroupRoleRecord[];
    currentRoleId ?: string;
}

const permissionLabels : Record<GroupPermission, string> = {
    [ GroupPermission.MANAGE_GROUP ]: "Manage Group",
    [ GroupPermission.MANAGE_ROLES ]: "Manage Roles",
    [ GroupPermission.MANAGE_MEMBERS ]: "Manage Members",
    [ GroupPermission.MODERATE_CONTENT ]: "Moderate Content",
    [ GroupPermission.CREATE_NOTES ]: "Create Notes",
    [ GroupPermission.EDIT_NOTES ]: "Edit Notes",
    [ GroupPermission.DELETE_NOTES ]: "Delete Notes",
    [ GroupPermission.VIEW_NOTES ]: "View Notes",
};

const permissionDescriptions : Record<GroupPermission, string> = {
    [ GroupPermission.MANAGE_GROUP ]: "Update group settings, name, description, and color",
    [ GroupPermission.MANAGE_ROLES ]: "Create, edit, and assign roles to members",
    [ GroupPermission.MANAGE_MEMBERS ]: "Kick members and manage group membership",
    [ GroupPermission.MODERATE_CONTENT ]: "Delete inappropriate notes and moderate discussions",
    [ GroupPermission.CREATE_NOTES ]: "Create new notes on web pages",
    [ GroupPermission.EDIT_NOTES ]: "Modify existing notes",
    [ GroupPermission.DELETE_NOTES ]: "Remove notes from web pages",
    [ GroupPermission.VIEW_NOTES ]: "See notes created by other group members",
};

const permissionIcons : Record<GroupPermission, React.ReactNode> = {
    [ GroupPermission.MANAGE_GROUP ]: <Settings className="w-4 h-4" />,
    [ GroupPermission.MANAGE_ROLES ]: <Shield className="w-4 h-4" />,
    [ GroupPermission.MANAGE_MEMBERS ]: <Users className="w-4 h-4" />,
    [ GroupPermission.MODERATE_CONTENT ]: <Zap className="w-4 h-4" />,
    [ GroupPermission.CREATE_NOTES ]: <FileText className="w-4 h-4" />,
    [ GroupPermission.EDIT_NOTES ]: <FileText className="w-4 h-4" />,
    [ GroupPermission.DELETE_NOTES ]: <FileText className="w-4 h-4" />,
    [ GroupPermission.VIEW_NOTES ]: <FileText className="w-4 h-4" />,
};

const permissionGroups = [
    {
        title: "Group Management",
        description: "Control over group settings and administration",
        icon: <Settings className="w-5 h-5" />,
        permissions: [
            GroupPermission.MANAGE_GROUP,
            GroupPermission.MANAGE_ROLES,
            GroupPermission.MANAGE_MEMBERS,
        ],
    },
    {
        title: "Content Management",
        description: "Control over notes and content moderation",
        icon: <FileText className="w-5 h-5" />,
        permissions: [
            GroupPermission.MODERATE_CONTENT,
            GroupPermission.CREATE_NOTES,
            GroupPermission.EDIT_NOTES,
            GroupPermission.DELETE_NOTES,
            GroupPermission.VIEW_NOTES,
        ],
    },
];

const permissionPresets = [
    {
        name: "Viewer",
        description: "Can only view notes",
        permissions: [ GroupPermission.VIEW_NOTES ],
        color: "bg-gray-100 text-gray-800",
    },
    {
        name: "Contributor",
        description: "Can create and edit notes",
        permissions: [
            GroupPermission.VIEW_NOTES,
            GroupPermission.CREATE_NOTES,
            GroupPermission.EDIT_NOTES,
        ],
        color: "bg-blue-100 text-blue-800",
    },
    {
        name: "Moderator",
        description: "Can moderate content and manage notes",
        permissions: [
            GroupPermission.VIEW_NOTES,
            GroupPermission.CREATE_NOTES,
            GroupPermission.EDIT_NOTES,
            GroupPermission.DELETE_NOTES,
            GroupPermission.MODERATE_CONTENT,
        ],
        color: "bg-orange-100 text-orange-800",
    },
    {
        name: "Admin",
        description: "Full administrative access",
        permissions: Object.values( GroupPermission ),
        color: "bg-red-100 text-red-800",
    },
];

export function PermissionsEditor ( {
    permissions,
    onPermissionsChange,
    disabled = false,
    className = "",
    existingRoles = [],
    currentRoleId,
} : PermissionsEditorProps ) {

    const handlePermissionChange = ( permission : GroupPermission, checked : boolean ) => {
        if ( disabled ) return;

        const newPermissions = checked
            ? [ ...permissions, permission ]
            : permissions.filter( ( p ) => p !== permission );

        onPermissionsChange( newPermissions );
    };

    const handleGroupToggle = ( groupPermissions : GroupPermission[], checked : boolean ) => {
        if ( disabled ) return;

        const newPermissions = checked
            ? [ ...new Set( [ ...permissions, ...groupPermissions ] ) ]
            : permissions.filter( ( p ) => !groupPermissions.includes( p ) );

        onPermissionsChange( newPermissions );
    };

    const handlePresetSelect = ( presetName : string ) => {
        if ( disabled ) return;

        const preset = permissionPresets.find( ( p ) => p.name === presetName );
        if ( preset ) {
            onPermissionsChange( preset.permissions );
        }
    };

    const handleSelectAll = () => {
        if ( disabled ) return;
        onPermissionsChange( Object.values( GroupPermission ) );
    };

    const handleSelectNone = () => {
        if ( disabled ) return;
        onPermissionsChange( [] );
    };

    const groupStates = useMemo( () => {
        return permissionGroups.map( ( group ) => {
            const groupPermissions = group.permissions;
            const selectedCount = groupPermissions.filter( ( p ) => permissions.includes( p ) ).length;
            const isAllSelected = selectedCount === groupPermissions.length;
            const isPartiallySelected = selectedCount > 0 && selectedCount < groupPermissions.length;

            return {
                ...group,
                selectedCount,
                isAllSelected,
                isPartiallySelected,
            };
        } );
    }, [ permissions ] );

    const totalSelected = permissions.length;
    const totalAvailable = Object.values( GroupPermission ).length;

    return (
        <TooltipProvider>
            <Card className={className}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Permissions
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Select the permissions for this role ({totalSelected}/{totalAvailable} selected)
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                disabled={disabled || totalSelected === totalAvailable}
                            >
                                Select All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectNone}
                                disabled={disabled || totalSelected === 0}
                            >
                                Select None
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Permission Presets */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Quick Presets</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {permissionPresets.map( ( preset ) => (
                                <Button
                                    key={preset.name}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto p-3 flex flex-col items-start"
                                    onClick={() => handlePresetSelect( preset.name )}
                                    disabled={disabled}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <Badge className={`text-xs ${ preset.color }`}>
                                            {preset.name}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground text-left mt-1">
                                        {preset.description}
                                    </span>
                                </Button>
                            ) )}
                        </div>
                    </div>

                    <Separator />

                    {/* Permission Groups */}
                    <div className="space-y-4">
                        {groupStates.map( ( group ) => (
                            <div key={group.title} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {group.icon}
                                        <div>
                                            <Label className="text-sm font-medium">
                                                {group.title}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                {group.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {group.selectedCount}/{group.permissions.length}
                                        </span>
                                        <Checkbox
                                            checked={group.isAllSelected}
                                            ref={( el ) => {
                                                if ( el ) el.indeterminate = group.isPartiallySelected;
                                            }}
                                            onChange={( e ) =>
                                                handleGroupToggle( group.permissions, e.target.checked )
                                            }
                                            disabled={disabled}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 ml-7">
                                    {group.permissions.map( ( permission ) => (
                                        <div
                                            key={permission}
                                            className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id={permission}
                                                    checked={permissions.includes( permission )}
                                                    onChange={( e ) =>
                                                        handlePermissionChange(
                                                            permission,
                                                            e.target.checked
                                                        )
                                                    }
                                                    disabled={disabled}
                                                />
                                                <div className="flex items-center gap-2">
                                                    {permissionIcons[ permission ]}
                                                    <Label
                                                        htmlFor={permission}
                                                        className="text-sm cursor-pointer"
                                                    >
                                                        {permissionLabels[ permission ]}
                                                    </Label>
                                                </div>
                                            </div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">
                                                        {permissionDescriptions[ permission ]}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    ) )}
                                </div>
                            </div>
                        ) )}
                    </div>

                    {/* Permission Validation */}
                    <PermissionValidator
                        permissions={permissions}
                        existingRoles={existingRoles}
                        currentRoleId={currentRoleId}
                    />

                    {/* Permission Summary */}
                    {totalSelected > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Selected Permissions</Label>
                                <div className="flex flex-wrap gap-2">
                                    {permissions.map( ( permission ) => (
                                        <Badge
                                            key={permission}
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {permissionLabels[ permission ]}
                                        </Badge>
                                    ) )}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}

