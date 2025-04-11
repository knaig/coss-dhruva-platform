#!/bin/bash

# Shut them all down (in any order)
docker-compose -f docker-compose-app.yml down
docker-compose -f docker-compose-db.yml down
docker-compose -f docker-compose-metering.yml down
docker-compose -f docker-compose-monitoring.yml down

# Bring them up in a specific order
docker-compose -f docker-compose-db.yml up -d --remove-orphans
docker-compose -f docker-compose-metering.yml up -d --remove-orphans
docker-compose -f docker-compose-monitoring.yml up -d --remove-orphans
docker-compose -f docker-compose-app.yml up -d --remove-orphans