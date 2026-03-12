// Migration script to update KingKool23 profile image on existing posts
const KINGKOOL23_IMAGE_URL = 'https://i.pravatar.cc/150?u=KingKool23';

async function updateKingKool23ProfileImage() {
    if (!window.supabaseClient) {
        console.log('Supabase client not available');
        return;
    }

    try {
        console.log('🔧 Updating KingKool23 profile image on existing posts...');
        
        // Update all posts by KingKool23 to have the correct profile image
        const { data, error } = await window.supabaseClient
            .from('posts')
            .update({ user_avatar: KINGKOOL23_IMAGE_URL })
            .eq('username', 'KingKool23')
            .is('user_avatar', null);

        if (error) {
            console.error('Error updating posts:', error);
            return;
        }

        console.log(`✅ Updated ${data?.length || 0} posts with KingKool23 profile image`);
        
        // Also update the users table if needed
        const { data: userData, error: userError } = await window.supabaseClient
            .from('users')
            .update({ avatar_url: KINGKOOL23_IMAGE_URL })
            .eq('username', 'KingKool23')
            .is('avatar_url', null);

        if (userError) {
            console.error('Error updating user:', userError);
        } else {
            console.log(`✅ Updated KingKool23 user profile image`);
        }
        
    } catch (error) {
        console.error('Migration error:', error);
    }
}

// Auto-run if this script is loaded
if (typeof window !== 'undefined') {
    updateKingKool23ProfileImage();
}

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateKingKool23ProfileImage };
}
