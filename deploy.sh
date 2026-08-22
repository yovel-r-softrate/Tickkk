#!/usr/bin/env bash
set -euo pipefail

VPS_HOST="193.203.161.48"
VPS_USER="root"
REMOTE_DIR="/opt/task-management"

echo "Deploying Task Management (Tickkk) to $VPS_USER@$VPS_HOST:$REMOTE_DIR using Docker Compose..."

# 1. Sync files to VPS
echo "Syncing files..."
rsync -avz --delete \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="dist" \
  --exclude=".angular" \
  --exclude=".DS_Store" \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  ./ $VPS_USER@$VPS_HOST:$REMOTE_DIR

# 2. Rebuild and start Docker containers on VPS
echo "Starting Docker services on VPS..."
ssh -o StrictHostKeyChecking=accept-new $VPS_USER@$VPS_HOST << 'EOF'
  cd /opt/task-management
  
  # Stop existing containers if any, rebuild, and restart
  echo "Rebuilding and starting containers..."
  docker compose up --build -d
  
  # Prune old dangling images to save space
  docker image prune -f
EOF

echo "Deployment complete! ✅"
