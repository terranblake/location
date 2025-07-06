#!/usr/bin/env python3
"""
GPS Tracker Server
Simple Flask server for tracking GPS locations from log files
"""

import os
import glob
from datetime import datetime, timedelta
from flask import Flask, jsonify, send_from_directory, request

app = Flask(__name__, static_folder='static')

# Configuration
LOG_DIR = os.environ.get('LOG_DIR', '/logs')
PORT = int(os.environ.get('PORT', 8080))
ONE_MONTH_IN_HOURS = 30 * 24
MAX_AGE_HOURS = int(os.environ.get('MAX_AGE_HOURS', ONE_MONTH_IN_HOURS))

# User configuration - default to "terran" for now
# TODO: Replace with Cloudflare Zero Trust user information
DEFAULT_USER = "terran"

def get_current_user():
    """Get the current active user. For now, defaults to 'terran'"""
    # TODO: Extract user from Cloudflare Zero Trust headers
    return DEFAULT_USER

def get_device_owner(device_id):
    """Determine the owner of a device based on its ID"""
    # If device_id contains an underscore, the part before it is the owner
    if '_' in device_id:
        return device_id.split('_')[0].lower()
    
    # For devices without underscore, they don't belong to any specific user
    # Return None to indicate no owner
    return None

def get_device_friendly_name(device_id):
    """Get the friendly name for a device (part after underscore, or full name if no underscore)"""
    if '_' in device_id:
        return device_id.split('_', 1)[1]  # Get everything after the first underscore
    return device_id

def filter_locations_by_user(locations, user):
    """Filter locations to only include devices owned by the specified user"""
    return [loc for loc in locations if get_device_owner(loc['device_id']) == user.lower()]

def parse_logs():
    """Parse all GPS log files and return recent locations"""
    cutoff_time = datetime.now() - timedelta(hours=MAX_AGE_HOURS)
    log_files = glob.glob(os.path.join(LOG_DIR, '*.log'))

    def parse_line(line, log_file):
        line = line.strip()
        if not line:
            return None
        parts = line.split(',')
        if len(parts) < 4:
            print(f"Skipping malformed line in {log_file}: {line}")
            return None
        try:
            timestamp_str = parts[0]
            device_id = parts[1]
            lat = float(parts[2])
            lon = float(parts[3])
            accuracy = float(parts[4]) if len(parts) > 4 else 0
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            if timestamp.tzinfo:
                timestamp = timestamp.replace(tzinfo=None)
            if timestamp > cutoff_time:
                return {
                    'timestamp': timestamp.isoformat(),
                    'device_id': device_id,
                    'lat': lat,
                    'lon': lon,
                    'accuracy': accuracy
                }
        except Exception as e:
            print(f"Error parsing line in {log_file}: {e}")
        return None

    def parse_file(log_file):
        try:
            with open(log_file, 'r') as f:
                return [loc for line in f if (loc := parse_line(line, log_file))]
        except Exception as e:
            print(f"Error reading {log_file}: {e}")
            return []

    locations = [loc for log_file in log_files for loc in parse_file(log_file)]
    locations.sort(key=lambda x: x['timestamp'])
    return locations

def get_latest_locations():
    """Get the most recent location for each device"""
    all_locations = parse_logs()
    latest = {}
    
    for loc in all_locations:
        device_id = loc['device_id']
        if device_id not in latest or loc['timestamp'] > latest[device_id]['timestamp']:
            latest[device_id] = loc
    
    return list(latest.values())

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('static/html', 'index.html')

@app.route('/api/locations')
def api_locations():
    """API endpoint to get all recent locations for the current user"""
    current_user = get_current_user()
    all_locations = parse_logs()
    user_locations = filter_locations_by_user(all_locations, current_user)
    
    # Add friendly names to locations
    for loc in user_locations:
        loc['friendly_name'] = get_device_friendly_name(loc['device_id'])
    
    return jsonify(user_locations)

@app.route('/api/latest')
def api_latest():
    """API endpoint to get latest location per device for the current user"""
    current_user = get_current_user()
    all_latest = get_latest_locations()
    user_latest = filter_locations_by_user(all_latest, current_user)
    
    # Add friendly names to locations
    for loc in user_latest:
        loc['friendly_name'] = get_device_friendly_name(loc['device_id'])
    
    return jsonify(user_latest)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'log_dir': LOG_DIR})

@app.route('/api/location', methods=['POST'])
def api_post_location():
    """API endpoint to receive GPS data from devices"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['timestamp', 'device_id', 'lat', 'lon']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Optional accuracy field
        accuracy = data.get('accuracy', 0)
        
        # Create log entry
        log_entry = f"{data['timestamp']},{data['device_id']},{data['lat']},{data['lon']},{accuracy}\n"
        
        # Write to device-specific log file
        device_log_file = os.path.join(LOG_DIR, f"{data['device_id']}.log")
        with open(device_log_file, 'a') as f:
            f.write(log_entry)
        
        return jsonify({'status': 'success'}), 200
    
    except Exception as e:
        print(f"Error processing location data: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Static file routes
@app.route('/css/<path:filename>')
def css_files(filename):
    return send_from_directory('static/css', filename)

@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory('static/js', filename)

@app.route('/vendor/<path:filename>')
def vendor_files(filename):
    return send_from_directory('static/vendor', filename)

if __name__ == '__main__':
    # Ensure log directory exists
    os.makedirs(LOG_DIR, exist_ok=True)
    print(f"Starting GPS map server on port {PORT}")
    print(f"Reading logs from: {LOG_DIR}")
    print(f"Max age for locations: {MAX_AGE_HOURS} hours")
    app.run(host='0.0.0.0', port=PORT, debug=False)
