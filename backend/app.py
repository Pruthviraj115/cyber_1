from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, re
from datetime import datetime
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)

THREATS_FILE = os.path.join(os.path.dirname(__file__), 'data', 'threats.json')
threats_store = []
os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)

def load_threats():
    global threats_store
    if os.path.exists(THREATS_FILE):
        try:
            with open(THREATS_FILE, 'r') as f: threats_store = json.load(f)
        except: pass

def save_threats():
    with open(THREATS_FILE, 'w') as f: json.dump(threats_store, f, indent=2)

load_threats()

TOXIC_WORDS = {'idiot':0.9,'stupid':0.7,'dumb':0.6,'moron':0.9,'loser':0.8,'pathetic':0.75,'worthless':0.9,'trash':0.7,'hate':0.7,'kill':0.95,'die':0.9,'death':0.8,'murder':0.95,'rape':0.95,'abuse':0.8,'violent':0.75,'attack':0.7,'ugly':0.7,'fat':0.6,'disgusting':0.8,'gross':0.5,'creep':0.7,'freak':0.7,'retard':0.95,'psycho':0.8,'crazy':0.5,'insane':0.5}

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total = len(threats_store)
    bullying = sum(1 for t in threats_store if t.get('type') == 'CYBERBULLYING')
    scam = sum(1 for t in threats_store if t.get('type') == 'SCAM')
    phishing = sum(1 for t in threats_store if t.get('type') == 'PHISHING')
    high = sum(1 for t in threats_store if t.get('severity') == 'HIGH')
    med = sum(1 for t in threats_store if t.get('severity') == 'MEDIUM')
    low = sum(1 for t in threats_store if t.get('severity') == 'LOW')
    score = 100
    if total > 0:
        score = max(0, round((1 - (high*3 + med*2 + low) / (total*3)) * 100))
    return jsonify({"total_threats": total, "by_type": {"cyberbullying": bullying, "scam": scam, "phishing": phishing}, "by_severity": {"high": high, "medium": med, "low": low}, "safety_score": score})

@app.route('/api/analyze-text', methods=['POST'])
def analyze_text_endpoint():
    data = request.get_json()
    if not data or 'text' not in data: return jsonify({"error": "Text required"}), 400
    text = data['text'].lower()
    found = [w for w in text.split() if w in TOXIC_WORDS]
    threat = len(found) > 0
    conf = min(len(found) * 0.25, 1.0) if threat else 0
    sev = "HIGH" if conf >= 0.8 else "MEDIUM" if conf >= 0.4 else "LOW"
    res = {"threat_detected": threat, "category": "CYBERBULLYING" if threat else "SAFE", "severity": sev, "confidence": conf, "toxic_words_found": [{"word": w, "severity": 0.8} for w in found[:5]], "suggestion": "Try to be respectful." if threat else None}
    if threat:
        threats_store.append({"id": len(threats_store)+1, "timestamp": datetime.now().isoformat(), "type": "CYBERBULLYING", "category": "CYBERBULLYING", "severity": sev, "confidence": conf, "source": "text", "content_preview": data['text'][:100], "toxic_words": found})
        save_threats()
    return jsonify(res)

@app.route('/api/scan-url', methods=['POST'])
def scan_url_endpoint():
    data = request.get_json()
    if not data or 'url' not in data: return jsonify({"error": "URL required"}), 400
    url = data['url'].lower()
    bad = ['free-money','login-verify','secure-login','prize','lottery']
    found = [b for b in bad if b in url]
    safe = len(found) == 0
    conf = min(len(found) * 0.3, 1.0) if not safe else 0
    res = {"safe": safe, "threat_type": "PHISHING" if not safe else "SAFE", "confidence": conf, "indicators": found}
    if not safe:
        threats_store.append({"id": len(threats_store)+1, "timestamp": datetime.now().isoformat(), "type": "PHISHING", "category": "URL", "severity": "HIGH", "confidence": conf, "source": "url", "url": data['url'], "indicators": found})
        save_threats()
    return jsonify(res)

@app.route('/api/threats', methods=['GET'])
def get_threats():
    return jsonify({"threats": list(reversed(threats_store[-100:])), "total": len(threats_store)})

@app.route('/api/threats/clear', methods=['POST'])
def clear_threats():
    global threats_store
    threats_store = []
    save_threats()
    return jsonify({"message": "Cleared"})

if __name__ == '__main__':
    print("\nSafeNet API Running on http://127.0.0.1:5001\n")
    app.run(debug=True, port=5001, host='0.0.0.0')