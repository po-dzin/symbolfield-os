
import os
import json
import sys
from datetime import datetime
from notion_client import Client
from dotenv import load_dotenv

# Load env variables (NOTION_TOKEN, NOTION_QA_COVERAGE_ID)
load_dotenv()

def find_page_by_title(notion, database_id, title):
    """Try to find an existing page by its title property 'Doc name'."""
    try:
        # We use data_sources.query for the source ID, as standard databases.query might fail on views
        # If it's a data_source ID, it should work.
        # But wait, report_to_notion.py uses database_id for Page parent which is standard.
        # Let's try searching first.
        response = notion.search(query=title, filter={"property": "object", "value": "page"}).get('results', [])
        for page in response:
            # Check if this page belongs to our database
            parent = page.get('parent', {})
            if parent.get('database_id') == database_id or parent.get('data_source_id') == database_id:
                # Double check title content
                props = page.get('properties', {})
                title_prop = props.get('Doc name', {}).get('title', [])
                if title_prop and title_prop[0]['plain_text'] == title:
                    return page['id']
    except Exception as e:
        print(f"  Warning: search failed: {e}")
    return None

def report_to_notion(feature_name, test_results_path):
    notion = Client(auth=os.environ.get("NOTION_TOKEN"))
    
    # 1. Resolve Databases
    coverage_db = os.environ.get("NOTION_QA_COVERAGE_ID")
    roadmap_db = os.environ.get("NOTION_ROADMAP_ID")
    
    # 2. Read Test Results
    try:
        with open(test_results_path, 'r') as f:
            data = json.load(f)
            total = passed = failed = 0
            
            def count_tests(item):
                nonlocal total, passed, failed
                # Playwright format
                if 'specs' in item:
                    for spec in item['specs']:
                        total += 1
                        if spec.get('ok', False): passed += 1
                        else: failed += 1
                if 'suites' in item:
                    for suite in item['suites']: count_tests(suite)
                
                # Vitest format
                if 'testResults' in item:
                    for res in item['testResults']:
                        if 'assertionResults' in res:
                            for assertion in res['assertionResults']:
                                total += 1
                                if assertion.get('status') == 'passed': passed += 1
                                else: failed += 1

            count_tests(data)
            coverage_pct = (passed / total * 100) if total > 0 else 0
            notion_status = "Success" if failed == 0 and total > 0 else "Review required"
    except Exception as e:
        print(f"Error reading test results: {e}")
        return

    # 3. Update Coverage Database (Standard)
    if coverage_db:
        display_title = f"{feature_name} ({coverage_pct:.1f}%)"
        print(f"Searching for '{feature_name}' in Coverage DB...")
        try:
            res = notion.search(query=feature_name).get('results', [])
            target_page_id = None
            for p in res:
                if p['object'] != 'page': continue
                parent = p.get('parent', {})
                # Normalize IDs
                p_db_id = parent.get('database_id', '').replace('-', '')
                p_ds_id = parent.get('data_source_id', '').replace('-', '')
                target_db_id = coverage_db.replace('-', '')
                
                if p_db_id == target_db_id or p_ds_id == target_db_id:
                    props = p.get('properties', {})
                    if 'Doc name' in props:
                        target_page_id = p['id']
                        print(f"  Found matching page in Coverage DB: {target_page_id}")
                        break
            
            if target_page_id:
                props_to_update = {
                    "Doc name": {"title": [{"text": {"content": display_title}}]}
                }
                # Only add Category if it exists in the schema
                page_obj = notion.pages.retrieve(page_id=target_page_id)
                if "Category" in page_obj.get("properties", {}):
                    props_to_update["Category"] = {"multi_select": [{"name": notion_status}]}
                
                notion.pages.update(
                    page_id=target_page_id,
                    properties=props_to_update
                )
                print(f"✅ Updated Coverage DB.")
            else:
                # We try to create with both, if it fails, fallback
                try:
                    notion.pages.create(
                        parent={"database_id": coverage_db},
                        properties={
                            "Doc name": {"title": [{"text": {"content": display_title}}]},
                            "Category": {"multi_select": [{"name": notion_status}]}
                        }
                    )
                except:
                    notion.pages.create(
                        parent={"database_id": coverage_db},
                        properties={
                            "Doc name": {"title": [{"text": {"content": display_title}}]}
                        }
                    )
                print(f"✅ Created entry in Coverage DB.")
        except Exception as e:
            print(f"❌ Coverage DB error: {e}")

    # 4. Update Roadmap Database (Granular)
    if roadmap_db:
        print(f"Searching for '{feature_name}' in Roadmap DB...")
        try:
            res = notion.search(query=feature_name).get('results', [])
            for p in res:
                if p['object'] != 'page': continue
                parent = p.get('parent', {})
                # Normalize IDs
                p_db_id = parent.get('database_id', '').replace('-', '')
                p_ds_id = parent.get('data_source_id', '').replace('-', '')
                target_db_id = roadmap_db.replace('-', '')
                
                if p_db_id == target_db_id or p_ds_id == target_db_id:
                    props = p.get('properties', {})
                    title_list = props.get('Name', {}).get('title', [])
                    if not title_list: continue
                    
                    current_title = title_list[0]['plain_text']
                    if feature_name in current_title:
                        print(f"  Found matching page in Roadmap DB: {p['id']} ({current_title})")
                        base_name = current_title.split(" (")[0]
                        new_title = f"{base_name} ({coverage_pct:.1f}%)"
                        
                        notion.pages.update(
                            page_id=p['id'],
                            properties={"Name": {"title": [{"text": {"content": new_title}}]}}
                        )
                        print(f"✅ Updated Roadmap DB entry: {new_title}")
                        break
        except Exception as e:
            print(f"❌ Roadmap DB error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python report_to_notion.py <feature_name> <path_to_test_results.json>")
        sys.exit(1)
    
    report_to_notion(sys.argv[1], sys.argv[2])
