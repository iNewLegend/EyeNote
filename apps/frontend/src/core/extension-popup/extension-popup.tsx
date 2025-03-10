import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AuthDialog } from "../../components/auth-dialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import { toast } from "sonner";
import { Toaster } from "../../components/ui/sonner.tsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card.tsx";
import { Switch } from "../../components/ui/switch.tsx";
import { Label } from "../../components/ui/label.tsx";
import { ThemeProvider } from "../theme/theme-provider";
import { ChromeMessage, ChromeResponse, MockChromeAPI } from "../../types/chrome";
import "./extension-popup.css";

interface User {
    id : string;
    email : string;
    name : string;
    picture : string;
}

interface StorageSettings {
    enabled : boolean;
    notificationSound : boolean;
    showUnreadBadge : boolean;
}

interface StorageData {
    settings : StorageSettings;
    activeGroups : string[];
}

// Development mocks
const DEV_MODE = process.env.NODE_ENV === "development";
const mockStorage : StorageData = {
    settings: {
        enabled: true,
        notificationSound: true,
        showUnreadBadge: true,
    },
    activeGroups: [ "Development Group" ],
};

// Use mock or real Chrome API
const chromeAPI = DEV_MODE ? {
    storage: {
        local: {
            get: <T,>( key : string, callback : ( result : { [key : string] : T } ) => void ) => {
                callback( { [ key ]: mockStorage[ key as keyof typeof mockStorage ] as T } );
            },
            set: ( items : object ) => {
                Object.assign( mockStorage, items );
            },
        },
    },
    runtime: {
        sendMessage: ( message : ChromeMessage, callback ?: ( response : ChromeResponse ) => void ) => {
            if ( callback ) {
                if ( message.type === "GET_AUTH_STATUS" ) {
                    callback( {
                        isAuthenticated: true,
                        user: {
                            id: "dev",
                            email: "dev@example.com",
                            name: "Developer",
                            picture:
                                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCAvE4NQuOnrjboZSCZCOfDv7ry3l4yysuLg&s",
                        },
                    } );
                } else if ( message.type === "SIGN_OUT" ) {
                    callback( { success: true } );
                }
            }
            return Promise.resolve( { success: true } );
        },
    },
} as MockChromeAPI : ( chrome as unknown as MockChromeAPI );

export function ExtensionPopup () {
    const [ settings, setSettings ] = useState<StorageSettings>( {
        enabled: true,
        notificationSound: true,
        showUnreadBadge: true,
    } );

    const [ activeGroups, setActiveGroups ] = useState<string[]>( [] );
    const [ isAuthOpen, setIsAuthOpen ] = useState( false );
    const [ isAuthenticated, setIsAuthenticated ] = useState( false );
    const [ user, setUser ] = useState<User | null>( null );

    useEffect( () => {
        // Load settings
        chromeAPI.storage.local.get<StorageSettings>( "settings", ( result ) => {
            if ( result.settings ) {
                setSettings( result.settings );
            }
        } );

        // Load active groups
        chromeAPI.storage.local.get<string[]>( "activeGroups", ( result ) => {
            if ( result.activeGroups ) {
                setActiveGroups( result.activeGroups );
            }
        } );

        // Check authentication status
        chromeAPI.runtime.sendMessage( { type: "GET_AUTH_STATUS" }, ( response ) => {
            setIsAuthenticated( !!response.isAuthenticated );
            setUser( response.user || null );
        } );
    }, [] );

    const handleSignOut = async () => {
        try {
            const response = await chromeAPI.runtime.sendMessage( { type: "SIGN_OUT" } );
            if ( response.success ) {
                setIsAuthenticated( false );
                setUser( null );
                toast( "Signed out", {
                    description: "You have been successfully signed out",
                } );
            }
        } catch ( error ) {
            toast( "Error", {
                description: "Failed to sign out. Please try again.",
            } );
        }
    };

    const toggleSetting = ( key : keyof typeof settings ) => {
        const newSettings = {
            ...settings,
            [ key ]: !settings[ key ],
        };
        setSettings( newSettings );
        chromeAPI.storage.local.set( { settings: newSettings } );
    };

    return (
        <>
            <Toaster />
            <Card className="w-[350px] h-[500px] border-none shadow-none rounded-none bg-background overflow-hidden flex flex-col">
                <CardHeader className="pb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                                EyeNote
                            </CardTitle>
                            {isAuthenticated && user && (
                                <CardDescription className="text-sm">{user.name}</CardDescription>
                            )}
                        </div>
                        {isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                {user?.picture && (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full ring-1 ring-border"
                                    />
                                )}
                                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                                    Sign Out
                                </Button>
                            </div>
                        ) : (
                            <Button variant="default" size="sm" onClick={() => setIsAuthOpen( true )}>
                                Sign In
                            </Button>
                        )}
                    </div>
                </CardHeader>

                {isAuthenticated ? (
                    <CardContent className="p-6 space-y-8 flex-1 overflow-auto">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold">Settings</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between space-x-4">
                                    <Label
                                        htmlFor="enable-notes"
                                        className="flex-1 text-sm font-normal"
                                    >
                                        Enable Notes
                                    </Label>
                                    <Switch
                                        id="enable-notes"
                                        checked={settings.enabled}
                                        onCheckedChange={() => toggleSetting( "enabled" )}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-4">
                                    <Label
                                        htmlFor="notification-sound"
                                        className="flex-1 text-sm font-normal"
                                    >
                                        Notification Sound
                                    </Label>
                                    <Switch
                                        id="notification-sound"
                                        checked={settings.notificationSound}
                                        onCheckedChange={() => toggleSetting( "notificationSound" )}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-4">
                                    <Label
                                        htmlFor="unread-badge"
                                        className="flex-1 text-sm font-normal"
                                    >
                                        Show Unread Badge
                                    </Label>
                                    <Switch
                                        id="unread-badge"
                                        checked={settings.showUnreadBadge}
                                        onCheckedChange={() => toggleSetting( "showUnreadBadge" )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold">Active Groups</h2>
                            </div>
                            {activeGroups.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No active groups. Join a group to start collaborating!
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activeGroups.map( ( group ) => (
                                        <div
                                            key={group}
                                            className="flex items-center p-2 bg-secondary/50 rounded-md text-sm"
                                        >
                                            <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                                            {group}
                                        </div>
                                    ) )}
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                            <div className="flex gap-3 items-start">
                                <div className="p-1.5 bg-primary/20 rounded-md">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-primary"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4" />
                                        <path d="M12 8h.01" />
                                    </svg>
                                </div>
                                <p className="text-sm text-primary-foreground/80">
                                    Hold{" "}
                                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono border rounded-md bg-muted">
                                        SHIFT
                                    </kbd>{" "}
                                    + Click to create a note on any webpage element.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                ) : (
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
                        <div className="space-y-8 text-center">
                            <div className="space-y-6">
                                <div className="mx-auto w-fit">
                                    <img
                                        src="/icons/icon.svg"
                                        alt="EyeNote Logo"
                                        className="w-24 h-24 animate-in zoom-in duration-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold">Welcome to EyeNote</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Sign in to start creating and sharing notes across the web.
                                    </p>
                                </div>
                            </div>
                            <Button size="lg" onClick={() => setIsAuthOpen( true )}>
                                Get Started
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen( false )} />
        </>
    );
}

// Mount the app
console.log( "Popup mounting..." );

try {
    const rootElement = document.getElementById( "root" );
    console.log( "Found root element:", rootElement );

    if ( !rootElement ) {
        throw new Error( "Root element not found" );
    }

    const root = createRoot( rootElement );
    console.log( "Created React root" );

    root.render(
        <React.StrictMode>
            <ThemeProvider defaultTheme="dark">
                <ExtensionPopup />
                <Toaster />
            </ThemeProvider>
        </React.StrictMode>
    );

    console.log( "Rendered React app" );
} catch ( error ) {
    console.error( "Error mounting React app:", error );
}
