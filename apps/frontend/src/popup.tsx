import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { AuthDialog } from "./components/auth-dialog";
import { Button } from "./components/ui/button";
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
    <div className="popup">
      <div className="flex items-center justify-between mb-4">
        <h1>EyeNote</h1>
        {!isAuthenticated && (
          <Button onClick={() => setIsAuthOpen(true)}>Sign In</Button>
        )}
      </div>

      {isAuthenticated ? (
        <>
          <div className="settings">
            <h2>Settings</h2>
            <label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={() => toggleSetting("enabled")}
              />
              Enable Notes
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.notificationSound}
                onChange={() => toggleSetting("notificationSound")}
              />
              Notification Sound
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.showUnreadBadge}
                onChange={() => toggleSetting("showUnreadBadge")}
              />
              Show Unread Badge
            </label>
          </div>

          <div className="groups">
            <h2>Active Groups</h2>
            {activeGroups.length === 0 ? (
              <p>No active groups. Join a group to start collaborating!</p>
            ) : (
              <ul>
                {activeGroups.map((group) => (
                  <li key={group}>{group}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="instructions">
            <p>Hold SHIFT + Click to create a note on any webpage element.</p>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Sign in to start creating and sharing notes across the web.
          </p>
          <Button onClick={() => setIsAuthOpen(true)}>Get Started</Button>
        </div>
      )}

      <AuthDialog isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Popup />);
