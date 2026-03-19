#!/bin/bash

echo "Starting Next.js development server with WSL2 optimizations..."

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null

# Clear Next.js cache
rm -rf .next

# Set environment optimizations for WSL2
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=development

# Start the server with polling for file changes (WSL2 fix)
echo "Server starting on http://localhost:3000"
exec npx next dev --port 3000 --hostname 0.0.0.0