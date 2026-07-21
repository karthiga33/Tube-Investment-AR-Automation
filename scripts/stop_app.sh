#!/bin/bash

echo "=== Stopping Application ==="

# Kill backend process
sudo fuser -k 8000/tcp 2>/dev/null || true

echo "=== Application Stopped ==="
