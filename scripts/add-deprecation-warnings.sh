#!/bin/bash
# Script to add deprecation warnings to individual endpoints

# Add deprecation warning to finance endpoint
cat > deprecation-notice.ts << 'EOF'
// DEPRECATION NOTICE: This endpoint is deprecated.
// Use the batch API instead: POST /api/representative/[bioguideId]/batch
// This endpoint will be removed in the next major version.
console.warn(`[DEPRECATED] ${request.method} ${request.url} - Use batch API instead`);

EOF

# Add to each deprecated endpoint
for endpoint in "finance" "bills" "votes" "committees"; do
  file="src/app/api/representative/[bioguideId]/${endpoint}/route.ts"
  if [ -f "$file" ]; then
    echo "Adding deprecation warning to $file"
    # Insert warning after the imports
    sed -i '/^export async function/i cat deprecation-notice.ts' "$file"
  fi
done

rm deprecation-notice.ts
