#!/usr/bin/env python3
"""
Diagnostic script to check why recognition isn't working
"""
import sqlite3
import os

DB_PATH = "faces.db"

print("=" * 60)
print("🔍 RECOGNITION DIAGNOSTIC")
print("=" * 60)

# Check if database exists
if not os.path.exists(DB_PATH):
    print(f"❌ Database not found: {DB_PATH}")
    print("   The database should be created when backend starts")
    exit(1)

print(f"✅ Database found: {DB_PATH}")
print()

# Connect to database
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Check tables
print("📋 Tables in database:")
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
for table in tables:
    print(f"   - {table[0]}")
print()

# Check if embeddings table exists
if ('embeddings',) not in tables:
    print("❌ 'embeddings' table not found!")
    print("   Backend needs to create this table on startup")
    conn.close()
    exit(1)

print("✅ 'embeddings' table exists")
print()

# Check table schema
print("📐 Embeddings table schema:")
c.execute("PRAGMA table_info(embeddings)")
columns = c.fetchall()
for col in columns:
    print(f"   {col[1]} ({col[2]})")
print()

# Count embeddings
c.execute("SELECT COUNT(*) FROM embeddings")
count = c.fetchone()[0]
print(f"📊 Total embeddings in local cache: {count}")

if count == 0:
    print("❌ No embeddings found in local cache!")
    print("   This is why recognition doesn't work.")
    print()
    print("💡 Possible causes:")
    print("   1. Person was added but backend didn't save to local cache")
    print("   2. Wrong database file (check branch)")
    print("   3. Backend error during enrollment")
    print()
    conn.close()
    exit(1)

print()

# Show all embeddings
print("📝 Embeddings by person:")
c.execute("SELECT person_id, COUNT(*) as count FROM embeddings GROUP BY person_id")
rows = c.fetchall()
for person_id, emb_count in rows:
    print(f"   Person {person_id}: {emb_count} embeddings")
print()

# Check persons table
if ('persons',) in tables:
    print("👥 Persons in database:")
    c.execute("SELECT person_id, person_name FROM persons")
    persons = c.fetchall()
    if persons:
        for person_id, name in persons:
            print(f"   {person_id}: {name}")
    else:
        print("   (no persons found)")
else:
    print("⚠️  'persons' table not found (this is OK, names come from Supabase)")

print()
print("=" * 60)
print("✅ DIAGNOSIS COMPLETE")
print("=" * 60)

if count > 0:
    print()
    print("✅ Embeddings found! Recognition should work.")
    print()
    print("🔧 If recognition still doesn't work, check:")
    print("   1. Backend logs for errors")
    print("   2. Frontend is sending correct group_id or filter_ids")
    print("   3. Person IDs match between frontend and backend")
else:
    print()
    print("❌ No embeddings! This is why recognition doesn't work.")
    print()
    print("🔧 To fix:")
    print("   1. Re-add the person through the app")
    print("   2. Check backend logs for errors")
    print("   3. Make sure backend is running and connected to Supabase")

conn.close()

