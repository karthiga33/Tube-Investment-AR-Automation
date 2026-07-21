#!/bin/bash
set -e

echo "=== Starting Application ==="

# Kill existing backend process
sudo fuser -k 8000/tcp 2>/dev/null || true
sleep 2

# Start backend
cd /home/ec2-user/Tube-Project/aws-datavalidator/backend
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &

echo "Backend started on port 8000"
echo "=== Application Start Complete ==="
