
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

# Hierarchy definition (L0-L4)
FEATURES = [
    # Level, Module, Feature, Spec
    ("L0", "Authority", "Master Plan (PRD)", "PRD.md"),
    ("L0", "Authority", "Tech Blueprint", "ARCHITECTURE.md"),
    ("L0", "Authority", "Ontology / Invariants", "ONTOLOGY.md"),
    ("L0", "Authority", "API / Data Contracts", "API.md"),
    
    ("L1", "Shell", "Home Portal (Temple)", "UI_HOME_PORTAL_SoT_v0.5"),
    ("L1", "Shell", "Space Field Shell", "UI_SPACE_FIELD_SHELL_SoT_v0.5"),
    ("L1", "Shell", "StateCore (Status)", "UI_STATECORE_SoT_v0.5"),
    ("L1", "Shell", "Context UI", "UI_CONTEXT_UI_SoT_v0.5"),
    
    ("L1", "Interaction", "Gesture Pipeline", "UI_INTERACTION_PIPELINE_SoT_v0.5"),
    ("L1", "Interaction", "Hotkeys & Selection", "UI_HOTKEYS_SELECTION_SoT_v0.5"),
    
    ("L1", "Grouping", "Hubs & Regions", "UI_GROUPING_HUB_REGIONS_SoT_v0.5"),
    
    ("L2", "Navigation", "Graph Addressing", "GRAPH_ADDRESSING_SoT_v0.5"),
    
    ("L3", "State", "Presets & Customization", "SETTINGS_PRESETS_CUSTOMIZATION_SoT_v0.5"),
    
    ("L4", "Data", "Unified Schema", "sf_v0_5_schema_merged_FINAL_r1.sql"),
    ("L4", "Data", "Event Log", "EVENT_LOG_SoT_v0.5"),
    ("L4", "Data", "Ritual -> XP Loop", "RITUAL_XP_LOOP"),
]

def populate():
    print("Populating features into Notion...")
    for level, module, feature, spec in FEATURES:
        # Fallback Name: [Level][Module] Feature
        # This bypasses the need for restricted Schema properties in Synced DBs
        display_name = f"[{level}] [{module}] {feature}"
        print(f"  - Adding {display_name}")
        try:
            notion.pages.create(
                parent={"database_id": DATABASE_ID},
                properties={
                    "Name": {"title": [{"text": {"content": display_name}}]}
                }
            )
        except Exception as e:
            print(f"  Error adding {feature}: {e}")

if __name__ == "__main__":
    populate()
