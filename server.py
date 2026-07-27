import http.server
import json
import os

PORT = 8086

# Simple file-based data stores
LEADERBOARD_FILE = "db_leaderboard.json"
CHAT_FILE = "db_chat.json"
ATTACKS_FILE = "db_attacks.json"

def read_json_file(filename, default):
    if not os.path.exists(filename):
        return default
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            return json.loads(content) if content else default
    except Exception:
        return default

def write_json_file(filename, data):
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error writing to {filename}: {e}")

class CustomHandler(http.server.BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path) if 'urllib' in globals() else None
        # Simple manual query param parsing
        path = self.path
        query = ""
        if "?" in path:
            path, query = path.split("?", 1)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()

        if path == "/leaderboard":
            data = read_json_file(LEADERBOARD_FILE, [])
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif path == "/chat":
            data = read_json_file(CHAT_FILE, [])
            self.wfile.write(json.dumps(data).encode('utf-8'))
            
        elif path == "/attack":
            # parse playerId from query, e.g. playerId=play_1234
            player_id = ""
            if "playerId=" in query:
                player_id = query.split("playerId=")[1].split("&")[0]
            
            if not player_id:
                self.wfile.write(json.dumps({"error": "playerId required"}).encode('utf-8'))
                return

            attacks = read_json_file(ATTACKS_FILE, {})
            player_alerts = attacks.get(player_id, [])
            
            # Clear alerts for this player
            attacks[player_id] = []
            write_json_file(ATTACKS_FILE, attacks)
            
            self.wfile.write(json.dumps(player_alerts).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({"error": "Not Found"}).encode('utf-8'))

    def do_POST(self):
        path = self.path
        if "?" in path:
            path, _ = path.split("?", 1)

        # Read POST body
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            payload = {}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()

        if path == "/leaderboard":
            write_json_file(LEADERBOARD_FILE, payload)
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            
        elif path == "/chat":
            chat = read_json_file(CHAT_FILE, [])
            sender = payload.get("sender", "Unknown")
            msg = payload.get("msg", "")
            if msg:
                chat.push = chat.append({
                    "time": int(time.time() * 1000) if 'time' in globals() else 0,
                    "sender": sender,
                    "msg": msg
                })
                chat = chat[-40:] # trim to last 40 messages
                write_json_file(CHAT_FILE, chat)
            self.wfile.write(json.dumps(chat).encode('utf-8'))
            
        elif path == "/attack":
            target_id = payload.get("targetId")
            alert = payload.get("alert")
            if target_id and alert:
                attacks = read_json_file(ATTACKS_FILE, {})
                if target_id not in attacks:
                    attacks[target_id] = []
                
                alert_copy = dict(alert)
                alert_copy["time"] = int(time.time() * 1000) if 'time' in globals() else 0
                attacks[target_id].append(alert_copy)
                
                write_json_file(ATTACKS_FILE, attacks)
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({"error": "Invalid payload"}).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({"error": "Not Found"}).encode('utf-8'))

import time
import urllib.parse

def run_server():
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, CustomHandler)
    print(f"Starting Local Game Server on port {PORT}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
