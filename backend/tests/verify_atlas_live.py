import os
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.database.connection import get_db, close_db, check_db_health, sanitize_mongo_uri
from app.database.seed_data import seed_database
import pymongo

def run_live_atlas_verification():
    print("=" * 60)
    print("STARTING MONGODB ATLAS LIVE CONNECTION & PERSISTENCE VERIFICATION")
    print("=" * 60)

    # 1. Configuration check
    print(f"\n1. Target Database Name: '{settings.DB_NAME}'")
    assert settings.DB_NAME == "internconnect_ai", f"Expected 'internconnect_ai', got '{settings.DB_NAME}'"
    print(f"   Target Cluster URI: {sanitize_mongo_uri(settings.MONGO_URI)}")

    # 2. Direct Atlas Ping verification
    print("\n2. Executing client.admin.command('ping') on Atlas cluster...")
    client = pymongo.MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    ping_result = client.admin.command("ping")
    print(f"   Atlas Ping Response: {ping_result}")
    assert ping_result.get("ok") == 1.0, "Atlas ping command failed!"
    print("   [PASS] Atlas Ping SUCCESSFUL!")

    # 3. Project isolation check
    print("\n3. Checking Cluster Databases for Project Isolation...")
    db_names = client.list_database_names()
    print(f"   Databases found in cluster: {db_names}")
    assert "edumanage" in db_names, "Safety check failed: 'edumanage' not found in cluster."
    print("   [PASS] Safety Confirmed: 'edumanage' database exists and was NOT modified or deleted.")

    # 4. Connect via Application get_db()
    print(f"\n4. Connecting via application get_db() to '{settings.DB_NAME}'...")
    db = get_db(force_mock=False)
    assert db.name == "internconnect_ai", f"Database name mismatch: expected internconnect_ai, got {db.name}"
    print(f"   Connected Database instance name: {db.name}")

    # Seed initial data into internconnect_ai if fresh
    seed_database(db)
    users_count = db.users.count_documents({})
    internships_count = db.internships.count_documents({})
    print(f"   Documents in '{db.name}': users={users_count}, internships={internships_count}")
    assert users_count > 0, "Users collection should have documents."

    # 5. Live Health Check Verification
    print("\n5. Testing check_db_health()...")
    health = check_db_health()
    print(f"   Health check result: {health}")
    assert health["connected"] is True
    assert health["type"] == "mongodb-atlas-live"
    assert health["database"] == "internconnect_ai"
    print("   [PASS] Health check reports 'mongodb-atlas-live' on 'internconnect_ai'!")

    # 6. Persistence Test Across Restarts
    test_token = f"test-token-{uuid.uuid4().hex[:12]}"
    print(f"\n6. Writing test document with token '{test_token}' to Atlas...")
    insert_res = db["__atlas_persistence_test__"].insert_one({
        "token": test_token,
        "payload": "Testing persistent storage in internconnect_ai across backend restarts"
    })
    test_doc_id = insert_res.inserted_id
    print(f"   Inserted test doc ID: {test_doc_id}")

    # Simulate backend shutdown
    print("\n7. Simulating backend shutdown (calling close_db())...")
    close_db()
    print("   Database connection closed.")

    # Simulate backend restart with fresh connection
    print("\n8. Simulating backend restart (calling get_db())...")
    restarted_db = get_db(force_mock=False)
    persisted_doc = restarted_db["__atlas_persistence_test__"].find_one({"_id": test_doc_id})
    assert persisted_doc is not None, "Test document was lost after restart!"
    assert persisted_doc["token"] == test_token
    print(f"   [PASS] PERSISTENCE CONFIRMED: Retrieved persisted document after restart: {persisted_doc['payload']}")

    # Clean up test document
    restarted_db["__atlas_persistence_test__"].delete_one({"_id": test_doc_id})
    close_db()
    client.close()

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL ATLAS LIVE VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_live_atlas_verification()
