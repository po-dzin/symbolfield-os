
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

def populate_spec_vault():
    specs_dir = "docs/specs"
    if not os.path.exists(specs_dir):
        print(f"Error: {specs_dir} not found")
        return

    # 1. Get existing specs from Notion to avoid duplicates
    print("Fetching existing specs from Notion...")
    try:
        # data_sources.query since that worked in broad_sample
        response = notion.data_sources.query(data_source_id=DATABASE_ID)
        existing_titles = set()
        for page in response.get('results', []):
            title_prop = page['properties'].get('Doc name', {}).get('title', [])
            if title_prop:
                existing_titles.add(title_prop[0]['plain_text'])
    except Exception as e:
        print(f"Error fetching existing specs: {e}")
        existing_titles = set()

    # 2. Upload new specs
    files = [f for f in os.listdir(specs_dir) if f.endswith('.md')]
    print(f"Found {len(files)} local spec files.")
    
    for filename in files:
        title = filename.replace('.md', '').replace('_', ' ').capitalize()
        if title in existing_titles:
            print(f"Skipping (exists): {title}")
            continue
            
        print(f"Uploading: {title}...")
        try:
            notion.pages.create(
                parent={"database_id": DATABASE_ID},
                properties={
                    "Doc name": {"title": [{"text": {"content": title}}]},
                    "Category": {"multi_select": [{"name": "Planning"}]}
                }
            )
            print(f"  Done.")
        except Exception as e:
            print(f"  Error uploading {title}: {e}")

if __name__ == "__main__":
    populate_spec_vault()
