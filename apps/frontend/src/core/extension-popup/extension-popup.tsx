import { useState, useEffect } from "react";
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
import "./extension-popup.css";

interface User {
    id: string;
    email: string;
    name: string;
    picture: string;
}

// Development mocks
const DEV_MODE = process.env.NODE_ENV === "development";
const mockStorage = {
    settings: {
        enabled: true,
        notificationSound: true,
        showUnreadBadge: true,
    },
    activeGroups: ["Development Group"],
};

const mockChromeAPI = {
    storage: {
        local: {
            get: (key: string, callback: (result: any) => void) => {
                callback({ [key]: mockStorage[key as keyof typeof mockStorage] });
            },
            set: (items: object) => {
                Object.assign(mockStorage, items);
            },
        },
    },
    runtime: {
        sendMessage: (message: any, callback?: (response: any) => void) => {
            if (callback) {
                if (message.type === "GET_AUTH_STATUS") {
                    callback({
                        isAuthenticated: true,
                        user: {
                            id: "dev",
                            email: "dev@example.com",
                            name: "Developer",
                            picture: "https://via.placeholder.com/40",
                        },
                    });
                } else if (message.type === "SIGN_OUT") {
                    callback({ success: true });
                }
            }
            return Promise.resolve({ success: true });
        },
    },
};

// Use mock or real Chrome API
const chromeAPI = DEV_MODE ? mockChromeAPI : chrome;

export function ExtensionPopup() {
    const [settings, setSettings] = useState({
        enabled: true,
        notificationSound: true,
        showUnreadBadge: true,
    });

    const [activeGroups, setActiveGroups] = useState<string[]>([]);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Load settings
        chromeAPI.storage.local.get("settings", (result) => {
            if (result.settings) {
                setSettings(result.settings);
            }
        });

        // Load active groups
        chromeAPI.storage.local.get("activeGroups", (result) => {
            if (result.activeGroups) {
                setActiveGroups(result.activeGroups);
            }
        });

        // Check authentication status
        chromeAPI.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response) => {
            setIsAuthenticated(response.isAuthenticated);
            setUser(response.user || null);
        });
    }, []);

    const handleSignOut = async () => {
        try {
            const response = await chromeAPI.runtime.sendMessage({ type: "SIGN_OUT" });
            if (response.success) {
                setIsAuthenticated(false);
                setUser(null);
                toast("Signed out", {
                    description: "You have been successfully signed out",
                });
            }
        } catch (error) {
            toast("Error", {
                description: "Failed to sign out. Please try again.",
            });
        }
    };

    const toggleSetting = (key: keyof typeof settings) => {
        const newSettings = {
            ...settings,
            [key]: !settings[key],
        };
        setSettings(newSettings);
        chromeAPI.storage.local.set({ settings: newSettings });
    };

    return (
        <>
            <Toaster />
            <Card className="w-full h-full border-none shadow-none rounded-none bg-background">
                <CardHeader className="pb-4 bg-background sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                            EyeNote
                        </CardTitle>
                        {isAuthenticated ? (
                            <div className="flex items-center gap-2">
                                {user?.picture && (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                )}
                                <Button variant="outline" size="sm" onClick={handleSignOut}>
                                    Sign Out
                                </Button>
                            </div>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setIsAuthOpen(true)}>
                                Sign In
                            </Button>
                        )}
                    </div>
                    {isAuthenticated && user && (
                        <CardDescription className="mt-2">Signed in as {user.name}</CardDescription>
                    )}
                </CardHeader>

                {isAuthenticated ? (
                    <CardContent className="space-y-6 pb-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Settings</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="enable-notes" className="flex-1">
                                        Enable Notes
                                    </Label>
                                    <Switch
                                        id="enable-notes"
                                        checked={settings.enabled}
                                        onCheckedChange={() => toggleSetting("enabled")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="notification-sound" className="flex-1">
                                        Notification Sound
                                    </Label>
                                    <Switch
                                        id="notification-sound"
                                        checked={settings.notificationSound}
                                        onCheckedChange={() => toggleSetting("notificationSound")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="unread-badge" className="flex-1">
                                        Show Unread Badge
                                    </Label>
                                    <Switch
                                        id="unread-badge"
                                        checked={settings.showUnreadBadge}
                                        onCheckedChange={() => toggleSetting("showUnreadBadge")}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Active Groups</h2>
                            {activeGroups.length === 0 ? (
                                <CardDescription>
                                    No active groups. Join a group to start collaborating!
                                </CardDescription>
                            ) : (
                                <div className="space-y-2">
                                    {activeGroups.map((group) => (
                                        <div
                                            key={group}
                                            className="p-2 bg-secondary rounded-md text-sm font-medium"
                                        >
                                            {group}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-md bg-primary/10 border border-primary/20 p-3">
                            <p className="text-sm text-muted-foreground">
                                Hold SHIFT + Click to create a note on any webpage element.
                            </p>
                        </div>
                    </CardContent>
                ) : (
                    <CardContent className="text-center py-6">
                        <CardDescription className="text-base mb-6">
                            Sign in to start creating and sharing notes across the web.
                        </CardDescription>
                        <Button onClick={() => setIsAuthOpen(true)}>Get Started</Button>
                    </CardContent>
                )}
            </Card>

            <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </>
    );
}
