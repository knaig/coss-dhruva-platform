#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check AWS CLI configuration
check_aws_config() {
    if ! command_exists aws; then
        echo "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws configure get aws_access_key_id >/dev/null 2>&1; then
        echo "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
}

# Function to create and configure security group
setup_security_group() {
    echo "Creating security group..."
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name "triton-server-sg" \
        --description "Security group for Triton Inference Server" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' \
        --output text)

    echo "Security group created with ID: $SECURITY_GROUP_ID"

    echo "Adding security group rules..."
    aws ec2 authorize-security-group-ingress \
        --group-id "$SECURITY_GROUP_ID" \
        --ip-permissions \
        '[
            {
                "IpProtocol": "tcp",
                "FromPort": 22,
                "ToPort": 22,
                "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
            },
            {
                "IpProtocol": "tcp",
                "FromPort": 8000,
                "ToPort": 8000,
                "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
            },
            {
                "IpProtocol": "tcp",
                "FromPort": 8001,
                "ToPort": 8001,
                "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
            },
            {
                "IpProtocol": "tcp",
                "FromPort": 8002,
                "ToPort": 8002,
                "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
            }
        ]'

    echo "Security group rules added successfully"
}

# Function to launch EC2 instance
launch_ec2_instance() {
    echo "Launching EC2 instance..."
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --block-device-mappings '{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}' \
        --network-interfaces "AssociatePublicIpAddress=true,DeviceIndex=0,Groups=[$SECURITY_GROUP_ID]" \
        --tag-specifications '{"ResourceType":"instance","Tags":[{"Key":"Name","Value":"Triton Inference Server"}]}' \
        --query 'Instances[0].InstanceId' \
        --output text)

    echo "Instance launched with ID: $INSTANCE_ID"

    echo "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)

    echo "Instance is running with public IP: $PUBLIC_IP"
}

# Function to setup Triton server
setup_triton_server() {
    echo "Setting up Triton server..."
    
    # Create setup script for the instance
    cat > setup_instance.sh << 'EOF'
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

# Create systemd service for Triton
cat << 'EEOF' | sudo tee /etc/systemd/system/triton.service
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
EEOF

# Start Triton service
sudo systemctl daemon-reload
sudo systemctl enable triton
sudo systemctl start triton

# Install Python and pip
sudo apt-get install -y python3-pip

# Install Triton client
pip3 install tritonclient[all]

echo "Triton server setup completed!"
EOF

    # Copy setup script to instance and execute
    chmod +x setup_instance.sh
    scp -i "$KEY_PATH" -o StrictHostKeyChecking=no setup_instance.sh ubuntu@$PUBLIC_IP:~/
    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP 'bash setup_instance.sh'
    rm setup_instance.sh
}

# Main script
echo "Starting Triton server setup on AWS..."

# Check AWS CLI
check_aws_config

# Configuration
read -p "Enter your AWS region (e.g., ap-south-1): " AWS_REGION
read -p "Enter your VPC ID: " VPC_ID
read -p "Enter your SSH key pair name: " KEY_NAME
read -p "Enter the path to your SSH key file (.pem): " KEY_PATH
read -p "Enter AMI ID (press enter for default Ubuntu 20.04 with NVIDIA drivers): " AMI_ID
AMI_ID=${AMI_ID:-ami-0f5d1713c9af4fe30}  # Default AMI ID
read -p "Enter instance type (press enter for g4dn.xlarge): " INSTANCE_TYPE
INSTANCE_TYPE=${INSTANCE_TYPE:-g4dn.xlarge}  # Default instance type

# Export AWS region
export AWS_DEFAULT_REGION=$AWS_REGION

# Setup security group
setup_security_group

# Launch EC2 instance
launch_ec2_instance

# Setup Triton server
setup_triton_server

echo "Setup completed successfully!"
echo "Triton server is accessible at: http://$PUBLIC_IP:8000"
echo "Health check endpoint: http://$PUBLIC_IP:8000/v2/health/ready"
echo "Metrics endpoint: http://$PUBLIC_IP:8002/metrics"
echo ""
echo "To SSH into the instance:"
echo "ssh -i $KEY_PATH ubuntu@$PUBLIC_IP" 