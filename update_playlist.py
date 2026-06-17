import os
import re

def update_playlist():
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(current_dir)
    
    # Find all MP3 files in the MP3 directory
    mp3_dir = 'MP3'
    if not os.path.exists(mp3_dir):
        os.makedirs(mp3_dir)
        
    files = [f"MP3/{f}" for f in os.listdir(mp3_dir) if f.lower().endswith('.mp3') and os.path.isfile(os.path.join(mp3_dir, f))]
    
    # Sort files alphabetically
    files.sort()
    
    print(f"發現 {len(files)} 個 MP3 檔案：")
    for f in files:
        print(f" - {f}")
        
    # Read app.js
    app_js_path = 'app.js'
    if not os.path.exists(app_js_path):
        print(f"錯誤：找不到 {app_js_path} 檔案！")
        return
        
    with open(app_js_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Generate the replacement array content
    array_elements = ",\n".join(f'        "{name}"' for name in files)
    new_array = f"const FALLBACK_MP3_FILES = [\n{array_elements}\n    ];"
    
    # Regex to find const FALLBACK_MP3_FILES = [ ... ];
    pattern = r'const\s+FALLBACK_MP3_FILES\s*=\s*\[[^\]]*\];'
    
    if re.search(pattern, content):
        updated_content = re.sub(pattern, new_array, content)
        with open(app_js_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print("成功更新 app.js 中的 MP3 列表！")
    else:
        print("錯誤：在 app.js 中找不到 const FALLBACK_MP3_FILES 變數！")

    # Update version cache busters in index.html
    import time
    timestamp = time.strftime("%Y%m%d%H%M%S")
    index_path = 'index.html'
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            index_content = f.read()
        
        # Replace v=... in style.css?v=... and app.js?v=...
        index_content = re.sub(r'style\.css(\?v=[a-zA-Z0-9_-]*)?', f'style.css?v={timestamp}', index_content)
        index_content = re.sub(r'app\.js(\?v=[a-zA-Z0-9_-]*)?', f'app.js?v={timestamp}', index_content)
        
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(index_content)
        print(f"成功更新 index.html 中的靜態資源版本號為 {timestamp}！")

if __name__ == '__main__':
    update_playlist()
