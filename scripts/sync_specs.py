import os
import hashlib
import argparse
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# ==============================================================================
# Configuration & Setup
# ==============================================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") # Service key preferred for dev access

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
    exit(1)

client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Files to sync: (Local Path, Kind)
# Note: Paths are relative to project root (where script is run)
SYNC_TARGETS = [
    ("spec.md", "spec"),
    ("test_spec.md", "test_spec"), # Kind refined
    # Artifact paths - using absolute path relative to user workspace for stability
    (str(Path.home() / ".gemini/antigravity/brain/3e5f723d-1280-40e1-a7ff-bded9cd986a5/task.md"), "task"),
]

# ==============================================================================
# Helpers
# ==============================================================================

def md5_content(content: str) -> str:
    """Calculate MD5 hash of string content (matches DB generated hash)."""
    return hashlib.md5(content.encode("utf-8")).hexdigest()

def get_artifact_source(p: Path) -> str:
    """Extract brain ID and filename for consistent artifact paths."""
    # .../.gemini/antigravity/brain/<BRAIN_ID>/task.md
    parts = p.parts
    try:
        if "brain" in parts:
            i = parts.index("brain")
            if i + 1 < len(parts):
                brain_id = parts[i + 1]
                return f"artifacts/{brain_id}/{p.name}"
    except ValueError:
        pass
    return f"artifacts/{p.name}"

def get_relative_source_path(path_str: str) -> str:
    """Convert absolute path to a stable 'source' key."""
    p = Path(path_str).resolve()
    cwd = Path.cwd().resolve()
    
    # Handle Artifacts (outside CWD)
    if ".gemini" in str(p):
        return get_artifact_source(p)
    
    # Handle Project Files (inside CWD)
    if p.is_relative_to(cwd):
        return str(p.relative_to(cwd))
        
    return str(p)

def sync_file(file_path_str: str, kind: str, dry_run: bool = False) -> bool:
    """Sync a single file to Supabase dev.docs. Returns True if synced/skipped-valid, False on error."""
    path = Path(file_path_str)
    
    if not path.exists():
        print(f"⚠️  Skipping missing file: {path.name}")
        return False

    content = path.read_text(encoding="utf-8")
    local_hash = md5_content(content)
    source_path = get_relative_source_path(file_path_str)
    
    print(f"🔄 Checking: {source_path}...")

    # 1. Fetch existing content_hash
    response = client.schema("dev").table("docs")\
        .select("id, content_hash")\
        .eq("source", source_path)\
        .execute()
    
    # 2. Compare Hash
    if response.data:
        db_hash = response.data[0].get("content_hash")
        if db_hash == local_hash:
            print(f"   ✅ Up to date (Hash match)")
            return True
        else:
            print(f"   📝 Content differing. Queuing update...")

    # 3. Upsert (Insert or Update)
    if dry_run:
        print(f"   [DRY RUN] Would upsert {source_path} (length: {len(content)})")
        return True

    try:
        # Determine strict local path for meta
        p = Path(file_path_str).resolve()
        cwd = Path.cwd().resolve()
        relative_local_path = str(p.relative_to(cwd)) if p.is_relative_to(cwd) else str(p)

        client.schema("dev").table("docs").upsert({
            "kind": kind,
            "title": path.name,
            "content": content,
            "source": source_path,
            # 'meta' can store extra flexible data not in formal columns
            "meta": {
                "sync_agent": "antigravity",
                "local_path": relative_local_path
            }
            # created_at/updated_at/content_hash handled by DB
        }, on_conflict="source").execute()
        print(f"   🚀 Synced: {path.name}")
        return True
    except Exception as e:
        print(f"   ❌ DB Error: {e}")
        return False


# ==============================================================================
# Main
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description="Sync context files to Supabase dev.docs")
    parser.add_argument("--dry-run", action="store_true", help="Simulate sync without writing to DB")
    args = parser.parse_args()

    print(f"🤖 SymbolField OS — Context Sync {'(DRY RUN)' if args.dry_run else ''}")
    print("=" * 60)
    
    success_count = 0
    
    for path, kind in SYNC_TARGETS:
        if sync_file(path, kind, dry_run=args.dry_run):
            success_count += 1

    print("=" * 60)
    print(f"✅ Sync complete. Processed {success_count}/{len(SYNC_TARGETS)} files.")

if __name__ == "__main__":
    main()
