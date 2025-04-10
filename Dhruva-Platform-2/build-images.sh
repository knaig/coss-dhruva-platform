#!/bin/bash

# Function to check if image exists
image_exists() {
    docker image inspect "$1" > /dev/null 2>&1
}

# Build server image if it doesn't exist
if ! image_exists "dhruva-platform-server:latest"; then
    echo "Building dhruva-platform-server image..."
    docker build -t dhruva-platform-server:latest ./server
else
    echo "dhruva-platform-server image already exists"
fi

# Build worker image if it doesn't exist
if ! image_exists "dhruva-platform-worker:latest"; then
    echo "Building dhruva-platform-worker image..."
    docker build -t dhruva-platform-worker:latest ./server
else
    echo "dhruva-platform-worker image already exists"
fi

echo "All images are ready" 