import { useEffect, useState } from "react";
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@eye-note/ui";
import { useGroupsStore } from "../../modules/groups/groups-store";
import { RoleList } from "./role-list";
import { RoleForm } from "./role-form";
import { GroupPermission, type GroupRoleRecord, type CreateGroupRolePayload, type UpdateGroupRolePayload } from "@eye-note/definitions";

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

    const [activeTab, setActiveTab] = useState( "roles" );
    const [editingRole, setEditingRole] = useState<GroupRoleRecord | null>( null );
    const [isSubmitting, setIsSubmitting] = useState( false );

    useEffect( () => {
        fetchGroupWithRoles( groupId );
        return () => clearSelectedGroup();
    }, [groupId, fetchGroupWithRoles, clearSelectedGroup] );

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
        if ( !editingRole ) return;

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

    if ( rolesLoading ) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading roles...</div>
                </CardContent>
            </Card>
        );
    }

    if ( rolesError ) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-destructive">
                        Error: {rolesError}
                    </div>
                    <div className="flex justify-center mt-4">
                        <Button onClick={onClose}>Close</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if ( !selectedGroupWithRoles ) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">No group data available</div>
                </CardContent>
            </Card>
        );
    }

    const canManageRoles = selectedGroupWithRoles.roles.some( role => 
        role.permissions.includes( GroupPermission.MANAGE_ROLES )
    );

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Role Management - {selectedGroupWithRoles.name}</CardTitle>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                        <TabsTrigger value="create">Create Role</TabsTrigger>
                        <TabsTrigger value="edit" disabled={!editingRole}>
                            Edit Role
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="roles" className="mt-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Group Roles</h3>
                                {canManageRoles && (
                                    <Button onClick={() => setActiveTab( "create" )}>
                                        Create Role
                                    </Button>
                                )}
                            </div>
                            <RoleList
                                roles={selectedGroupWithRoles.roles}
                                onEditRole={canManageRoles ? handleEditRole : undefined}
                                canManageRoles={canManageRoles}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="create" className="mt-6">
                        <RoleForm
                            onSubmit={handleCreateRole}
                            onCancel={() => setActiveTab( "roles" )}
                            isLoading={isSubmitting}
                            title="Create New Role"
                        />
                    </TabsContent>

                    <TabsContent value="edit" className="mt-6">
                        {editingRole && (
                            <RoleForm
                                initialData={editingRole}
                                onSubmit={handleUpdateRole}
                                onCancel={handleCancelEdit}
                                isLoading={isSubmitting}
                                title={`Edit Role: ${editingRole.name}`}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
