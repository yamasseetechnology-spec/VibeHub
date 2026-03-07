-- =============================================
-- VIBEHUB RLS RESET - RESTORE SECURE POLICIES
-- =============================================
-- Run this in Supabase SQL Editor (or as a SQL migration)
-- after 002-rls-fix-anonymous-access.sql and
-- 003-fix-rls-public-access.sql have been applied.
--
-- This migration:
--   1. Drops permissive "Anyone/Public" policies that allow
--      unauthenticated read/write access.
--   2. Restores the secure, auth-aware policies from the
--      original 001-full-schema.sql (with the same names).
-- =============================================

-- ---------- USERS ----------
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Anyone can create users" ON users;
DROP POLICY IF EXISTS "Anyone can update users" ON users;
DROP POLICY IF EXISTS "Public insert users" ON users;
DROP POLICY IF EXISTS "Public update users" ON users;
DROP POLICY IF EXISTS "Public select users" ON users;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid()::text = clerk_id OR role = 'admin');

-- ---------- POSTS ----------
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Anyone can create posts" ON posts;
DROP POLICY IF EXISTS "Anyone can update posts" ON posts;
DROP POLICY IF EXISTS "Anyone can delete posts" ON posts;
DROP POLICY IF EXISTS "Public insert posts" ON posts;
DROP POLICY IF EXISTS "Public select posts" ON posts;
DROP POLICY IF EXISTS "Public update posts" ON posts;
DROP POLICY IF EXISTS "Public delete posts" ON posts;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Anyone can create posts" ON posts;
DROP POLICY IF EXISTS "Owners can update posts" ON posts;
DROP POLICY IF EXISTS "Owners can delete posts" ON posts;

CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Anyone can create posts"
  ON posts FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update posts"
  ON posts FOR UPDATE USING (
    auth.uid()::text = clerk_id
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.clerk_id = auth.uid()::text
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Owners can delete posts"
  ON posts FOR DELETE USING (
    auth.uid()::text = clerk_id
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.clerk_id = auth.uid()::text
        AND users.role = 'admin'
    )
  );

-- ---------- COMMENTS ----------
DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON comments;
DROP POLICY IF EXISTS "Anyone can update comments" ON comments;
DROP POLICY IF EXISTS "Anyone can delete comments" ON comments;
DROP POLICY IF EXISTS "Public insert comments" ON comments;
DROP POLICY IF EXISTS "Public select comments" ON comments;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON comments;
DROP POLICY IF EXISTS "Owners can update comments" ON comments;
DROP POLICY IF EXISTS "Owners can delete comments" ON comments;

CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Anyone can create comments"
  ON comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update comments"
  ON comments FOR UPDATE USING (auth.uid()::text = clerk_id);

CREATE POLICY "Owners can delete comments"
  ON comments FOR DELETE USING (auth.uid()::text = clerk_id);

-- ---------- CHANNELS ----------
DROP POLICY IF EXISTS "Anyone can read channels" ON channels;
DROP POLICY IF EXISTS "Anyone can create channels" ON channels;
DROP POLICY IF EXISTS "Anyone can update channels" ON channels;
DROP POLICY IF EXISTS "Anyone can delete channels" ON channels;
DROP POLICY IF EXISTS "Public insert channels" ON channels;
DROP POLICY IF EXISTS "Public select channels" ON channels;

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Channels are viewable by everyone" ON channels;
DROP POLICY IF EXISTS "Anyone can create channels" ON channels;
DROP POLICY IF EXISTS "Owners can update channels" ON channels;

CREATE POLICY "Channels are viewable by everyone"
  ON channels FOR SELECT USING (true);

CREATE POLICY "Anyone can create channels"
  ON channels FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update channels"
  ON channels FOR UPDATE USING (auth.uid()::text = clerk_id);

-- ---------- VIDEOS ----------
DROP POLICY IF EXISTS "Anyone can read videos" ON videos;
DROP POLICY IF EXISTS "Anyone can create videos" ON videos;
DROP POLICY IF EXISTS "Anyone can update videos" ON videos;
DROP POLICY IF EXISTS "Anyone can delete videos" ON videos;

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON videos;
DROP POLICY IF EXISTS "Anyone can create videos" ON videos;
DROP POLICY IF EXISTS "Owners can update videos" ON videos;

CREATE POLICY "Videos are viewable by everyone"
  ON videos FOR SELECT USING (true);

CREATE POLICY "Anyone can create videos"
  ON videos FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update videos"
  ON videos FOR UPDATE USING (true);

-- ---------- MESSAGES ----------
DROP POLICY IF EXISTS "Anyone can read messages" ON messages;
DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON messages;
DROP POLICY IF EXISTS "Anyone can delete messages" ON messages;
DROP POLICY IF EXISTS "Public select messages" ON messages;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages between participants" ON messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON messages;

CREATE POLICY "Messages between participants"
  ON messages FOR SELECT USING (
    auth.uid()::text = sender_id::text
    OR auth.uid()::text = receiver_id::text
  );

CREATE POLICY "Anyone can send messages"
  ON messages FOR INSERT WITH CHECK (true);

-- ---------- NOTIFICATIONS ----------
DROP POLICY IF EXISTS "Anyone can read notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON notifications;
DROP POLICY IF EXISTS "Public insert notifications" ON notifications;
DROP POLICY IF EXISTS "Public select notifications" ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications for user" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;

CREATE POLICY "Notifications for user"
  ON notifications FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Anyone can create notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- ---------- MARKETPLACE ----------
DROP POLICY IF EXISTS "Anyone can read marketplace" ON marketplace;
DROP POLICY IF EXISTS "Anyone can create marketplace" ON marketplace;
DROP POLICY IF EXISTS "Anyone can update marketplace" ON marketplace;
DROP POLICY IF EXISTS "Anyone can delete marketplace" ON marketplace;
DROP POLICY IF EXISTS "Public insert marketplace" ON marketplace;
DROP POLICY IF EXISTS "Public select marketplace" ON marketplace;

ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Marketplace is viewable by everyone" ON marketplace;
DROP POLICY IF EXISTS "Anyone can create listings" ON marketplace;

CREATE POLICY "Marketplace is viewable by everyone"
  ON marketplace FOR SELECT USING (status = 'active');

CREATE POLICY "Anyone can create listings"
  ON marketplace FOR INSERT WITH CHECK (true);

-- ---------- SYNC SPACES ----------
DROP POLICY IF EXISTS "Anyone can read sync_spaces" ON sync_spaces;
DROP POLICY IF EXISTS "Anyone can create sync_spaces" ON sync_spaces;
DROP POLICY IF EXISTS "Anyone can update sync_spaces" ON sync_spaces;
DROP POLICY IF EXISTS "Anyone can delete sync_spaces" ON sync_spaces;

ALTER TABLE sync_spaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sync Spaces are viewable by everyone" ON sync_spaces;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON sync_spaces;
DROP POLICY IF EXISTS "Creator can manage room" ON sync_spaces;

CREATE POLICY "Sync Spaces are viewable by everyone"
  ON sync_spaces FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON sync_spaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator can manage room"
  ON sync_spaces FOR UPDATE USING (
    auth.uid()::text = creator_clerk_id
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.clerk_id = auth.uid()::text
        AND users.role = 'admin'
    )
  );

-- ---------- SYNC SPACE MESSAGES ----------
DROP POLICY IF EXISTS "Anyone can read sync_space_messages" ON sync_space_messages;
DROP POLICY IF EXISTS "Anyone can create sync_space_messages" ON sync_space_messages;

ALTER TABLE sync_space_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Space messages are viewable by everyone" ON sync_space_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON sync_space_messages;

CREATE POLICY "Space messages are viewable by everyone"
  ON sync_space_messages FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON sync_space_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- REPORTS ----------
DROP POLICY IF EXISTS "Anyone can read reports" ON reports;
DROP POLICY IF EXISTS "Anyone can create reports" ON reports;
DROP POLICY IF EXISTS "Reports for admin" ON reports;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports for admin"
  ON reports FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.clerk_id = auth.uid()::text
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Anyone can create reports"
  ON reports FOR INSERT WITH CHECK (true);

-- ---------- PAYMENTS ----------
DROP POLICY IF EXISTS "Anyone can read payments" ON payments;
DROP POLICY IF EXISTS "Anyone can create payments" ON payments;
DROP POLICY IF EXISTS "Payments viewable by user or admin" ON payments;
DROP POLICY IF EXISTS "Admins can create payments" ON payments;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments viewable by user or admin"
  ON payments FOR SELECT USING (
    auth.uid()::text = clerk_id
    OR EXISTS (
      SELECT 1
      FROM users
      WHERE users.clerk_id = auth.uid()::text
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can create payments"
  ON payments FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.clerk_id = auth.uid()::text
        AND users.role = 'admin'
    )
  );

-- Note: Additional tables introduced in later iterations
-- (e.g., reputation_cache, vibe_likes, user_waves, etc.)
-- should have their own secure, auth-aware policies defined
-- explicitly as needed. This migration focuses on the core
-- tables defined in 001 and opened up in 002/003.

-- =============================================
-- DONE - Secure RLS restored
-- =============================================
