#!/bin/bash
# Email System Monitoring Script for Dhruva Platform
# Monitors email verification system health and performance

echo "=== DHRUVA PLATFORM EMAIL SYSTEM MONITORING ==="
echo "Timestamp: $(date)"
echo ""

# 1. Check Email Service Status
echo "1. EMAIL SERVICE STATUS:"
docker logs dhruva-platform-server --tail 20 --timestamps | grep -i "email service" || echo "No email service logs found"
echo ""

# 2. Check Recent Email Attempts
echo "2. RECENT EMAIL SENDING ATTEMPTS:"
docker logs dhruva-platform-server --tail 50 --timestamps | grep -E "(verification email|email sent|email failed)" | tail -10
echo ""

# 3. Check SMTP Errors
echo "3. SMTP ERRORS (Last 24 hours):"
docker logs dhruva-platform-server --since 24h --timestamps | grep -E "(530|535|550|authentication failed|connection refused)" || echo "No SMTP errors found"
echo ""

# 4. Database Statistics
echo "4. DATABASE STATISTICS:"
echo "Pending Registrations:"
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "db.pending_registrations.countDocuments()" --quiet

echo "Email Verification Logs (Last 24 hours):"
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "
db.email_verification_logs.countDocuments({
  timestamp: { \$gte: new Date(Date.now() - 24*60*60*1000) }
})" --quiet

echo "Successful Verifications (Last 24 hours):"
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "
db.email_verification_logs.countDocuments({
  timestamp: { \$gte: new Date(Date.now() - 24*60*60*1000) },
  success: true,
  action: 'email_verified'
})" --quiet
echo ""

# 5. Container Health
echo "5. CONTAINER HEALTH:"
echo "dhruva-platform-server:"
docker inspect dhruva-platform-server --format='{{.State.Status}}' 2>/dev/null || echo "Container not found"

echo "dhruva-platform-app-db:"
docker inspect dhruva-platform-app-db --format='{{.State.Status}}' 2>/dev/null || echo "Container not found"
echo ""

# 6. Email Queue Status (if using Celery for emails)
echo "6. EMAIL QUEUE STATUS:"
docker logs celery-metering --tail 20 --timestamps | grep -i email || echo "No email queue logs found"
echo ""

# 7. Rate Limiting Status
echo "7. RATE LIMITING ALERTS:"
docker logs dhruva-platform-server --since 1h --timestamps | grep -i "rate limit" || echo "No rate limiting alerts"
echo ""

# 8. System Resources
echo "8. SYSTEM RESOURCES:"
echo "Memory usage for email-related containers:"
docker stats dhruva-platform-server dhruva-platform-app-db --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

# 9. Email Verification Success Rate
echo "9. EMAIL VERIFICATION METRICS (Last 24 hours):"
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "
var total = db.email_verification_logs.countDocuments({
  timestamp: { \$gte: new Date(Date.now() - 24*60*60*1000) },
  action: 'signup'
});
var successful = db.email_verification_logs.countDocuments({
  timestamp: { \$gte: new Date(Date.now() - 24*60*60*1000) },
  action: 'email_verified',
  success: true
});
print('Total Signups: ' + total);
print('Successful Verifications: ' + successful);
if (total > 0) {
  print('Success Rate: ' + ((successful / total) * 100).toFixed(2) + '%');
} else {
  print('Success Rate: No data');
}
" --quiet
echo ""

echo "=== MONITORING COMPLETE ==="
echo ""
echo "🎯 RECOMMENDED ACTIONS:"
echo "- Success rate should be >70%"
echo "- Monitor for SMTP authentication errors"
echo "- Check pending registrations don't exceed 100"
echo "- Verify email delivery to test addresses"
echo ""
echo "📊 For detailed analysis, check:"
echo "- Grafana dashboard: http://localhost:3000"
echo "- Server logs: docker logs dhruva-platform-server -f"
echo "- Database: MongoDB admin.email_verification_logs collection"
