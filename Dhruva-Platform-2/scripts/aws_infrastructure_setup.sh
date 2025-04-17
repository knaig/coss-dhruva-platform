#!/bin/bash

# Create security group
echo "Creating security group..."
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
    --group-name "triton-server-sg" \
    --description "Security group for Triton Inference Server" \
    --vpc-id "vpc-071037d1572befa17" \
    --query 'GroupId' \
    --output text)

echo "Security group created with ID: $SECURITY_GROUP_ID"

# Add rules for all required ports
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

# Launch EC2 instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "ami-0f5d1713c9af4fe30" \
    --instance-type "p3.2xlarge" \
    --block-device-mappings '{"DeviceName":"/dev/sda1","Ebs":{"Encrypted":false,"DeleteOnTermination":true,"Iops":3000,"SnapshotId":"snap-00c99099911ce655c","VolumeSize":64,"VolumeType":"gp3","Throughput":125}}' \
    --network-interfaces "AssociatePublicIpAddress=true,DeviceIndex=0,Groups=[$SECURITY_GROUP_ID]" \
    --tag-specifications '{"ResourceType":"instance","Tags":[{"Key":"Name","Value":"My triton inference server"}]}' \
    --metadata-options '{"HttpEndpoint":"enabled","HttpPutResponseHopLimit":2,"HttpTokens":"required"}' \
    --private-dns-name-options '{"HostnameType":"ip-name","EnableResourceNameDnsARecord":true,"EnableResourceNameDnsAAAARecord":false}' \
    --count 1 \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance launched with ID: $INSTANCE_ID"

# Wait for instance to be running
echo "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

# Get public IP address
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance is running with public IP: $PUBLIC_IP"
echo "You can now SSH into the instance using:"
echo "ssh -i your-key.pem ubuntu@$PUBLIC_IP" 