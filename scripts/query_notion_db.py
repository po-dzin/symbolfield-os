
import os
import sys
import json
from dotenv import load_dotenv
from notion_client import Client

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
if not NOTION_TOKEN:
    print("Error: NOTION_TOKEN not found in .env")
    sys.exit(1)

notion = Client(auth=NOTION_TOKEN)

def format_uuid(id_str):
    if len(id_str) == 32:
        return f"{id_str[:8]}-{id_str[8:12]}-{id_str[12:16]}-{id_str[16:20]}-{id_str[20:]}"
    return id_str

def query_database(db_id, label):
    formatted_id = format_uuid(db_id)
    print(f"\n--- Querying {label} ({formatted_id}) ---")
    try:
        # Using data_sources.query
        response = notion.data_sources.query(data_source_id=formatted_id, page_size=2)
        results = response.get('results', [])
        if not results:
            print("No items found.")
        else:
            for i, item in enumerate(results):
                print(f"\nItem {i+1} ID: {item['id']}")
                props = item.get('properties', {})
                for name, val in props.items():
                    # For data_sources, items might have different property structures
                    # Let's print the property names and their types/values roughly
                    p_type = val.get('type')
                    p_val = val.get(p_type) if p_type else "unknown"
                    print(f"  - {name} ({p_type}): {p_val}")
                if i == 0:
                    # Print full first item for deep inspection
                    print(f"\nFull Item 1 JSON snippet:")
                    print(json.dumps(item, indent=2)[:500] + "...")
                
    except Exception as e:
        print(f"Error querying {label}: {e}")


if __name__ == "__main__":
    # Spec Vault Source
    query_database("2d19a4ad-e4bd-80b3-bc72-000b9e5a3604", "Spec Vault")
    
    # QA Coverage Source (parent of reports)
    query_database("2d99a4ad-e4bd-8136-afef-e42c184293c6", "QA Coverage")
