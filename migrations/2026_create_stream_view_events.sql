-- Phase X1: Create stream_view_events table (illustrative)
CREATE TABLE stream_view_events (
  id UUID PRIMARY KEY,
  user_id UUID,
  stream_id UUID NOT NULL,
  event_type TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
