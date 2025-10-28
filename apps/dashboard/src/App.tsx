import { useMemo, useState } from "react";
import { RefreshCw, Users } from "lucide-react";

import {
    Badge,
    Button,
    Label,
    Switch,
    SettingsSurface,
    type SettingsDialogItem,
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
        <div className="flex items-center justify-between space-x-4 rounded-lg border border-border/60 bg-background/60 px-4 py-3">
            <div className="space-y-1">
                <Label htmlFor={`settings-${ descriptor.key }`} className="text-sm font-medium">
                    {descriptor.label}
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {descriptor.description}
                </p>
            </div>
            <Switch
                id={`settings-${ descriptor.key }`}
                checked={value}
                onCheckedChange={onChange}
            />
        </div>
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
    const [ activeSection, setActiveSection ] = useState( "general" );

    const generalContent = useMemo(
        () => (
            <div className="space-y-4">
                {settingDescriptors.map( ( descriptor ) => (
                    <SettingToggle
                        key={descriptor.key}
                        descriptor={descriptor}
                        value={settings[ descriptor.key ]}
                        onChange={( next ) => setSetting( descriptor.key, next )}
                    />
                ) )}
                <ResetBanner onReset={resetSettings} />
            </div>
        ),
        [ resetSettings, setSetting, settings ]
    );

    const collaborationContent = useMemo(
        () => (
            <div className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-2 text-foreground">
                    <div className="flex items-center gap-2 text-base font-semibold">
                        <Users className="h-4 w-4" />
                        Manage collaboration groups
                    </div>
                    <p>
                        We&apos;re moving group management into the dashboard so you can configure
                        invites and roles without the browser extension.
                    </p>
                </div>
                <ul className="space-y-3">
                    {collaborationHighlights.map( ( item ) => (
                        <li key={item} className="flex items-start gap-2">
                            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{item}</span>
                        </li>
                    ) )}
                </ul>
                <div className="flex flex-wrap items-center gap-2 text-sm">
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
            </div>
        ),
        []
    );

    const settingsItems = useMemo<SettingsDialogItem[]>(
        () => [
            {
                id: "general",
                label: "General",
                description: "Configure overlay preferences and notifications.",
                content: generalContent,
            },
            {
                id: "collaboration",
                label: "Collaboration",
                description: "Preview the upcoming shared group manager experience.",
                content: (
                    <div className="space-y-4">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                            Coming soon
                        </Badge>
                        {collaborationContent}
                    </div>
                ),
            },
        ],
        [ collaborationContent, generalContent ]
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="container flex min-h-screen flex-col gap-10 py-12">
                <DashboardHeader />
                <SettingsSurface
                    title="Extension settings"
                    description="Manage overlay behavior and collaboration options without launching the extension."
                    items={settingsItems}
                    selectedItemId={activeSection}
                    onSelectedItemChange={setActiveSection}
                />
            </div>
            <Toaster position="top-right" />
        </div>
    );
}

export default DashboardApp;
