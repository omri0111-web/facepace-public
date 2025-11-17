#!/bin/bash

echo "============================================"
echo "🌿 CURRENT BRANCH & DATABASE CHECK"
echo "============================================"
echo ""

# Check current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $BRANCH"
echo ""

# Check which faces.db files exist
echo "Database files in backend/:"
ls -lh faces*.db 2>/dev/null || echo "  No faces*.db files found"
echo ""

# Check which database is active
if [ -f "faces.db" ]; then
    SIZE=$(du -h faces.db | awk '{print $1}')
    PEOPLE_COUNT=$(sqlite3 faces.db "SELECT COUNT(DISTINCT person_id) FROM embeddings;" 2>/dev/null || echo "error")
    EMBEDDINGS_COUNT=$(sqlite3 faces.db "SELECT COUNT(*) FROM embeddings;" 2>/dev/null || echo "error")
    
    echo "Active database: faces.db"
    echo "  Size: $SIZE"
    echo "  People: $PEOPLE_COUNT"
    echo "  Embeddings: $EMBEDDINGS_COUNT"
else
    echo "❌ No active faces.db found!"
fi

echo ""
echo "============================================"
echo ""

# Recommendation based on branch
if [ "$BRANCH" = "test-online" ]; then
    echo "✅ You're on test-online branch"
    echo ""
    echo "Expected: faces.db should have TEST data only"
    echo "  (Not Yuval, Gaya, etc. from main branch)"
    echo ""
    echo "If you see 80 embeddings, you might be using the wrong database!"
    echo ""
    echo "To switch to test-online database:"
    echo "  ./switch-database.sh"
elif [ "$BRANCH" = "main" ] || [ "$BRANCH" = "test-video-upload" ]; then
    echo "✅ You're on $BRANCH branch"
    echo ""
    echo "Expected: faces.db should have ORIGINAL data"
    echo "  (Yuval, Gaya, checking 1, etc.)"
else
    echo "ℹ️  You're on $BRANCH branch"
fi

echo ""

