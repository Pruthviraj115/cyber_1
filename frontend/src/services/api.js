const API_BASE = 'http://localhost:5001/api';

export const api = {
  async analyzeText(text) {
    const response = await fetch(`${API_BASE}/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error('Failed to analyze text');
    return response.json();
  },

  async scanUrl(url) {
    const response = await fetch(`${API_BASE}/scan-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!response.ok) throw new Error('Failed to scan URL');
    return response.json();
  },

  async getThreats() {
    const response = await fetch(`${API_BASE}/threats`);
    if (!response.ok) throw new Error('Failed to fetch threats');
    return response.json();
  },

  async getStats() {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async clearThreats() {
    const response = await fetch(`${API_BASE}/threats/clear`, { method: 'POST' });
    return response.json();
  }
};