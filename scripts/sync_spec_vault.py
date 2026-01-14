
import os
import sys
from dotenv import load_dotenv
from notion_client import Client

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
DATABASE_ID = os.getenv("NOTION_SPEC_VAULT_ID")

if not NOTION_TOKEN or not DATABASE_ID:
    print("Error: NOTION_TOKEN or NOTION_SPEC_VAULT_ID not found in .env")
    sys.exit(1)

notion = Client(auth=NOTION_TOKEN)

def normalize_title(filename):
    return filename.replace('.md', '').replace('_', ' ').capitalize()

def sync_spec_vault():
    specs_dir = "docs/specs"
    legacy_dir = "docs/specs/legacy specs"
    
    # 1. Gather local state
    new_specs = {}
    if os.path.exists(specs_dir):
        new_specs = {normalize_title(f): f for f in os.listdir(specs_dir) if f.endswith('.md')}
    
    legacy_specs = {}
    if os.path.exists(legacy_dir):
        legacy_specs = {normalize_title(f): f for f in os.listdir(legacy_dir) if f.endswith('.md')}

    print(f"Local state: {len(new_specs)} new, {len(legacy_specs)} legacy.")

    # 2. Fetch Notion state using search()
    print("Searching for Spec Vault contents...")
    notion_map = {}
    try:
        # We search for all objects, then filter by parent database_id
        # This is very robust across data_sources and standard DBs
        has_more = True
        start_cursor = None
        while has_more:
            res = notion.search(start_cursor=start_cursor)
            for page in res.get('results', []):
                if page['object'] != 'page': continue
                
                parent = page.get('parent', {})
                # Check database_id or data_source_id
                if parent.get('database_id') == DATABASE_ID or parent.get('data_source_id') == DATABASE_ID:
                    title_prop = page['properties'].get('Doc name', {}).get('title', [])
                    if title_prop:
                        notion_map[title_prop[0]['plain_text']] = page['id']
            
            has_more = res.get('has_more', False)
            start_cursor = res.get('next_cursor')
            if not has_more: break
    except Exception as e:
        print(f"Error searching Notion: {e}")
        return

    print(f"Found {len(notion_map)} pages in Spec Vault.")

    # 3. Process Sync
    # A) Archive Legacy
    for title, page_id in notion_map.items():
        if title in legacy_specs:
            print(f"Archiving Legacy: {title}")
            try:
                notion.pages.update(
                    page_id=page_id,
                    properties={"Category": {"multi_select": [{"name": "Legacy"}]}}
                )
            except Exception as e:
                print(f"  Failed: {e}")
        
    # B) Add Missing New Specs
    for title, filename in new_specs.items():
        if title not in notion_map:
            print(f"Adding New Spec: {title}")
            category = "Planning"
            if "SoT" in filename:
                category = "Strategy doc"
            
            try:
                notion.pages.create(
                    parent={"database_id": DATABASE_ID},
                    properties={
                        "Doc name": {"title": [{"text": {"content": title}}]},
                        "Category": {"multi_select": [{"name": category}]}
                    }
                )
            except Exception as e:
                print(f"  Failed: {e}")

if __name__ == "__main__":
    sync_spec_vault()
