#!/usr/bin/env python3
"""
Script to update license headers in all source files from AGPL to MIT
"""

import os
import re
from pathlib import Path

# New MIT header
NEW_HEADER = """/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */"""

# Pattern to match existing AGPL headers
AGPL_PATTERN = re.compile(
    r'/\*\s*\n\s*\*\s*CIV\.IQ.*?\n.*?GNU Affero General Public License.*?\*/\s*\n',
    re.DOTALL | re.MULTILINE
)

# Pattern to match any copyright header
COPYRIGHT_PATTERN = re.compile(
    r'/\*\*?\s*\n.*?[Cc]opyright.*?\*/\s*\n',
    re.DOTALL | re.MULTILINE
)

def update_file(filepath):
    """Update a single file's license header"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # First try to replace AGPL headers
        if AGPL_PATTERN.search(content):
            content = AGPL_PATTERN.sub(NEW_HEADER + '\n\n', content)
        # If no AGPL header, check for any copyright header
        elif COPYRIGHT_PATTERN.search(content):
            content = COPYRIGHT_PATTERN.sub(NEW_HEADER + '\n\n', content)
        # If no header at all, add it at the beginning (after 'use client' if present)
        else:
            if content.startswith("'use client'"):
                # Insert after 'use client'
                lines = content.split('\n', 1)
                content = lines[0] + '\n\n' + NEW_HEADER + '\n\n' + (lines[1] if len(lines) > 1 else '')
            else:
                content = NEW_HEADER + '\n\n' + content
        
        # Write back if changed
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    """Main function to process all source files"""
    root_dir = Path('/mnt/d/civic-intel-hub')
    extensions = ['.ts', '.tsx', '.js', '.jsx']
    
    updated_count = 0
    total_count = 0
    
    for ext in extensions:
        for filepath in root_dir.rglob(f'*{ext}'):
            # Skip node_modules and other build directories
            if any(part in str(filepath) for part in ['node_modules', '.next', 'dist', 'build']):
                continue
            
            total_count += 1
            if update_file(filepath):
                updated_count += 1
                print(f"Updated: {filepath.relative_to(root_dir)}")
    
    print(f"\nProcessed {total_count} files, updated {updated_count} files")

if __name__ == "__main__":
    main()