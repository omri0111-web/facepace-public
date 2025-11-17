#!/bin/bash

# Database Switcher Script
# Automatically swaps database files when switching branches

CURRENT_BRANCH=$(git branch --show-current)
BACKEND_DIR="backend"
ORIGINAL_DB="/Users/omrishamai/Desktop/Attendance App Design (admin)new/backend/faces.db"
TESTONLINE_DB="${BACKEND_DIR}/faces_testonline.db"
ORIGINAL_DB_LOCAL="${BACKEND_DIR}/faces_original.db"
ACTIVE_DB="${BACKEND_DIR}/faces.db"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Database Switcher${NC}"
echo "Current branch: ${CURRENT_BRANCH}"

# First time setup: backup current databases
if [ ! -f "${TESTONLINE_DB}" ]; then
    echo -e "${YELLOW}📦 First time setup...${NC}"
    
    # Save current test-online database
    if [ -f "${ACTIVE_DB}" ]; then
        cp "${ACTIVE_DB}" "${TESTONLINE_DB}"
        echo "✅ Saved test-online database"
    fi
    
    # Copy original database from Desktop
    if [ -f "${ORIGINAL_DB}" ]; then
        cp "${ORIGINAL_DB}" "${ORIGINAL_DB_LOCAL}"
        echo "✅ Copied original database (356K)"
    else
        echo "⚠️  Original database not found at Desktop location"
    fi
fi

# Switch database based on branch
case "$CURRENT_BRANCH" in
    "test-online")
        if [ -f "${TESTONLINE_DB}" ]; then
            cp "${TESTONLINE_DB}" "${ACTIVE_DB}"
            echo -e "${GREEN}✅ Switched to test-online database (test data only)${NC}"
        fi
        ;;
    "main"|"test-video-upload")
        if [ -f "${ORIGINAL_DB_LOCAL}" ]; then
            cp "${ORIGINAL_DB_LOCAL}" "${ACTIVE_DB}"
            echo -e "${GREEN}✅ Switched to original database (Gaya, checking 1, etc.)${NC}"
        else
            echo -e "${YELLOW}⚠️  Original database not found. Run this script once to set up.${NC}"
        fi
        ;;
    *)
        echo "Unknown branch: $CURRENT_BRANCH"
        echo "Using current database as-is"
        ;;
esac

# Show database info
if [ -f "${ACTIVE_DB}" ]; then
    DB_SIZE=$(ls -lh "${ACTIVE_DB}" | awk '{print $5}')
    echo ""
    echo "Active database: ${ACTIVE_DB}"
    echo "Size: ${DB_SIZE}"
    
    # Count people in database
    PERSON_COUNT=$(sqlite3 "${ACTIVE_DB}" "SELECT COUNT(*) FROM persons;" 2>/dev/null || echo "?")
    GROUP_COUNT=$(sqlite3 "${ACTIVE_DB}" "SELECT COUNT(*) FROM groups;" 2>/dev/null || echo "?")
    echo "People: ${PERSON_COUNT}"
    echo "Groups: ${GROUP_COUNT}"
fi

echo ""
echo -e "${BLUE}Done! Database ready for ${CURRENT_BRANCH} branch.${NC}"

