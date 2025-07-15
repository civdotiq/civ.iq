#!/usr/bin/env python3
"""
CIV.IQ - Update License Headers
Replaces MIT license headers with AGPL license headers in TypeScript/JavaScript files
"""

import os
import sys
from pathlib import Path

# Old MIT license header to replace
OLD_MIT_HEADER = """/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */"""

# New AGPL license header
NEW_AGPL_HEADER = """/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */"""

def process_file(file_path):
    """Process a single file to update its license header."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has MIT header
        if OLD_MIT_HEADER in content:
            # Replace MIT header with AGPL header
            new_content = content.replace(OLD_MIT_HEADER, NEW_AGPL_HEADER, 1)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return 'replaced'
        elif 'Copyright' not in content[:1000] and 'copyright' not in content[:1000]:
            # No license header found - add AGPL header
            new_content = NEW_AGPL_HEADER + '\n\n' + content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return 'added'
        else:
            # Has some other license or copyright notice
            return 'skipped'
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return 'error'

def main():
    """Main function to process all TypeScript/JavaScript files."""
    print("CIV.IQ License Header Update Script")
    print("===================================")
    print()
    
    # Find all TypeScript and JavaScript files in src/
    src_dir = Path('src')
    extensions = {'.ts', '.tsx', '.js', '.jsx'}
    
    files = []
    for ext in extensions:
        files.extend(src_dir.rglob(f'*{ext}'))
    
    files.sort()
    total_files = len(files)
    
    print(f"Found {total_files} TypeScript/JavaScript files to process.")
    print()
    
    # Process counters
    replaced = 0
    added = 0
    skipped = 0
    errors = 0
    
    # Process each file
    for i, file_path in enumerate(files, 1):
        if i % 10 == 0:
            print(f"Progress: {i}/{total_files} files processed...")
        
        result = process_file(file_path)
        
        if result == 'replaced':
            print(f"✅ Replaced MIT with AGPL header in: {file_path}")
            replaced += 1
        elif result == 'added':
            print(f"✅ Added AGPL header to: {file_path}")
            added += 1
        elif result == 'skipped':
            skipped += 1
        elif result == 'error':
            errors += 1
    
    # Summary report
    print()
    print("===================================")
    print("Summary Report")
    print("===================================")
    print(f"Total files processed: {total_files}")
    print(f"MIT headers replaced:  {replaced}")
    print(f"New headers added:     {added}")
    print(f"Files skipped:         {skipped}")
    print(f"Errors encountered:    {errors}")
    print()
    
    if replaced + added > 0:
        print(f"✅ Successfully updated {replaced + added} files with AGPL license headers!")
    else:
        print("ℹ️  No files needed license header updates.")
    
    if errors > 0:
        print(f"⚠️  There were {errors} errors during processing.")
        sys.exit(1)

if __name__ == "__main__":
    main()