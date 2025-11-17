#!/usr/bin/env python3
"""
Sync embeddings from Supabase to local SQLite cache
This ensures local database matches cloud database
"""
import os
import sqlite3
import numpy as np
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
DB_PATH = "faces.db"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
    print("   Please check backend/.env file")
    exit(1)

print("=" * 80)
print("☁️  SYNCING FROM SUPABASE TO LOCAL CACHE")
print("=" * 80)
print()

# Connect to Supabase
print("🔗 Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
print("✅ Connected to Supabase")
print()

# Fetch all embeddings from Supabase
print("📥 Fetching embeddings from Supabase...")
response = supabase.table('face_embeddings').select('*').execute()
supabase_embeddings = response.data

print(f"✅ Found {len(supabase_embeddings)} embeddings in Supabase")
print()

if len(supabase_embeddings) == 0:
    print("⚠️  No embeddings in Supabase. Nothing to sync.")
    exit(0)

# Group by person
by_person = {}
for emb in supabase_embeddings:
    person_id = emb['person_id']
    if person_id not in by_person:
        by_person[person_id] = []
    by_person[person_id].append(emb)

print(f"📊 Embeddings by person:")
for person_id, embeddings in by_person.items():
    print(f"   {person_id}: {len(embeddings)} embeddings")
print()

# Connect to local database
print("💾 Connecting to local database...")
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Check current local embeddings
c.execute("SELECT COUNT(*) FROM embeddings")
local_count = c.fetchone()[0]
print(f"📊 Current local embeddings: {local_count}")
print()

# Ask user if they want to clear local cache first
print("⚠️  Options:")
print("   1. REPLACE - Clear local cache and sync from Supabase (recommended)")
print("   2. MERGE - Keep local cache and add Supabase embeddings")
print()
choice = input("Choose option (1 or 2): ").strip()

if choice == "1":
    print()
    print("🗑️  Clearing local cache...")
    c.execute("DELETE FROM embeddings")
    conn.commit()
    print("✅ Local cache cleared")
    print()

# Sync embeddings
print("⬇️  Syncing embeddings to local cache...")
synced = 0

for person_id, embeddings in by_person.items():
    print(f"   Syncing {person_id}...")
    
    for emb_data in embeddings:
        embedding = emb_data['embedding']
        
        # Convert to numpy array and then to bytes
        emb_array = np.array(embedding, dtype=np.float32)
        emb_bytes = emb_array.tobytes()
        
        # Insert into local database
        c.execute(
            "INSERT INTO embeddings (person_id, embedding) VALUES (?, ?)",
            (person_id, emb_bytes)
        )
        synced += 1

conn.commit()
print()
print(f"✅ Synced {synced} embeddings to local cache")
print()

# Verify
c.execute("SELECT COUNT(*) FROM embeddings")
final_count = c.fetchone()[0]

c.execute("SELECT person_id, COUNT(*) FROM embeddings GROUP BY person_id")
rows = c.fetchall()

print("📊 Final local cache:")
print(f"   Total embeddings: {final_count}")
print(f"   People: {len(rows)}")
for person_id, count in rows:
    print(f"      {person_id}: {count} embeddings")

conn.close()

print()
print("=" * 80)
print("✅ SYNC COMPLETE!")
print("=" * 80)
print()
print("🎯 Next steps:")
print("   1. Restart backend: lsof -ti:8000 | xargs kill -9; python main.py")
print("   2. Try recognition in the app")
print()

