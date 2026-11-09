#!/bin/sh
set -eu

API_URL="${API_URL:-http://localhost:8080}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__CONFIG__ = { API_URL: "${API_URL}" };
EOF

echo "frontend configured with API_URL=${API_URL}"

exec nginx -g 'daemon off;'
