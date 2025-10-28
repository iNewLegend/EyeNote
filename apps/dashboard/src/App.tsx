import { useMemo, useState } from "react";
import { RefreshCw, Settings as SettingsIcon, Users } from "lucide-react";

import {
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Label,
    Switch,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Toaster,
    toast,
} from "@eye-note/ui";

import { useDashboardSettings, type DashboardSettings } from "./hooks/use-dashboard-settings";

type SettingDescriptor = {
    key : keyof DashboardSettings;
    label : string;
    description : string;
};

const settingDescriptors : SettingDescriptor[] = [
    {
        key: "enabled",
        label: "Enable overlay",
        description: "Keep the EyeNote overlay available on supported pages.",
    },
    {
        key: "notificationSound",
        label: "Notification sound",
        description: "Play a chime when collaborators leave a new note.",
    },
    {
        key: "showUnreadBadge",
        label: "Show unread badge",
        description: "Display an unread indicator on the overlay launcher when updates arrive.",
    },
];

const collaborationHighlights = [
    "Create and join collaboration groups in the browser dashboard.",
    "Manage invitations, member roles, and default channels without opening the extension.",
    "Centralize team onboarding by sharing a single dashboard link.",
];

function SettingToggle ( {
    descriptor,
    value,
    onChange,
} : {
    descriptor : SettingDescriptor;
    value : boolean;
    onChange : ( value : boolean ) => void;
} ) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4">
            <div className="space-y-1">
                <Label htmlFor={`settings-${ descriptor.key }`} className="text-sm font-medium">
                    {descriptor.label}
                </Label>
                <p className="text-sm text-muted-foreground">{descriptor.description}</p>
            </div>
            <Switch
                id={`settings-${ descriptor.key }`}
                checked={value}
                onCheckedChange={onChange}
            />
        </div>
    );
}

function CollaborationCard () {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5" />
                        Collaboration groups
                    </CardTitle>
                    <CardDescription>
                        Manage invites, ownership, and workspace alignment without depending on the
                        browser extension.
                    </CardDescription>
                </div>
                <Badge variant="secondary">Coming soon</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm text-muted-foreground">
                    {collaborationHighlights.map( ( item ) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{item}</span>
                        </li>
                    ) )}
                </ul>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        onClick={() =>
                            toast( {
                                title: "Groups dashboard",
                                description:
                                    "We are bringing group management to the standalone dashboard—stay tuned!",
                            } )
                        }
                    >
                        Notify me
                    </Button>
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() =>
                            toast( {
                                title: "Switching to dashboard",
                                description:
                                    "Settings you configure here will sync once the dashboard connects to EyeNote Cloud.",
                            } )
                        }
                    >
                        Learn more
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function GeneralSettingsCard ( {
    settings,
    setSetting,
} : {
    settings : DashboardSettings;
    setSetting : ( key : keyof DashboardSettings, value : boolean ) => void;
} ) {
    return (
        <Card>
            <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <SettingsIcon className="h-5 w-5" />
                    Overlay preferences
                </CardTitle>
                <CardDescription>
                    Control how EyeNote behaves in the browser, independent of the extension popup.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {settingDescriptors.map( ( descriptor ) => (
                    <SettingToggle
                        key={descriptor.key}
                        descriptor={descriptor}
                        value={settings[ descriptor.key ]}
                        onChange={( next ) => setSetting( descriptor.key, next )}
                    />
                ) )}
            </CardContent>
        </Card>
    );
}

function ResetBanner ( {
    onReset,
} : {
    onReset : () => void;
} ) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/40 p-4">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold">Reset dashboard settings</h3>
                <p className="text-sm text-muted-foreground">
                    Restore the default configuration for the standalone dashboard.
                </p>
            </div>
            <Button
                type="button"
                variant="outline"
                onClick={() => {
                    onReset();
                    toast( {
                        title: "Settings reset",
                        description: "Dashboard preferences have been restored to defaults.",
                    } );
                }}
            >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
            </Button>
        </div>
    );
}

const DashboardHeader = () => (
    <header className="space-y-3 text-center md:text-left">
        <Badge variant="outline" className="bg-primary/10 text-primary">
            Experimental
        </Badge>
        <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                EyeNote Dashboard
            </h1>
            <p className="text-base text-muted-foreground">
                Configure collaboration and overlay preferences from a standalone web experience.
            </p>
        </div>
    </header>
);

function DashboardApp () {
    const { settings, setSetting, resetSettings } = useDashboardSettings();
    const [ activeTab, setActiveTab ] = useState( "general" );

    const generalCard = useMemo(
        () => (
            <GeneralSettingsCard settings={settings} setSetting={setSetting} />
        ),
        [ settings, setSetting ]
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="container flex min-h-screen flex-col gap-10 py-12">
                <DashboardHeader />
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid grid-cols-2 gap-2">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="space-y-6">
                        {generalCard}
                        <ResetBanner onReset={resetSettings} />
                    </TabsContent>
                    <TabsContent value="collaboration" className="space-y-6">
                        <CollaborationCard />
                    </TabsContent>
                </Tabs>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}

export default DashboardApp;
