/**
 * SafeNet Content Script
 * Scans webpage text and highlights toxic words
 */

// Toxic words list (synced with backend)
const TOXIC_WORDS = [
  'idiot', 'stupid', 'dumb', 'moron', 'imbecile', 'fool', 'loser', 
  'pathetic', 'worthless', 'trash', 'hate', 'kill', 'die', 'death',
  'murder', 'rape', 'abuse', 'violent', 'attack', 'ugly', 'fat',
  'disgusting', 'gross', 'creep', 'freak', 'weirdo', 'racist', 
  'sexist', 'homophobic', 'nazi', 'fascist', 'threat', 'harm', 
  'hurt', 'destroy', 'ruin', 'stfu', 'kys', 'retard', 'psycho',
  'crazy', 'insane', 'schizo'
];

let highlightsVisible = true;
let overlayShown = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getPageText':
      sendResponse({ text: getPageText() });
      return true;
      
    case 'highlightWords':
      highlightToxicWords(message.words);
      sendResponse({ success: true });
      return true;
      
    case 'toggleHighlights':
      highlightsVisible = message.enabled;
      toggleHighlightVisibility();
      sendResponse({ success: true });
      return true;
      
    case 'showOverlay':
      showOverlay();
      sendResponse({ success: true });
      return true;
  }
});

/**
 * Get visible text content from the page
 */
function getPageText() {
  // Get text from main content areas
  const selectors = [
    'article', 'main', '[role="main"]',
    '.post-content', '.tweet-text', '.comment-text',
    '.message-content', '.post-text', 'p', 'div'
  ];
  
  let text = '';
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      // Skip script and style tags
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
      const elText = el.textContent?.trim();
      if (elText && elText.length > 10) {
        text += elText + ' ';
      }
    });
    
    // If we got enough text, stop
    if (text.length > 3000) break;
  }
  
  return text.substring(0, 10000); // Limit size
}

/**
 * Highlight toxic words on the page
 */
function highlightToxicWords(words) {
  // Clear existing highlights first
  clearHighlights();
  
  if (!words || words.length === 0) return;
  
  // Find text nodes and highlight matches
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, and already highlighted elements
        if (node.parentElement.tagName === 'SCRIPT' ||
            node.parentElement.tagName === 'STYLE' ||
            node.parentElement.classList.contains('safenet-highlight') ||
            node.parentElement.closest('.safenet-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Only process nodes that contain toxic words
        const text = node.textContent.toLowerCase();
        if (words.some(w => text.includes(w.toLowerCase()))) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  const nodesToProcess = [];
  let node;
  while (node = walker.nextNode()) {
    nodesToProcess.push(node);
  }
  
  // Process each node
  nodesToProcess.forEach(textNode => {
    const originalText = textNode.textContent;
    const wordsToHighlight = words.filter(w => 
      originalText.toLowerCase().includes(w.toLowerCase())
    );
    
    if (wordsToHighlight.length === 0) return;
    
    // Create a fragment with highlighted words
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    const regex = new RegExp(`\\b(${wordsToHighlight.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(originalText)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(originalText.slice(lastIndex, match.index)));
      }
      
      // Add highlighted word
      const mark = document.createElement('mark');
      mark.className = 'safenet-highlight';
      mark.textContent = match[0];
      fragment.appendChild(mark);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < originalText.length) {
      fragment.appendChild(document.createTextNode(originalText.slice(lastIndex)));
    }
    
    // Replace original node
    textNode.parentNode.replaceChild(fragment, textNode);
  });
  
  // Show overlay if high severity
  if (words.length >= 3 && !overlayShown) {
    showOverlay();
    overlayShown = true;
  }
}

/**
 * Clear all highlights
 */
function clearHighlights() {
  document.querySelectorAll('.safenet-highlight').forEach(mark => {
    const textNode = document.createTextNode(mark.textContent);
    mark.parentNode.replaceChild(textNode, mark);
  });
  
  // Normalize text nodes
  document.body.normalize();
}

/**
 * Toggle highlight visibility
 */
function toggleHighlightVisibility() {
  document.querySelectorAll('.safenet-highlight').forEach(mark => {
    mark.style.backgroundColor = highlightsVisible ? 'rgba(239, 68, 68, 0.3)' : 'transparent';
  });
}

/**
 * Show warning overlay
 */
function showOverlay() {
  // Check if overlay already exists
  if (document.getElementById('safenet-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'safenet-overlay';
  overlay.innerHTML = `
    <div class="safenet-overlay-content">
      <div class="safenet-overlay-icon">⚠️</div>
      <div class="safenet-overlay-title">Harmful Content Detected</div>
      <div class="safenet-overlay-text">
        SafeNet has detected potentially abusive or toxic language on this page.
        Please proceed with caution.
      </div>
      <button class="safenet-overlay-close" onclick="this.closest('#safenet-overlay').remove()">
        I Understand
      </button>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

// Auto-scan on page load (lightweight)
setTimeout(() => {
  const pageText = getPageText().toLowerCase();
  const toxicCount = TOXIC_WORDS.filter(w => pageText.includes(w)).length;
  
  // If significant toxicity found, notify background
  if (toxicCount >= 2) {
    chrome.runtime.sendMessage({
      action: 'toxicityDetected',
      count: toxicCount,
      url: window.location.href
    });
  }
}, 2000);