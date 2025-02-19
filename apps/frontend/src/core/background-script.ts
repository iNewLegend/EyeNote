// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(() => {
    // Initialize default settings
    chrome.storage.local.set({
        settings: {
            enabled: true,
            notificationSound: true,
            showUnreadBadge: true,
        },
        activeGroups: [],
    });
});

// Handle Google authentication
async function handleGoogleAuth(token: string) {
    try {
        // Fetch user info using the access token
        const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error("Failed to fetch user info:", await response.text());
            throw new Error(`Failed to fetch user info: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("User info received:", data);

        if (!data.sub || !data.email || !data.name) {
            throw new Error("Invalid user info received");
        }

        // Store the auth token and user info
        await chrome.storage.local.set({
            authToken: token,
            user: {
                id: data.sub,
                email: data.email,
                name: data.name,
                picture: data.picture || null,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Google auth error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Authentication failed",
        };
    }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_AUTH_STATUS") {
        chrome.storage.local.get(["authToken", "user"], (result) => {
            sendResponse({
                isAuthenticated: !!result.authToken,
                user: result.user,
            });
        });
        return true; // Will respond asynchronously
    }

    if (message.type === "GOOGLE_AUTH") {
        if (!message.token) {
            sendResponse({ success: false, error: "No token provided" });
            return true;
        }
        handleGoogleAuth(message.token).then(sendResponse);
        return true; // Will respond asynchronously
    }

    if (message.type === "SIGN_OUT") {
        chrome.identity.clearAllCachedAuthTokens().then(() => {
            chrome.storage.local.remove(["authToken", "user"], () => {
                sendResponse({ success: true });
            });
        });
        return true; // Will respond asynchronously
    }

    if (message.type === "UPDATE_BADGE") {
        const count = message.count;
        if (count > 0) {
            chrome.action.setBadgeText({ text: count.toString() });
            chrome.action.setBadgeBackgroundColor({ color: "#646cff" });
        } else {
            chrome.action.setBadgeText({ text: "" });
        }
    }
});
