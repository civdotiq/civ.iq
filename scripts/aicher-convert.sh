#!/bin/bash
FILE=$1

# Skip if no file provided
if [ -z "$FILE" ]; then
    echo "Usage: $0 <file.tsx>"
    exit 1
fi

# Skip archived files
if [[ $FILE == *"archived-features"* ]]; then
    echo "Skipping archived: $FILE"
    exit 0
fi

echo "Converting: $FILE"

# Create backup
cp "$FILE" "$FILE.backup"

# Apply Aicher replacements
sed -i 's/shadow-sm/border-2 border-black/g' "$FILE"
sed -i 's/shadow-md/border-2 border-black/g' "$FILE"
sed -i 's/shadow-lg/border-2 border-black/g' "$FILE"
sed -i 's/shadow/border-2 border-black/g' "$FILE"
sed -i 's/rounded-lg//g' "$FILE"
sed -i 's/rounded-md//g' "$FILE"
sed -i 's/bg-gray-50/bg-white/g' "$FILE"
sed -i 's/bg-gray-100/bg-white border-2 border-gray-300/g' "$FILE"
sed -i 's/hover:shadow-[a-z]*/hover:bg-gray-50/g' "$FILE"

# Clean up double spaces and empty classes
sed -i 's/  / /g' "$FILE"
sed -i 's/className=" /className="/g' "$FILE"
sed -i 's/ "/"/g' "$FILE"

echo "✅ Converted: $FILE"