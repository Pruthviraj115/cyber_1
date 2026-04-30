import { Trash2, RefreshCw, AlertTriangle, MessageSquare, Link, Clock } from 'lucide-react';
import { api } from '../services/api';

export default function ThreatList({ threats, loading, onRefresh }) {
  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all threat logs?')) {
      await api.clearThreats();
      onRefresh();
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'CYBERBULLYING':
        return <MessageSquare className="w-4 h-4 text-orange-400" />;
      case 'SCAM':
        return <Link className="w-4 h-4 text-purple-400" />;
      case 'PHISHING':
        return <AlertTriangle className="w-4 h-4 text-cyan-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH': return 'border-l-red-500';
      case 'MEDIUM': return 'border-l-yellow-500';
      case 'LOW': return 'border-l-blue-500';
      default: return 'border-l-gray-500';
    }
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      HIGH: 'badge-danger',
      MEDIUM: 'badge-warning',
      LOW: 'badge-safe'
    };
    return styles[severity] || 'badge-safe';
  };

  const formatTimestamp = (ts) => {
    try {
      const date = new Date(ts);
      return date.toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Threat Log</h3>
          <span className="text-sm text-gray-400">({threats.length} entries)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            className="btn-secondary text-sm py-2 px-3"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {threats.length > 0 && (
            <button 
              onClick={handleClear}
              className="btn-secondary text-sm py-2 px-3 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading threats...
        </div>
      ) : threats.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No threats detected yet</p>
          <p className="text-sm mt-1">Use the analyzers above or the Chrome extension to scan content</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {threats.map((threat) => (
            <div 
              key={threat.id}
              className={`border-l-4 ${getSeverityColor(threat.severity)} bg-safe-dark/50 rounded-r-lg p-4 animate-slide-up`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5">
                    {getTypeIcon(threat.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white text-sm">{threat.type}</span>
                      <span className={getSeverityBadge(threat.severity)}>
                        {threat.severity}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(threat.confidence * 100)}% confidence
                      </span>
                    </div>
                    
                    {threat.content_preview && (
                      <p className="text-sm text-gray-400 truncate mb-1">
                        "{threat.content_preview}"
                      </p>
                    )}
                    
                    {threat.url && (
                      <p className="text-sm text-gray-400 truncate mb-1">
                        🔗 {threat.url}
                      </p>
                    )}
                    
                    {threat.toxic_words && threat.toxic_words.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {threat.toxic_words.map((word, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                            {word}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {threat.indicators && threat.indicators.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {threat.indicators.map((ind, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(threat.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}