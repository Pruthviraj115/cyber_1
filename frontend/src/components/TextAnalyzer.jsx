import { useState } from 'react';
import { MessageSquare, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function TextAnalyzer({ onAnalysisComplete }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.analyzeText(text);
      setResult(data);
      if (onAnalysisComplete) onAnalysisComplete();
    } catch (err) {
      setError('Failed to analyze text. Make sure the backend is running.');
    } finally {
      setLoading(false);
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

  const highlightText = (text, toxicWords) => {
    if (!toxicWords || toxicWords.length === 0) return text;
    
    let highlighted = text;
    toxicWords.forEach(({ word }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      highlighted = highlighted.replace(
        regex, 
        `<mark class="bg-red-500/30 text-red-300 px-0.5 rounded">${word}</mark>`
      );
    });
    return highlighted;
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Text Analyzer</h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-4">
        Analyze text for cyberbullying and toxic language
      </p>

      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to analyze... e.g., 'You are so stupid and worthless'"
          className="input-field min-h-[100px] resize-y"
          rows={4}
        />

        <div className="flex items-center gap-3">
          <button 
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Analyze Text
              </>
            )}
          </button>
          
          {result && (
            <button 
              onClick={() => { setResult(null); setText(''); }}
              className="btn-secondary text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className={`animate-slide-up p-4 rounded-lg border ${
            result.threat_detected 
              ? 'bg-red-500/10 border-red-500/30' 
              : 'bg-green-500/10 border-green-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {result.threat_detected ? (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              <span className={`font-semibold ${
                result.threat_detected ? 'text-red-400' : 'text-green-400'
              }`}>
                {result.threat_detected ? 'Threat Detected!' : 'Text Appears Safe'}
              </span>
              <span className={getSeverityBadge(result.severity)}>
                {result.severity}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <span className="text-gray-400">Category:</span>
                <span className="ml-2 text-white">{result.category}</span>
              </div>
              <div>
                <span className="text-gray-400">Confidence:</span>
                <span className="ml-2 text-white">{Math.round(result.confidence * 100)}%</span>
              </div>
            </div>

            {result.toxic_words_found.length > 0 && (
              <div className="mb-3">
                <span className="text-sm text-gray-400">Toxic words found:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.toxic_words_found.map((tw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                      {tw.word} ({Math.round(tw.severity * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.suggestion && (
              <div className="p-2 bg-blue-500/10 rounded text-blue-300 text-sm italic">
                💡 {result.suggestion}
              </div>
            )}

            {/* Highlighted text preview */}
            {result.toxic_words_found.length > 0 && (
              <div className="mt-3 p-3 bg-safe-dark/50 rounded text-sm">
                <span className="text-gray-400 text-xs block mb-1">Highlighted preview:</span>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: highlightText(text, result.toxic_words_found) 
                  }} 
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}