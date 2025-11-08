-- Add signature field to ai_quotes table
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS signed_by TEXT;

-- Create notifications table for maintenance reminders
CREATE TABLE IF NOT EXISTS maintenance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES maintenance_reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on maintenance_notifications
ALTER TABLE maintenance_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for maintenance_notifications
CREATE POLICY "Users can view their own notifications"
  ON maintenance_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications"
  ON maintenance_notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create stats table for automated statistics
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_quotes INTEGER DEFAULT 0,
  total_quotes_value NUMERIC DEFAULT 0,
  total_analyses INTEGER DEFAULT 0,
  total_maintenance_reminders INTEGER DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stats
CREATE POLICY "Users can view their own stats"
  ON user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stats"
  ON user_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for user_stats updated_at
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();