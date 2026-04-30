/**
 * SafeNet Background Service Worker
 * Handles notifications and background tasks
 */

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showNotification') {
    showNotification(message.title, message.message);
    sendResponse({ success: true });
  }
  
  if (message.action === 'toxicityDetected') {
    // Log to console (in production, send to API)
    console.log(`[SafeNet] Toxicity detected: ${message.count} words on ${message.url}`);
    
    // Show notification for significant detection
    if (message.count >= 3) {
      showNotification(
        'SafeNet Alert',
        `Detected ${message.count} toxic words on this page`
      );
    }
    
    sendResponse({ success: true });
  }
  
  return true;
});

/**
 * Show browser notification
 */
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SafeNet] Extension installed');
  
  // Set default settings
  chrome.storage.local.set({
    enabled: true,
    highlightsEnabled: true,
    sensitivity: 'medium'
  });
});