#!/bin/bash

echo "🧪 Testing SSL Setup for Dhruva Platform"
echo "========================================"

# Initialize test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo "✅ PASSED"
        ((TESTS_PASSED++))
        return 0
    else
        echo "❌ FAILED"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 1: Nginx configuration syntax
echo "1️⃣ Testing Nginx configuration syntax..."
if sudo nginx -t > /dev/null 2>&1; then
    echo "✅ Nginx configuration is valid"
    ((TESTS_PASSED++))
else
    echo "❌ Nginx configuration has errors"
    sudo nginx -t
    ((TESTS_FAILED++))
fi

# Test 2: SSL certificate validation
echo "2️⃣ Testing SSL certificate..."
if [ -f "/etc/nginx/ssl/dhruva-selfsigned.crt" ]; then
    if openssl x509 -in /etc/nginx/ssl/dhruva-selfsigned.crt -text -noout > /dev/null 2>&1; then
        echo "✅ Self-signed SSL certificate is valid"
        echo "   Certificate details:"
        openssl x509 -in /etc/nginx/ssl/dhruva-selfsigned.crt -subject -dates -noout | sed 's/^/   /'
        ((TESTS_PASSED++))
    else
        echo "❌ Self-signed SSL certificate validation failed"
        ((TESTS_FAILED++))
    fi
elif [ -d "/etc/letsencrypt/live" ]; then
    DOMAIN=$(ls /etc/letsencrypt/live/ | head -n1)
    if [ -n "$DOMAIN" ] && openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -text -noout > /dev/null 2>&1; then
        echo "✅ Let's Encrypt SSL certificate is valid"
        echo "   Certificate details:"
        openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subject -dates -noout | sed 's/^/   /'
        ((TESTS_PASSED++))
    else
        echo "❌ Let's Encrypt SSL certificate validation failed"
        ((TESTS_FAILED++))
    fi
else
    echo "❌ No SSL certificate found"
    ((TESTS_FAILED++))
fi

# Test 3: Nginx service status
echo "3️⃣ Testing Nginx service status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx service is running"
    ((TESTS_PASSED++))
else
    echo "❌ Nginx service is not running"
    systemctl status nginx --no-pager
    ((TESTS_FAILED++))
fi

# Test 4: Port 443 listening
echo "4️⃣ Testing HTTPS port (443)..."
if sudo netstat -tlnp | grep -q ":443.*nginx"; then
    echo "✅ Nginx is listening on port 443"
    ((TESTS_PASSED++))
else
    echo "❌ Nginx is not listening on port 443"
    sudo netstat -tlnp | grep nginx
    ((TESTS_FAILED++))
fi

# Test 5: HTTPS connectivity
echo "5️⃣ Testing HTTPS connectivity..."
if curl -k -f --max-time 10 https://localhost/health > /dev/null 2>&1; then
    echo "✅ HTTPS health check passed"
    ((TESTS_PASSED++))
else
    echo "❌ HTTPS health check failed"
    echo "   Trying to get more details..."
    curl -k -v https://localhost/health 2>&1 | head -10 | sed 's/^/   /'
    ((TESTS_FAILED++))
fi

# Test 6: HTTP to HTTPS redirect
echo "6️⃣ Testing HTTP to HTTPS redirect..."
REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost/dhruva 2>/dev/null)
if [ "$REDIRECT_STATUS" = "301" ] || [ "$REDIRECT_STATUS" = "302" ]; then
    echo "✅ HTTP to HTTPS redirect working (Status: $REDIRECT_STATUS)"
    ((TESTS_PASSED++))
else
    echo "❌ HTTP to HTTPS redirect not working (Status: $REDIRECT_STATUS)"
    ((TESTS_FAILED++))
fi

# Test 7: Next.js service availability
echo "7️⃣ Testing Next.js service availability..."
if curl -f --max-time 10 http://localhost:3001/dhruva > /dev/null 2>&1; then
    echo "✅ Next.js service is responding on port 3001"
    ((TESTS_PASSED++))
else
    echo "❌ Next.js service is not responding on port 3001"
    echo "   Checking if process is running..."
    if pgrep -f "node.*3001" > /dev/null; then
        echo "   ✓ Node.js process found"
    else
        echo "   ✗ No Node.js process found on port 3001"
    fi
    ((TESTS_FAILED++))
fi

# Test 8: Frontend proxy functionality via HTTPS
echo "8️⃣ Testing frontend proxy functionality via HTTPS..."
if curl -k -f --max-time 10 https://localhost/dhruva > /dev/null 2>&1; then
    echo "✅ Frontend proxy working via HTTPS"
    ((TESTS_PASSED++))
else
    echo "❌ Frontend proxy not working via HTTPS"
    ((TESTS_FAILED++))
fi

# Test 9: Security headers
echo "9️⃣ Testing security headers..."
HEADERS=$(curl -k -s -I --max-time 10 https://localhost/dhruva 2>/dev/null)
SECURITY_TESTS=0
SECURITY_PASSED=0

if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo "   ✅ HSTS header present"
    ((SECURITY_PASSED++))
else
    echo "   ❌ HSTS header missing"
fi
((SECURITY_TESTS++))

if echo "$HEADERS" | grep -q "X-Frame-Options"; then
    echo "   ✅ X-Frame-Options header present"
    ((SECURITY_PASSED++))
else
    echo "   ❌ X-Frame-Options header missing"
fi
((SECURITY_TESTS++))

if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    echo "   ✅ X-Content-Type-Options header present"
    ((SECURITY_PASSED++))
else
    echo "   ❌ X-Content-Type-Options header missing"
fi
((SECURITY_TESTS++))

if [ $SECURITY_PASSED -eq $SECURITY_TESTS ]; then
    echo "✅ All security headers present"
    ((TESTS_PASSED++))
else
    echo "❌ Some security headers missing ($SECURITY_PASSED/$SECURITY_TESTS)"
    ((TESTS_FAILED++))
fi

# Test 10: Docker services status
echo "🔟 Testing Docker services status..."
DOCKER_SERVICES=("dhruva-platform-server" "dhruva-platform-app-db" "dhruva-platform-redis")
DOCKER_PASSED=0

for service in "${DOCKER_SERVICES[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^$service$"; then
        echo "   ✅ $service is running"
        ((DOCKER_PASSED++))
    else
        echo "   ❌ $service is not running"
    fi
done

if [ $DOCKER_PASSED -eq ${#DOCKER_SERVICES[@]} ]; then
    echo "✅ All critical Docker services are running"
    ((TESTS_PASSED++))
else
    echo "❌ Some Docker services are not running ($DOCKER_PASSED/${#DOCKER_SERVICES[@]})"
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "🏁 SSL Testing Complete!"
echo "========================"
echo "✅ Tests Passed: $TESTS_PASSED"
echo "❌ Tests Failed: $TESTS_FAILED"
echo "📊 Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! SSL setup is working correctly."
    echo "🌐 You can access Dhruva Platform at: https://localhost/dhruva"
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Please review the errors above."
    echo "📋 Check the SSL_IMPLEMENTATION_GUIDE.md for troubleshooting steps."
    exit 1
fi
