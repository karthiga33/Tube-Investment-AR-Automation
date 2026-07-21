#!/bin/bash
set -e

echo "=== After Install ==="

# Navigate to project
cd /home/ec2-user/Tube-Project/aws-datavalidator

# Install frontend dependencies and build
echo "Installing npm dependencies..."
npm ci --production=false

echo "Building React app..."
npm run build

# Install backend dependencies
echo "Installing Python dependencies..."
cd backend
pip3 install -r requirements.txt

echo "=== After Install Complete ==="
