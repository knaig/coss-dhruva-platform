#!/bin/bash

# Security Remediation Script - Remove Hardcoded Credentials
# This script sanitizes all documentation files to remove exposed passwords

echo "🔒 Starting credential sanitization process..."

# Define the files that need sanitization
FILES_TO_SANITIZE=(
    "METERING_SYSTEM_DIAGNOSTIC_REPORT.md"
    "END_TO_END_METERING_TEST_RESULTS.md"
    "AUTHENTICATION_AUTHORIZATION_SYSTEM.md"
    "CLOUD_STORAGE_DEPENDENCY_ANALYSIS.md"
    "QUICK_REFERENCE.md"
    "DHRUVA_METERING_SYSTEM_DOCUMENTATION.md"
    "DHRUVA_METERING_BUSINESS_OVERVIEW.md"
    "COMPREHENSIVE_METERING_VERIFICATION_RESULTS.md"
    "METERING_QUICK_REFERENCE.md"
)

# Backup original files
echo "📁 Creating backup of original files..."
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Function to sanitize a file
sanitize_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo "🔧 Sanitizing $file..."
        
        # Create backup
        cp "$file" "$BACKUP_DIR/"
        
        # Replace hardcoded credentials with environment variables
        sed -i 's/dhruva123/\${MONGO_APP_DB_PASSWORD}/g' "$file"
        sed -i 's/dhruvaadmin/\${MONGO_APP_DB_USERNAME}/g' "$file"
        sed -i 's/--password \${MONGO_APP_DB_PASSWORD}/--password \$MONGO_APP_DB_PASSWORD/g' "$file"
        sed -i 's/--username \${MONGO_APP_DB_USERNAME}/--username \$MONGO_APP_DB_USERNAME/g' "$file"
        
        # Replace connection strings
        sed -i 's|mongodb://dhruvaadmin:dhruva123@|mongodb://\$MONGO_APP_DB_USERNAME:\$MONGO_APP_DB_PASSWORD@|g' "$file"
        sed -i 's|mongodb://\${MONGO_APP_DB_USERNAME}:\${MONGO_APP_DB_PASSWORD}@|mongodb://\$MONGO_APP_DB_USERNAME:\$MONGO_APP_DB_PASSWORD@|g' "$file"
        
        # Add security notice at the top of files
        if ! grep -q "SECURITY NOTICE" "$file"; then
            echo "Adding security notice to $file..."
            cat > temp_file << 'EOF'
> **🔒 SECURITY NOTICE**: This documentation contains examples with placeholder credentials. 
> Always use environment variables for actual passwords. Never commit real credentials to version control.

EOF
            cat "$file" >> temp_file
            mv temp_file "$file"
        fi
        
        echo "✅ Sanitized $file"
    else
        echo "⚠️  File not found: $file"
    fi
}

# Sanitize all files
for file in "${FILES_TO_SANITIZE[@]}"; do
    sanitize_file "$file"
done

# Find and sanitize any other files with the exposed password
echo "🔍 Searching for any remaining hardcoded credentials..."
grep -r "dhruva123" --include="*.md" . | while read -r line; do
    file=$(echo "$line" | cut -d: -f1)
    echo "⚠️  Found remaining credential in: $file"
done

echo "🎯 Credential sanitization complete!"
echo "📁 Backups stored in: $BACKUP_DIR"
echo ""
echo "🚨 NEXT STEPS:"
echo "1. Review the sanitized files"
echo "2. Update your actual environment variables with new secure passwords"
echo "3. Commit the sanitized files to git"
echo "4. Force push to overwrite the history with exposed credentials"
echo ""
echo "⚠️  IMPORTANT: Change all actual database passwords immediately!"
