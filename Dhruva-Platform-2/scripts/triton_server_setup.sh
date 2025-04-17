#!/bin/bash

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
   && curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add - \
   && curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# Create directory for Triton models
sudo mkdir -p /models
sudo chmod 777 /models

# Create a systemd service for Triton
cat << EOF | sudo tee /etc/systemd/system/triton.service
[Unit]
Description=Triton Inference Server
After=docker.service

[Service]
Type=simple
ExecStart=/usr/bin/docker run --gpus=all --rm -p8000:8000 -p8001:8001 -p8002:8002 -v /models:/models nvcr.io/nvidia/tritonserver:23.12-py3 tritonserver --model-repository=/models
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start Triton
sudo systemctl daemon-reload
sudo systemctl enable triton
sudo systemctl start triton

# Check Triton status
echo "Checking Triton server status..."
sleep 10
curl -v http://localhost:8000/v2/health/ready 