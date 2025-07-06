FROM python:3.11-slim

# Install system dependencies including cloudflared
RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install cloudflared
RUN wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    && chmod +x cloudflared-linux-amd64 \
    && mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Set working directory
WORKDIR /app

# Install Python dependencies
RUN pip install --no-cache-dir flask

# Create necessary directories
RUN mkdir -p /logs /tunnel-auth static/html static/css static/js

# Copy application files
COPY server.py .
COPY static/ static/

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start cloudflared tunnel in background if tunnel ID is provided\n\
if [ ! -z "$TUNNEL_ID" ]; then\n\
    echo "Starting Cloudflare tunnel: $TUNNEL_ID"\n\
    cloudflared tunnel --config /tunnel-config/config.yml run $TUNNEL_ID &\n\
    TUNNEL_PID=$!\n\
    echo "Tunnel started with PID: $TUNNEL_PID"\n\
else\n\
    echo "No TUNNEL_ID provided, skipping tunnel startup"\n\
fi\n\
\n\
# Start the Flask application\n\
echo "Starting GPS tracker server on port $PORT"\n\
exec python3 server.py' > /app/start.sh

RUN chmod +x /app/start.sh

# Set default environment variables
ENV PORT=8080
ENV LOG_DIR=/logs
ENV MAX_AGE_HOURS=24

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:$PORT/health')"

# Start script
CMD ["/app/start.sh"]