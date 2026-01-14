
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

print("--- Notion Client Debug ---")
print("notion dir:", dir(notion))

if hasattr(notion, 'databases'):
    print("\nnotion.databases dir:", dir(notion.databases))
    print("\nnotion.databases type:", type(notion.databases))
else:
    print("\nnotion.databases NOT FOUND")

if hasattr(notion, 'search'):
    print("\nnotion.search exists")
