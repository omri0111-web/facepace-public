#!/bin/bash

# 🎯 Commit and Push Script for test-online Branch
# This script helps you organize and commit all your changes

echo "🚀 Git Organization Script"
echo "=========================="
echo ""

# Navigate to project directory
cd "/Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO"

echo "📍 Current location: $(pwd)"
echo "🌿 Current branch: $(git branch --show-current)"
echo ""

# Show current status
echo "📊 Checking what has changed..."
echo ""
git status
echo ""

# Ask user if they want to continue
read -p "❓ Do you want to stage ALL changes? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📦 Staging all changes..."
    git add .
    echo "✅ Changes staged!"
    echo ""
    
    # Show what will be committed
    echo "📋 Files to be committed:"
    git status --short
    echo ""
    
    # Ask for commit message
    echo "💬 Please enter your commit message:"
    echo "   (Press Enter when done)"
    read -p "Message: " commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="feat: Update test-online branch with latest changes"
        echo "   Using default message: $commit_message"
    fi
    echo ""
    
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "$commit_message"
    echo "✅ Changes committed!"
    echo ""
    
    # Ask if user wants to push
    read -p "🚀 Do you want to push to remote (GitHub)? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        echo "📤 Pushing to origin/test-online..."
        git push origin test-online
        echo "✅ Changes pushed to GitHub!"
        echo ""
        echo "🎉 All done! Your changes are now on GitHub."
    else
        echo "⏸️  Changes committed locally but NOT pushed to GitHub."
        echo "   Run 'git push origin test-online' later to push."
    fi
else
    echo "❌ Cancelled. No changes were staged or committed."
    echo "   Run this script again when you're ready!"
fi

echo ""
echo "=========================="
echo "✅ Script complete!"

