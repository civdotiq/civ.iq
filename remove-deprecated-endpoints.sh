#!/bin/bash
# Script to remove deprecated individual API endpoints

echo "🗑️  Removing deprecated individual API endpoints..."

# List of endpoints to remove
ENDPOINTS=("finance" "bills" "votes" "committees" "party-alignment" "news")

# Remove each endpoint directory
for endpoint in "${ENDPOINTS[@]}"; do
  dir_path="src/app/api/representative/[bioguideId]/${endpoint}"
  
  if [ -d "$dir_path" ]; then
    echo "Removing $dir_path..."
    rm -rf "$dir_path"
  else
    echo "Directory not found: $dir_path (may already be removed)"
  fi
done

echo "✅ Deprecated endpoints removed!"
echo ""
echo "Next steps:"
echo "1. Update any remaining imports that reference these endpoints"
echo "2. Run 'npm run build' to verify no broken imports"
echo "3. Update API documentation to reflect batch-only pattern"
