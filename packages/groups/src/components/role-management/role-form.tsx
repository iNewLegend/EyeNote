import { useState } from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Button, Checkbox, Input, Label, Textarea } from "@eye-note/ui";
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
    const [ formData, setFormData ] = useState( {
        name: initialData?.name || "",
        description: initialData?.description || "",
        color: initialData?.color || "#6366f1",
        permissions: initialData?.permissions || [ GroupPermission.VIEW_NOTES ],
    } );

    const handlePermissionChange = ( permission : GroupPermission, checked : boolean ) => {
        setFormData( ( prev ) => ( {
            ...prev,
            permissions: checked
                ? [ ...prev.permissions, permission ]
                : prev.permissions.filter( ( p ) => p !== permission ),
        } ) );
    };

    const handleSubmit = async ( event : React.FormEvent ) => {
        event.preventDefault();
        await onSubmit( formData );
    };

    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-white/50">{title}</p>
                    <h4 className="text-xl font-semibold text-white">Role composer</h4>
                </div>
                <div className="flex items-center gap-3">
                    <div
                        className="h-12 w-12 rounded-2xl border-2 border-white/30"
                        style={{ background: formData.color }}
                        aria-label="Role color preview"
                    />
                    <div>
                        <p className="text-xs text-white/60">Accent</p>
                        <p className="font-mono text-sm">{formData.color.toUpperCase()}</p>
                    </div>
                </div>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase tracking-[0.3em] text-white/60">
                        Role name
                    </Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={( event ) =>
                            setFormData( ( prev ) => ( { ...prev, name: event.target.value } ) )
                        }
                        placeholder="Ex. Moderators"
                        required
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs uppercase tracking-[0.3em] text-white/60">
                        Description
                    </Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={( event ) =>
                            setFormData( ( prev ) => ( { ...prev, description: event.target.value } ) )
                        }
                        placeholder="What does this role do?"
                        rows={3}
                        className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.3em] text-white/60">Color system</Label>
                    <div className="grid gap-4 lg:grid-cols-[1fr_1.618fr]">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <Input
                                id="color"
                                type="color"
                                value={formData.color}
                                onChange={( event ) =>
                                    setFormData( ( prev ) => ( { ...prev, color: event.target.value } ) )
                                }
                                className="h-12 w-16 cursor-pointer border-0 bg-transparent p-0"
                            />
                            <Input
                                value={formData.color}
                                onChange={( event ) =>
                                    setFormData( ( prev ) => ( { ...prev, color: event.target.value } ) )
                                }
                                placeholder="#6366F1"
                                className="flex-1 border-0 bg-transparent font-mono uppercase tracking-wider"
                            />
                        </div>
                        <div
                            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-transparent p-4"
                            style={{ aspectRatio: "1.618 / 1" }}
                        >
                            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Preview</p>
                            <div className="mt-3 flex h-full items-center justify-center rounded-2xl border border-dashed border-white/20">
                                <span className="text-sm font-medium text-white/60">{formData.name || "Role"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-xs uppercase tracking-[0.3em] text-white/60">Permissions</Label>
                    {permissionGroups.map( ( group ) => (
                        <div key={group.title} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                            <h4 className="text-sm font-semibold text-white">{group.title}</h4>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {group.permissions.map( ( permission ) => (
                                    <Label
                                        key={permission}
                                        htmlFor={permission}
                                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                                    >
                                        <Checkbox
                                            id={permission}
                                            checked={formData.permissions.includes( permission )}
                                            onCheckedChange={( checkedValue : CheckedState ) =>
                                                handlePermissionChange( permission, checkedValue === true )
                                            }
                                        />
                                        <span>{permissionLabels[permission]}</span>
                                    </Label>
                                ) )}
                            </div>
                        </div>
                    ) )}
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="rounded-full border-white/20 text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="rounded-full bg-white text-slate-900 hover:bg-slate-100">
                        {isLoading ? "Saving…" : "Save role"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
