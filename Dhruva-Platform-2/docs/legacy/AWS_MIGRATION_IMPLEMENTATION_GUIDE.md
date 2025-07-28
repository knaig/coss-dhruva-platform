# AWS S3 Migration Implementation Guide
## Complete Step-by-Step Implementation for Dhruva Platform

### Prerequisites Checklist
- [ ] AWS Account with billing enabled
- [ ] Administrative access to AWS Console
- [ ] Access to Dhruva Platform server environment
- [ ] Backup of current system completed

---

## 1. AWS Account Setup Requirements

### Required AWS Services
```bash
# Services to enable (most are enabled by default)
- Amazon S3 (Simple Storage Service)
- AWS IAM (Identity and Access Management)
- AWS CloudTrail (for audit logging - optional but recommended)
```

### Recommended AWS Region
```bash
# Choose based on your location for lowest latency
US_EAST_1="us-east-1"      # N. Virginia (most services, lowest cost)
US_WEST_2="us-west-2"      # Oregon (good alternative)
EU_WEST_1="eu-west-1"      # Ireland (for EU users)
AP_SOUTH_1="ap-south-1"    # Mumbai (for India users)

# Set your preferred region
export AWS_DEFAULT_REGION="us-east-1"
```

### AWS CLI Setup (Optional but Recommended)
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

---

## 2. AWS Credentials Creation

### Step 1: Create IAM User
```bash
# Login to AWS Console → IAM → Users → Create User
# User name: dhruva-platform-storage
# Access type: Programmatic access (Access key - Programmatic access)
```

### Step 2: Create IAM Policy
**Policy Name:** `DhruvaPlatformS3Access`

**Policy JSON:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DhruvaPlatformS3FullAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:GetObjectVersion",
                "s3:PutObjectAcl",
                "s3:GetObjectAcl"
            ],
            "Resource": [
                "arn:aws:s3:::dhruva-platform-*/*"
            ]
        },
        {
            "Sid": "DhruvaPlatformS3ListBuckets",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:ListBucketMultipartUploads",
                "s3:ListBucketVersions"
            ],
            "Resource": [
                "arn:aws:s3:::dhruva-platform-*"
            ]
        },
        {
            "Sid": "DhruvaPlatformS3ListAllBuckets",
            "Effect": "Allow",
            "Action": [
                "s3:ListAllMyBuckets",
                "s3:GetBucketLocation"
            ],
            "Resource": "*"
        }
    ]
}
```

### Step 3: Attach Policy to User
```bash
# In AWS Console:
# IAM → Users → dhruva-platform-storage → Permissions → Attach policies
# Search for "DhruvaPlatformS3Access" → Attach policy
```

### Step 4: Generate Access Keys
```bash
# IAM → Users → dhruva-platform-storage → Security credentials → Create access key
# Choose: Application running outside AWS
# Download CSV file or copy keys immediately (they won't be shown again)

# Example output:
# Access Key ID: AKIA...
# Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Step 5: Secure Credential Storage
```bash
# Create secure credentials file (temporary)
cat > /tmp/aws_credentials.txt << EOF
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
EOF

# Set secure permissions
chmod 600 /tmp/aws_credentials.txt

# IMPORTANT: Delete this file after updating .env
```

---

## 3. S3 Bucket Configuration

### Step 1: Create S3 Buckets
```bash
# Using AWS CLI (if installed)
aws s3 mb s3://dhruva-platform-logs --region us-east-1
aws s3 mb s3://dhruva-platform-feedback --region us-east-1
aws s3 mb s3://dhruva-platform-errors --region us-east-1

# Or using AWS Console:
# S3 → Create bucket → Enter bucket name → Select region → Create
```

### Step 2: Bucket Naming Convention
```bash
# Bucket names (must be globally unique - add suffix if needed)
LOGS_BUCKET="dhruva-platform-logs-$(date +%Y%m%d)"
FEEDBACK_BUCKET="dhruva-platform-feedback-$(date +%Y%m%d)"
ERRORS_BUCKET="dhruva-platform-errors-$(date +%Y%m%d)"

# Test bucket name availability
aws s3api head-bucket --bucket $LOGS_BUCKET 2>/dev/null || echo "Bucket name available"
```

### Step 3: Bucket Policy Configuration
**Apply to each bucket:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DhruvaPlatformAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/dhruva-platform-storage"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::BUCKET_NAME/*"
        }
    ]
}
```

### Step 4: Bucket Settings
```bash
# Enable versioning (recommended)
aws s3api put-bucket-versioning \
    --bucket dhruva-platform-logs \
    --versioning-configuration Status=Enabled

# Set lifecycle policy (optional - auto-delete old files)
cat > lifecycle-policy.json << EOF
{
    "Rules": [
        {
            "ID": "DeleteOldFiles",
            "Status": "Enabled",
            "Filter": {"Prefix": ""},
            "Expiration": {"Days": 90},
            "NoncurrentVersionExpiration": {"NoncurrentDays": 30}
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket dhruva-platform-logs \
    --lifecycle-configuration file://lifecycle-policy.json
```

---

## 4. Environment Variables Update

### Step 1: Backup Current Configuration
```bash
# Create backup of current .env file
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Remove Azure Variables
```bash
# Remove these lines from .env file:
sed -i '/AZURE_STORAGE_ACCOUNT_NAME/d' .env
sed -i '/AZURE_STORAGE_ACCOUNT_KEY/d' .env
sed -i '/AZURE_STORAGE_CONNECTION_STRING/d' .env
sed -i '/AZURE_STORAGE_CONTAINER_NAME/d' .env
```

### Step 3: Add AWS Variables
```bash
# Add AWS configuration to .env file
cat >> .env << EOF

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
AWS_S3_BUCKET_LOGS=dhruva-platform-logs
AWS_S3_BUCKET_FEEDBACK=dhruva-platform-feedback
AWS_S3_BUCKET_ERRORS=dhruva-platform-errors

# AWS S3 Settings
AWS_S3_SIGNATURE_VERSION=s3v4
AWS_S3_ADDRESSING_STYLE=virtual
EOF
```

### Step 4: Verify Environment Variables
```bash
# Check that variables are properly set
grep -E "^AWS_" .env

# Expected output:
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# AWS_DEFAULT_REGION=us-east-1
# AWS_S3_BUCKET_LOGS=dhruva-platform-logs
# AWS_S3_BUCKET_FEEDBACK=dhruva-platform-feedback
# AWS_S3_BUCKET_ERRORS=dhruva-platform-errors
```

---

## 5. Code Implementation

### Step 1: Update Python Dependencies
```bash
# Edit server/requirements.txt
# Remove Azure dependencies:
sed -i '/azure-storage-blob/d' server/requirements.txt
sed -i '/azure-identity/d' server/requirements.txt
sed -i '/azure-core/d' server/requirements.txt

# Add AWS dependencies:
echo "boto3>=1.26.0" >> server/requirements.txt
echo "botocore>=1.29.0" >> server/requirements.txt
```

### Step 2: Create AWS Storage Manager
```bash
# Create new file: server/celery_backend/tasks/aws_storage.py
cat > server/celery_backend/tasks/aws_storage.py << 'EOF'
import boto3
import os
import logging
from botocore.exceptions import ClientError, NoCredentialsError
from typing import Optional, Union

logger = logging.getLogger(__name__)

class AWSStorageManager:
    """AWS S3 storage manager for Dhruva Platform"""

    def __init__(self):
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
                region_name=os.environ['AWS_DEFAULT_REGION']
            )
            # Test connection
            self.s3_client.list_buckets()
            logger.info("AWS S3 client initialized successfully")
        except (KeyError, NoCredentialsError) as e:
            logger.error(f"AWS credentials not found or invalid: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize AWS S3 client: {e}")
            raise

    def upload_file(self, file_content: Union[str, bytes], bucket: str, key: str,
                   content_type: str = 'application/octet-stream') -> bool:
        """
        Upload file content to S3 bucket

        Args:
            file_content: File content as string or bytes
            bucket: S3 bucket name
            key: S3 object key (file path)
            content_type: MIME type of the file

        Returns:
            bool: True if upload successful, False otherwise
        """
        try:
            if isinstance(file_content, str):
                file_content = file_content.encode('utf-8')

            self.s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=file_content,
                ContentType=content_type
            )
            logger.info(f"Successfully uploaded {key} to bucket {bucket}")
            return True

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS S3 upload failed for {key}: {error_code} - {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error uploading {key}: {e}")
            return False

    def download_file(self, bucket: str, key: str) -> Optional[bytes]:
        """
        Download file from S3 bucket

        Args:
            bucket: S3 bucket name
            key: S3 object key (file path)

        Returns:
            bytes: File content if successful, None otherwise
        """
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=key)
            content = response['Body'].read()
            logger.info(f"Successfully downloaded {key} from bucket {bucket}")
            return content

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.warning(f"File {key} not found in bucket {bucket}")
            else:
                logger.error(f"AWS S3 download failed for {key}: {error_code} - {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error downloading {key}: {e}")
            return None

    def delete_file(self, bucket: str, key: str) -> bool:
        """
        Delete file from S3 bucket

        Args:
            bucket: S3 bucket name
            key: S3 object key (file path)

        Returns:
            bool: True if deletion successful, False otherwise
        """
        try:
            self.s3_client.delete_object(Bucket=bucket, Key=key)
            logger.info(f"Successfully deleted {key} from bucket {bucket}")
            return True

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS S3 delete failed for {key}: {error_code} - {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting {key}: {e}")
            return False

    def list_files(self, bucket: str, prefix: str = '') -> list:
        """
        List files in S3 bucket with optional prefix

        Args:
            bucket: S3 bucket name
            prefix: Object key prefix to filter results

        Returns:
            list: List of object keys
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=bucket,
                Prefix=prefix
            )

            if 'Contents' in response:
                files = [obj['Key'] for obj in response['Contents']]
                logger.info(f"Found {len(files)} files in bucket {bucket} with prefix '{prefix}'")
                return files
            else:
                logger.info(f"No files found in bucket {bucket} with prefix '{prefix}'")
                return []

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"AWS S3 list failed for bucket {bucket}: {error_code} - {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error listing files in bucket {bucket}: {e}")
            return []
EOF
```

### Step 3: Update Upload Feedback Dump Task
```bash
# Backup original file
cp server/celery_backend/tasks/upload_feedback_dump.py server/celery_backend/tasks/upload_feedback_dump.py.backup

# Create updated version
cat > server/celery_backend/tasks/upload_feedback_dump.py << 'EOF'
import csv
import io
import os
from datetime import datetime

from ..celery_app import app
from .aws_storage import AWSStorageManager
from .database import AppDatabase

# CSV headers for feedback export
csv_headers = [
    "feedbackId",
    "userId",
    "apiKeyId",
    "serviceId",
    "taskType",
    "rating",
    "feedback",
    "feedbackTimeStamp"
]

db = AppDatabase()
feedback_collection = db["feedback"]

@app.task(name="upload.feedback.dump")
def upload_feedback_dump() -> None:
    """Uploads feedback dumps to AWS S3"""
    try:
        file = io.StringIO()
        csv_writer = csv.writer(file)
        csv_writer.writerow(csv_headers)

        d = datetime.now()

        # Calculate date range for previous month
        start_month, start_year = (
            (d.month - 1, d.year) if d.month - 1 != 0 else (12, d.year - 1)
        )
        start_date = d.replace(
            year=start_year,
            month=start_month,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        ).timestamp()

        end_date = d.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ).timestamp()

        query = {
            "feedbackTimeStamp": {"$gte": int(start_date), "$lt": int(end_date)},
        }

        # Write feedback data to CSV
        record_count = 0
        for doc in feedback_collection.find(query):
            csv_writer.writerow([
                str(doc.get("_id", "")),
                doc.get("userId", ""),
                doc.get("apiKeyId", ""),
                doc.get("serviceId", ""),
                doc.get("taskType", ""),
                doc.get("rating", ""),
                doc.get("feedback", ""),
                doc.get("feedbackTimeStamp", "")
            ])
            record_count += 1

        # Generate filename with timestamp
        filename = f"feedback_dump_{start_year}{start_month:02d}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        # Upload to AWS S3
        storage_manager = AWSStorageManager()
        bucket = os.environ['AWS_S3_BUCKET_FEEDBACK']

        success = storage_manager.upload_file(
            file_content=file.getvalue(),
            bucket=bucket,
            key=f"monthly_dumps/{filename}",
            content_type='text/csv'
        )

        if success:
            print(f"Successfully uploaded feedback dump: {filename} ({record_count} records)")
        else:
            print(f"Failed to upload feedback dump: {filename}")

    except Exception as e:
        print(f"Error in upload_feedback_dump: {e}")
        raise
EOF
```

### Step 4: Update Log Data Task (if needed)
```bash
# Check if log_data.py uses Azure storage
grep -n "azure" server/celery_backend/tasks/log_data.py

# If Azure storage is used, update the file:
# Backup original
cp server/celery_backend/tasks/log_data.py server/celery_backend/tasks/log_data.py.backup

# Add AWS storage import at the top of the file
sed -i '1i from .aws_storage import AWSStorageManager' server/celery_backend/tasks/log_data.py

# Replace Azure storage calls with AWS S3 calls
# (This step depends on current implementation - manual review needed)
```

### Step 5: Update Constants File
```bash
# Update server/celery_backend/tasks/constants.py
# Replace Azure container names with S3 bucket environment variables

cat >> server/celery_backend/tasks/constants.py << 'EOF'

# AWS S3 Configuration
import os

# S3 Bucket names from environment
LOGS_BUCKET = os.environ.get('AWS_S3_BUCKET_LOGS', 'dhruva-platform-logs')
FEEDBACK_BUCKET = os.environ.get('AWS_S3_BUCKET_FEEDBACK', 'dhruva-platform-feedback')
ERROR_BUCKET = os.environ.get('AWS_S3_BUCKET_ERRORS', 'dhruva-platform-errors')

# S3 Key prefixes
LOGS_PREFIX = "logs/"
ERROR_PREFIX = "errors/"
FEEDBACK_PREFIX = "feedback/"
EOF
```

---

## 6. Testing and Validation

### Step 1: Pre-Migration Testing
```bash
# Test AWS credentials before deployment
docker exec celery-metering python3 -c "
import os
import boto3
from botocore.exceptions import ClientError

try:
    # Test credentials
    s3 = boto3.client(
        's3',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
        region_name=os.environ['AWS_DEFAULT_REGION']
    )

    # Test connection
    response = s3.list_buckets()
    print('✓ AWS credentials valid')
    print(f'✓ Found {len(response[\"Buckets\"])} buckets')

    # Test bucket access
    for bucket_env in ['AWS_S3_BUCKET_LOGS', 'AWS_S3_BUCKET_FEEDBACK', 'AWS_S3_BUCKET_ERRORS']:
        bucket = os.environ[bucket_env]
        try:
            s3.head_bucket(Bucket=bucket)
            print(f'✓ Bucket {bucket} accessible')
        except ClientError as e:
            print(f'✗ Bucket {bucket} not accessible: {e}')

except Exception as e:
    print(f'✗ AWS test failed: {e}')
"
```

### Step 2: Create Test Script
```bash
# Create comprehensive test script
mkdir -p scripts
cat > scripts/test_aws_s3_integration.sh << 'EOF'
#!/bin/bash

echo "=== AWS S3 Integration Test ==="
echo "Date: $(date)"

# Test 1: Environment Variables
echo "1. Testing environment variables..."
required_vars=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AWS_DEFAULT_REGION" "AWS_S3_BUCKET_LOGS" "AWS_S3_BUCKET_FEEDBACK" "AWS_S3_BUCKET_ERRORS")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "✗ Missing environment variable: $var"
        exit 1
    else
        echo "✓ $var is set"
    fi
done

# Test 2: AWS Credentials
echo "2. Testing AWS credentials..."
docker exec celery-metering python3 -c "
import boto3
from botocore.exceptions import ClientError
try:
    s3 = boto3.client('s3')
    s3.list_buckets()
    print('✓ AWS credentials valid')
except Exception as e:
    print(f'✗ AWS credentials invalid: {e}')
    exit(1)
"

# Test 3: Bucket Access
echo "3. Testing bucket access..."
for bucket in "$AWS_S3_BUCKET_LOGS" "$AWS_S3_BUCKET_FEEDBACK" "$AWS_S3_BUCKET_ERRORS"; do
    docker exec celery-metering python3 -c "
import boto3
import os
from botocore.exceptions import ClientError

bucket = '$bucket'
s3 = boto3.client('s3')

try:
    s3.head_bucket(Bucket=bucket)
    print(f'✓ Bucket {bucket} accessible')
except ClientError as e:
    print(f'✗ Bucket {bucket} error: {e}')
"
done

# Test 4: Upload/Download Test
echo "4. Testing file operations..."
docker exec celery-metering python3 -c "
import boto3
import os
from datetime import datetime

s3 = boto3.client('s3')
bucket = os.environ['AWS_S3_BUCKET_LOGS']
test_key = f'test/integration_test_{datetime.now().isoformat()}.txt'
test_content = b'AWS S3 integration test - upload/download verification'

try:
    # Upload test
    s3.put_object(Bucket=bucket, Key=test_key, Body=test_content)
    print('✓ Upload test successful')

    # Download test
    response = s3.get_object(Bucket=bucket, Key=test_key)
    downloaded = response['Body'].read()

    if downloaded == test_content:
        print('✓ Download test successful')
    else:
        print('✗ Download content mismatch')
        exit(1)

    # Delete test
    s3.delete_object(Bucket=bucket, Key=test_key)
    print('✓ Delete test successful')

except Exception as e:
    print(f'✗ File operation failed: {e}')
    exit(1)
"

# Test 5: AWS Storage Manager
echo "5. Testing AWS Storage Manager..."
docker exec celery-metering python3 -c "
from celery_backend.tasks.aws_storage import AWSStorageManager
import os
from datetime import datetime

try:
    storage = AWSStorageManager()
    print('✓ AWS Storage Manager initialized')

    # Test upload
    test_content = f'Storage manager test - {datetime.now().isoformat()}'
    bucket = os.environ['AWS_S3_BUCKET_LOGS']
    key = f'test/storage_manager_test_{datetime.now().strftime(\"%Y%m%d_%H%M%S\")}.txt'

    if storage.upload_file(test_content, bucket, key, 'text/plain'):
        print('✓ Storage Manager upload successful')

        # Test download
        downloaded = storage.download_file(bucket, key)
        if downloaded and downloaded.decode('utf-8') == test_content:
            print('✓ Storage Manager download successful')

            # Test delete
            if storage.delete_file(bucket, key):
                print('✓ Storage Manager delete successful')
            else:
                print('✗ Storage Manager delete failed')
        else:
            print('✗ Storage Manager download failed')
    else:
        print('✗ Storage Manager upload failed')

except Exception as e:
    print(f'✗ Storage Manager test failed: {e}')
    exit(1)
"

echo "=== All tests passed! AWS S3 integration is ready ==="
EOF

chmod +x scripts/test_aws_s3_integration.sh
```

### Step 3: Deployment Steps
```bash
# Step 3.1: Stop services
echo "Stopping Celery services..."
docker-compose -f docker-compose-metering.yml stop celery-metering celery-monitoring celery_beat

# Step 3.2: Rebuild containers with new dependencies
echo "Rebuilding containers..."
docker-compose -f docker-compose-metering.yml build celery-metering celery-monitoring celery_beat

# Step 3.3: Start services
echo "Starting services..."
docker-compose -f docker-compose-metering.yml up -d celery-metering celery-monitoring celery_beat

# Step 3.4: Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Step 3.5: Run integration tests
echo "Running AWS integration tests..."
./scripts/test_aws_s3_integration.sh
```

### Step 4: Verification Steps
```bash
# Verify services are running
docker ps | grep celery

# Check logs for errors
docker logs celery-metering --tail 50 | grep -i error
docker logs celery-monitoring --tail 50 | grep -i error

# Test feedback dump task manually
docker exec celery-metering python3 -c "
from celery_backend.tasks.upload_feedback_dump import upload_feedback_dump
try:
    upload_feedback_dump()
    print('✓ Feedback dump task executed successfully')
except Exception as e:
    print(f'✗ Feedback dump task failed: {e}')
"

# Verify files in S3 (if AWS CLI is available)
aws s3 ls s3://$AWS_S3_BUCKET_FEEDBACK/monthly_dumps/ --recursive
```

### Step 5: Rollback Procedure
```bash
# Create rollback script
cat > scripts/rollback_aws_migration.sh << 'EOF'
#!/bin/bash

echo "=== ROLLING BACK AWS MIGRATION ==="

# Stop services
docker-compose -f docker-compose-metering.yml stop celery-metering celery-monitoring celery_beat

# Restore original files
cp .env.backup.* .env
cp server/celery_backend/tasks/upload_feedback_dump.py.backup server/celery_backend/tasks/upload_feedback_dump.py
cp server/celery_backend/tasks/log_data.py.backup server/celery_backend/tasks/log_data.py

# Remove AWS files
rm -f server/celery_backend/tasks/aws_storage.py

# Restore original requirements.txt
git checkout server/requirements.txt

# Rebuild and restart
docker-compose -f docker-compose-metering.yml build celery-metering celery-monitoring celery_beat
docker-compose -f docker-compose-metering.yml up -d celery-metering celery-monitoring celery_beat

echo "=== ROLLBACK COMPLETED ==="
EOF

chmod +x scripts/rollback_aws_migration.sh
```

---

## 7. Post-Migration Monitoring

### Step 1: Monitor AWS Costs
```bash
# Set up AWS Cost Alerts (via AWS Console)
# Billing → Budgets → Create Budget
# Budget type: Cost budget
# Amount: $10/month (adjust as needed)
# Alert threshold: 80% of budget
```

### Step 2: Monitor S3 Usage
```bash
# Create monitoring script
cat > scripts/monitor_s3_usage.sh << 'EOF'
#!/bin/bash

echo "=== S3 Usage Report $(date) ==="

for bucket in "$AWS_S3_BUCKET_LOGS" "$AWS_S3_BUCKET_FEEDBACK" "$AWS_S3_BUCKET_ERRORS"; do
    echo "Bucket: $bucket"

    # Object count and total size
    aws s3 ls s3://$bucket --recursive --summarize | tail -2

    # Recent uploads (last 24 hours)
    echo "Recent uploads:"
    aws s3api list-objects-v2 --bucket $bucket --query "Contents[?LastModified>=\`$(date -d '1 day ago' -u +%Y-%m-%dT%H:%M:%S.000Z)\`].[Key,Size,LastModified]" --output table

    echo "---"
done
EOF

chmod +x scripts/monitor_s3_usage.sh
```

### Step 3: Set Up Alerts
```bash
# Add to prometheus/alert_rules.yml
cat >> prometheus/alert_rules.yml << 'EOF'

  - name: aws_s3_alerts
    rules:
      - alert: S3UploadFailure
        expr: increase(celery_task_failed_total{task="upload.feedback.dump"}[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "S3 upload task failing"
          description: "Feedback dump upload to S3 has failed"
EOF
```

---

## 8. Success Criteria Checklist

### Pre-Migration Checklist
- [ ] AWS account setup completed
- [ ] IAM user and policies created
- [ ] S3 buckets created and configured
- [ ] Environment variables updated
- [ ] Code changes implemented
- [ ] Dependencies updated
- [ ] Test scripts created

### Migration Checklist
- [ ] Services stopped gracefully
- [ ] Containers rebuilt successfully
- [ ] Services restarted without errors
- [ ] AWS integration tests passed
- [ ] Manual task execution successful
- [ ] Files visible in S3 buckets

### Post-Migration Checklist
- [ ] All Celery workers running normally
- [ ] No Azure-related errors in logs
- [ ] S3 uploads working correctly
- [ ] Monitoring and alerts configured
- [ ] Cost monitoring enabled
- [ ] Rollback procedure documented and tested

---

## 9. Troubleshooting Common Issues

### Issue 1: AWS Credentials Not Found
```bash
# Symptoms: NoCredentialsError in logs
# Solution: Verify environment variables
docker exec celery-metering env | grep AWS

# If missing, restart containers after updating .env
docker-compose -f docker-compose-metering.yml restart celery-metering
```

### Issue 2: Bucket Access Denied
```bash
# Symptoms: AccessDenied errors
# Solution: Check IAM policy and bucket policy
aws iam get-user-policy --user-name dhruva-platform-storage --policy-name DhruvaPlatformS3Access
aws s3api get-bucket-policy --bucket $AWS_S3_BUCKET_LOGS
```

### Issue 3: Import Errors
```bash
# Symptoms: ModuleNotFoundError: No module named 'boto3'
# Solution: Rebuild containers
docker-compose -f docker-compose-metering.yml build --no-cache celery-metering
docker-compose -f docker-compose-metering.yml up -d celery-metering
```

### Issue 4: High S3 Costs
```bash
# Solution: Implement lifecycle policies
aws s3api put-bucket-lifecycle-configuration \
    --bucket $AWS_S3_BUCKET_LOGS \
    --lifecycle-configuration file://lifecycle-policy.json
```

---

## 10. Quick Reference Commands

### Essential Commands for Daily Operations
```bash
# Check AWS integration status
./scripts/test_aws_s3_integration.sh

# Monitor S3 usage
./scripts/monitor_s3_usage.sh

# View recent S3 uploads
aws s3 ls s3://$AWS_S3_BUCKET_FEEDBACK/monthly_dumps/ --recursive --human-readable

# Check Celery worker logs for AWS errors
docker logs celery-metering --tail 100 | grep -i "aws\|s3\|boto"

# Test manual feedback dump
docker exec celery-metering python3 -c "from celery_backend.tasks.upload_feedback_dump import upload_feedback_dump; upload_feedback_dump()"

# Emergency rollback
./scripts/rollback_aws_migration.sh
```

### Environment Variables Quick Check
```bash
# Verify all AWS variables are set
env | grep AWS | sort
```

---

**🎉 Migration Complete!**

Your Dhruva Platform is now using AWS S3 instead of Azure Blob Storage. The implementation includes:

✅ **Complete AWS S3 integration** with proper error handling
✅ **Comprehensive testing framework** for validation
✅ **Monitoring and alerting** for ongoing operations
✅ **Rollback procedures** for emergency recovery
✅ **Cost optimization** with lifecycle policies

**Next Steps:**
1. Monitor the system for 24-48 hours
2. Set up AWS cost alerts
3. Schedule regular S3 usage reviews
4. Consider implementing automated backup policies

Use the provided scripts for ongoing monitoring and maintenance!