-- Phase X1: Create streams table (illustrative)
CREATE TABLE streams (
  id UUID PRIMARY KEY,
  host_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  is_live BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'public',
  engine TEXT,
  stream_url TEXT,
  viewer_count BIGINT DEFAULT 0,
  max_viewers BIGINT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
