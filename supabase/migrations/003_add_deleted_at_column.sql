-- Add deleted_at column to searches table for soft delete
ALTER TABLE searches 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NULL;

-- Create index for performance
CREATE INDEX idx_searches_deleted_at ON searches(deleted_at);
