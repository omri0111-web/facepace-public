#!/bin/bash

# 🚀 Push to GitHub Script
# This script commits all changes and pushes to GitHub

set -e  # Exit on error

echo "🚀 Git Push Script"
echo "=================="
echo ""

# Navigate to project directory
cd "/Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO"

echo "📍 Location: $(pwd)"
echo "🌿 Branch: $(git branch --show-current)"
echo ""

# Check if there are changes
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes to commit. Everything is up to date!"
    exit 0
fi

echo "📊 Changes detected:"
echo ""
git status --short
echo ""

# Stage all changes
echo "📦 Staging all changes..."
git add -A
echo "✅ All changes staged!"
echo ""

# Show what will be committed
echo "📋 Files to be committed:"
git status --short
echo ""

# Create commit message
COMMIT_MESSAGE="feat: Complete Supabase integration with offline mode and all features

- Add Supabase authentication and database integration
- Implement public enrollment links with pending inbox
- Add offline mode with local storage fallback
- Create direct add person flow with backend processing
- Add auto-sync when internet is available
- Implement local SQLite cache for face recognition
- Add video testing with InsightFace model verification
- Create helper scripts for backend management
- Add comprehensive documentation and Git guides
- Organize repository structure and branches"

echo "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE"
echo "✅ Changes committed!"
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub (test-online branch)..."
git push origin test-online
echo ""

echo "✅ Success! All changes pushed to GitHub!"
echo ""
echo "🌐 View on GitHub:"
echo "   https://github.com/YOUR_USERNAME/YOUR_REPO/tree/test-online"
echo ""
echo "=================="
echo "🎉 Done!"

