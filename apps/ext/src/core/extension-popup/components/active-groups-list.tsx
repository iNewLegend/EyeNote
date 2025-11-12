import React, { useMemo } from "react";
import { useGroupsStore } from "../../../modules/groups";

export function ActiveGroupsList () {
    const groups = useGroupsStore( ( state ) => state.groups );
    const activeGroupIds = useGroupsStore( ( state ) => state.activeGroupIds );

    const activeGroups = useMemo( () => {
        const activeSet = new Set( activeGroupIds );
        return groups.filter( ( group ) => activeSet.has( group.id ) );
    }, [ activeGroupIds, groups ] );

    return (
        <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Active groups
            </h3>
            {activeGroups.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                    No active groups right now. Use the in-page manager to enable
                    groups for your session.
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {activeGroups.map( ( group ) => (
                        <span
                            key={group.id}
                            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs"
                        >
                            <span
                                className="h-2 w-2 rounded-full border border-border/60"
                                style={{ backgroundColor: group.color }}
                            />
                            {group.name}
                        </span>
                    ) )}
                </div>
            )}
        </div>
    );
}

