#!/bin/bash

cd "$(dirname "$0")"
cd ..

TARGET_DIR="minimized-windows-buttons@code-monkey-island.ch"

if [ -d "$TARGET_DIR" ]; then
    echo "Processing files in $TARGET_DIR..."
    
    find "$TARGET_DIR" -type f | while read -r file; do
    	
    	if expand -t 4 "$file" > "$file.tmp"; then
	        mv "$file.tmp" "$file"
	        # trailing whitespaces
	        sed -i 's/[[:space:]]*$//' "$file"
	        echo "Cleaned tabs in: $file"
	    else
	        echo "Failed to process: $file"
	        rm -f "$file.tmp"
	    fi

        # Convert tabs to 4 spaces using a temporary file
        expand -t 4 "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        
        # Also remove trailing whitespace (another common reviewer requirement)
        sed -i 's/[[:space:]]*$//' "$file"
        
        echo "Converted: $file"
    done
    echo "Successfully cleaned all files!"
else
    echo "Error: Directory $TARGET_DIR not found."
    exit 1
fi