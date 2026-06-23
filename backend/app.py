from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
from urllib.parse import urlparse
import json, os, re

app = Flask(__name__)
CORS(app)

MONGO_URI = "mongodb+srv://Pruthviraj_S_R:pruthvi@cluster1.yzwr4ou.mongodb.net/?appName=Cluster1"

# Setup MongoDB with forced TLS bypass for strict networks
db_connected = False
threats_col = None
threats_store = [] # Local fallback list

try:
    client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
    client.admin.command('ping') # Force a real connection test
    db = client["safenet_db"]
    threats_col = db["threats"]
    db_connected = True
    print("✅ Connected to MongoDB Cloud successfully!")
except Exception as e:
    print("⚠️ MongoDB blocked by network. Using Local Storage Fallback.")
    if os.path.exists('data/threats.json'):
        os.makedirs('data', exist_ok=True)
        with open('data/threats.json', 'r') as f: threats_store = json.load(f)

def save_threat_local(threat):
    threats_store.append(threat)
    os.makedirs('data', exist_ok=True)
    with open('data/threats.json', 'w') as f: json.dump(threats_store, f, indent=2)

# ==========================================
# TEXT ANALYSIS WORDS
# ==========================================
TOXIC_WORDS = {
    'idiot':0.9,'stupid':0.7,'dumb':0.6,'moron':0.9,'loser':0.8,'pathetic':0.75,
    'worthless':0.9,'trash':0.7,'hate':0.7,'kill':0.95,'die':0.9,'death':0.8,
    'murder':0.95,'rape':0.95,'abuse':0.8,'violent':0.75,'attack':0.7,'ugly':0.7,
    'fat':0.6,'disgusting':0.8,'gross':0.5,'creep':0.7,'freak':0.7,'retard':0.95,
    'psycho':0.8,'crazy':0.5,'insane':0.5,'bitch':0.9,'fuck':0.85,'asshole':0.9,
    'shit':0.6,'bastard':0.8,'slut':0.95
}

# ==========================================
# UPGRADED URL SCANNING LOGIC
# ==========================================
SUSPICIOUS_PATTERNS = [
    (r'login[-_]?verify', 'PHISHING', 0.9), (r'account[-_]?verify', 'PHISHING', 0.9),
    (r'confirm[-_]?account', 'PHISHING', 0.85), (r'secure[-_]?login', 'PHISHING', 0.85),
    (r'update[-_]?payment', 'PHISHING', 0.9), (r'verify[-_]?identity', 'PHISHING', 0.85),
    (r'paypal[-_]?(secure|login|verify)', 'PHISHING', 0.95), (r'amazon[-_]?(secure|verify|confirm)', 'PHISHING', 0.9),
    (r'google[-_]?(secure|verify|account)', 'PHISHING', 0.9), (r'microsoft[-_]?(secure|verify|account)', 'PHISHING', 0.9),
    (r'apple[-_]?(id|secure|verify)', 'PHISHING', 0.9), (r'netflix[-_]?(account|verify|billing)', 'PHISHING', 0.85),
    (r'facebook[-_]?(secure|verify|login)', 'PHISHING', 0.9), (r'instagram[-_]?(secure|verify)', 'PHISHING', 0.85),
    (r'free[-_]?(money|cash|gift|prize|winner)', 'SCAM', 0.9), (r'make[-_]?money[-_]?fast', 'SCAM', 0.9),
    (r'get[-_]?rich[-_]?quick', 'SCAM', 0.9), (r'crypto[-_]?(invest|profit|double|guarantee)', 'SCAM', 0.85),
    (r'bitcoin[-_]?(double|guarantee|free)', 'SCAM', 0.9), (r'lottery[-_]?(winner|claim|prize)', 'SCAM', 0.95),
    (r'urgent[-_]?action[-_]?required', 'PHISHING', 0.8), (r'suspend[-_]?account', 'PHISHING', 0.85),
    (r'unusual[-_]?activity', 'PHISHING', 0.75), (r'click[-_]?here[-_]?to', 'PHISHING', 0.6),
    (r'security[-_]?alert', 'PHISHING', 0.7), (r'password[-_]?reset[-_]?required', 'PHISHING', 0.85),
]

LEGITIMATE_DOMAINS = {
    'google.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 
    'linkedin.com', 'youtube.com', 'reddit.com', 'github.com', 'stackoverflow.com',
    'wikipedia.org', 'amazon.com', 'netflix.com', 'spotify.com', 'microsoft.com', 
    'apple.com', 'whatsapp.com', 'twitch.tv', 'discord.com'
}

def scan_url_logic(url):
    if not url: return {"safe": True, "threat_type": "SAFE", "confidence": 0, "indicators": []}
    
    url_lower = url.lower()
    parsed = urlparse(url_lower)
    domain = parsed.netloc.lower()
    clean_domain = domain.replace('www.', '')
    
    indicators = []
    max_confidence = 0
    threat_type = "SAFE"
    
    # 1. Check for suspicious phrases in the full URL
    for pattern, t_type, confidence in SUSPICIOUS_PATTERNS:
        if re.search(pattern, url_lower):
            indicators.append({"pattern": pattern, "type": t_type})
            if confidence > max_confidence:
                max_confidence = confidence
                threat_type = t_type
                
    # 2. Check for suspicious TLDs (like .xyz, .tk)
    suspicious_tlds = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.work', '.click', '.buzz']
    if any(domain.endswith(tld) for tld in suspicious_tlds):
        indicators.append({"pattern": f"Suspicious TLD (.{domain.split('.')[-1]})", "type": "SCAM"})
        max_confidence = max(max_confidence, 0.5)
        if threat_type == "SAFE": threat_type = "SCAM"
        
    # 3. Check for IP addresses instead of domain names
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', clean_domain):
        indicators.append({"pattern": "IP address used instead of domain", "type": "PHISHING"})
        max_confidence = max(max_confidence, 0.8)
        threat_type = "PHISHING"
        
    # 4. Check for brand impersonation (e.g., google-security.com)
    brands = ['google', 'facebook', 'paypal', 'amazon', 'microsoft', 'apple', 'netflix', 'instagram', 'twitter', 'linkedin', 'chase', 'bankofamerica', 'wellsfargo']
    for brand in brands:
        if brand in clean_domain and not clean_domain.endswith(brand + '.com'):
            indicators.append({"pattern": f"Brand impersonation ({brand})", "type": "PHISHING"})
            max_confidence = max(max_confidence, 0.9)
            threat_type = "PHISHING"
            break
            
    # 5. Check for HTTP instead of HTTPS
    if url_lower.startswith('http://'):
        indicators.append({"pattern": "Not using HTTPS", "type": "SCAM"})
        max_confidence = max(max_confidence, 0.3)
        
    # 6. Whitelist known good domains (unless confidence is super high)
    if clean_domain in LEGITIMATE_DOMAINS and max_confidence < 0.8:
        return {"safe": True, "threat_type": "SAFE", "confidence": 0, "indicators": []}
        
    is_safe = max_confidence < 0.5
    
    return {
        "safe": is_safe, 
        "threat_type": threat_type if not is_safe else "SAFE", 
        "confidence": round(max_confidence, 2), 
        "indicators": indicators
    }


# ==========================================
# DATABASE HELPERS
# ==========================================
def get_all_threats():
    if db_connected:
        mongo_threats = list(threats_col.find().sort("timestamp", -1).limit(100))
        for t in mongo_threats: t['_id'] = str(t['_id'])
        return mongo_threats
    else:
        return list(reversed(threats_store[-100:]))

def count_threats(query):
    if db_connected: return threats_col.count_documents(query)
    else: return sum(1 for t in threats_store if all(t.get(k) == v for k, v in query.items()))

def add_threat(threat):
    if db_connected: threats_col.insert_one(threat)
    else: save_threat_local(threat)

def clear_all_threats():
    if db_connected: threats_col.delete_many({})
    else:
        global threats_store
        threats_store = []
        save_threat_local({})

# ==========================================
# API ROUTES
# ==========================================
@app.route('/api/stats', methods=['GET'])
def get_stats():
    total = count_threats({})
    bullying = count_threats({"type": "CYBERBULLYING"})
    scam = count_threats({"type": "SCAM"})
    phishing = count_threats({"type": "PHISHING"})
    high = count_threats({"severity": "HIGH"})
    med = count_threats({"severity": "MEDIUM"})
    low = count_threats({"severity": "LOW"})
    score = max(0, round((1 - (high*3 + med*2 + low) / (total*3)) * 100)) if total > 0 else 100
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
        add_threat({"timestamp": datetime.now().isoformat(), "type": "CYBERBULLYING", "severity": sev, "confidence": conf, "source": "text", "content_preview": data['text'][:100], "toxic_words": found})
    return jsonify(res)

@app.route('/api/scan-url', methods=['POST'])
def scan_url_endpoint():
    data = request.get_json()
    if not data or 'url' not in data: return jsonify({"error": "URL required"}), 400
    
    url_to_scan = data['url']
    if not url_to_scan.startswith('http'):
        url_to_scan = 'https://' + url_to_scan
        
    result = scan_url_logic(url_to_scan)
    
    if not result["safe"]:
        add_threat({
            "timestamp": datetime.now().isoformat(), 
            "type": result["threat_type"], 
            "severity": "HIGH" if result["confidence"] >= 0.8 else "MEDIUM", 
            "confidence": result["confidence"], 
            "source": "url", 
            "url": url_to_scan, 
            "indicators": [i["pattern"] for i in result["indicators"]]
        })
        
    return jsonify(result)

@app.route('/api/threats', methods=['GET'])
def get_threats():
    return jsonify({"threats": get_all_threats(), "total": len(get_all_threats())})

@app.route('/api/threats/clear', methods=['POST'])
def clear_threats():
    clear_all_threats()
    return jsonify({"message": "Cleared"})

if __name__ == '__main__':
    print("\nSafeNet API Running on http://127.0.0.1:5001\n")
    app.run(debug=True, use_reloader=False, port=5001, host='0.0.0.0')