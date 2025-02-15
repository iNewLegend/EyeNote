// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Set default settings
    chrome.storage.local.set({
      activeGroups: [],
      settings: {
        enabled: true,
        notificationSound: true,
        showUnreadBadge: true,
      },
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_ACTIVE_GROUPS") {
    chrome.storage.local.get("activeGroups", (result) => {
      sendResponse(result.activeGroups || []);
    });
    return true; // Will respond asynchronously
  }
});

// Update badge when there are unread notes
chrome.runtime.onMessage.addListener((message) => {
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
