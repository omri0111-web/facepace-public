#!/bin/bash
BRANCH=$(git branch --show-current)

echo "📤 Pushing $BRANCH to both repos..."

# Push to FacePace repo
echo "1️⃣ Pushing to FacePace..."
git push origin $BRANCH

# Push to facepace-public repo (as main branch)
echo "2️⃣ Pushing to facepace-public..."
git push public $BRANCH:main

echo "✅ Done! Vercel will auto-deploy from facepace-public."

