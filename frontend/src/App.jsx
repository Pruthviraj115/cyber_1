import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import SafetyScore from './components/SafetyScore';
import TextAnalyzer from './components/TextAnalyzer';
import UrlScanner from './components/UrlScanner';
import ThreatList from './components/ThreatList';
import { api } from './services/api';

function App() {
  const [stats, setStats] = useState({
    total_threats: 0,
    by_type: { cyberbullying: 0, scam: 0, phishing: 0 },
    by_severity: { high: 0, medium: 0, low: 0 },
    safety_score: 100
  });
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [statsData, threatsData] = await Promise.all([
        api.getStats(),
        api.getThreats()
      ]);
      setStats(statsData);
      setThreats(threatsData.threats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'from-green-500/20 to-green-500/5';
    if (score >= 50) return 'from-yellow-500/20 to-yellow-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-safe-border bg-safe-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SafeNet</h1>
                <p className="text-xs text-gray-400">Cyberbullying & Threat Monitor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
                <Activity className="w-4 h-4" />
                <span>{stats.total_threats} threats logged</span>
              </div>
              <button 
                onClick={refreshData}
                className="btn-secondary text-sm py-2 px-3"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Safety Score Hero */}
        <div className={`card bg-gradient-to-r ${getScoreBg(stats.safety_score)} mb-8 animate-slide-up`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                Overall Safety Score
              </h2>
              <div className={`text-6xl font-bold ${getScoreColor(stats.safety_score)}`}>
                {loading ? '...' : `${stats.safety_score}%`}
              </div>
              <p className="mt-2 text-gray-400">
                {stats.safety_score >= 80 ? (
                  <span className="flex items-center gap-1 justify-center md:justify-start">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Environment appears safe
                  </span>
                ) : stats.safety_score >= 50 ? (
                  <span className="flex items-center gap-1 justify-center md:justify-start">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Some risks detected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 justify-center md:justify-start">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    High risk environment
                  </span>
                )}
              </p>
            </div>
            
            <SafetyScore stats={stats} />
          </div>
        </div>

        {/* Analysis Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TextAnalyzer onAnalysisComplete={refreshData} />
          <UrlScanner onScanComplete={refreshData} />
        </div>

        {/* Threat List */}
        <ThreatList threats={threats} loading={loading} onRefresh={refreshData} />
      </main>

      {/* Footer */}
      <footer className="border-t border-safe-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>🛡️ SafeNet — Built for Hackathon Demo | Protecting digital conversations</p>
        </div>
      </footer>
    </div>
  );
}

export default App;