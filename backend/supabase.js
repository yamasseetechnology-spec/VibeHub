// =============================================
// VIBEHUB BACKEND - SUPABASE CLIENT
// =============================================
// This file handles all database operations
// using the shared vhSupabase client.
// =============================================

const supabaseClient =
  (window.vhSupabase && window.vhSupabase.getClient()) || null;

if (!supabaseClient) {
  console.error(
    'Supabase client not initialized. Ensure backend/supabaseClient.js runs before backend/supabase.js.'
  );
}

// =============================================
// USER OPERATIONS
// =============================================

async function getUserByClerkId(clerkId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();
  
  if (error) return { user: null, error };
  return { user: data, error: null };
}

async function getUserByUsername(username) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) return { user: null, error };
  return { user: data, error: null };
}

async function createUser(userData) {
  const { data, error } = await supabaseClient
    .from('users')
    .insert([userData])
    .select()
    .single();
  
  if (error) return { user: null, error };
  return { user: data, error: null };
}

async function updateUser(clerkId, updates) {
  const { data, error } = await supabaseClient
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('clerk_id', clerkId)
    .select()
    .single();
  
  if (error) return { user: null, error };
  return { user: data, error: null };
}

async function getAllUsers() {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { users: data || [], error };
}

async function updateVibeScore(userId) {
  // Get user stats
  const { data: user } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (!user) return;
  
  // Get post counts
  const { count: postCount } = await supabaseClient
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  // Calculate vibe score
  const vibeScore = (postCount * 10) + 
    (user.likes_given * 2) + 
    (user.vibes_boosted * 5) + 
    (user.followers ? user.followers.length * 4 : 0);
  
  await supabaseClient
    .from('users')
    .update({ vibe_score: vibeScore })
    .eq('id', userId);
}

// =============================================
// POST OPERATIONS
// =============================================

async function createPost(postData) {
  const { data, error } = await supabaseClient
    .from('posts')
    .insert([postData])
    .select()
    .single();
  
  if (error) return { post: null, error };
  return { post: data, error: null };
}

async function getPosts(options = {}) {
  let query = supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  
  if (options.tags && options.tags.length > 0) {
    query = query.contains('tags', options.tags);
  }
  
  const { data, error } = await query;
  return { posts: data || [], error };
}

async function getFeedPosts(userId, followingList = []) {
  let query = supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (followingList && followingList.length > 0) {
    query = query.in('username', followingList);
  }
  
  const { data, error } = await query;
  return { posts: data || [], error };
}

async function getTrendingPosts() {
  // Get posts from last 24 hours with most engagement
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabaseClient
    .from('posts')
    .select('*')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false });
  
  if (error) return { posts: [], error };
  
  // Sort by engagement (likes + comments)
  const sorted = (data || []).sort((a, b) => {
    const engagementA = (a.likes?.length || 0) + (a.comment_count || 0);
    const engagementB = (b.likes?.length || 0) + (b.comment_count || 0);
    return engagementB - engagementA;
  });
  
  return { posts: sorted, error: null };
}

async function updatePost(postId, updates) {
  const { data, error } = await supabaseClient
    .from('posts')
    .update(updates)
    .eq('id', postId)
    .select()
    .single();
  
  if (error) return { post: null, error };
  return { post: data, error: null };
}

async function deletePost(postId) {
  const { error } = await supabaseClient
    .from('posts')
    .delete()
    .eq('id', postId);
  
  return { error };
}

async function addReaction(postId, userId, reactionType) {
  const { data: post } = await supabaseClient
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();
  
  if (!post) return { error: 'Post not found' };
  
  let updates = {};
  
  switch(reactionType) {
    case 'like':
      const newLikes = post.likes || [];
      if (!newLikes.includes(userId)) {
        newLikes.push(userId);
      }
      updates.likes = newLikes;
      break;
    case 'dislike':
      const newDislikes = post.dislikes || [];
      if (!newDislikes.includes(userId)) {
        newDislikes.push(userId);
      }
      updates.dislikes = newDislikes;
      break;
    case 'cap':
    case 'relate':
    case 'wild':
    case 'facts':
      const reactions = post.reactions || { cap: [], relate: [], wild: [], facts: [] };
      if (!reactions[reactionType].includes(userId)) {
        reactions[reactionType].push(userId);
      }
      updates.reactions = reactions;
      break;
  }
  
  return await updatePost(postId, updates);
}

// =============================================
// COMMENT OPERATIONS
// =============================================

async function createComment(commentData) {
  const { data, error } = await supabaseClient
    .from('comments')
    .insert([commentData])
    .select()
    .single();
  
  if (error) return { comment: null, error };
  
  // Update post comment count
  await supabaseClient.rpc('increment_comment_count', { post_id: commentData.post_id });
  
  return { comment: data, error: null };
}

async function getComments(postId) {
  const { data, error } = await supabaseClient
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  
  return { comments: data || [], error };
}

async function addCommentReaction(commentId, userId, reaction) {
  const { data: comment } = await supabaseClient
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .single();
  
  if (!comment) return { error: 'Comment not found' };
  
  const reactions = comment.reactions || {};
  if (!reactions[reaction]) {
    reactions[reaction] = [];
  }
  if (!reactions[reaction].includes(userId)) {
    reactions[reaction].push(userId);
  }
  
  const { error } = await supabaseClient
    .from('comments')
    .update({ reactions })
    .eq('id', commentId);
  
  return { error };
}

// =============================================
// CHANNEL & VIDEO OPERATIONS
// =============================================

async function createChannel(channelData) {
  const { data, error } = await supabaseClient
    .from('channels')
    .insert([channelData])
    .select()
    .single();
  
  if (error) return { channel: null, error };
  return { channel: data, error: null };
}

async function getChannels() {
  const { data, error } = await supabaseClient
    .from('channels')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { channels: data || [], error };
}

async function subscribeToChannel(channelId, userId) {
  const { data: channel } = await supabaseClient
    .from('channels')
    .select('subscribers')
    .eq('id', channelId)
    .single();
  
  if (!channel) return { error: 'Channel not found' };
  
  const subscribers = channel.subscribers || [];
  if (!subscribers.includes(userId)) {
    subscribers.push(userId);
  }
  
  const { error } = await supabaseClient
    .from('channels')
    .update({ subscribers })
    .eq('id', channelId);
  
  return { error };
}

async function createVideo(videoData) {
  const { data, error } = await supabaseClient
    .from('videos')
    .insert([videoData])
    .select()
    .single();
  
  if (error) return { video: null, error };
  return { video: data, error: null };
}

async function getVideos(channelId) {
  const { data, error } = await supabaseClient
    .from('videos')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });
  
  return { videos: data || [], error };
}

// =============================================
// MESSAGE OPERATIONS
// =============================================

async function sendMessage(messageData) {
  const { data, error } = await supabaseClient
    .from('messages')
    .insert([messageData])
    .select()
    .single();
  
  if (error) return { message: null, error };
  return { message: data, error: null };
}

async function getMessages(conversationId) {
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  return { messages: data || [], error };
}

async function markMessagesRead(conversationId, userId) {
  const { error } = await supabaseClient
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);
  
  return { error };
}

// =============================================
// NOTIFICATION OPERATIONS
// =============================================

async function createNotification(notifData) {
  const { data, error } = await supabaseClient
    .from('notifications')
    .insert([notifData])
    .select()
    .single();
  
  return { notification: data, error };
}

async function getNotifications(clerkId) {
  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('clerk_id', clerkId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  return { notifications: data || [], error };
}

async function markNotificationRead(notifId) {
  const { error } = await supabaseClient
    .from('notifications')
    .update({ read: true })
    .eq('id', notifId);
  
  return { error };
}

async function markAllNotificationsRead(clerkId) {
  const { error } = await supabaseClient
    .from('notifications')
    .update({ read: true })
    .eq('clerk_id', clerkId)
    .eq('read', false);
  
  return { error };
}

// =============================================
// MARKETPLACE OPERATIONS
// =============================================

async function createListing(listingData) {
  const { data, error } = await supabaseClient
    .from('marketplace')
    .insert([listingData])
    .select()
    .single();
  
  if (error) return { listing: null, error };
  return { listing: data, error: null };
}

async function getListings(category = 'all') {
  let query = supabaseClient
    .from('marketplace')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  return { listings: data || [], error };
}

// =============================================
// FRIEND OPERATIONS
// =============================================

async function sendFriendRequest(fromUser, toUserId) {
  const { data, error } = await supabaseClient
    .from('friend_requests')
    .insert([{
      from_user_id: fromUser.id,
      from_username: fromUser.username,
      to_user_id: toUserId,
      to_username: '', // Will be filled by trigger
      status: 'pending'
    }])
    .select()
    .single();
  
  return { request: data, error };
}

async function getFriendRequests(userId) {
  const { data, error } = await supabaseClient
    .from('friend_requests')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  return { requests: data || [], error };
}

async function respondToFriendRequest(requestId, status) {
  const { error } = await supabaseClient
    .from('friend_requests')
    .update({ status })
    .eq('id', requestId);
  
  return { error };
}

// =============================================
// REPORT OPERATIONS
// =============================================

async function createReport(reportData) {
  const { data, error } = await supabaseClient
    .from('reports')
    .insert([reportData])
    .select()
    .single();
  
  return { report: data, error };
}

async function getReports() {
  const { data, error } = await supabaseClient
    .from('reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  return { reports: data || [], error };
}

// =============================================
// PAYMENT OPERATIONS
// =============================================

async function verifyPayment(clerkId, paymentId) {
  // Update user payment status
  const { error } = await supabaseClient
    .from('users')
    .update({ 
      paid: true, 
      paid_at: new Date().toISOString(),
      payment_id: paymentId
    })
    .eq('clerk_id', clerkId);
  
  return { error };
}

async function checkPaymentStatus(clerkId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('paid, paid_at')
    .eq('clerk_id', clerkId)
    .single();
  
  return { user: data, error };
}

// =============================================
// REALTIME SUBSCRIPTIONS
// =============================================

function subscribeToPosts(callback) {
  return supabaseClient
    .channel('public:posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, callback)
    .subscribe();
}

function subscribeToNotifications(clerkId, callback) {
  return supabaseClient
    .channel(`notifications:${clerkId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'notifications',
      filter: `clerk_id=eq.${clerkId}`
    }, callback)
    .subscribe();
}

function subscribeToMessages(conversationId, callback) {
  return supabaseClient
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, callback)
    .subscribe();
}

// =============================================
// SEARCH OPERATIONS
// =============================================

async function searchUsers(query) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('username, name, bio, avatar_url, verified')
    .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(20);
  
  return { results: data || [], error };
}

async function searchPosts(query) {
  const { data, error } = await supabaseClient
    .from('posts')
    .select('*')
    .or(`text.ilike.%${query}%,tags.cs.{${query}}`)
    .order('created_at', { ascending: false })
    .limit(20);
  
  return { results: data || [], error };
}

async function getTrendingTags() {
  // Get top tags from recent posts
  const { data, error } = await supabaseClient
    .from('posts')
    .select('tags')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  if (error) return { tags: [], error };
  
  // Count tag frequency
  const tagCounts = {};
  (data || []).forEach(post => {
    (post.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  // Sort by count and return top 20
  const sorted = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));
  
  return { tags: sorted, error: null };
}

// =============================================
// EXPORTS
// =============================================

window.vhDb = {
  // Users
  getUserByClerkId,
  getUserByUsername,
  createUser,
  updateUser,
  getAllUsers,
  updateVibeScore,
  
  // Posts
  createPost,
  getPosts,
  getFeedPosts,
  getTrendingPosts,
  updatePost,
  deletePost,
  addReaction,
  
  // Comments
  createComment,
  getComments,
  addCommentReaction,
  
  // Channels
  createChannel,
  getChannels,
  subscribeToChannel,
  createVideo,
  getVideos,
  
  // Messages
  sendMessage,
  getMessages,
  markMessagesRead,
  
  // Notifications
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Marketplace
  createListing,
  getListings,
  
  // Friends
  sendFriendRequest,
  getFriendRequests,
  respondToFriendRequest,
  
  // Reports
  createReport,
  getReports,
  
  // Payments
  verifyPayment,
  checkPaymentStatus,
  
  // Realtime
  subscribeToPosts,
  subscribeToNotifications,
  subscribeToMessages,
  
  // Search
  searchUsers,
  searchPosts,
  getTrendingTags,
  
  // Client
  client: supabaseClient
};
