
import os
import sys
from dotenv import load_dotenv
from notion_client import Client

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
if not NOTION_TOKEN:
    print("Error: NOTION_TOKEN not found in .env")
    sys.exit(1)

notion = Client(auth=NOTION_TOKEN)

def inspect_database(db_id, label):
    print(f"\n--- Inspecting {label} ({db_id}) ---")
    try:
        # Using data_sources endpoint since search identified them as such
        db = notion.data_sources.retrieve(data_source_id=db_id)
        print(f"Name: {db.get('name', 'Untitled')}")
        print("Properties:")
        props = db.get('properties', {})
        for name, prop in props.items():
            print(f"  - {name}: {prop['type']}")
            if prop['type'] == 'multi_select':
                options = [opt['name'] for opt in prop['multi_select']['options']]
                print(f"    Options: {', '.join(options)}")
            elif prop['type'] == 'select':
                options = [opt['name'] for opt in prop['select']['options']]
                print(f"    Options: {', '.join(options)}")
            elif prop['type'] == 'status':
                options = [opt['name'] for opt in prop['status']['options']]
                print(f"    Options: {', '.join(options)}")
    except Exception as e:
        print(f"Error inspecting {label}: {e}")

if __name__ == "__main__":
    # Actual Data Source IDs
    inspect_database("2d19a4ad-e4bd-80b3-bc72-000b9e5a3604", "Spec Vault Source")
    inspect_database("2d99a4ad-e4bd-8132-8c3a-000bc01caf5c", "QA Coverage Source")
