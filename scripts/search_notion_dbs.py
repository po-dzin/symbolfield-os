
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

def search_databases():
    print("--- Searching for all shared objects ---")
    try:
        response = notion.search().get('results', [])
        
        for item in response:
            obj_type = item['object']
            obj_id = item['id']
            title = "Untitled"
            if obj_type == 'database':
                title = item.get('title', [{}])[0].get('text', {}).get('content', 'Untitled') if item.get('title') else 'Untitled'
            elif obj_type == 'page':
                # Pages have 'properties' -> 'title' (if it's a DB page) or just properties
                title_props = item.get('properties', {})
                for p_name, p_val in title_props.items():
                    if p_val['type'] == 'title':
                        title = p_val['title'][0]['plain_text'] if p_val['title'] else 'Untitled'
            
            print(f"\nFound {obj_type}: {title} ({obj_id})")
            if obj_type == 'database':
                print("Properties:")
                props = item.get('properties', {})
                for name, prop in props.items():
                    print(f"  - {name}: {prop['type']}")
                if prop['type'] == 'select':
                    options = [opt['name'] for opt in prop['select']['options']]
                    print(f"    Options: {', '.join(options)}")
                elif prop['type'] == 'status':
                    options = [opt['name'] for opt in prop['status']['options']]
                    print(f"    Options: {', '.join(options)}")
                elif prop['type'] == 'multi_select':
                    options = [opt['name'] for opt in prop['multi_select']['options']]
                    print(f"    Options: {', '.join(options)}")
                    
    except Exception as e:
        print(f"Search error: {e}")

if __name__ == "__main__":
    search_databases()
