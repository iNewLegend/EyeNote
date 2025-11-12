import React from "react";
import { CreateGroupForm } from "./create-group-form";
import { JoinGroupForm } from "./join-group-form";
import { ActiveGroupsList } from "./active-groups-list";

export function GroupsManagementSection () {
    return (
        <>
            <div className="space-y-4">
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Manage groups</h2>
                    <p className="text-sm text-muted-foreground">
                        Create a new collaboration group or join an existing team with an invite
                        code.
                    </p>
                </div>
                <CreateGroupForm />
                <JoinGroupForm />
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Groups</h2>
                    <p className="text-sm text-muted-foreground">
                        Active groups sync automatically here. Use the menu dialog to open
                        the full manager inside your current tab.
                    </p>
                </div>
                <ActiveGroupsList />
            </div>
        </>
    );
}

