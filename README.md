# Find Hub - GPS Tracker

A complete GPS tracking solution with Google Find My Device-style interface, Termux logging, server-side processing, and Cloudflare tunnel integration.

## Project Structure

```
gps-tracker/
├── server.py                 # Main Flask application
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container build instructions
├── k8s-manifests.yaml       # Kubernetes deployment configuration
├── static/
│   ├── html/
│   │   └── index.html       # Main web interface
│   ├── css/
│   │   └── style.css        # Styling
│   └── js/
│       └── app.js           # Frontend JavaScript
└── README.md               # This file
```

## Setup Instructions

### 1. Build and Import Docker Image

```bash
# Build the Docker image for the cluster architecture
docker build --platform linux/amd64 -t gps-tracker:latest .

# Import the image directly to K3s cluster
docker save gps-tracker:latest | ssh mgmt-host 'k3s ctr images import -'
```

### 2. Prepare Cloudflare Tunnel

1. Create a Cloudflare tunnel:
   ```bash
   cloudflared tunnel create gps-tracker
   ```

2. Note the tunnel ID from the output

3. Create credentials file and copy to your tunnel auth PVC location

### 3. Configure Kubernetes Secrets

```bash
# Create the tunnel ID secret
kubectl create secret generic cloudflare-tunnel \
  --from-literal=tunnel-id="your-tunnel-id-here"

# If you want to include credentials in the secret:
kubectl create secret generic cloudflare-tunnel \
  --from-literal=tunnel-id="your-tunnel-id-here" \
  --from-file=credentials.json=/path/to/your/credentials.json
```

### 4. Deploy to Kubernetes

```bash
# Create the location namespace if it doesn't exist
kubectl create namespace location

# Update the image reference in k8s.yaml if needed
# Then deploy:
kubectl apply -f k8s.yaml
```

### 5. Set up Tunnel Authentication

Either:
- Mount your `credentials.json` file to the tunnel-auth PVC, or
- Include the credentials in the Kubernetes secret as shown above

### 6. Configure DNS

Point `find.terran.sh` to your Cloudflare tunnel in the Cloudflare dashboard.

## Features

- **Google Find My Device Style Interface**: Clean, modern UI with sidebar navigation
- **Devices & People Views**: Switch between your devices and shared family/friend devices
- **Smart Map Navigation**: Automatically zooms to relevant devices based on context
- **Location History Timeline**: Visual timeline showing recent location updates
- **Device Actions**: Play sound, secure device, and erase device functionality
- **Color-coded Tracking**: Each person gets a unique color palette for their devices
- **Multi-device Support**: Track multiple devices with color-coded paths
- **Auto-refresh**: Updates every 30 seconds
- **Interactive Map**: Click devices to focus, paths show movement history
- **Cloudflare Zero Trust**: Secure access with user identification
- **Persistent Storage**: Logs stored on PVC for durability
- **Health Checks**: Built-in monitoring and health endpoints

## API Endpoints

- `GET /` - Main web interface
- `GET /api/locations` - All recent location data
- `GET /api/latest` - Latest location per device
- `GET /health` - Health check endpoint

## Environment Variables

- `PORT` - Server port (default: 8080)
- `LOG_DIR` - Directory for GPS logs (default: /logs)
- `MAX_AGE_HOURS` - Maximum age for displayed locations (default: 24)
- `TUNNEL_ID` - Cloudflare tunnel ID

## Log Format

CSV format: `timestamp,device_id,latitude,longitude,accuracy`

Example:
```
2025-07-01T12:00:00,phone-123,37.7749,-122.4194,10.5
```

## Termux Setup

Use the GPS service script from the first artifact to automatically log and sync GPS data from your Android device.

## Security Features

- Non-root container execution
- Security contexts and capability dropping
- Read-only tunnel authentication mounting
- Resource limits and health checks

## Test Video Workflow

When a pull request modifies files under `tests/`, a GitHub Actions workflow runs
the changed tests with Playwright video recording enabled. The resulting videos
are uploaded as the `test-videos` artifact and a comment with a direct link to
the artifact panel is posted on the pull request.
