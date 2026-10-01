import os
import glob
import re

def main():
    search_pattern = r'-\(--color-([a-zA-Z0-9-]+)\)'
    replace_pattern = r'-\1'
    
    # Also handle [var(--color-...)] in case there are any remaining or reverted
    search_pattern2 = r'-\[var\(--color-([a-zA-Z0-9-]+)\)\]'
    replace_pattern2 = r'-\1'
    
    src_dir = os.path.join(r"C:\Users\marki\OneDrive\Documents\proj\longquiz\frontend\src")
    files = glob.glob(os.path.join(src_dir, "**", "*.tsx"), recursive=True)
    files.extend(glob.glob(os.path.join(src_dir, "**", "*.ts"), recursive=True))
    
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = re.sub(search_pattern, replace_pattern, content)
        new_content = re.sub(search_pattern2, replace_pattern2, new_content)
            
        if content != new_content:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file}")

if __name__ == "__main__":
    main()
