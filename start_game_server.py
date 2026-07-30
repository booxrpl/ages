import subprocess
import time
import sys
import re
import os

PORT = 8089
LEADERBOARD_FILE = "leaderboard.js"

def update_leaderboard_js(new_url):
    if not os.path.exists(LEADERBOARD_FILE):
        print(f"Error: {LEADERBOARD_FILE} not found!")
        return False
        
    try:
        with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Search for this.bucketBase = "..."
        pattern = r'(this\.bucketBase\s*=\s*")[^"]+(")'
        new_content, count = re.subn(pattern, r'\g<1>' + new_url + r'\g<2>', content)
        
        if count == 0:
            print("Warning: Could not find this.bucketBase in leaderboard.js!")
            return False
            
        with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
            f.write(new_content)
            
        print(f"Updated leaderboard.js with new tunnel URL: {new_url}")
        return True
    except Exception as e:
        print("Failed to update leaderboard.js:", e)
        return False

def run():
    print("Starting Local Game Server and Serveo Tunnel...")
    
    print(f"Starting python server on 127.0.0.1:{PORT} in the background...")
    server_proc = subprocess.Popen([sys.executable, "-u", "server.py"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    # Wait for server to bind
    time.sleep(2)
    
    # 2. Launch Serveo SSH Tunnel
    print("Connecting to Serveo tunnel...")
    ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-R", f"80:127.0.0.1:{PORT}", "serveo.net"]
    ssh_proc = subprocess.Popen(ssh_cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    
    tunnel_url = None
    
    # Read SSH output line by line to capture the URL
    print("Waiting for Serveo to allocate public URL...")
    for line in iter(ssh_proc.stdout.readline, ''):
        print("Serveo:", line.strip())
        match = re.search(r'https://[a-zA-Z0-9_\-\.]+\.serveousercontent\.com', line)
        if match:
            tunnel_url = match.group(0)
            print(f"Allocated Tunnel URL: {tunnel_url}")
            break
            
    if not tunnel_url:
        print("Failed to get tunnel URL from Serveo!")
        ssh_proc.terminate()
        server_proc.terminate()
        return
        
    # 3. Update leaderboard.js
    success = update_leaderboard_js(tunnel_url)
    
    if success:
        print("\n=== GAME SERVER RUNNING ===")
        print(f"Direct Database Tunnel: {tunnel_url}")
    else:
        print("Error updating leaderboard.js")

    # Keep script running to maintain the server and SSH tunnel
    try:
        while True:
            # Check if processes are alive
            if server_proc.poll() is not None:
                print("Local Python server terminated! Exiting...")
                break
            if ssh_proc.poll() is not None:
                print("Serveo tunnel terminated! Exiting...")
                break
            time.sleep(5)
    except KeyboardInterrupt:
        print("Shutting down game server...")
    finally:
        ssh_proc.terminate()
        server_proc.terminate()

if __name__ == "__main__":
    run()
