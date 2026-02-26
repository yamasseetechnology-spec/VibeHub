// =============================================
// VIBEHUB BACKEND - SYNC SPACES
// =============================================
// Real-time live chat rooms
// =============================================

// Sync Spaces configuration
const MAX_ROOM_USERS = 125;
const ROOM_DURATION_HOURS = 24;

// Glow levels based on messages sent
const GLOW_LEVELS = [
  { min: 0, max: 5, color: null, name: 'silent' },
  { min: 6, max: 15, color: '#10b981', name: 'green' },
  { min: 16, max: 30, color: '#f59e0b', name: 'yellow' },
  { min: 31, max: 50, color: '#f97316', name: 'orange' },
  { min: 51, max: 9999, color: '#ef4444', name: 'red' }
];

// Get glow level for user
function getGlowLevel(messagesSent) {
  for (let level of GLOW_LEVELS) {
    if (messagesSent >= level.min && messagesSent <= level.max) {
      return level;
    }
  }
  return GLOW_LEVELS[0];
}

// Create a new Sync Space
async function createSyncSpace(name, creatorClerkId, creatorUsername) {
  const spaceData = {
    name: name,
    creator_clerk_id: creatorClerkId,
    creator_username: creatorUsername,
    description: '',
    message_count: 0,
    active_users: [creatorUsername],
    max_users: MAX_ROOM_USERS,
    is_active: true,
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabaseClient
    .from('sync_spaces')
    .insert([spaceData])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating sync space:', error);
    return { space: null, error };
  }
  
  // Add creator as participant
  await addParticipant(data.id, creatorClerkId, creatorUsername);
  
  return { space: data, error: null };
}

// Get all active Sync Spaces
async function getSyncSpaces() {
  const now = new Date().toISOString();
  
  const { data, error } = await supabaseClient
    .from('sync_spaces')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) return { spaces: [], error };
  
  // Filter out expired spaces
  const activeSpaces = (data || []).filter(space => {
    const expiresAt = new Date(space.expires_at);
    return expiresAt > new Date();
  });
  
  return { spaces: activeSpaces, error: null };
}

// Get a specific Sync Space
async function getSyncSpace(spaceId) {
  const { data, error } = await supabaseClient
    .from('sync_spaces')
    .select('*')
    .eq('id', spaceId)
    .single();
  
  return { space: data, error };
}

// Join a Sync Space
async function joinSyncSpace(spaceId, clerkId, username) {
  // Check if room is full
  const { space, error: spaceError } = await getSyncSpace(spaceId);
  if (spaceError || !space) {
    return { error: 'Room not found' };
  }
  
  if (space.active_users && space.active_users.length >= MAX_ROOM_USERS) {
    return { error: 'Room is full' };
  }
  
  // Check if expired
  if (new Date(space.expires_at) < new Date()) {
    return { error: 'Room has expired' };
  }
  
  // Add participant
  await addParticipant(spaceId, clerkId, username);
  
  // Update active users
  const activeUsers = space.active_users || [];
  if (!activeUsers.includes(username)) {
    activeUsers.push(username);
    await supabaseClient
      .from('sync_spaces')
      .update({ active_users: activeUsers })
      .eq('id', spaceId);
  }
  
  return { success: true };
}

// Leave a Sync Space
async function leaveSyncSpace(spaceId, clerkId) {
  // Update participant
  await supabaseClient
    .from('sync_space_participants')
    .delete()
    .eq('space_id', spaceId)
    .eq('clerk_id', clerkId);
  
  // Update active users count
  const { space } = await getSyncSpace(spaceId);
  if (space) {
    const activeUsers = (space.active_users || []).filter(u => u !== clerkId);
    await supabaseClient
      .from('sync_spaces')
      .update({ active_users: activeUsers })
      .eq('id', spaceId);
  }
  
  return { success: true };
}

// Send message to Sync Space
async function sendSyncSpaceMessage(spaceId, clerkId, username, userAvatar, message) {
  // Get participant to get message number
  const { data: participant } = await supabaseClient
    .from('sync_space_participants')
    .select('messages_sent')
    .eq('space_id', spaceId)
    .eq('clerk_id', clerkId)
    .single();
  
  const messageNumber = (participant?.messages_sent || 0) + 1;
  
  const messageData = {
    space_id: spaceId,
    clerk_id: clerkId,
    username: username,
    user_avatar: userAvatar || '',
    message: message,
    message_number: messageNumber,
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabaseClient
    .from('sync_space_messages')
    .insert([messageData])
    .select()
    .single();
  
  if (error) {
    console.error('Error sending message:', error);
    return { message: null, error };
  }
  
  // Update participant message count
  await supabaseClient
    .from('sync_space_participants')
    .update({ 
      messages_sent: messageNumber,
      last_active: new Date().toISOString()
    })
    .eq('space_id', spaceId)
    .eq('clerk_id', clerkId);
  
  // Update space message count
  await supabaseClient
    .from('sync_spaces')
    .update({ message_count: messageNumber })
    .eq('id', spaceId);
  
  return { message: data, error: null };
}

// Get messages from Sync Space
async function getSyncSpaceMessages(spaceId, limit = 100) {
  const { data, error } = await supabaseClient
    .from('sync_space_messages')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  return { messages: data || [], error };
}

// React to message in Sync Space
async function reactToSyncSpaceMessage(messageId, spaceId, clerkId, reaction) {
  const reactionData = {
    message_id: messageId,
    space_id: spaceId,
    clerk_id: clerkId,
    reaction: reaction,
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabaseClient
    .from('sync_space_reactions')
    .insert([reactionData])
    .select()
    .single();
  
  return { reaction: data, error };
}

// Get reactions for a message
async function getMessageReactions(messageId) {
  const { data, error } = await supabaseClient
    .from('sync_space_reactions')
    .select('*')
    .eq('message_id', messageId);
  
  return { reactions: data || [], error };
}

// Add participant to Sync Space
async function addParticipant(spaceId, clerkId, username) {
  const { data, error } = await supabaseClient
    .from('sync_space_participants')
    .upsert([{
      space_id: spaceId,
      clerk_id: clerkId,
      username: username,
      messages_sent: 0,
      joined_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    }], { onConflict: 'space_id,clerk_id' })
    .select()
    .single();
  
  return { participant: data, error };
}

// Get participant info
async function getParticipant(spaceId, clerkId) {
  const { data, error } = await supabaseClient
    .from('sync_space_participants')
    .select('*')
    .eq('space_id', spaceId)
    .eq('clerk_id', clerkId)
    .single();
  
  return { participant: data, error };
}

// Get all participants in a space
async function getParticipants(spaceId) {
  const { data, error } = await supabaseClient
    .from('sync_space_participants')
    .select('*')
    .eq('space_id', spaceId)
    .order('messages_sent', { ascending: false });
  
  return { participants: data || [], error };
}

// Kick user from Sync Space (admin only)
async function kickUserFromSpace(spaceId, targetClerkId) {
  // Delete participant
  await supabaseClient
    .from('sync_space_participants')
    .delete()
    .eq('space_id', spaceId)
    .eq('clerk_id', targetClerkId);
  
  // Update active users
  const { space } = await getSyncSpace(spaceId);
  if (space) {
    const activeUsers = (space.active_users || []).filter(u => u !== targetClerkId);
    await supabaseClient
      .from('sync_spaces')
      .update({ active_users: activeUsers })
      .eq('id', spaceId);
  }
  
  return { success: true };
}

// Close Sync Space (creator or admin)
async function closeSyncSpace(spaceId, clerkId) {
  // Verify ownership
  const { space, error } = await getSyncSpace(spaceId);
  if (error || !space) {
    return { error: 'Room not found' };
  }
  
  // Check if creator or admin
  if (space.creator_clerk_id !== clerkId) {
    // Check if admin
    const { user } = await window.vhDb.getUserByClerkId(clerkId);
    if (!user || user.role !== 'admin') {
      return { error: 'Only room creator or admin can close this room' };
    }
  }
  
  // Deactivate space
  await supabaseClient
    .from('sync_spaces')
    .update({ is_active: false })
    .eq('id', spaceId);
  
  return { success: true };
}

// Clean up expired spaces
async function cleanupExpiredSpaces() {
  const now = new Date().toISOString();
  
  // Mark expired spaces as inactive
  await supabaseClient
    .from('sync_spaces')
    .update({ is_active: false })
    .lt('expires_at', now)
    .eq('is_active', true);
  
  // Delete old messages (older than 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabaseClient
    .from('sync_space_messages')
    .delete()
    .lt('created_at', yesterday);
  
  return { success: true };
}

// Subscribe to Sync Space updates
function subscribeToSyncSpace(spaceId, callback) {
  const channel = supabaseClient
    .channel(`sync_space:${spaceId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'sync_space_messages',
      filter: `space_id=eq.${spaceId}`
    }, callback)
    .subscribe();
  
  return channel;
}

// Subscribe to space reactions
function subscribeToSyncSpaceReactions(spaceId, callback) {
  const channel = supabaseClient
    .channel(`sync_space_reactions:${spaceId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'sync_space_reactions',
      filter: `space_id=eq.${spaceId}`
    }, callback)
    .subscribe();
  
  return channel;
}

// Get time remaining until expiry
function getTimeRemaining(expiresAt) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;
  
  if (diff <= 0) {
    return { expired: true, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { expired: false, hours, minutes, seconds };
}

// =============================================
// EXPORTS
// =============================================

window.vhSyncSpaces = {
  // Constants
  MAX_ROOM_USERS,
  ROOM_DURATION_HOURS,
  GLOW_LEVELS,
  
  // Core functions
  createSyncSpace,
  getSyncSpaces,
  getSyncSpace,
  joinSyncSpace,
  leaveSyncSpace,
  sendSyncSpaceMessage,
  getSyncSpaceMessages,
  reactToSyncSpaceMessage,
  getMessageReactions,
  getParticipant,
  getParticipants,
  kickUserFromSpace,
  closeSyncSpace,
  cleanupExpiredSpaces,
  
  // Helpers
  getGlowLevel,
  getTimeRemaining,
  
  // Realtime
  subscribeToSyncSpace,
  subscribeToSyncSpaceReactions,
  
  // Client
  client: supabaseClient
};
