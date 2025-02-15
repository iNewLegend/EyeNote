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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_AUTH_STATUS") {
    chrome.storage.local.get("authToken", (result) => {
      sendResponse({ isAuthenticated: !!result.authToken });
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
