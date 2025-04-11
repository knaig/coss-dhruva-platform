#!/bin/bash

# Detect the platform architecture
ARCH=$(uname -m)

# Set the appropriate Docker platform
if [ "$ARCH" = "arm64" ]; then
    export DOCKER_PLATFORM="linux/arm64/v8"
elif [ "$ARCH" = "x86_64" ]; then
    export DOCKER_PLATFORM="linux/amd64"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

echo "Detected architecture: $ARCH"
echo "Setting DOCKER_PLATFORM to: $DOCKER_PLATFORM"

# Make the script executable
chmod +x "$0" 