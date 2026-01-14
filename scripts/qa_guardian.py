import os
import sys
import uuid
import json
import argparse
import subprocess
import re
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# ==============================================================================
# Configuration
# ==============================================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Heuristics Configuration
EXCLUDE_DIRS = {'.git', 'node_modules', 'dist', 'coverage', '.venv', 'scripts', 'e2e'}
EXCLUDE_FILES = {'test', 'spec', 'stories'} # Exclude checks in test files themselves

# ==============================================================================
# Database & Logging
# ==============================================================================

class QAContext:
    def __init__(self, run_id: str, client: Client | None, dry_run: bool):
        self.run_id = run_id
        self.client = client
        self.dry_run = dry_run
        self.findings = []
        self.stats = {"tests": 0, "passed": 0, "failed": 0, "findings": 0}

    def log_event(self, action: str, status: str = "ok", meta: dict = None, error: str = None):
        """Log pipeline event to dev.agent_activity."""
        payload = {
            "run_id": self.run_id,
            "agent": "qa_guardian",
            "action": action,
            "status": status,
            "error": error,
            "meta": meta or {}
        }
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [{action.upper()}] {status}: {error or ''}")

        if self.dry_run or not self.client:
            return

        try:
            self.client.schema("dev").table("agent_activity").insert(payload).execute()
        except Exception as e:
            print(f"⚠️ Failed to log event: {e}")

    def log_finding(self, type_: str, severity: str, message: str, details: dict):
        """Log structured finding to dev.audit_logs."""
        payload = {
            "run_id": self.run_id,
            "type": type_,
            "severity": severity,
            "message": message,
            "details": details
        }
        
        print(f"   🚩 [{severity.upper()}] {message}")
        self.findings.append(payload)
        self.stats["findings"] += 1

        if self.dry_run or not self.client:
            return

        try:
            self.client.schema("dev").table("audit_logs").insert(payload).execute()
        except Exception as e:
            print(f"⚠️ Failed to log finding: {e}")

    def save_report(self):
        """Generate and save Markdown report to dev.docs."""
        if not self.findings:
            return

        report = f"# QA Guardian Report\n**Run ID**: {self.run_id}\n**Date**: {datetime.now()}\n\n"
        report += "## Findings\n\n| Severity | Type | Message | File |\n|---|---|---|---|\n"
        
        for f in self.findings:
            loc = f['details'].get('file', 'N/A')
            if 'line' in f['details']:
                loc += f":{f['details']['line']}"
            report += f"| {f['severity']} | {f['type']} | {f['message']} | `{loc}` |\n"

        if self.dry_run or not self.client:
            if self.dry_run:
                print("\n--- DRY RUN REPORT ---\n" + report + "\n----------------------")
            return

        try:
            self.client.schema("dev").table("docs").upsert({
                "kind": "audit",
                "title": f"Audit Report {self.run_id}",
                "source": f"audits/{self.run_id}.md",
                "content": report,
                "meta": {
                    "run_id": self.run_id,
                    "generated_by": "qa_guardian"
                }
            }, on_conflict="source").execute()
            self.log_event("report_written", "ok")
        except Exception as e:
            self.log_event("report_written", "error", error=str(e))

# ==============================================================================
# Static Audits (Grep-based)
# ==============================================================================

def walk_files(exts: list[str]):
    """Generator to walk project files respecting exclusions."""
    root = Path.cwd()
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in exts:
            # Check exclusions
            parts = path.parts
            if any(p in EXCLUDE_DIRS for p in parts):
                continue
            if any(x in path.name for x in EXCLUDE_FILES):
                continue
            yield path

def audit_ssot(ctx: QAContext):
    """Scan *store*.ts for duplicate state definitions."""
    print("🔎 Auditing SSoT...")
    state_defs = {} # key -> list of files

    # Keys to watch for duplications
    watch_keys = ['mode', 'activeNode', 'activeTab']
    
    # Exclusions: file -> list of keys to ignore (False positives)
    exclusions = {
        'graphStore.js': ['mode'], # mode used in node.state object, not store state
        'harmonyStore.js': ['mode'] # mode used in local objects/comments
    }
    
    # Regex to find simple property definitions in stores
    # Matches: mode: ... or activeNode: ...
    patterns = {k: re.compile(rf"\b{k}\s*:") for k in watch_keys}

    for path in walk_files(['.js', '.ts', '.jsx', '.tsx']):
        if 'store' not in path.name.lower():
            continue
            
        content = path.read_text(encoding='utf-8')
        for key, pattern in patterns.items():
            # Check exclusions
            if key in exclusions.get(path.name, []):
                continue

            if pattern.search(content):
                if key not in state_defs:
                    state_defs[key] = []
                state_defs[key].append(str(path.relative_to(Path.cwd())))

    for key, files in state_defs.items():
        if len(files) > 1:
            ctx.log_finding(
                type_="state_ssot",
                severity="warning",
                message=f"Duplicate state definition: '{key}' found in multiple stores",
                details={"key": key, "files": files}
            )

def audit_render(ctx: QAContext):
    """Scan JSX for getState() (Render Sanity)."""
    print("🔎 Auditing Render Sanity...")
    pattern = re.compile(r"\.getState\(\)")
    
    for path in walk_files(['.jsx', '.tsx']):
        lines = path.read_text(encoding='utf-8').splitlines()
        for i, line in enumerate(lines):
            if pattern.search(line):
                # Simple heuristic: if it looks like a component file
                # and uses getState() in what might be render logic.
                # (False positives possible, but 'getState' in JSX is suspicious).
                ctx.log_finding(
                    type_="render",
                    severity="info", # Info for now until proven bad
                    message="Direct store access (getState) detected in component",
                    details={"file": str(path.relative_to(Path.cwd())), "line": i+1, "match": line.strip()}
                )

def audit_layers(ctx: QAContext):
    """Scan for inline zIndex usage."""
    print("🔎 Auditing Layers...")
    # Matches zIndex: 999 or style={{ zIndex: 999 }}
    pattern = re.compile(r"zIndex\s*[:]\s*\d+")
    
    for path in walk_files(['.jsx', '.tsx']):
        lines = path.read_text(encoding='utf-8').splitlines()
        for i, line in enumerate(lines):
            if pattern.search(line):
                ctx.log_finding(
                    type_="layers",
                    severity="warning",
                    message="Hardcoded inline zIndex detected",
                    details={"file": str(path.relative_to(Path.cwd())), "line": i+1, "match": line.strip()}
                )

# ==============================================================================
# Test Runners
# ==============================================================================

def run_command(cmd: list[str], cwd=None) -> tuple[int, str, str]:
    """Run shell command and return (exit_code, stdout, stderr)."""
    print(f"⚡ Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    return result.returncode, result.stdout, result.stderr

def audit_unit_tests(ctx: QAContext):
    """Run Vitest."""
    print("🧪 Running Unit Tests (Vitest)...")
    code, out, err = run_command(["npm", "test", "--", "--run"]) # --run for single pass
    
    status = "ok" if code == 0 else "error"
    ctx.log_event("vitest_run", status, meta={"exit_code": code})
    
    if code != 0:
        ctx.log_finding(
            type_="tests_gap",
            severity="error",
            message="Unit tests failed",
            details={"output_tail": out[-500:] if out else err[-500:]}
        )

def audit_e2e_tests(ctx: QAContext):
    """Run Playwright."""
    print("🎭 Running E2E Tests (Playwright)...")
    # Assuming playwright is installed via npx
    code, out, err = run_command(["npx", "playwright", "test"])
    
    status = "ok" if code == 0 else "error"
    ctx.log_event("playwright_run", status, meta={"exit_code": code})

    if code != 0:
        ctx.log_finding(
            type_="tests_gap",
            severity="error",
            message="E2E tests failed",
            details={"output_tail": out[-500:] if out else err[-500:]}
        )

# ==============================================================================
# Main Orchestrator
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description="QA Guardian — Automated Audit System")
    parser.add_argument("--static", action="store_true", help="Run static analysis (Grep)")
    parser.add_argument("--unit", action="store_true", help="Run unit tests")
    parser.add_argument("--e2e", action="store_true", help="Run E2E tests")
    parser.add_argument("--all", action="store_true", help="Run EVERYTHING")
    parser.add_argument("--dry-run", action="store_true", help="Simulate logging")
    
    args = parser.parse_args()
    
    # Defaults: if nothing specified, run static + unit (MVP safe default)
    if not (args.static or args.unit or args.e2e or args.all):
        args.static = True
        args.unit = True

    if args.all:
        args.static = True
        args.unit = True
        args.e2e = True

    # Setup DB
    client = None
    if not args.dry_run:
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("❌ Error: SUPABASE env vars missing.")
            sys.exit(1)
        try:
            client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            print(f"❌ Failed to connect to Supabase: {e}")
            sys.exit(1)

    run_id = str(uuid.uuid4())
    ctx = QAContext(run_id, client, args.dry_run)
    
    # Get Git SHA
    git_sha = "unknown"
    try:
        git_sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
    except:
        pass

    print(f"🛡️  QA Guardian Plan initiated (Run ID: {run_id})")
    
    # Log flags in meta
    flags = {k: v for k, v in vars(args).items() if v}
    ctx.log_event("pipeline_start", meta={"git_sha": git_sha, "flags": flags})

    # 1. Static Audits
    if args.static:
        try:
            audit_ssot(ctx)
            audit_render(ctx)
            audit_layers(ctx)
            ctx.log_event("static_audit_done", "ok", meta={"findings_count": ctx.stats["findings"]})
        except Exception as e:
            ctx.log_event("static_audit_done", "error", error=str(e))

    # 2. Unit Tests
    if args.unit:
        try:
            audit_unit_tests(ctx)
        except Exception as e:
            ctx.log_event("vitest_run", "error", error=str(e))

    # 3. E2E Tests
    if args.e2e:
        try:
            audit_e2e_tests(ctx)
        except Exception as e:
            ctx.log_event("playwright_run", "error", error=str(e))

    # 4. Finalize
    ctx.save_report()
    
    final_status = "error" if ctx.stats["failed"] > 0 or any(f['severity'] == 'error' for f in ctx.findings) else "ok"
    ctx.log_event("pipeline_end", final_status, meta={"total_findings": ctx.stats["findings"]})
    
    if final_status == "error":
        print("🚨 Pipeline failed with errors.")
        sys.exit(1)
    else:
        print("✅ Pipeline finished successfully.")

if __name__ == "__main__":
    main()
