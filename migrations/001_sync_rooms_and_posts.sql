-- VibeHub Migration: Sync Rooms & Post Expiry
-- Run this in Supabase SQL Editor

-- ============================================
-- SYNC ROOMS TABLE (24hr expiry)
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id TEXT,
    max_users INT DEFAULT 125,
    current_user_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROOM MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS room_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COMMUNITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS communities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    creator_id TEXT,
    member_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- COMMUNITY MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(community_id, user_id)
);

-- ============================================
-- FRIENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS friends (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- ============================================
-- POST REACTIONS TABLE (Multiple reactions per user per post)
-- ============================================
CREATE TABLE IF NOT EXISTS post_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid NOT NULL,
    user_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id, reaction_type)
);

-- ============================================
-- REPORTED POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reported_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid NOT NULL,
    reporter_id TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BANNED USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS banned_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    reason TEXT,
    banned_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT,
    target_url TEXT,
    title TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ADD EXPIRES_AT TO POSTS (48hr expiry)
-- ============================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours');

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE communities;
ALTER PUBLICATION supabase_realtime ADD TABLE post_reactions;

-- ============================================
-- AUTO-DELETE ROOMS AFTER 24 HOURS (Trigger)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
    DELETE FROM rooms WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment community member count
CREATE OR REPLACE FUNCTION increment_community_members(community_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = community_id;
END;
$$ LANGUAGE plpgsql;

-- Join room function (with 125 user limit check)
CREATE OR REPLACE FUNCTION join_room(room_uuid uuid)
RETURNS boolean AS $$
DECLARE
    current_count INT;
    max_limit INT;
BEGIN
    SELECT current_user_count, max_users INTO current_count, max_limit 
    FROM rooms WHERE id = room_uuid;
    
    IF current_count IS NULL THEN
        RETURN false;
    END IF;
    
    IF current_count < max_limit THEN
        UPDATE rooms SET current_user_count = current_user_count + 1 WHERE id = room_uuid;
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Leave room function
CREATE OR REPLACE FUNCTION leave_room(room_uuid uuid)
RETURNS void AS $$
BEGIN
    UPDATE rooms 
    SET current_user_count = GREATEST(0, current_user_count - 1) 
    WHERE id = room_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (Optional - enable as needed)
-- ============================================
-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON communities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reported_posts_status ON reported_posts(status);

-- ============================================
-- ADD IS_SPONSORED TO POSTS
-- ============================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false;

-- ============================================
-- ADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE communities;
ALTER PUBLICATION supabase_realtime ADD TABLE post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE ads;

-- ============================================
-- AUTO-DELETE ROOMS AFTER 24 HOURS (Trigger)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
    DELETE FROM rooms WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment community member count
CREATE OR REPLACE FUNCTION increment_community_members(community_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = community_id;
END;
$$ LANGUAGE plpgsql;

-- Join room function (with 125 user limit check)
CREATE OR REPLACE FUNCTION join_room(room_uuid uuid)
RETURNS boolean AS $$
DECLARE
    current_count INT;
    max_limit INT;
BEGIN
    SELECT current_user_count, max_users INTO current_count, max_limit 
    FROM rooms WHERE id = room_uuid;
    
    IF current_count IS NULL THEN
        RETURN false;
    END IF;
    
    IF current_count < max_limit THEN
        UPDATE rooms SET current_user_count = current_count + 1 WHERE id = room_uuid;
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Leave room function
CREATE OR REPLACE FUNCTION leave_room(room_uuid uuid)
RETURNS void AS $$
BEGIN
    UPDATE rooms 
    SET current_user_count = GREATEST(0, current_user_count - 1) 
    WHERE id = room_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (Optional - enable as needed)
-- ============================================
-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON room_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON communities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reported_posts_status ON reported_posts(status);

