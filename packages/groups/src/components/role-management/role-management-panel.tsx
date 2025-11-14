import { useEffect, useState } from "react";
import {
    Badge,
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@eye-note/ui";
import {
    GroupPermission,
    type CreateGroupRolePayload,
    type GroupRoleRecord,
    type UpdateGroupRolePayload,
} from "@eye-note/definitions";
import { Layers3, ShieldCheck, Sparkles, Users, X } from "lucide-react";

import { useGroupsStore } from "../../store/groups-store";
import { RoleForm } from "./role-form";
import { RoleList } from "./role-list";

interface RoleManagementPanelProps {
    groupId : string;
    onClose : () => void;
}

export function RoleManagementPanel ( { groupId, onClose } : RoleManagementPanelProps ) {
    const {
        selectedGroupWithRoles,
        rolesLoading,
        rolesError,
        fetchGroupWithRoles,
        createGroupRole,
        updateGroupRole,
        clearSelectedGroup,
    } = useGroupsStore();

    const [ activeTab, setActiveTab ] = useState( "roles" );
    const [ editingRole, setEditingRole ] = useState<GroupRoleRecord | null>( null );
    const [ isSubmitting, setIsSubmitting ] = useState( false );

    useEffect( () => {
        fetchGroupWithRoles( groupId );
        return () => clearSelectedGroup();
    }, [ groupId, fetchGroupWithRoles, clearSelectedGroup ] );

    useEffect( () => {
        setEditingRole( null );
        setActiveTab( "roles" );
    }, [ groupId ] );

    const handleCreateRole = async ( data : CreateGroupRolePayload | UpdateGroupRolePayload ) => {
        setIsSubmitting( true );
        try {
            const payload : CreateGroupRolePayload = {
                name: data.name ?? "",
                description: data.description,
                color: data.color,
                permissions: data.permissions ?? [],
            };
            await createGroupRole( groupId, payload );
            setActiveTab( "roles" );
        } finally {
            setIsSubmitting( false );
        }
    };

    const handleUpdateRole = async ( data : CreateGroupRolePayload | UpdateGroupRolePayload ) => {
        if ( !editingRole ) {
            return;
        }

        setIsSubmitting( true );
        try {
            const payload : UpdateGroupRolePayload = {
                name: data.name,
                description: data.description,
                color: data.color,
                permissions: data.permissions,
            };
            await updateGroupRole( groupId, editingRole.id, payload );
            setEditingRole( null );
            setActiveTab( "roles" );
        } finally {
            setIsSubmitting( false );
        }
    };

    const handleEditRole = ( role : GroupRoleRecord ) => {
        setEditingRole( role );
        setActiveTab( "edit" );
    };

    const handleCancelEdit = () => {
        setEditingRole( null );
        setActiveTab( "roles" );
    };

    if ( rolesLoading || !selectedGroupWithRoles ) {
        return (
            <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-10 text-sm text-muted-foreground">
                {rolesLoading ? "Loading roles…" : "No group data available"}
            </div>
        );
    }

    if ( rolesError ) {
        return (
            <div className="space-y-4 rounded-3xl border border-destructive/40 bg-destructive/10 p-8 text-center">
                <p className="text-base font-semibold text-destructive">{rolesError}</p>
                <Button variant="outline" onClick={onClose} className="mx-auto">
                    Close
                </Button>
            </div>
        );
    }

    const canManageRoles = selectedGroupWithRoles.roles.some( ( role ) =>
        role.permissions.includes( GroupPermission.MANAGE_ROLES )
    );

    const accentColor = selectedGroupWithRoles.color ?? "#6366f1";
    const maintainerCount = selectedGroupWithRoles.roles.filter( ( role ) =>
        role.permissions.includes( GroupPermission.MANAGE_ROLES )
    ).length;

    const heroStats = [
        { label: "Total roles", value: selectedGroupWithRoles.roles.length, icon: Layers3 },
        { label: "Members", value: selectedGroupWithRoles.memberCount, icon: Users },
        { label: "Maintainers", value: maintainerCount, icon: ShieldCheck },
    ];

    return (
        <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#05060f]/95 p-6 text-white shadow-[0_30px_120px_rgba(2,6,23,0.6)]">
            <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                    backgroundImage: `radial-gradient(circle at 20% 10%, ${ accentColor }33, transparent 50%)`,
                }}
            />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Roles</p>
                    <h2 className="text-2xl font-semibold text-white">{selectedGroupWithRoles.name}</h2>
                    <p className="text-sm text-slate-400">
                        Craft Discord-style hierarchies with fine-grained permissions.
                    </p>
                </div>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                    <Badge className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/70">
                        LIVE
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-10 w-10 rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/20"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close role manager</span>
                    </Button>
                </div>
            </div>

            <div className="relative mt-6 grid gap-3 text-slate-200 sm:grid-cols-3">
                {heroStats.map( ( stat ) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                            <span className="rounded-2xl bg-white/10 p-2 text-white">
                                <Icon className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-white/60">{stat.label}</p>
                                <p className="text-lg font-semibold text-white">{stat.value}</p>
                            </div>
                        </div>
                    );
                } )}
            </div>

            <div className="relative mt-8 grid gap-6 lg:grid-cols-[0.382fr_0.618fr]">
                <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Hierarchy</p>
                            <h3 className="text-lg font-semibold text-white">Roles</h3>
                        </div>
                        {canManageRoles && (
                            <Button
                                size="sm"
                                className="rounded-full bg-white/15 text-white hover:bg-white/25"
                                onClick={() => setActiveTab( "create" )}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                New role
                            </Button>
                        )}
                    </div>
                    <RoleList
                        roles={selectedGroupWithRoles.roles}
                        onEditRole={canManageRoles ? handleEditRole : undefined}
                        canManageRoles={canManageRoles}
                    />
                </div>

                <div className="space-y-5 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-3 gap-2 rounded-full bg-white/10 p-1">
                            <TabsTrigger
                                value="roles"
                                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/60 data-[state=active]:bg-white data-[state=active]:text-slate-900"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="create"
                                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/60 data-[state=active]:bg-white data-[state=active]:text-slate-900"
                            >
                                Create
                            </TabsTrigger>
                            <TabsTrigger
                                value="edit"
                                disabled={!editingRole}
                                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/60 data-[state=active]:bg-white data-[state=active]:text-slate-900 disabled:opacity-40"
                            >
                                Edit
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="roles" className="mt-6 text-sm text-white/70">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <p className="text-base font-semibold text-white">Need a new permission mix?</p>
                                <p className="mt-2 text-sm text-white/70">
                                    Duplicate your favorite role in the list, tweak its palette, and assign members
                                    without leaving this surface. Use the create tab whenever you need a fresh tier.
                                </p>
                                {canManageRoles && (
                                    <Button
                                        className="mt-4 w-full rounded-full bg-white text-slate-900 hover:bg-slate-100"
                                        onClick={() => setActiveTab( "create" )}
                                    >
                                        Open composer
                                    </Button>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="create" className="mt-6">
                            <RoleForm
                                onSubmit={handleCreateRole}
                                onCancel={() => setActiveTab( "roles" )}
                                isLoading={isSubmitting}
                                title="Create a new role"
                            />
                        </TabsContent>

                        <TabsContent value="edit" className="mt-6">
                            {editingRole ? (
                                <RoleForm
                                    initialData={editingRole}
                                    onSubmit={handleUpdateRole}
                                    onCancel={handleCancelEdit}
                                    isLoading={isSubmitting}
                                    title={`Editing ${editingRole.name}`}
                                />
                            ) : (
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/60">
                                    Select a role from the list to edit its permissions.
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </section>
    );
}
