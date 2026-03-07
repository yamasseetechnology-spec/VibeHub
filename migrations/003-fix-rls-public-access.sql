-- =============================================
-- VIBEHUB RLS POLICY FIX - ALLOW PUBLIC ACCESS
-- =============================================
-- Run this in Supabase SQL Editor
-- This allows public insert/update/select on all tables
-- =============================================

-- Users table
DROP POLICY IF EXISTS "Anyone can create users" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Anyone can update users" ON users;
DROP POLICY IF EXISTS "Public access" ON users;

CREATE POLICY "Public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Public select users" ON users FOR SELECT USING (true);

-- Posts table
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Anyone can create posts" ON posts;
DROP POLICY IF EXISTS "Anyone can update posts" ON posts;
DROP POLICY IF EXISTS "Anyone can delete posts" ON posts;

CREATE POLICY "Public insert posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Public update posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Public delete posts" ON posts FOR DELETE USING (true);

-- Comments table
DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
DROP POLICY IF EXISTS "Anyone can create comments" ON comments;

CREATE POLICY "Public insert comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select comments" ON comments FOR SELECT USING (true);

-- Channels table
DROP POLICY IF EXISTS "Anyone can read channels" ON channels;
DROP POLICY IF EXISTS "Anyone can create channels" ON channels;

CREATE POLICY "Public insert channels" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select channels" ON channels FOR SELECT USING (true);

-- Notifications table
DROP POLICY IF EXISTS "Anyone can read notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;

CREATE POLICY "Public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select notifications" ON notifications FOR SELECT USING (true);

-- Messages table
DROP POLICY IF EXISTS "Anyone can read messages" ON messages;

CREATE POLICY "Public select messages" ON messages FOR SELECT USING (true);

-- Marketplace table
DROP POLICY IF EXISTS "Anyone can read marketplace" ON marketplace;
DROP POLICY IF EXISTS "Anyone can create marketplace" ON marketplace;

CREATE POLICY "Public insert marketplace" ON marketplace FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select marketplace" ON marketplace FOR SELECT USING (true);

-- =============================================
-- DONE - All tables now allow public access
-- =============================================
