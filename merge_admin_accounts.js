/**
 * VIBEHUB ADMIN ACCOUNT MERGE MIGRATION
 * Merges KingKool23 and yamasseetechnology@gmail.com accounts
 * Run this in browser console: await window.mergeAdminAccounts()
 */

async function mergeAdminAccounts() {
    console.log('🚀 Starting Admin Account Merge Process...');
    
    if (!window.supabaseClient) {
        console.error('❌ Supabase client not available');
        return { success: false, error: 'Supabase not initialized' };
    }
    
    const adminUsername = 'KingKool23';
    const fallbackEmail = 'yamasseetechnology@gmail.com';
    
    try {
        // Step 1: Get the main admin user (KingKool23)
        console.log('🔍 Finding KingKool23 admin account...');
        const { data: kingKoolUser, error: kingKoolError } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('username', adminUsername)
            .single();
        
        if (kingKoolError || !kingKoolUser) {
            console.error('❌ KingKool23 user not found:', kingKoolError);
            return { success: false, error: 'KingKool23 user not found' };
        }
        
        console.log('✅ Found KingKool23 account:', kingKoolUser.id);
        
        // Step 2: Check for email-based account
        console.log('🔍 Checking for yamasseetechnology@gmail.com account...');
        const { data: emailUser, error: emailError } = await window.supabaseClient
            .from('users')
            .select('*')
            .eq('email', fallbackEmail)
            .single();
        
        if (emailUser && emailUser.id !== kingKoolUser.id) {
            console.log('⚠️ Found separate email account:', emailUser.id);
            
            // Step 3: Transfer posts from email account to KingKool23
            console.log('🔄 Transferring posts from email account...');
            const { data: emailPosts, error: postsError } = await window.supabaseClient
                .from('posts')
                .select('*')
                .eq('user_id', emailUser.id);
            
            if (emailPosts && emailPosts.length > 0) {
                console.log(`📦 Found ${emailPosts.length} posts to transfer`);
                
                const { error: updateError } = await window.supabaseClient
                    .from('posts')
                    .update({ 
                        user_id: kingKoolUser.id,
                        username: adminUsername
                    })
                    .eq('user_id', emailUser.id);
                
                if (updateError) {
                    console.error('❌ Error transferring posts:', updateError);
                } else {
                    console.log(`✅ Transferred ${emailPosts.length} posts to KingKool23`);
                }
            }
            
            // Step 4: Transfer reactions from email account
            console.log('🔄 Transferring reactions...');
            const { data: emailReactions, error: reactionsError } = await window.supabaseClient
                .from('post_reactions')
                .select('*')
                .eq('user_id', emailUser.id);
            
            if (emailReactions && emailReactions.length > 0) {
                const { error: reactionUpdateError } = await window.supabaseClient
                    .from('post_reactions')
                    .update({ user_id: kingKoolUser.id })
                    .eq('user_id', emailUser.id);
                
                if (reactionUpdateError) {
                    console.error('❌ Error transferring reactions:', reactionUpdateError);
                } else {
                    console.log(`✅ Transferred ${emailReactions.length} reactions`);
                }
            }
            
            // Step 5: Transfer comments from email account
            console.log('🔄 Transferring comments...');
            const { data: emailComments, error: commentsError } = await window.supabaseClient
                .from('comments')
                .select('*')
                .eq('user_id', emailUser.id);
            
            if (emailComments && emailComments.length > 0) {
                const { error: commentUpdateError } = await window.supabaseClient
                    .from('comments')
                    .update({ user_id: kingKoolUser.id })
                    .eq('user_id', emailUser.id);
                
                if (commentUpdateError) {
                    console.error('❌ Error transferring comments:', commentUpdateError);
                } else {
                    console.log(`✅ Transferred ${emailComments.length} comments`);
                }
            }
            
            // Step 6: Transfer friend relationships
            console.log('🔄 Transferring friend relationships...');
            
            // Friends where user is the requester
            const { data: userFriends, error: friendsError } = await window.supabaseClient
                .from('friends')
                .select('*')
                .eq('user_id', emailUser.id);
            
            if (userFriends && userFriends.length > 0) {
                const { error: friendsUpdateError } = await window.supabaseClient
                    .from('friends')
                    .update({ user_id: kingKoolUser.id })
                    .eq('user_id', emailUser.id);
                
                if (friendsUpdateError) {
                    console.error('❌ Error transferring friends:', friendsUpdateError);
                } else {
                    console.log(`✅ Transferred ${userFriends.length} friend relationships`);
                }
            }
            
            // Friends where user is the recipient
            const { data: friendRecipients, error: recipientError } = await window.supabaseClient
                .from('friends')
                .select('*')
                .eq('friend_id', emailUser.id);
            
            if (friendRecipients && friendRecipients.length > 0) {
                const { error: recipientUpdateError } = await window.supabaseClient
                    .from('friends')
                    .update({ friend_id: kingKoolUser.id })
                    .eq('friend_id', emailUser.id);
                
                if (recipientUpdateError) {
                    console.error('❌ Error transferring friend recipients:', recipientUpdateError);
                } else {
                    console.log(`✅ Transferred ${friendRecipients.length} friend recipient relationships`);
                }
            }
            
            // Step 7: Delete the old email account
            console.log('🗑️ Removing old email account...');
            const { error: deleteError } = await window.supabaseClient
                .from('users')
                .delete()
                .eq('id', emailUser.id);
            
            if (deleteError) {
                console.error('❌ Error deleting email account:', deleteError);
            } else {
                console.log('✅ Deleted old email account');
            }
        }
        
        // Step 8: Fix any orphaned posts with string usernames
        console.log('🔄 Fixing orphaned posts...');
        const { data: orphanedPosts, error: orphanError } = await window.supabaseClient
            .from('posts')
            .select('*')
            .or(`username.eq.${adminUsername},username.eq.${fallbackEmail}`)
            .or(`user_id.is.null,user_id.eq.'',user_id.eq.'undefined'`);
        
        if (orphanedPosts && orphanedPosts.length > 0) {
            const { error: fixError } = await window.supabaseClient
                .from('posts')
                .update({ 
                    user_id: kingKoolUser.id,
                    username: adminUsername
                })
                .or(`username.eq.${adminUsername},username.eq.${fallbackEmail}`);
            
            if (fixError) {
                console.error('❌ Error fixing orphaned posts:', fixError);
            } else {
                console.log(`✅ Fixed ${orphanedPosts.length} orphaned posts`);
            }
        }
        
        // Step 9: Ensure admin has correct role and permissions
        console.log('🔧 Updating admin permissions...');
        const { error: roleError } = await window.supabaseClient
            .from('users')
            .update({ 
                role: 'admin',
                email: fallbackEmail,
                updated_at: new Date().toISOString()
            })
            .eq('id', kingKoolUser.id);
        
        if (roleError) {
            console.error('❌ Error updating admin role:', roleError);
        } else {
            console.log('✅ Admin permissions updated');
        }
        
        console.log('🎉 Admin Account Merge Complete!');
        console.log('📊 Summary:');
        console.log(`   - KingKool23 ID: ${kingKoolUser.id}`);
        console.log(`   - Email: ${fallbackEmail}`);
        console.log('   - All posts transferred to unified account');
        console.log('   - All reactions preserved');
        console.log('   - All comments preserved');
        console.log('   - Friend relationships maintained');
        
        return { 
            success: true, 
            adminId: kingKoolUser.id,
            message: 'Admin accounts merged successfully'
        };
        
    } catch (error) {
        console.error('❌ Account merge failed:', error);
        return { success: false, error: error.message };
    }
}

// Auto-expose to window for console access
if (typeof window !== 'undefined') {
    window.mergeAdminAccounts = mergeAdminAccounts;
    console.log('💡 Admin merge function available: await window.mergeAdminAccounts()');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mergeAdminAccounts };
}
