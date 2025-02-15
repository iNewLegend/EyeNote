import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { AuthDialog } from "./components/auth-dialog";
import { Button } from "./components/ui/button";
import { ToastContextProvider } from "./components/ui/toast-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Switch } from "./components/ui/switch";
import { Label } from "./components/ui/label";
import "./popup.css";

function Popup() {
  const [settings, setSettings] = useState({
    enabled: true,
    notificationSound: true,
    showUnreadBadge: true,
  });

  const [activeGroups, setActiveGroups] = useState<string[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load settings
    chrome.storage.local.get("settings", (result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
    });

    // Load active groups
    chrome.storage.local.get("activeGroups", (result) => {
      if (result.activeGroups) {
        setActiveGroups(result.activeGroups);
      }
    });

    // Check authentication status
    chrome.storage.local.get("authToken", (result) => {
      setIsAuthenticated(!!result.authToken);
    });
  }, []);

  const toggleSetting = (key: keyof typeof settings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(newSettings);
    chrome.storage.local.set({ settings: newSettings });
  };

  return (
    <ToastContextProvider>
      <Card className="w-[350px] border-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
              EyeNote
            </CardTitle>
            {!isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuthOpen(true)}
              >
                Sign In
              </Button>
            )}
          </div>
        </CardHeader>

        {isAuthenticated ? (
          <CardContent className="space-y-6">
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
    </ToastContextProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Popup />);
