-- Migration: Add group_id column to pending_enrollments table
-- This allows direct enrollment links without needing the enrollment_links table

-- Add group_id column (optional, can be NULL for general enrollments)
ALTER TABLE pending_enrollments 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_pending_enrollments_group_id 
ON pending_enrollments(group_id);

-- Add processed_at timestamp to track when enrollment was accepted/rejected
ALTER TABLE pending_enrollments 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Update the status check to include 'approved' (we were using this in the code)
ALTER TABLE pending_enrollments 
DROP CONSTRAINT IF EXISTS pending_enrollments_status_check;

ALTER TABLE pending_enrollments 
ADD CONSTRAINT pending_enrollments_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'approved'));

-- Done! Now pending_enrollments can store group_id directly

