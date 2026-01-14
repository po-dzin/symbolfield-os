
import os
import sys
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
DATABASE_ID = "2d99a4ade4bd80aca84bee500bc63654"

if not NOTION_TOKEN:
    print("Error: NOTION_TOKEN not found in .env")
    sys.exit(1)

notion = Client(auth=NOTION_TOKEN)

def test_create():
    print(f"Attempting to create page in {DATABASE_ID}...")
    try:
        res = notion.pages.create(
            parent={"database_id": DATABASE_ID},
            properties={
                "Name": {"title": [{"text": {"content": "Test Feature"}}]}
            }
        )
        print(f"Page Created: {res['id']}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_create()
