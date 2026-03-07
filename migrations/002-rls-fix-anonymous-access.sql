-- =============================================
-- VIBEHUB RLS POLICY FIXES
-- =============================================
-- Run this in Supabase SQL Editor
-- This fixes the issue where data cannot be inserted without authentication
-- =============================================

-- Drop existing restrictive policies that require auth
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Owners can update posts" ON posts;
DROP POLICY IF EXISTS "Owners can delete posts" ON posts;
DROP POLICY IF EXISTS "Owners can update channels" ON channels;
DROP POLICY IF EXISTS "Owners can update comments" ON comments;
DROP POLICY IF EXISTS "Creator can manage room" ON sync_spaces;
DROP POLICY IF EXISTS "Payments viewable by user or admin" ON payments;
DROP POLICY IF EXISTS "Admins can create payments" ON payments;
DROP POLICY IF EXISTS "Reports for admin" ON reports;
DROP POLICY IF EXISTS "Notifications for user" ON notifications;

-- Create permissive policies for anonymous access (no auth required)
-- Users table
CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can create users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON users FOR UPDATE USING (true);

-- Posts table  
CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Anyone can create posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete posts" ON posts FOR DELETE USING (true);

-- Comments table
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can create comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comments" ON comments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete comments" ON comments FOR DELETE USING (true);

-- Channels table
CREATE POLICY "Anyone can read channels" ON channels FOR SELECT USING (true);
CREATE POLICY "Anyone can create channels" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update channels" ON channels FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete channels" ON channels FOR DELETE USING (true);

-- Videos table
CREATE POLICY "Anyone can read videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Anyone can create videos" ON videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update videos" ON videos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete videos" ON videos FOR DELETE USING (true);

-- Messages table
CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can create messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update messages" ON messages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete messages" ON messages FOR DELETE USING (true);

-- Notifications table
CREATE POLICY "Anyone can read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON notifications FOR UPDATE USING (true);

-- Marketplace table
CREATE POLICY "Anyone can read marketplace" ON marketplace FOR SELECT USING (true);
CREATE POLICY "Anyone can create marketplace" ON marketplace FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update marketplace" ON marketplace FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete marketplace" ON marketplace FOR DELETE USING (true);

-- Sync Spaces table
CREATE POLICY "Anyone can read sync_spaces" ON sync_spaces FOR SELECT USING (true);
CREATE POLICY "Anyone can create sync_spaces" ON sync_spaces FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sync_spaces" ON sync_spaces FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sync_spaces" ON sync_spaces FOR DELETE USING (true);

-- Sync Space Messages table
CREATE POLICY "Anyone can read sync_space_messages" ON sync_space_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can create sync_space_messages" ON sync_space_messages FOR INSERT WITH CHECK (true);

-- Reports table
CREATE POLICY "Anyone can read reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Anyone can create reports" ON reports FOR INSERT WITH CHECK (true);

-- Payments table
CREATE POLICY "Anyone can read payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Anyone can create payments" ON payments FOR INSERT WITH CHECK (true);

-- Status Channels table
CREATE POLICY "Anyone can read status_channels" ON status_channels FOR SELECT USING (true);
CREATE POLICY "Anyone can create status_channels" ON status_channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update status_channels" ON status_channels FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete status_channels" ON status_channels FOR DELETE USING (true);

-- Reputation Cache table
CREATE POLICY "Anyone can read reputation_cache" ON reputation_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can create reputation_cache" ON reputation_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reputation_cache" ON reputation_cache FOR UPDATE USING (true);

-- Friend Requests table
CREATE POLICY "Anyone can read friend_requests" ON friend_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can create friend_requests" ON friend_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update friend_requests" ON friend_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete friend_requests" ON friend_requests FOR DELETE USING (true);

-- Collab Posts table
CREATE POLICY "Anyone can read collab_posts" ON collab_posts FOR SELECT USING (true);
CREATE POLICY "Anyone can create collab_posts" ON collab_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update collab_posts" ON collab_posts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete collab_posts" ON collab_posts FOR DELETE USING (true);

-- Vibe Likes table
CREATE POLICY "Anyone can read vibe_likes" ON vibe_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can create vibe_likes" ON vibe_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete vibe_likes" ON vibe_likes FOR DELETE USING (true);

-- User Waves table
CREATE POLICY "Anyone can read user_waves" ON user_waves FOR SELECT USING (true);
CREATE POLICY "Anyone can create user_waves" ON user_waves FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user_waves" ON user_waves FOR DELETE USING (true);

-- Momentum Data table
CREATE POLICY "Anyone can read momentum_data" ON momentum_data FOR SELECT USING (true);
CREATE POLICY "Anyone can create momentum_data" ON momentum_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update momentum_data" ON momentum_data FOR UPDATE USING (true);

-- Friends table
CREATE POLICY "Anyone can read friends" ON friends FOR SELECT USING (true);
CREATE POLICY "Anyone can create friends" ON friends FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete friends" ON friends FOR DELETE USING (true);

-- User Blocks table
CREATE POLICY "Anyone can read user_blocks" ON user_blocks FOR SELECT USING (true);
CREATE POLICY "Anyone can create user_blocks" ON user_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user_blocks" ON user_blocks FOR DELETE USING (true);

-- Privacy Settings table
CREATE POLICY "Anyone can read privacy_settings" ON privacy_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can create privacy_settings" ON privacy_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update privacy_settings" ON privacy_settings FOR UPDATE USING (true);

-- Verification Requests table
CREATE POLICY "Anyone can read verification_requests" ON verification_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can create verification_requests" ON verification_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update verification_requests" ON verification_requests FOR UPDATE USING (true);

-- User Sessions table
CREATE POLICY "Anyone can read user_sessions" ON user_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create user_sessions" ON user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user_sessions" ON user_sessions FOR DELETE USING (true);

-- =============================================
-- DONE
-- =============================================
-- All tables now allow public read/write access
-- This enables the app to work without authentication
-- For production, you may want to add additional validation
-- =============================================
