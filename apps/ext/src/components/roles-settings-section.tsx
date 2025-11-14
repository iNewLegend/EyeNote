import { useEffect, useMemo } from "react";
import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardTitle,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@eye-note/ui";
import { RefreshCw, Shield } from "lucide-react";

import { RoleManagementPanel, useGroupsStore } from "../modules/groups";

const ROLE_NONE_VALUE = "__role_none__";

interface RolesSettingsSectionProps {
    canManageGroups : boolean;
    selectedGroupId : string | null;
    onSelectedGroupIdChange : ( groupId : string | null ) => void;
    portalContainer ?: HTMLElement | null;
}

export function RolesSettingsSection ( {
    canManageGroups,
    selectedGroupId,
    onSelectedGroupIdChange,
    portalContainer,
} : RolesSettingsSectionProps ) {
    const groups = useGroupsStore( ( state ) => state.groups );
    const isLoading = useGroupsStore( ( state ) => state.isLoading );
    const error = useGroupsStore( ( state ) => state.error );
    const fetchGroups = useGroupsStore( ( state ) => state.fetchGroups );

    const sortedGroups = useMemo( () => groups.slice().sort( ( a, b ) => a.name.localeCompare( b.name ) ), [ groups ] );

    useEffect( () => {
        if ( selectedGroupId && !sortedGroups.some( ( group ) => group.id === selectedGroupId ) ) {
            onSelectedGroupIdChange( null );
        }
    }, [ selectedGroupId, sortedGroups, onSelectedGroupIdChange ] );

    if ( !canManageGroups ) {
        return (
            <Card className="border border-dashed border-border/60 bg-muted/30">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Sign in and connect to manage roles.
                </CardContent>
            </Card>
        );
    }

    if ( isLoading && groups.length === 0 ) {
        return (
            <Card className="border border-border/60 bg-muted/20">
                <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading groups…
                </CardContent>
            </Card>
        );
    }

    if ( error && groups.length === 0 ) {
        return (
            <Card className="border border-destructive/40 bg-destructive/5">
                <CardContent className="space-y-4 py-8 text-center">
                    <CardTitle className="text-base text-destructive">Could not load groups</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{error}</CardDescription>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mx-auto"
                        onClick={() => {
                            void fetchGroups();
                        }}
                    >
                        Try again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if ( sortedGroups.length === 0 ) {
        return (
            <Card className="border border-dashed border-border/60 bg-muted/20">
                <CardContent className="py-10 text-center">
                    <CardTitle className="text-base font-semibold">No groups yet</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                        Create a group from the Groups tab to start defining roles.
                    </CardDescription>
                </CardContent>
            </Card>
        );
    }

    const selectValue = selectedGroupId ?? ROLE_NONE_VALUE;

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-border/60 bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <Label className="text-xs font-medium">Group</Label>
                        <p className="text-[10px] text-muted-foreground">Choose a group to edit its roles.</p>
                    </div>
                    <Shield className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div className="mt-3">
                    <Select
                        value={selectValue}
                        onValueChange={( value ) => {
                            if ( value === ROLE_NONE_VALUE ) {
                                onSelectedGroupIdChange( null );
                                return;
                            }
                            onSelectedGroupIdChange( value );
                        }}
                    >
                        <SelectTrigger className="h-10 w-full text-sm">
                            <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                        <SelectContent container={portalContainer ?? undefined}>
                            <SelectItem value={ROLE_NONE_VALUE}>No group selected</SelectItem>
                            {sortedGroups.map( ( group ) => (
                                <SelectItem key={group.id} value={group.id}>
                                    <div className="flex items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            className="h-3 w-3 rounded-full border border-border"
                                            style={{ backgroundColor: group.color }}
                                        />
                                        <span className="truncate">{group.name}</span>
                                    </div>
                                </SelectItem>
                            ) )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedGroupId ? (
                <RoleManagementPanel
                    groupId={selectedGroupId}
                    onClose={() => onSelectedGroupIdChange( null )}
                />
            ) : (
                <Card className="border border-dashed border-border/60 bg-muted/20">
                    <CardContent className="py-10 text-center">
                        <CardTitle className="text-base font-semibold">Select a group</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                            Pick a group above to view or edit its role definitions.
                        </CardDescription>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
