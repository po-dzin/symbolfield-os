
import os
import sys
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
TARGET_ID = "2d99a4ade4bd80aca84bee500bc63654"

if not NOTION_TOKEN:
    print("Error: NOTION_TOKEN not found in .env")
    sys.exit(1)

notion = Client(auth=NOTION_TOKEN)

def inspect():
    print(f"--- Inspecting Target ID: {TARGET_ID} ---")
    
    # Try as Data Source first (since search often shows them)
    try:
        ds = notion.data_sources.retrieve(data_source_id=TARGET_ID)
        print(f"Type: Data Source")
        print(f"Name: {ds.get('name', 'N/A')}")
        print(f"Properties: {list(ds.get('properties', {}).keys())}")
        for name, prop in ds.get('properties', {}).items():
            print(f"  - {name}: {prop['type']}")
        return
    except Exception as e:
        print(f"Data Source Error: {e}")

    # Try as Database
    try:
        db = notion.databases.retrieve(database_id=TARGET_ID)
        print(f"Type: Database")
        import json
        print(json.dumps(db, indent=2))
        return
    except Exception as e:
        print(f"Database Error: {e}")

    # Try as Page
    try:
        page = notion.pages.retrieve(page_id=TARGET_ID)
        print(f"Type: Page")
        # Find title prop
        title = "N/A"
        for p_name, p_val in page.get('properties', {}).items():
            if p_val['type'] == 'title':
                title = p_val['title'][0]['plain_text'] if p_val['title'] else "Empty"
        print(f"Title: {title}")
        print(f"Parent: {page.get('parent')}")
        return
    except Exception as e:
        print(f"Page Error: {e}")

if __name__ == "__main__":
    inspect()
