#!/bin/bash

echo "=== Dhruva Platform Metering System Verification ==="
echo "Date: $(date)"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Checking $service_name... "
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Function to check URL
check_url() {
    local service_name=$1
    local url=$2
    
    echo -n "Checking $service_name... "
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

echo "1. DOCKER SERVICES STATUS"
echo "========================="
check_service "Docker containers" "docker ps | grep -E '(dhruva|celery|timescale|rabbitmq)' | grep -v Exited"

echo ""
echo "2. DATABASE CONNECTIVITY"
echo "========================"
check_service "TimescaleDB" "docker exec -it timescaledb psql -U postgres -d dhruva -c 'SELECT 1' 2>/dev/null"
check_service "MongoDB" "docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin dhruva --eval 'db.runCommand({ping: 1})' 2>/dev/null"
check_service "Redis" "docker exec dhruva-platform-redis redis-cli -a dhruva123 ping 2>/dev/null"

echo ""
echo "3. MESSAGE QUEUE STATUS"
echo "======================"
echo "RabbitMQ Queue Status:"
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host 2>/dev/null | grep -E "(data-log|metrics-log|heartbeat)" | while read queue messages; do
    if [ "$messages" -lt 100 ]; then
        echo -e "  $queue: ${GREEN}$messages messages ✅${NC}"
    elif [ "$messages" -lt 1000 ]; then
        echo -e "  $queue: ${YELLOW}$messages messages ⚠️${NC}"
    else
        echo -e "  $queue: ${RED}$messages messages ❌${NC}"
    fi
done

echo ""
echo "4. MONITORING SERVICES"
echo "====================="
check_url "Prometheus" "http://localhost:9090/-/healthy"
check_url "Grafana" "http://localhost:3000/api/health"
check_url "Pushgateway" "http://localhost:9091/-/healthy"
check_url "Flower (Celery)" "http://localhost:5555"

echo ""
echo "5. CELERY WORKERS STATUS"
echo "======================="
echo "Active Celery workers:"
docker exec celery-metering celery -A celery_backend.celery_app inspect active 2>/dev/null | grep -E "(celery@|empty)" | head -5

echo ""
echo "6. RECENT CELERY LOGS (Last 5 lines)"
echo "===================================="
echo "Celery Metering Worker:"
docker logs celery-metering --tail 5 2>/dev/null | grep -v "azure" | tail -3

echo ""
echo "7. DATABASE RECORD COUNTS"
echo "========================="
echo -n "TimescaleDB apikey records: "
docker exec -it timescaledb psql -U postgres -d dhruva -c "SELECT COUNT(*) FROM apikey;" 2>/dev/null | grep -E "^\s*[0-9]+\s*$" | tr -d ' '

echo -n "MongoDB API keys: "
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin dhruva --eval "db.api_key.countDocuments()" 2>/dev/null | tail -1

echo -n "MongoDB users: "
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin dhruva --eval "db.user.countDocuments()" 2>/dev/null | tail -1

echo ""
echo "8. PROMETHEUS METRICS TEST"
echo "=========================="
echo "Testing Prometheus metrics collection:"
METRICS_RESPONSE=$(curl -s "http://localhost:9090/api/v1/query?query=up" 2>/dev/null)
if echo "$METRICS_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✅ Prometheus metrics collecting successfully${NC}"
    echo "Available targets:"
    echo "$METRICS_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for result in data['data']['result']:
        instance = result['metric']['instance']
        job = result['metric']['job']
        value = result['value'][1]
        status = '✅ UP' if value == '1' else '❌ DOWN'
        print(f'  {job} ({instance}): {status}')
except:
    print('  Could not parse metrics data')
" 2>/dev/null
else
    echo -e "${RED}❌ Prometheus metrics not working${NC}"
fi

echo ""
echo "9. SYSTEM HEALTH SUMMARY"
echo "========================"

# Count successful checks
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Check critical services
CRITICAL_SERVICES=(
    "docker ps | grep dhruva-platform-server"
    "docker ps | grep celery-metering"
    "docker ps | grep timescaledb"
    "docker ps | grep dhruva-platform-rabbitmq"
    "curl -f -s http://localhost:9090/-/healthy"
    "curl -f -s http://localhost:3000/api/health"
)

for service_check in "${CRITICAL_SERVICES[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if eval "$service_check" > /dev/null 2>&1; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
done

echo "Critical Services: $PASSED_CHECKS/$TOTAL_CHECKS passing"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 SYSTEM STATUS: FULLY OPERATIONAL${NC}"
    echo -e "${GREEN}✅ All core metering services are working correctly${NC}"
    echo -e "${GREEN}✅ Ready for development and testing${NC}"
elif [ $PASSED_CHECKS -gt $((TOTAL_CHECKS / 2)) ]; then
    echo -e "${YELLOW}⚠️  SYSTEM STATUS: PARTIALLY OPERATIONAL${NC}"
    echo -e "${YELLOW}Some services may need attention${NC}"
else
    echo -e "${RED}❌ SYSTEM STATUS: CRITICAL ISSUES${NC}"
    echo -e "${RED}Multiple services are not working${NC}"
fi

echo ""
echo "10. NEXT STEPS"
echo "=============="
echo "For full functionality:"
echo "1. Create test users and API keys in MongoDB"
echo "2. Test API requests with valid authentication"
echo "3. Verify usage data appears in TimescaleDB"
echo "4. Monitor real-time metrics in Grafana dashboards"
echo ""
echo "Verification completed at $(date)"
