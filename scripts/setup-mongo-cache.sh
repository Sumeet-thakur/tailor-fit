#!/bin/bash
# 
# scripts/setup-mongo-cache.sh
# 
# Automates deploying the local `vps-setup/mongod.conf` to the VPS MongoDB service.
# Usage: sudo ./scripts/setup-mongo-cache.sh

set -e

SOURCE_CONF="./vps-setup/mongod.conf"
DEST_CONF="/etc/mongod.conf"

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

if [ ! -f "$SOURCE_CONF" ]; then
  echo "Error: $SOURCE_CONF not found. Are you running this from the project root?"
  exit 1
fi

echo "Backing up existing MongoDB config..."
cp $DEST_CONF "${DEST_CONF}.backup-$(date +%s)" || true

echo "Deploying new mongod.conf from repository..."
cp $SOURCE_CONF $DEST_CONF

echo "Restarting MongoDB..."
systemctl restart mongod

echo "Verification: checking current cache size limit..."
sleep 2 # wait for mongo to start
mongosh --eval 'db.serverStatus().wiredTiger.cache["maximum bytes configured"] / 1024 / 1024 / 1024' --quiet | tail -n 1 | awk '{printf "MongoDB Cache is now capped to: %.2f GB\n", $1}'

echo "Done! The local vps-setup/mongod.conf is now active on the server."
