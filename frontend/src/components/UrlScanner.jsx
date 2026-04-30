import { useState } from 'react';
import { Link, Loader2, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function UrlScanner({ onScanComplete }) {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    if (!url.trim()) return;
    
    // Basic URL validation
    let urlToScan = url.trim();
    if (!urlToScan.startsWith('http://') && !urlToScan.startsWith('https://')) {
      urlToScan = 'https://' + urlToScan;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.scanUrl(urlToScan);
      setResult({ ...data, scanned_url: urlToScan });
      if (onScanComplete) onScanComplete();
    } catch (err) {
      setError('Failed to scan URL. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const getThreatBadge = (type) => {
    const styles = {
      SAFE: 'badge-safe',
      SCAM: 'badge-danger',
      PHISHING: 'badge-danger',
      MALWARE: 'badge-danger'
    };
    return styles[type] || 'badge-warning';
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Link className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">URL Scanner</h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-4">
        Detect phishing links and scam URLs
      </p>

      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            placeholder="Enter URL to scan... e.g., free-money-now.xyz"
            className="input-field flex-1"
          />
          <button 
            onClick={handleScan}
            disabled={loading || !url.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Link className="w-4 h-4" />
                Scan
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className={`animate-slide-up p-4 rounded-lg border ${
            result.safe 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {result.safe ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className={`font-semibold ${
                result.safe ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.safe ? 'URL Appears Safe' : '⚠️ Threat Detected!'}
              </span>
              <span className={getThreatBadge(result.threat_type)}>
                {result.threat_type}
              </span>
            </div>

            <div className="text-sm text-gray-400 mb-3 truncate">
              <ExternalLink className="w-3 h-3 inline mr-1" />
              {result.scanned_url}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <span className="text-gray-400">Confidence:</span>
                <span className="ml-2 text-white">{Math.round(result.confidence * 100)}%</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 ${result.safe ? 'text-green-400' : 'text-red-400'}`}>
                  {result.safe ? 'Safe' : 'Dangerous'}
                </span>
              </div>
            </div>

            {result.indicators && result.indicators.length > 0 && (
              <div>
                <span className="text-sm text-gray-400">Suspicious indicators:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.indicators.map((ind, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                      {ind.pattern}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick test URLs */}
        <div className="pt-2">
          <p className="text-xs text-gray-500 mb-2">Quick test URLs:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'google.com',
              'free-money-now.xyz',
              'paypal-secure-login.verify-account.com',
              'amazon.com'
            ].map((testUrl) => (
              <button
                key={testUrl}
                onClick={() => setUrl(testUrl)}
                className="text-xs px-2 py-1 bg-safe-border/50 hover:bg-safe-border rounded text-gray-400 hover:text-white transition-colors"
              >
                {testUrl}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}