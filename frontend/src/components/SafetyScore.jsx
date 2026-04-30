import { MessageSquare, Link, AlertTriangle } from 'lucide-react';

export default function SafetyScore({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
      <div className="bg-safe-dark/50 rounded-lg p-4 text-center">
        <MessageSquare className="w-5 h-5 text-orange-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{stats.by_type.cyberbullying}</div>
        <div className="text-xs text-gray-400 mt-1">Cyberbullying</div>
      </div>
      <div className="bg-safe-dark/50 rounded-lg p-4 text-center">
        <Link className="w-5 h-5 text-purple-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{stats.by_type.scam}</div>
        <div className="text-xs text-gray-400 mt-1">Scams</div>
      </div>
      <div className="bg-safe-dark/50 rounded-lg p-4 text-center">
        <AlertTriangle className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{stats.by_type.phishing}</div>
        <div className="text-xs text-gray-400 mt-1">Phishing</div>
      </div>
      <div className="bg-safe-dark/50 rounded-lg p-4 text-center">
        <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
        <div className="text-2xl font-bold text-white">{stats.by_severity.high}</div>
        <div className="text-xs text-gray-400 mt-1">High Severity</div>
      </div>
    </div>
  );
}