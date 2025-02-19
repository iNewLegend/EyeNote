// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("Extension installed");
    } else if (details.reason === "update") {
        console.log("Extension updated");
    }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("Message received:", message);

    // Handle different message types
    switch (message.type) {
        case "SIGN_IN":
            // Handle sign in
            sendResponse({ success: true });
            break;
        case "SIGN_OUT":
            // Handle sign out
            sendResponse({ success: true });
            break;
        default:
            console.warn("Unknown message type:", message.type);
            sendResponse({ success: false, error: "Unknown message type" });
    }

    // Return true to indicate we will send a response asynchronously
    return true;
});
