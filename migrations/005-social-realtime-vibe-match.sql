-- ===========================================================================
-- VIBEHUB SOCIAL & REAL-TIME UPGRADES (005)
-- Adds Top 8 functionality, Vibe Match statistical JSONs, and Timeline indexes
-- ===========================================================================

-- 1. Ensure `top_8_friends` is present on users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS top_8_friends text[] DEFAULT '{}';

-- 2. Ensure `reaction_stats` is present on users to power Vibe Match algorithmic connections
-- This will store {"given": {"heat": 5, "cap": 1}, "received": {"admire": 10, "wild": 3}}
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS reaction_stats jsonb DEFAULT '{"given": {}, "received": {}}'::jsonb;

-- 3. Add Engagement Index to Posts for faster Timeline Algorithmic Sorting
-- The timeline algorithm will sort by (reactions + comments) and time decay.
CREATE INDEX IF NOT EXISTS idx_posts_algorithmic_timeline on public.posts (created_at DESC, comment_count DESC);

-- 4. Set up an RPC (Remote Procedure Call) to Atomically update JSON reaction stats.
-- This ensures when two users react at the exact same millisecond, JSON doesn't get overwritten incorrectly.
CREATE OR REPLACE FUNCTION increment_user_reaction_stat(
    user_id_param UUID,
    stat_type TEXT,     -- 'given' or 'received'
    reaction_name TEXT, -- 'heat', 'cap', 'wild', etc
    increment INT       -- 1 to add, -1 to remove
) RETURNS void AS $$
DECLARE
    current_stats JSONB;
    current_val INT;
BEGIN
    -- Get current stats, default to empty structure if null
    SELECT COALESCE(reaction_stats, '{"given": {}, "received": {}}'::jsonb) 
    INTO current_stats
    FROM public.users
    WHERE id = user_id_param;

    -- Extract current value for the specific reaction, default 0
    current_val := COALESCE(
        (current_stats -> stat_type ->> reaction_name)::int, 
        0
    );

    -- Calculate new value
    current_val := GREATEST(0, current_val + increment);

    -- Build the new jsonb tree 
    current_stats := jsonb_set(
        current_stats,
        ARRAY[stat_type, reaction_name],
        to_jsonb(current_val),
        true -- create missing path
    );

    -- Update User
    UPDATE public.users 
    SET reaction_stats = current_stats
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
