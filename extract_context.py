import os
from pathlib import Path

IGNORE_DIRS = {
    'node_modules', '.git', 'dist', 'build', '.firebase', 
    '.wrangler', '.vercel', '.vscode', '.idea', '__pycache__', 'coverage'
}
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
    '.DS_Store', 'extract_context.py', 'resume_project_summary.md'
}
CODE_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html'}
CONFIG_FILES = {'package.json', 'firebase.json', 'vite.config.js', 'vite.config.ts', 'README.md', 'tsconfig.json'}

MAX_LINES_CODE = 120
MAX_LINES_DATA = 35
MAX_TOTAL_CHARS = 70000

def is_ignored_file(filename: str) -> bool:
    return filename in IGNORE_FILES or filename.startswith('.env')

def generate_tree(root_path: Path) -> str:
    tree_lines = ["## 1. Project Directory Structure\n```text"]
    for root, dirs, files in os.walk(root_path):
        dirs[:] = sorted([d for d in dirs if d not in IGNORE_DIRS])
        level = Path(root).relative_to(root_path).parts
        indent = "  " * len(level)
        folder_name = Path(root).name if level else root_path.name
        tree_lines.append(f"{indent}{folder_name}/")
        sub_indent = "  " * (len(level) + 1)
        for f in sorted(files):
            if not is_ignored_file(f):
                tree_lines.append(f"{sub_indent}{f}")
    tree_lines.append("```\n")
    return "\n".join(tree_lines)

def read_file_smart(filepath: Path, max_lines: int) -> str:
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        total = len(lines)
        if total <= max_lines:
            return "".join(lines)
        snippet = "".join(lines[:max_lines])
        return f"{snippet}\n// ... [Truncated {total - max_lines} additional lines to save tokens] ...\n"
    except Exception as e:
        return f"// Error reading file: {e}\n"

def main():
    root = Path.cwd()
    output_path = root / "resume_project_summary.md"
    sections = [f"# Project Context Export: {root.name}\n"]
    sections.append(generate_tree(root))
    sections.append("## 2. Configuration & Dependencies\n")
    for cfg in sorted(CONFIG_FILES):
        cfg_path = root / cfg
        if cfg_path.exists() and cfg_path.is_file():
            ext = cfg_path.suffix.lstrip('.') or 'text'
            content = read_file_smart(cfg_path, 150)
            sections.append(f"### `{cfg}`\n```{ext}\n{content}\n```\n")

    sections.append("## 3. Source Code & Component Architecture\n")
    current_chars = sum(len(s) for s in sections)

    for dirpath, dirs, files in os.walk(root):
        dirs[:] = sorted([d for d in dirs if d not in IGNORE_DIRS])
        for fname in sorted(files):
            if is_ignored_file(fname) or fname in CONFIG_FILES:
                continue
            fpath = Path(dirpath) / fname
            rel_path = fpath.relative_to(root)
            ext = fpath.suffix.lower()
            if ext not in CODE_EXTENSIONS:
                continue
            is_data_file = (
                ext == '.json' or 
                'data' in str(rel_path).lower() or 
                'vocab' in str(rel_path).lower() or
                'words' in str(rel_path).lower()
            )
            line_cap = MAX_LINES_DATA if is_data_file else MAX_LINES_CODE
            snippet = read_file_smart(fpath, line_cap)
            lang = ext.lstrip('.')
            block = f"### `{rel_path}`\n```{lang}\n{snippet}\n```\n"
            if current_chars + len(block) > MAX_TOTAL_CHARS:
                sections.append("\n> **[Reached maximum token safety cap - remaining files omitted]**\n")
                break
            sections.append(block)
            current_chars += len(block)
        else:
            continue
        break

    final_text = "\n".join(sections)
    with open(output_path, 'w', encoding='utf-8') as out_f:
        out_f.write(final_text)
    est_tokens = len(final_text) // 4
    print(f"Done! Created '{output_path.name}' ({len(final_text):,} chars / ~{est_tokens:,} tokens).")

if __name__ == "__main__":
    main()