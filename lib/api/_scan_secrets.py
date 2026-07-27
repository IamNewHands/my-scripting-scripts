import os, re, sys

SECRET_PATTERNS = [
    (r'(?i)(password|passwd|pwd|secret|token|api[_-]?key|auth|credential|private[_-]?key)\s*[=:]\s*["\']?[A-Za-z0-9_\-\.]{20,}', "密码/Token"),
    (r'ghp_[A-Za-z0-9]{36}', "GitHub PAT"),
    (r'gho_[A-Za-z0-9]{36}', "GitHub OAuth"),
    (r'-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----', "私钥"),
    (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', "邮箱"),
    (r'\b(?:10|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b', "内网IP"),
]

EXCLUDE_DIRS = {'node_modules', '__pycache__', '.git', 'venv', '.venv', 'dist', 'build', 'backup'}
EXCLUDE_EXT = {'.pyc', '.pyo', '.so', '.dll', '.dylib', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'}

def scan_file(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except:
        return []
    hits = []
    for pattern, desc in SECRET_PATTERNS:
        for m in re.finditer(pattern, content):
            line_num = content[:m.start()].count('\n') + 1
            hits.append((path, line_num, desc, m.group()[:40]))
    return hits

def main():
    root = "/var/mobile/Library/Mobile Documents/iCloud~com~thomfang~Scripting/Documents/scripts/自选估值"
    all_hits = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        rel = os.path.relpath(dirpath, root)
        if rel.startswith('backup') or rel.startswith('.'):
            continue
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in EXCLUDE_EXT:
                continue
            fpath = os.path.join(dirpath, f)
            hits = scan_file(fpath)
            all_hits.extend(hits)
    
    if all_hits:
        print(f"Warning: Found {len(all_hits)} potential secrets:")
        for path, line, desc, snippet in all_hits:
            print(f"  [{desc}] {path}:{line} -> {snippet}")
        sys.exit(1)
    else:
        print("OK: Privacy scan passed, no secrets found")

if __name__ == '__main__':
    main()