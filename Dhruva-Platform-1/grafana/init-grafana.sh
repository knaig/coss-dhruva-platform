#!/bin/bash

# Wait for Grafana to be ready
until curl -s http://localhost:4000/api/health; do
  echo "Waiting for Grafana to be ready..."
  sleep 2
done

# Create organization
curl -X POST http://admin:admin@localhost:4000/api/orgs \
  -H "Content-Type: application/json" \
  -d '{"name":"PublicMonitoring"}'

# Get organization ID
ORG_ID=$(curl -s http://admin:admin@localhost:4000/api/orgs | jq '.[] | select(.name=="PublicMonitoring") | .id')

# Switch to the organization
curl -X POST http://admin:admin@localhost:4000/api/user/using/$ORG_ID

# Create Prometheus datasource
curl -X POST http://admin:admin@localhost:4000/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "access": "proxy",
    "url": "http://prometheus:9090",
    "basicAuth": false,
    "isDefault": true,
    "editable": false
  }' 