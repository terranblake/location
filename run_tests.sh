#!/bin/bash
set -e
PORT=8081
python3 -m http.server $PORT -d static >/tmp/server.log 2>&1 &
server_pid=$!
# give server time to start
sleep 2
BASE_URL=http://localhost:$PORT npx cypress run --browser electron --config video=false
kill $server_pid 2>/dev/null || true
