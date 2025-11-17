#!/usr/bin/env python3
"""
Check which person IDs have embeddings
"""
import sqlite3

DB_PATH = "faces.db"

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

print("=" * 80)
print("📊 EMBEDDINGS BY PERSON")
print("=" * 80)
print()

# Count by person
c.execute("SELECT person_id, COUNT(*) as count FROM embeddings GROUP BY person_id ORDER BY count DESC")
rows = c.fetchall()

print(f"Total: {len(rows)} people with embeddings")
print()

for person_id, count in rows:
    # Try to get name from persons table if it exists
    try:
        c.execute("SELECT person_name FROM persons WHERE person_id = ?", (person_id,))
        name_row = c.fetchone()
        name = name_row[0] if name_row else "Unknown"
    except:
        name = "Unknown"
    
    print(f"  {person_id}")
    print(f"    Name: {name}")
    print(f"    Embeddings: {count}")
    print()

print("=" * 80)
print()
print("🔍 Looking for: ed400785-410a-406a-b031-e04cceefa057")
print()

# Check if the specific person exists
c.execute("SELECT COUNT(*) FROM embeddings WHERE person_id = ?", ("ed400785-410a-406a-b031-e04cceefa057",))
count = c.fetchone()[0]

if count > 0:
    print(f"✅ FOUND! This person has {count} embeddings in local cache")
    print()
    print("Recognition SHOULD work for this person.")
    print()
    print("If recognition still doesn't work, the issue is:")
    print("  1. Frontend not sending correct person_id or group_id")
    print("  2. Backend not receiving recognition requests")
    print("  3. Recognition threshold too strict")
else:
    print("❌ NOT FOUND! This person has 0 embeddings in local cache")
    print()
    print("This is why recognition doesn't work.")
    print()
    print("The 80 embeddings belong to OTHER people.")

conn.close()

