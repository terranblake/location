#!/bin/bash
# gps_service.sh - Place in ~/.termux/boot/ to auto-start
# Single device GPS tracker - configure variables below

# ===== CONFIGURATION - EDIT THESE VALUES =====
USER_NAME="terran"                    # Your name 
DEVICE_NAME="phone"                 # This device name
SERVER_URL="https://find.terran.sh"
INTERVAL=30                         # Seconds between GPS readings
# ============================================

# Single device configuration
LOG_FILE="$HOME/gps_locations.log"
DEVICE_ID="${USER_NAME}_${DEVICE_NAME}"

# Function to get and post GPS data
log_and_post_gps() {
    local location=$(termux-location -p gps 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$location" ]; then
        local timestamp=$(date -Iseconds)
        local lat=$(echo "$location" | grep -o '"latitude":[^,]*' | cut -d':' -f2 | tr -d ' ')
        local lon=$(echo "$location" | grep -o '"longitude":[^,]*' | cut -d':' -f2 | tr -d ' ')
        local accuracy=$(echo "$location" | grep -o '"accuracy":[^,]*' | cut -d':' -f2 | tr -d ' ')
        
        if [ -n "$lat" ] && [ -n "$lon" ]; then
            # POST GPS data as JSON to /api/location endpoint
            local json_data="{\"timestamp\":\"$timestamp\",\"device_id\":\"$DEVICE_ID\",\"lat\":$lat,\"lon\":$lon,\"accuracy\":${accuracy:-0}}"
            
            if curl -f -X POST \
               -H "Content-Type: application/json" \
               -d "$json_data" \
               "$SERVER_URL/api/location" 2>/dev/null; then
                echo "$(date): GPS data posted successfully - $lat,$lon"
            else
                echo "$(date): Failed to post GPS data"
                # Optionally save locally as backup
                echo "$timestamp,$DEVICE_ID,$lat,$lon,$accuracy" >> "$LOG_FILE"
            fi
        fi
    else
        echo "$(date): Failed to get GPS location"
    fi
}

# Main loop
echo "$(date): GPS service started for device: $DEVICE_ID"

while true; do
    log_and_post_gps
    sleep $INTERVAL
done