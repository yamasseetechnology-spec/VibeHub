-- =============================================
-- VIBEHUB COMPLETE DATABASE SCHEMA
-- =============================================
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  theme TEXT DEFAULT 'purple' CHECK (theme IN ('purple', 'pink', 'cyan', 'gold', 'green', 'red')),
  banner_gradient TEXT DEFAULT 'purple',
  song_url TEXT DEFAULT '',
  song_name TEXT DEFAULT '',
  song_artist TEXT DEFAULT '',
  mood_emoji TEXT DEFAULT '☀️',
  mood_text TEXT DEFAULT 'Living my best life',
  top8 TEXT[] DEFAULT '{}',
  followers TEXT[] DEFAULT '{}',
  following TEXT[] DEFAULT '{}',
  likes_given INT DEFAULT 0,
  vibes_boosted INT DEFAULT 0,
  vibe_score INT DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_id TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  blocked_users TEXT[] DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{"profileVisibility": "public", "showOnlineStatus": true, "allowMessages": true}',
  notification_settings JSONB DEFAULT '{"likes": true, "comments": true, "follows": true, "mentions": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- POSTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  username TEXT,
  user_avatar TEXT,
  text TEXT NOT NULL,
  media_url TEXT DEFAULT '',
  media_type TEXT DEFAULT 'none' CHECK (media_type IN ('none', 'image', 'video')),
  tags TEXT[] DEFAULT '{}',
  mood TEXT DEFAULT '',
  link_preview JSONB DEFAULT '{"title": "", "description": "", "image": "", "url": ""}',
  likes TEXT[] DEFAULT '{}',
  dislikes TEXT[] DEFAULT '{}',
  reactions JSONB DEFAULT '{"cap": [], "relate": [], "wild": [], "facts": []}',
  comment_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- COMMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  username TEXT,
  user_avatar TEXT,
  text TEXT NOT NULL,
  audio_url TEXT DEFAULT '',
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CHANNELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '🎵 Music',
  emoji_banner TEXT DEFAULT '🎬',
  subscribers TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VIDEOS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji_thumbnail TEXT DEFAULT '🎬',
  video_url TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  views INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MESSAGES (DMs) TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  sender_username TEXT,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('like', 'dislike', 'comment', 'follow', 'mention', 'vibe_boost', 'wave')),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_username TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MARKETPLACE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS marketplace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  seller_username TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN ('electronics', 'clothing', 'art', 'other')),
  image_url TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'removed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- STATUS CHANNELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS status_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FRIENDSHIPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'friends' CHECK (status IN ('friends', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- =============================================
-- FRIEND REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_username TEXT,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_username TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- =============================================
-- REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reporter_clerk_id TEXT,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('post', 'user', 'comment', 'message', 'channel', 'marketplace')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'violence', 'inappropriate', 'scam', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SYNC SPACES (LIVE CHAT ROOMS) TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sync_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_clerk_id TEXT,
  creator_username TEXT,
  description TEXT DEFAULT '',
  message_count INT DEFAULT 0,
  active_users TEXT[] DEFAULT '{}',
  max_users INT DEFAULT 125,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (created_at + INTERVAL '24 hours') STORED
);

-- =============================================
-- SYNC SPACE MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sync_space_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES sync_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clerk_id TEXT,
  username TEXT NOT NULL,
  user_avatar TEXT DEFAULT '',
  message TEXT NOT NULL,
  message_number INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SYNC SPACE REACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sync_space_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES sync_space_messages(id) ON DELETE CASCADE,
  space_id UUID REFERENCES sync_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clerk_id TEXT,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SYNC SPACE PARTICIPANTS (for glow tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS sync_space_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES sync_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clerk_id TEXT,
  username TEXT NOT NULL,
  messages_sent INT DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(space_id, clerk_id)
);

-- =============================================
-- PAYMENT VERIFICATION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT DECIMAL(10,2) NOT NULL NULL,
  amount,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('signup', 'marketplace')),
  square_payment_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sync_spaces_active ON sync_spaces(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_sync_space_messages_space ON sync_space_messages(space_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace(status);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Users: Public read, owner update
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = clerk_id OR role = 'admin');

-- Posts: Public read, owner create/update/delete
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Anyone can create posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update posts" ON posts FOR UPDATE USING (auth.uid()::text = clerk_id OR EXISTS (SELECT 1 FROM users WHERE users.clerk_id = auth.uid()::text AND users.role = 'admin'));
CREATE POLICY "Owners can delete posts" ON posts FOR DELETE USING (auth.uid()::text = clerk_id OR EXISTS (SELECT 1 FROM users WHERE users.clerk_id = auth.uid()::text AND users.role = 'admin'));

-- Comments: Public read, owner create/update/delete
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can create comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update comments" ON comments FOR UPDATE USING (auth.uid()::text = clerk_id);
CREATE POLICY "Owners can delete comments" ON comments FOR DELETE USING (auth.uid()::text = clerk_id);

-- Channels: Public read, owner create/update
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels are viewable by everyone" ON channels FOR SELECT USING (true);
CREATE POLICY "Anyone can create channels" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update channels" ON channels FOR UPDATE USING (auth.uid()::text = clerk_id);

-- Videos: Public read, owner create/update
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos are viewable by everyone" ON videos FOR SELECT USING (true);
CREATE POLICY "Anyone can create videos" ON videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update videos" ON videos FOR UPDATE USING (true);

-- Messages: Only sender and receiver
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages between participants" ON messages FOR SELECT USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);
CREATE POLICY "Anyone can send messages" ON messages FOR INSERT WITH CHECK (true);

-- Notifications: Only owner
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications for user" ON notifications FOR SELECT USING (auth.uid()::text = clerk_id);
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Marketplace: Public read, owner create
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marketplace is viewable by everyone" ON marketplace FOR SELECT USING (status = 'active');
CREATE POLICY "Anyone can create listings" ON marketplace FOR INSERT WITH CHECK (true);

-- Sync Spaces: Public read, authenticated create
ALTER TABLE sync_spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sync Spaces are viewable by everyone" ON sync_spaces FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON sync_spaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creator can manage room" ON sync_spaces FOR UPDATE USING (auth.uid()::text = creator_clerk_id OR EXISTS (SELECT 1 FROM users WHERE users.clerk_id = auth.uid()::text AND users.role = 'admin'));

-- Sync Space Messages: Public read, authenticated create
ALTER TABLE sync_space_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Space messages are viewable by everyone" ON sync_space_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON sync_space_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Reports: Admin only view
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports for admin" ON reports FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.clerk_id = auth.uid()::text AND users.role = 'admin'));
CREATE POLICY "Anyone can create reports" ON reports FOR INSERT WITH CHECK (true);

-- Payments: User and admin only
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payments viewable by user or admin" ON payments FOR SELECT USING (auth.uid()::text = clerk_id OR EXISTS (SELECT 1 FROM users WHERE users.clerk_id = auth.uid()::text AND users.role = 'admin'));
CREATE POLICY "Admins can create payments" ON payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.clerk_id = auth.uid()::text AND users.role = 'admin'));

-- =============================================
-- SEED DATA (Demo Mode Users)
-- =============================================
INSERT INTO users (username, email, name, bio, theme, banner_gradient, mood_emoji, mood_text, top8, vibe_score, verified, role, paid, created_at) VALUES
('skyvibes', 'sky@vibe.com', 'Sky Williams', 'Just living. 🌈 Music lover. Creator.', 'purple', 'purple', '☀️', 'Living my best life', ARRAY['neoncat', 'djbeatrix', 'cosmicray', 'petalrose', 'hackernova', 'the_sage', 'wanderlust', 'sunsetkim'], 850, true, 'admin', true, NOW() - INTERVAL '30 days'),
('neoncat', 'neo@vibe.com', 'Neon Cat', '🎮 Gamer. 🐱 Cat person. 💻 Developer.', 'cyan', 'cyan', '🎵', 'Vibing to music', ARRAY['skyvibes', 'djbeatrix', 'hackernova', 'cosmicray', 'petalrose', 'the_sage', 'wanderlust', 'sunsetkim'], 720, false, 'user', true, NOW() - INTERVAL '20 days'),
('djbeatrix', 'bea@vibe.com', 'DJ Beatrix', '🎵 DJ. Producer. Music is life.', 'pink', 'pink', '🔥', 'On fire today', ARRAY['skyvibes', 'neoncat', 'cosmicray', 'hackernova', 'petalrose', 'the_sage', 'wanderlust', 'sunsetkim'], 680, false, 'user', true, NOW() - INTERVAL '15 days'),
('cosmicray', 'ray@vibe.com', 'Cosmic Ray', '✨ Space nerd. Artist. Always curious.', 'gold', 'gold', '💫', 'Lost in thought', ARRAY['skyvibes', 'neoncat', 'djbeatrix', 'hackernova', 'petalrose', 'the_sage', 'wanderlust', 'sunsetkim'], 590, false, 'user', true, NOW() - INTERVAL '10 days'),
('petalrose', 'rose@vibe.com', 'Petal Rose', '🌹 Fashion. Beauty. Self love.', 'pink', 'pink', '✌️', 'Peace and love', ARRAY['skyvibes', 'neoncat', 'djbeatrix', 'cosmicray', 'hackernova', 'the_sage', 'wanderlust', 'sunsetkim'], 520, false, 'user', true, NOW() - INTERVAL '8 days'),
('hackernova', 'hack@vibe.com', 'HackerNova', '💻 Code. Build. Ship. Repeat.', 'green', 'green', '🔥', 'On fire today', ARRAY['skyvibes', 'neoncat', 'djbeatrix', 'cosmicray', 'petalrose', 'the_sage', 'wanderlust', 'sunsetkim'], 780, false, 'user', true, NOW() - INTERVAL '5 days'),
('the_sage', 'sage@vibe.com', 'The Sage', '🧠 Philosophy. Deep thoughts. Tea.', 'purple', 'purple', '😴', 'Need coffee', ARRAY['skyvibes', 'neoncat', 'djbeatrix', 'cosmicray', 'petalrose', 'hackernova', 'wanderlust', 'sunsetkim'], 450, false, 'user', true, NOW() - INTERVAL '3 days'),
('wanderlust', 'wander@vibe.com', 'Wanderlust', '✈️ Traveler. Storyteller. World citizen.', 'cyan', 'cyan', '✌️', 'Peace and love', ARRAY['skyvibes', 'neoncat', 'djbeatrix', 'cosmicray', 'petalrose', 'hackernova', 'the_sage', 'sunsetkim'], 610, false, 'user', true, NOW() - INTERVAL '2 days'),
('sunsetkim', 'kim@vibe.com', 'Sunset Kim', '🌅 Photographer. Sunset collector.', 'gold', 'gold', '☀️', 'Living my best life', ARRAY['skyvibes', 'neoncat', 'djbeatrix', 'cosmicray', 'petalrose', 'hackernova', 'the_sage', 'wanderlust'], 550, false, 'user', true, NOW() - INTERVAL '1 day')
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- SEED POSTS
-- =============================================
INSERT INTO posts (user_id, username, text, tags, mood, created_at) 
SELECT 
  id, username,
  CASE 
    WHEN username = 'skyvibes' THEN 'Just dropped my new photography collection! Every shot is a vibe. 🌈 What do you think?'
    WHEN username = 'djbeatrix' THEN 'Just finished a 3-hour set 🎵 The energy in the room was ELECTRIC. Sometimes music is the only thing that makes sense. ✌️'
    WHEN username = 'neoncat' THEN 'Pro tip: debugging at 3am with lo-fi music hits different. Shipped a feature I''ve been stuck on for weeks. 💻🐱 Flow state is real.'
    WHEN username = 'cosmicray' THEN 'Nobody talks about how humbling space is. One look at the James Webb images and suddenly all my problems feel manageable. ✨🌌'
    WHEN username = 'petalrose' THEN 'Self care is not selfish. Repeat that. 🌹 Taking care of yourself is how you show up for others. Your energy matters.'
    WHEN username = 'hackernova' THEN 'Open source contribution #100 is LIVE! 🎉 Two years ago I was afraid to even open a PR. Consistency is the real flex. #code #OpenSource'
    WHEN username = 'wanderlust' THEN 'Day 3 in Morocco. The medina in Marrakech smells like cumin and rose petals and old stories. Every alley has a secret. ✈️🌍'
    WHEN username = 'sunsetkim' THEN 'Golden hour at 6:42pm was perfect today. No filter. Just light doing what light does. 🌅📸'
    WHEN username = 'the_sage' THEN 'Socrates said "I know that I know nothing." The more I learn, the more I realize he was right. Intellectual humility is a superpower. 🧠'
  END,
  ARRAY['vibes', 'community'],
  '☀️',
  NOW() - INTERVAL '1 day' * random() * 7
FROM users WHERE username IN ('skyvibes', 'djbeatrix', 'neoncat', 'cosmicray', 'petalrose', 'hackernova', 'wanderlust', 'sunsetkim', 'the_sage');

-- =============================================
-- SEED CHANNELS
-- =============================================
INSERT INTO channels (owner_id, name, description, category, emoji_banner)
SELECT 
  id, 
  CASE WHEN username = 'djbeatrix' THEN 'Beatrix Beats'
       WHEN username = 'neoncat' THEN 'NeonCode'
       WHEN username = 'cosmicray' THEN 'Cosmic Art'
       WHEN username = 'wanderlust' THEN 'Wandering World'
       WHEN username = 'sunsetkim' THEN 'Golden Lens'
  END,
  CASE 
    WHEN username = 'djbeatrix' THEN 'Weekly DJ sets, production tutorials and behind-the-scenes music content.'
    WHEN username = 'neoncat' THEN 'Dev tutorials, coding tips and game dev projects. New video every Tuesday.'
    WHEN username = 'cosmicray' THEN 'Digital art speedpaints, space art and creative process videos.'
    WHEN username = 'wanderlust' THEN 'Travel vlogs, budget travel tips and hidden gems around the globe.'
    WHEN username = 'sunsetkim' THEN 'Photography tutorials, golden hour guides and camera reviews.'
  END,
  CASE 
    WHEN username = 'djbeatrix' THEN '🎵 Music'
    WHEN username = 'neoncat' THEN '💻 Tech'
    WHEN username = 'cosmicray' THEN '🎨 Art'
    WHEN username = 'wanderlust' THEN '🌍 Travel'
    WHEN username = 'sunsetkim' THEN '📸 Lifestyle'
  END,
  CASE 
    WHEN username = 'djbeatrix' THEN '🎵'
    WHEN username = 'neoncat' THEN '💻'
    WHEN username = 'cosmicray' THEN '🎨'
    WHEN username = 'wanderlust' THEN '✈️'
    WHEN username = 'sunsetkim' THEN '📸'
  END
FROM users WHERE username IN ('djbeatrix', 'neoncat', 'cosmicray', 'wanderlust', 'sunsetkim');

-- =============================================
-- COMPLETE
-- =============================================
SELECT 'VibeHub database schema created successfully!' as status;
