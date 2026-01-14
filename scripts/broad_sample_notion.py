
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

def broad_sample():
    print("--- Broad Sampling Shared Objects ---")
    try:
        response = notion.search().get('results', [])
        
        for item in response:
            obj_type = item['object']
            obj_id = item['id']
            print(f"\n- Found {obj_type}: {obj_id}")
            
            # Try to query if it's a data_source or database
            if obj_type in ['database', 'data_source']:
                try:
                    if obj_type == 'database':
                        # Official database querying (standard)
                        # We saw wait, our SDK doesn't have .databases.query
                        # Let's try raw request
                        res = notion.request(path=f"databases/{obj_id}/query", method="POST", body={"page_size": 1})
                    else:
                        res = notion.data_sources.query(data_source_id=obj_id, page_size=1)
                        
                    results = res.get('results', [])
                    if results:
                        print(f"  Item found! Props: {list(results[0]['properties'].keys())}")
                        # Check for specific landmarks
                        props = results[0]['properties']
                        if 'Doc name' in props:
                            print(f"  LANDMARK: Found 'Doc name' prop. Doc title: {props['Doc name']}")
                        if 'Category' in props:
                            print(f"  LANDMARK: Found 'Category' prop.")
                    else:
                        print("  Empty object.")
                except Exception as e:
                    print(f"  Query error: {e}")
            elif obj_type == 'page':
                # Just print title
                title = "Untitled"
                props = item.get('properties', {})
                for p_name, p_val in props.items():
                    if p_val['type'] == 'title':
                        title = p_val['title'][0]['plain_text'] if p_val['title'] else 'Untitled'
                        break
                print(f"  Page Title: {title}")
                
    except Exception as e:
        print(f"Overall search error: {e}")

if __name__ == "__main__":
    broad_sample()
