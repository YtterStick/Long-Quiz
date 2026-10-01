import os
import glob
import re

def main():
    search_pattern = r'\[var\(--color-([a-zA-Z0-9-]+)\)\]'
    replace_pattern = r'(--color-\1)'
    
    src_dir = os.path.join(r"C:\Users\marki\OneDrive\Documents\proj\longquiz\frontend\src")
    files = glob.glob(os.path.join(src_dir, "**", "*.tsx"), recursive=True)
    files.extend(glob.glob(os.path.join(src_dir, "**", "*.ts"), recursive=True))
    
    for file in files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = re.sub(search_pattern, replace_pattern, content)
        
        # Additional specific fixes from the prompt
        if "max-h-[600px]" in new_content:
            new_content = new_content.replace("max-h-[600px]", "max-h-150")
            
        if "min-h-[400px]" in new_content:
            new_content = new_content.replace("min-h-[400px]", "min-h-100")
            
        # Optional: Replace specific ones like shadow-[var(...)]/20 -> shadow-(--color-...)/20
        # The regex above already handles the `[var(...)]` part, leaving the `/20` intact!
            
        if content != new_content:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {file}")

if __name__ == "__main__":
    main()
