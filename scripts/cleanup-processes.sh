#!/bin/bash
# Production-grade process cleanup script for Linux/macOS
# Aggressively terminates all Node.js dev server processes

echo "🔍 Starting comprehensive Node.js process cleanup..."
echo "================================================"

# Kill all processes on development ports (3000-3010)
echo "📍 Terminating processes on ports 3000-3010..."
killed_count=0
for port in {3000..3010}; do
    pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "  Port $port: Found PIDs: $pids"
        echo "$pids" | xargs -r kill -9 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  ✅ Killed processes on port $port"
            ((killed_count++))
        fi
    fi
done

# Kill Node.js processes by name pattern
echo ""
echo "📍 Terminating Node.js processes by name..."
node_pids=$(pgrep -f "node.*dev|npm.*dev|next-router-worker|next dev" 2>/dev/null)
if [ ! -z "$node_pids" ]; then
    echo "  Found Node.js PIDs: $(echo $node_pids | tr '\n' ' ')"
    echo "$node_pids" | xargs -r kill -9 2>/dev/null
    echo "  ✅ Terminated Node.js development processes"
fi

# Kill zombie npm processes
echo ""
echo "📍 Cleaning up zombie npm processes..."
npm_pids=$(ps aux | grep -E "npm|node" | grep -v grep | grep -E "defunct|<zombie>" | awk '{print $2}')
if [ ! -z "$npm_pids" ]; then
    echo "  Found zombie PIDs: $(echo $npm_pids | tr '\n' ' ')"
    echo "$npm_pids" | xargs -r kill -9 2>/dev/null
    echo "  ✅ Cleaned zombie processes"
fi

# Verify cleanup
echo ""
echo "📊 Verification:"
echo "================"

# Check remaining processes
remaining_port_processes=0
for port in {3000..3010}; do
    if lsof -ti:$port >/dev/null 2>&1; then
        ((remaining_port_processes++))
    fi
done

remaining_node=$(pgrep -f "node.*dev|npm.*dev" 2>/dev/null | wc -l)

if [ $remaining_port_processes -eq 0 ] && [ $remaining_node -eq 0 ]; then
    echo "✅ SUCCESS: All development processes terminated"
    echo "   - Ports 3000-3010: CLEAR"
    echo "   - Node.js dev processes: NONE"
else
    echo "⚠️  WARNING: Some processes may still be running"
    if [ $remaining_port_processes -gt 0 ]; then
        echo "   - $remaining_port_processes ports still occupied"
    fi
    if [ $remaining_node -gt 0 ]; then
        echo "   - $remaining_node Node.js processes still running"
    fi
    echo ""
    echo "Try running with sudo: sudo bash $0"
fi

echo ""
echo "💡 You can now safely start your development server"