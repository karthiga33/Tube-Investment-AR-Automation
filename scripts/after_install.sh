#!/bin/bash
set -e

echo "=== After Install ==="

# Fix ownership (CodeDeploy copies files as root)
sudo chown -R ec2-user:ec2-user /home/ec2-user/Tube-Project

# Navigate to project
cd /home/ec2-user/Tube-Project/aws-datavalidator

# Install frontend dependencies and build
echo "Installing npm dependencies..."
rm -rf node_modules
npm install

echo "Building React app..."
npm run build

# Install backend dependencies
echo "Installing Python dependencies..."
cd backend
pip3 install -r requirements.txt

echo "=== After Install Complete ==="
