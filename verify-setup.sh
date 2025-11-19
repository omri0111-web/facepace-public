#!/bin/bash

# 🔍 Setup Verification Script
# Verifies that everything is set up correctly for test-online branch

set -e

cd "/Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verifying Setup for test-online Branch${NC}"
echo "=========================================="
echo ""

# Check 1: Current Branch
echo -e "${BLUE}1. Checking Git Branch...${NC}"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
if [ "$CURRENT_BRANCH" = "test-online" ]; then
    echo -e "${GREEN}✅ On test-online branch${NC}"
else
    echo -e "${YELLOW}⚠️  Current branch: $CURRENT_BRANCH (should be test-online)${NC}"
    echo "   Switching to test-online..."
    git checkout test-online 2>/dev/null && echo -e "${GREEN}✅ Switched to test-online${NC}" || echo -e "${RED}❌ Failed to switch branch${NC}"
fi
echo ""

# Check 2: Database
echo -e "${BLUE}2. Checking Database...${NC}"
if [ -f "switch-database.sh" ]; then
    chmod +x switch-database.sh
    ./switch-database.sh
    echo ""
else
    echo -e "${YELLOW}⚠️  switch-database.sh not found${NC}"
fi

# Check 3: Backend Environment
echo -e "${BLUE}3. Checking Backend Setup...${NC}"
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ backend/.env exists${NC}"
    if grep -q "SUPABASE_URL" backend/.env && grep -q "SUPABASE_SERVICE_KEY" backend/.env; then
        echo -e "${GREEN}✅ Supabase credentials configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase credentials may be missing${NC}"
    fi
else
    echo -e "${RED}❌ backend/.env not found${NC}"
    echo "   Create it with:"
    echo "   SUPABASE_URL=your_url"
    echo "   SUPABASE_SERVICE_KEY=your_key"
fi
echo ""

# Check 4: Frontend Environment
echo -e "${BLUE}4. Checking Frontend Setup...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local exists${NC}"
    if grep -q "VITE_SUPABASE_URL" .env.local && grep -q "VITE_SUPABASE_ANON_KEY" .env.local; then
        echo -e "${GREEN}✅ Supabase credentials configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase credentials may be missing${NC}"
    fi
else
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "   Create it with:"
    echo "   VITE_SUPABASE_URL=your_url"
    echo "   VITE_SUPABASE_ANON_KEY=your_key"
fi
echo ""

# Check 5: Backend Dependencies
echo -e "${BLUE}5. Checking Backend Dependencies...${NC}"
if [ -d "backend/venv" ]; then
    echo -e "${GREEN}✅ Python virtual environment exists${NC}"
else
    echo -e "${YELLOW}⚠️  Python venv not found${NC}"
    echo "   Create it with: cd backend && python3 -m venv venv"
fi

if [ -f "backend/requirements.txt" ]; then
    echo -e "${GREEN}✅ requirements.txt exists${NC}"
else
    echo -e "${RED}❌ requirements.txt not found${NC}"
fi
echo ""

# Check 6: Frontend Dependencies
echo -e "${BLUE}6. Checking Frontend Dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules not found${NC}"
    echo "   Install with: npm install"
fi

if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json exists${NC}"
else
    echo -e "${RED}❌ package.json not found${NC}"
fi
echo ""

# Check 7: Backend Scripts
echo -e "${BLUE}7. Checking Backend Scripts...${NC}"
for script in "backend/start.sh" "backend/stop.sh" "backend/restart.sh"; do
    if [ -f "$script" ]; then
        chmod +x "$script" 2>/dev/null
        echo -e "${GREEN}✅ $(basename $script) exists and executable${NC}"
    else
        echo -e "${YELLOW}⚠️  $script not found${NC}"
    fi
done
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}📊 Setup Summary${NC}"
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "Database: backend/faces.db"
if [ -f "backend/faces.db" ]; then
    DB_SIZE=$(ls -lh backend/faces.db 2>/dev/null | awk '{print $5}' || echo "?")
    echo "Database size: $DB_SIZE"
fi
echo ""
echo -e "${GREEN}✅ Setup verification complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && ./start.sh"
echo "2. Start frontend: npm run dev"
echo "3. Open browser: http://localhost:3000"


