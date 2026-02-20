-- Add receipt_url column to subscription_payment_history table
ALTER TABLE subscription_payment_history 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Update the comments
COMMENT ON COLUMN subscription_payment_history.receipt_url IS 'URL to access the PortOne payment receipt';
