// Find Hub - Google Find My Device Style Application
class FindHub {
    constructor() {
        this.map = null;
        this.markers = {};
        this.polylines = {};
        this.deviceColors = {};
        this.showPaths = true;
        this.currentView = 'devices'; // Track current view
        this.currentDevice = null; // Track current device in detail view
        this.allDeviceLocations = {}; // Store all device location data
        this.colorPalette = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
            '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
        ];
        this.colorIndex = 0;
        
        this.initMap();
        this.initViews();
        this.loadLocations();
        this.startAutoRefresh();
    }
    
    initMap() {
        // Initialize map centered on US
        this.map = L.map('map').setView([39.8283, -98.5795], 4);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);
    }
    
    initViews() {
        // Initialize view state - start with devices view
        this.showDevicesView();
    }
    
    getDeviceColor(deviceId) {
        if (!this.deviceColors[deviceId]) {
            this.deviceColors[deviceId] = this.colorPalette[this.colorIndex % this.colorPalette.length];
            this.colorIndex++;
        }
        return this.deviceColors[deviceId];
    }

    getOwner(deviceId) {
        if (deviceId.includes('_')) {
            return deviceId.split('_')[0];
        }
        return deviceId;
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
    
    formatAccuracy(accuracy) {
        if (accuracy < 1000) {
            return `${Math.round(accuracy)}m`;
        } else {
            return `${(accuracy / 1000).toFixed(1)}km`;
        }
    }
    
    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
    }
    
    async loadLocations() {
        try {
            this.updateStatus('Loading locations...', 'loading');
            
            // Load all locations for historical data, not just latest
            const response = await fetch('/api/locations');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.processLocations(data);
            
            this.updateStatus(`Loaded ${data.length} location points`, 'success');
        } catch (error) {
            console.error('Error loading locations:', error);
            this.updateStatus('Failed to load locations', 'error');
        }
    }
    
    processLocations(data) {
        // Clear existing markers and polylines
        this.clearMap();
        
        // Group locations by device
        const deviceLocations = {};
        data.forEach(loc => {
            if (!deviceLocations[loc.device_id]) {
                deviceLocations[loc.device_id] = [];
            }
            deviceLocations[loc.device_id].push(loc);
        });
        
        // Store for use in detail views
        this.allDeviceLocations = deviceLocations;
        
        // Sort locations by timestamp for each device
        Object.keys(deviceLocations).forEach(deviceId => {
            deviceLocations[deviceId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        
        let bounds = L.latLngBounds();
        let hasLocations = false;
        
        // Process each device
        Object.keys(deviceLocations).forEach(deviceId => {
            const locations = deviceLocations[deviceId];
            if (locations.length === 0) return;
            
            const color = this.getDeviceColor(deviceId);
            
            // Always create polyline for path if multiple points
            if (locations.length > 1) {
                const latLngs = locations.map(loc => [loc.lat, loc.lon]);
                const polyline = L.polyline(latLngs, {
                    color: color,
                    weight: 3,
                    opacity: 0.7,
                    smoothFactor: 1
                }).addTo(this.map);
                this.polylines[deviceId] = polyline;
            }
            
            // Add markers for all locations, with the latest one being most prominent
            locations.forEach((loc, index) => {
                const isLatest = index === locations.length - 1;
                const marker = L.circleMarker([loc.lat, loc.lon], {
                    color: '#ffffff',
                    fillColor: color,
                    fillOpacity: isLatest ? 0.9 : 0.5,
                    radius: isLatest ? 8 : 4,
                    weight: 2
                }).addTo(this.map);
                
                // Only add popup to latest marker
                if (isLatest) {
                    const friendlyName = loc.friendly_name || deviceId;
                    const popupContent = `
                        <div class="popup-device-name">${friendlyName}</div>
                        <div class="popup-info">
                            <strong>Time:</strong> ${this.formatTime(loc.timestamp)}<br>
                            <strong>Accuracy:</strong> ${this.formatAccuracy(loc.accuracy)}<br>
                            <strong>Coordinates:</strong> ${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}
                        </div>
                    `;
                    marker.bindPopup(popupContent);
                    this.markers[deviceId] = marker;
                }
                
                bounds.extend([loc.lat, loc.lon]);
                hasLocations = true;
            });
        });
        
        // Fit map to show all locations
        if (hasLocations) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        // Update the appropriate list based on current view
        if (this.currentView === 'devices') {
            this.updateDeviceList(deviceLocations);
        } else if (this.currentView === 'device-detail') {
            this.updateDeviceDetailView();
        } else if (this.currentView === 'people') {
            this.updatePeopleList(deviceLocations);
        }
    }
    
    updateDeviceList(deviceLocations) {
        const deviceList = document.getElementById('devices-list');
        deviceList.innerHTML = '';
        
        if (Object.keys(deviceLocations).length === 0) {
            deviceList.innerHTML = '<div style="color: #95a5a6; font-style: italic; padding: 20px;">No devices found</div>';
            return;
        }
        
        Object.keys(deviceLocations).forEach(deviceId => {
            const locations = deviceLocations[deviceId];
            if (locations.length === 0) return;
            
            const latest = locations[locations.length - 1];
            const color = this.getDeviceColor(deviceId);
            const friendlyName = latest.friendly_name || deviceId;
            
            const deviceDiv = document.createElement('div');
            deviceDiv.className = 'device-item';
            
            // Calculate time difference for status
            const timeDiff = new Date() - new Date(latest.timestamp);
            const isOnline = timeDiff < 5 * 60 * 1000; // 5 minutes
            
            deviceDiv.innerHTML = `
                <div class="device-icon" style="background-color: ${color};">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <div class="device-info">
                    <div class="device-name">${friendlyName}</div>
                    <div class="device-status ${isOnline ? 'online' : 'offline'}">
                        <i class="fas fa-circle"></i>
                        ${this.formatTime(latest.timestamp)} • ±${this.formatAccuracy(latest.accuracy)}
                    </div>
                </div>
                <div class="device-actions-menu">
                    <i class="fas fa-ellipsis-v"></i>
                </div>
            `;
            
            deviceDiv.onclick = () => {
                this.showDeviceDetail(deviceId);
            };
            
            deviceList.appendChild(deviceDiv);
        });
    }
    
    focusDevice(deviceId, location) {
        // Only zoom to a reasonable level, don't zoom out
        const currentZoom = this.map.getZoom();
        const targetZoom = Math.max(currentZoom, 12); // Never zoom out below level 12
        this.map.setView([location.lat, location.lon], targetZoom);
        if (this.markers[deviceId]) {
            this.markers[deviceId].openPopup();
        }
    }
    
    clearMap() {
        // Remove all markers
        Object.values(this.markers).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = {};
        
        // Remove all polylines
        Object.values(this.polylines).forEach(polyline => {
            this.map.removeLayer(polyline);
        });
        this.polylines = {};
    }
    
    fitAllDevices() {
        const markerGroup = new L.featureGroup(Object.values(this.markers));
        if (Object.keys(this.markers).length > 0) {
            this.map.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
        }
    }
    
    togglePaths() {
        this.showPaths = !this.showPaths;
        this.loadLocations(); // Reload to apply path visibility
    }
    
    startAutoRefresh() {
        // Refresh every 30 seconds
        setInterval(() => {
            this.loadLocations();
        }, 30000);
    }
    
    showDevicesView() {
        this.currentView = 'devices';
        
        // Show devices view, hide people view
        const devicesView = document.getElementById('devices-view');
        const peopleView = document.getElementById('people-view');
        const devicesTab = document.getElementById('devices-tab');
        const peopleTab = document.getElementById('people-tab');
        
        if (devicesView) {
            devicesView.classList.add('active');
            devicesView.style.display = 'block';
        }
        if (peopleView) {
            peopleView.classList.remove('active');
            peopleView.style.display = 'none';
        }
        
        // Update tab states
        if (devicesTab) devicesTab.classList.add('active');
        if (peopleTab) peopleTab.classList.remove('active');
        
        // Reload locations to update the view
        this.loadLocations();
    }
    
    showPeopleView() {
        this.currentView = 'people';
        
        // Show people view, hide devices view
        const devicesView = document.getElementById('devices-view');
        const peopleView = document.getElementById('people-view');
        const devicesTab = document.getElementById('devices-tab');
        const peopleTab = document.getElementById('people-tab');
        
        if (devicesView) {
            devicesView.classList.remove('active');
            devicesView.style.display = 'none';
        }
        if (peopleView) {
            peopleView.classList.add('active');
            peopleView.style.display = 'block';
        }
        
        // Update tab states
        if (devicesTab) devicesTab.classList.remove('active');
        if (peopleTab) peopleTab.classList.add('active');
        
        // Load people data (for now, same as devices but could be extended)
        this.loadPeopleData();
    }
    
    goBack() {
        // If we're in device detail view, go back to devices view
        if (this.currentView === 'device-detail') {
            this.showDevicesView();
            return;
        }
        
        // Otherwise, just refresh the current view
        if (this.currentView === 'devices') {
            this.showDevicesView();
        } else {
            this.showPeopleView();
        }
    }
    
    loadPeopleData() {
        // For now, use the same data as devices
        // In a real implementation, this would load shared/family devices
        this.loadLocations();
    }

    updatePeopleList() {
        const peopleList = document.getElementById('people-list');
        if (!peopleList) return;

        peopleList.innerHTML = '';

        const ownerLatest = {};
        Object.entries(this.allDeviceLocations).forEach(([deviceId, locs]) => {
            if (locs.length === 0) return;
            const owner = this.getOwner(deviceId);
            const latest = locs[locs.length - 1];
            if (!ownerLatest[owner] || new Date(latest.timestamp) > new Date(ownerLatest[owner].latest.timestamp)) {
                ownerLatest[owner] = { latest, deviceId };
            }
        });

        const entries = Object.entries(ownerLatest);
        if (entries.length === 0) {
            peopleList.innerHTML = '<div style="color: #95a5a6; font-style: italic;">No people found</div>';
            return;
        }

        entries.forEach(([owner, info]) => {
            const { latest, deviceId } = info;
            const color = this.getDeviceColor(deviceId);
            const personDiv = document.createElement('div');
            personDiv.className = 'person-item';
            personDiv.style.borderLeftColor = color;
            personDiv.innerHTML = `
                <div class="person-info">
                    <div class="person-name">${owner}</div>
                    <div class="person-status">${this.formatTime(latest.timestamp)}</div>
                </div>
            `;
            personDiv.onclick = () => {
                this.focusDevice(deviceId, latest);
            };
            peopleList.appendChild(personDiv);
        });
    }
    
    showDeviceDetail(deviceId) {
        this.currentView = 'device-detail';
        this.currentDevice = deviceId;
        
        // Hide all views, show device detail view
        const devicesView = document.getElementById('devices-view');
        const peopleView = document.getElementById('people-view');
        const deviceDetailView = document.getElementById('device-detail-view');
        
        if (devicesView) devicesView.style.display = 'none';
        if (peopleView) peopleView.style.display = 'none';
        if (deviceDetailView) deviceDetailView.style.display = 'block';
        
        this.updateDeviceDetailView();
        
        // Focus on this device on the map
        const locations = this.allDeviceLocations[deviceId];
        if (locations && locations.length > 0) {
            const latest = locations[locations.length - 1];
            this.focusDevice(deviceId, latest);
        }
    }
    
    updateDeviceDetailView() {
        if (!this.currentDevice) return;
        
        const deviceId = this.currentDevice;
        const locations = this.allDeviceLocations[deviceId] || [];
        
        if (locations.length === 0) return;
        
        const latest = locations[locations.length - 1];
        const friendlyName = latest.friendly_name || deviceId;
        const color = this.getDeviceColor(deviceId);
        
        // Update device name
        const deviceNameEl = document.getElementById('device-detail-name');
        if (deviceNameEl) deviceNameEl.textContent = friendlyName;
        
        // Update device detail content
        const contentEl = document.getElementById('device-detail-content');
        if (!contentEl) return;
        
        // Calculate status
        const timeDiff = new Date() - new Date(latest.timestamp);
        const isOnline = timeDiff < 5 * 60 * 1000; // 5 minutes
        
        contentEl.innerHTML = `
            <div class="device-detail-info">
                <div class="device-detail-status ${isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i>
                    ${isOnline ? 'Online' : 'Offline'} • ${this.formatTime(latest.timestamp)}
                </div>
                <div class="device-detail-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${latest.lat.toFixed(6)}, ${latest.lon.toFixed(6)}
                </div>
                <div class="device-detail-accuracy">
                    <i class="fas fa-bullseye"></i>
                    Accurate to ±${this.formatAccuracy(latest.accuracy)}
                </div>
            </div>
            
            <div class="device-actions">
                <button class="device-action-btn" onclick="window.findHub.playSound('${deviceId}')">
                    <i class="fas fa-volume-up"></i>
                    <span>Play sound</span>
                </button>
                <button class="device-action-btn" onclick="window.findHub.secureDevice('${deviceId}')">
                    <i class="fas fa-lock"></i>
                    <span>Secure device</span>
                </button>
                <button class="device-action-btn" onclick="window.findHub.eraseDevice('${deviceId}')">
                    <i class="fas fa-trash"></i>
                    <span>Erase device</span>
                </button>
            </div>
            
            <div class="device-history">
                <h4>Location History</h4>
                <div id="device-history-list">
                    ${this.generateHistoryList(locations)}
                </div>
            </div>
        `;
    }
    
    generateHistoryList(locations) {
        if (!locations || locations.length === 0) {
            return '<div style="color: #95a5a6; font-style: italic; padding: 20px;">No location history found</div>';
        }
        
        // Show latest 20 locations, most recent first
        const recentLocations = locations.slice(-20).reverse();
        
        return recentLocations.map(loc => `
            <div class="history-item">
                <div class="history-time">${this.formatTime(loc.timestamp)}</div>
                <div class="history-location">${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}</div>
                <div class="history-accuracy">±${this.formatAccuracy(loc.accuracy)}</div>
            </div>
        `).join('');
    }
    
    // Device action methods (placeholder implementations)
    playSound(deviceId) {
        alert(`Playing sound on ${deviceId}`);
    }
    
    secureDevice(deviceId) {
        if (confirm(`Are you sure you want to secure ${deviceId}?`)) {
            alert(`Securing ${deviceId}`);
        }
    }
    
    eraseDevice(deviceId) {
        if (confirm(`Are you sure you want to erase ${deviceId}? This action cannot be undone.`)) {
            alert(`Erasing ${deviceId}`);
        }
    }
}

// Global functions for HTML event handlers
function refreshLocations() {
    if (window.findHub) {
        window.findHub.loadLocations();
    }
}

function fitAllDevices() {
    if (window.findHub) {
        window.findHub.fitAllDevices();
    }
}

function togglePaths() {
    if (window.findHub) {
        window.findHub.togglePaths();
    }
}

function showDevicesView() {
    if (window.findHub) {
        window.findHub.showDevicesView();
    }
}

function showPeopleView() {
    if (window.findHub) {
        window.findHub.showPeopleView();
    }
}

function goBack() {
    if (window.findHub) {
        window.findHub.goBack();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.findHub = new FindHub();
});