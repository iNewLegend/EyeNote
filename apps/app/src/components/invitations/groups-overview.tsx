import type { GroupRecord } from "@eye-note/definitions";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@eye-note/ui";
import { Users } from "lucide-react";

interface GroupsOverviewProps {
    groups : GroupRecord[];
    isLoading : boolean;
}

export function GroupsOverview ( { groups, isLoading } : GroupsOverviewProps ) {
    return (
        <Card className="border border-border/60 bg-card/60">
            <CardHeader>
                <CardTitle className="text-lg">Your groups</CardTitle>
                <CardDescription>
                    See where you already collaborate before sharing invites.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 animate-pulse" /> Loading groups…
                    </div>
                ) : groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Join a group with an invite link to see it here.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {groups.map( ( group ) => (
                            <Badge
                                key={group.id}
                                variant="secondary"
                                className="gap-2 rounded-full border border-border/60 bg-secondary/40"
                            >
                                <span
                                    className="h-2 w-2 rounded-full border border-border"
                                    style={{ backgroundColor: group.color }}
                                />
                                {group.name}
                            </Badge>
                        ) )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
