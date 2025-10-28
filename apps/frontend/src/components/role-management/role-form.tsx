import React, { useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Checkbox,
    Input,
    Label,
    Textarea,
} from "@eye-note/ui";
import { GroupPermission, type CreateGroupRolePayload, type UpdateGroupRolePayload } from "@eye-note/definitions";

interface RoleFormProps {
    initialData ?: Partial<CreateGroupRolePayload>;
    onSubmit : ( data : CreateGroupRolePayload | UpdateGroupRolePayload ) => Promise<void>;
    onCancel : () => void;
    isLoading ?: boolean;
    title : string;
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

const permissionGroups = [
    {
        title: "Group Management",
        permissions: [
            GroupPermission.MANAGE_GROUP,
            GroupPermission.MANAGE_ROLES,
            GroupPermission.MANAGE_MEMBERS,
        ],
    },
    {
        title: "Content Management",
        permissions: [
            GroupPermission.MODERATE_CONTENT,
            GroupPermission.CREATE_NOTES,
            GroupPermission.EDIT_NOTES,
            GroupPermission.DELETE_NOTES,
            GroupPermission.VIEW_NOTES,
        ],
    },
];

export function RoleForm ( { initialData, onSubmit, onCancel, isLoading = false, title } : RoleFormProps ) {
    const [formData, setFormData] = useState( {
        name: initialData?.name || "",
        description: initialData?.description || "",
        color: initialData?.color || "#6366f1",
        permissions: initialData?.permissions || [GroupPermission.VIEW_NOTES],
    } );

    const handlePermissionChange = ( permission : GroupPermission, checked : boolean ) => {
        setFormData( ( prev ) => ( {
            ...prev,
            permissions: checked
                ? [ ...prev.permissions, permission ]
                : prev.permissions.filter( ( p ) => p !== permission ),
        } ) );
    };

    const handleSubmit = async ( e : React.FormEvent ) => {
        e.preventDefault();
        await onSubmit( formData );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Role Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={( event : React.ChangeEvent<HTMLInputElement> ) =>
                                setFormData( ( prev ) => ( { ...prev, name: event.target.value } ) )
                            }
                            placeholder="Enter role name"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={( event : React.ChangeEvent<HTMLTextAreaElement> ) =>
                                setFormData( ( prev ) => ( { ...prev, description: event.target.value } ) )
                            }
                            placeholder="Enter role description"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="color"
                                type="color"
                                value={formData.color}
                                onChange={( event : React.ChangeEvent<HTMLInputElement> ) =>
                                    setFormData( ( prev ) => ( { ...prev, color: event.target.value } ) )
                                }
                                className="w-16 h-10 p-1"
                            />
                            <Input
                                value={formData.color}
                                onChange={( event : React.ChangeEvent<HTMLInputElement> ) =>
                                    setFormData( ( prev ) => ( { ...prev, color: event.target.value } ) )
                                }
                                placeholder="#6366f1"
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label>Permissions</Label>
                        {permissionGroups.map( ( group ) => (
                            <div key={group.title} className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    {group.title}
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {group.permissions.map( ( permission ) => (
                                        <div key={permission} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={permission}
                                                checked={formData.permissions.includes( permission )}
                                                onCheckedChange={( checkedValue : CheckedState ) =>
                                                    handlePermissionChange( permission, checkedValue === true )
                                                }
                                            />
                                            <Label htmlFor={permission} className="text-sm">
                                                {permissionLabels[permission]}
                                            </Label>
                                        </div>
                                    ) )}
                                </div>
                            </div>
                        ) )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Role"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
