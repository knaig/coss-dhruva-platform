#!/bin/bash

# Set up environment variables
export CUDA_VISIBLE_DEVICES=0
export MODEL_REPOSITORY="/home/ubuntu/model_repository"
export TRITON_SERVER_IMAGE="nvcr.io/nvidia/tritonserver:23.12-py3"

# Create model repository directory if it doesn't exist
mkdir -p $MODEL_REPOSITORY

# Pull the Triton server image
docker pull $TRITON_SERVER_IMAGE

# Run the Triton server container
docker run --gpus=1 \
    --rm \
    --shm-size=1g \
    --ulimit memlock=-1 \
    --ulimit stack=67108864 \
    -p 8000:8000 \
    -p 8001:8001 \
    -p 8002:8002 \
    -v $MODEL_REPOSITORY:/models \
    $TRITON_SERVER_IMAGE \
    tritonserver \
    --model-repository=/models \
    --log-verbose=1 \
    --strict-model-config=false \
    --model-control-mode=poll \
    --repository-poll-secs=30 