#!/bin/sh

# Wait for PostgreSQL to be ready
HOST=$1
PORT=$2
MAX_ATTEMPTS=$3

if [ -z "$MAX_ATTEMPTS" ]; then
  MAX_ATTEMPTS=60
fi

ATTEMPTS=0

echo "Waiting for PostgreSQL at $HOST:$PORT..."

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if nc -z $HOST $PORT 2>/dev/null; then
    echo "PostgreSQL port is open. Waiting for database to be ready..."
    sleep 5  # Wait for DB to fully initialize
    exit 0
  fi
  
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "Attempt $ATTEMPTS/$MAX_ATTEMPTS - PostgreSQL not ready yet..."
  sleep 1
done

echo "PostgreSQL did not become ready in time"
exit 1
