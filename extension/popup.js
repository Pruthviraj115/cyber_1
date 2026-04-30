/**
 * SafeNet Popup Script
 * Handles popup UI interactions and communication with content script
 */

const API_BASE = 'http://localhost:5000/api';

// DOM Elements
const scanBtn = document.getElementById('scan-btn');
const resultsDiv = document.getElementById('results');
const resultContent = document.getElementById('result-content');
const scoreText = document.getElementById('score-text');
const scoreCircle = document.getElementById('score-circle');
const statusIndicator = document.getElementById('status-indicator');
const toggleHighlightBtn = document.getElementById('toggle-highlight');
const openDashboardBtn = document.getElementById('open-dashboard');

// State
let highlightsEnabled = true;
let currentResults = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  scanBtn.addEventListener('click', scanPage);
  toggleHighlightBtn.addEventListener('click', toggleHighlights);
  openDashboardBtn.addEventListener('click', openDashboard);
  
  // Auto-scan on open
  scanPage();
});

/**
 * Scan the current page for threats
 */
async function scanPage() {
  scanBtn.disabled = true;
  scanBtn.classList.add('loading');
  scanBtn.innerHTML = '<span class="scan-icon">⏳</span> Scanning...';
  
  try {
    // Get page text from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageText' });
    
    if (!response || !response.text) {
      showNoContent();
      return;
    }
    
    // Send to API for analysis
    const analysisResult = await analyzeText(response.text);
    currentResults = analysisResult;
    
    // Update UI
    updateScore(analysisResult);
    updateStatus(analysisResult);
    showResults(analysisResult);
    
    // Send highlight command to content script
    if (highlightsEnabled && analysisResult.toxic_words_found?.length > 0) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'highlightWords',
        words: analysisResult.toxic_words_found.map(w => w.word)
      });
    }
    
  } catch (error) {
    console.error('Scan error:', error);
    showError(error.message);
  } finally {
    scanBtn.disabled = false;
    scanBtn.classList.remove('loading');
    scanBtn.innerHTML = '<span class="scan-icon">🔍</span> Scan This Page';
  }
}

/**
 * Analyze text via API (with fallback to local analysis)
 */
async function analyzeText(text) {
  try {
    const response = await fetch(`${API_BASE}/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.substring(0, 5000) }) // Limit for performance
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log('API unavailable, using local analysis');
  }
  
  // Fallback: Local simple analysis
  return localAnalysis(text);
}

/**
 * Local fallback analysis (basic keyword matching)
 */
function localAnalysis(text) {
  const toxicWords = ['stupid', 'idiot', 'hate', 'ugly', 'loser', 'worthless', 
                      'pathetic', 'dumb', 'moron', 'kill', 'die', 'trash',
                      'freak', 'creep', 'disgusting', 'retard', 'psycho'];
  
  const textLower = text.toLowerCase();
  const found = toxicWords.filter(w => textLower.includes(w));
  
  const threatDetected = found.length > 0;
  const confidence = Math.min(found.length * 0.2, 1);
  
  return {
    threat_detected: threatDetected,
    category: threatDetected ? 'CYBERBULLYING' : 'SAFE',
    severity: confidence > 0.6 ? 'HIGH' : confidence > 0.3 ? 'MEDIUM' : 'LOW',
    confidence: confidence,
    toxic_words_found: found.map(w => ({ word: w, severity: 0.6 })),
    suggestion: threatDetected ? 'Try to be respectful in your communication.' : null
  };
}

/**
 * Update the safety score display
 */
function updateScore(result) {
  const score = Math.round((1 - result.confidence) * 100);
  scoreText.textContent = score + '%';
  
  // Update circle stroke
  const circumference = 283; // 2 * π * 45
  const offset = circumference - (score / 100) * circumference;
  scoreCircle.style.strokeDashoffset = offset;
  
  // Update color based on score
  if (score >= 80) {
    scoreCircle.style.stroke = '#10B981';
    scoreText.style.color = '#10B981';
  } else if (score >= 50) {
    scoreCircle.style.stroke = '#F59E0B';
    scoreText.style.color = '#F59E0B';
  } else {
    scoreCircle.style.stroke = '#EF4444';
    scoreText.style.color = '#EF4444';
  }
}

/**
 * Update the status badge
 */
function updateStatus(result) {
  if (!result.threat_detected) {
    statusIndicator.className = 'status-badge safe';
    statusIndicator.innerHTML = '<span class="status-dot"></span>Safe';
  } else if (result.severity === 'HIGH') {
    statusIndicator.className = 'status-badge danger';
    statusIndicator.innerHTML = '<span class="status-dot"></span>Danger';
  } else {
    statusIndicator.className = 'status-badge warning';
    statusIndicator.innerHTML = '<span class="status-dot"></span>Warning';
  }
}

/**
 * Display scan results
 */
function showResults(result) {
  resultsDiv.classList.remove('hidden');
  
  if (!result.threat_detected) {
    resultContent.innerHTML = `
      <div class="no-threats">
        <div class="no-threats-icon">✅</div>
        <div class="no-threats-text">No Threats Detected</div>
        <div class="no-threats-sub">This page appears to be safe</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  // Show toxic words found
  if (result.toxic_words_found?.length > 0) {
    result.toxic_words_found.forEach(word => {
      html += `
        <div class="result-item">
          <span class="result-icon">⚠️</span>
          <div class="result-info">
            <div class="result-type" style="color: #EF4444;">Toxic Word</div>
            <div class="result-detail">"${word.word}" detected with ${Math.round(word.severity * 100)}% severity</div>
          </div>
          <span class="result-severity severity-${word.severity >= 0.8 ? 'high' : word.severity >= 0.5 ? 'medium' : 'low'}">
            ${word.severity >= 0.8 ? 'HIGH' : word.severity >= 0.5 ? 'MED' : 'LOW'}
          </span>
        </div>
      `;
    });
  }
  
  // Show suggestion
  if (result.suggestion) {
    html += `<div class="suggestion-box">${result.suggestion}</div>`;
  }
  
  resultContent.innerHTML = html;
  
  // Show browser notification for high severity
  if (result.severity === 'HIGH') {
    chrome.runtime.sendMessage({
      action: 'showNotification',
      title: 'SafeNet Alert',
      message: 'High severity cyberbullying content detected on this page!'
    });
  }
}

/**
 * Show error state
 */
function showError(message) {
  resultsDiv.classList.remove('hidden');
  resultContent.innerHTML = `
    <div class="no-threats">
      <div class="no-threats-icon">❌</div>
      <div class="no-threats-text" style="color: #EF4444;">Scan Failed</div>
      <div class="no-threats-sub">${message || 'Unable to scan this page'}</div>
    </div>
  `;
}

/**
 * Show no content state
 */
function showNoContent() {
  resultsDiv.classList.remove('hidden');
  resultContent.innerHTML = `
    <div class="no-threats">
      <div class="no-threats-icon">📄</div>
      <div class="no-threats-text">No Text Content</div>
      <div class="no-threats-sub">This page doesn't have scannable text content</div>
    </div>
  `;
  updateScore({ confidence: 0 });
  updateStatus({ threat_detected: false });
}

/**
 * Toggle word highlighting
 */
async function toggleHighlights() {
  highlightsEnabled = !highlightsEnabled;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { 
    action: 'toggleHighlights',
    enabled: highlightsEnabled
  });
  
  toggleHighlightBtn.style.background = highlightsEnabled ? '#1E293B' : '#334155';
  toggleHighlightBtn.style.color = highlightsEnabled ? '#94A3B8' : '#64748B';
}

/**
 * Open the web dashboard
 */
function openDashboard() {
  chrome.tabs.create({ url: 'http://localhost:3000' });
}