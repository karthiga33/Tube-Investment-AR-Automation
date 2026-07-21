#!/bin/bash

echo "=== Stopping Application ==="

# Backup .env before deploy overwrites it
if [ -f /home/ec2-user/Tube-Project/aws-datavalidator/backend/.env ]; then
    cp /home/ec2-user/Tube-Project/aws-datavalidator/backend/.env /tmp/.env.backup
    echo "Backed up .env"
fi

# Kill backend process
sudo fuser -k 8000/tcp 2>/dev/null || true

echo "=== Application Stopped ==="
