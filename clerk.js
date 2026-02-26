// =============================================
// VIBEHUB BACKEND - CLERK AUTH
// =============================================
// Handles authentication with Clerk
// =============================================

// Clerk configuration
const CLERK_PUBLISHABLE_KEY = CLERK_PUBLISHABLE_KEY || '';
const DEMO_MODE = !!window.VIBEHUB_DEMO_MODE;
const CLERK_SIGN_IN_URL = '/sign-in';
const CLERK_SIGN_UP_URL = '/sign-up';
const CLERK_AFTER_SIGN_IN_URL = '/';
const CLERK_AFTER_SIGN_UP_URL = '/';

// Initialize Clerk
let clerkClerk = null;

// Wait for Clerk to load
async function initClerk() {
  return new Promise((resolve) => {
    if (window.Clerk) {
      window.Clerk.configure({
        publishableKey: CLERK_PUBLISHABLE_KEY
      });
      clerkClerk = window.Clerk;
      resolve(window.Clerk);
    } else {
      // Wait for Clerk to load
      const checkClerk = setInterval(() => {
        if (window.Clerk) {
          clearInterval(checkClerk);
          window.Clerk.configure({
            publishableKey: CLERK_PUBLISHABLE_KEY
          });
          clerkClerk = window.Clerk;
          resolve(window.Clerk);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkClerk);
        resolve(null);
      }, 10000);
    }
  });
}

// Get current user
async function getCurrentUser() {
  if (!window.Clerk) {
    return null;
  }
  
  try {
    await window.Clerk.load();
    return window.Clerk.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Check if user is signed in
async function isSignedIn() {
  const user = await getCurrentUser();
  return !!user;
}

// Get user ID
async function getUserId() {
  const user = await getCurrentUser();
  return user ? user.id : null;
}

// Get user email
async function getUserEmail() {
  const user = await getCurrentUser();
  return user ? user.emailAddresses[0]?.emailAddress : null;
}

// Sign in
async function signIn(email, password) {
  if (!window.Clerk) {
    return { error: 'Clerk not loaded' };
  }
  
  try {
    await window.Clerk.signIn({
      emailAddress: email,
      password: password
    });
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

// Sign up
async function signUp(email, password, firstName, lastName) {
  if (!window.Clerk) {
    return { error: 'Clerk not loaded' };
  }
  
  try {
    await window.Clerk.createUser({
      emailAddress: email,
      password: password,
      firstName: firstName,
      lastName: lastName
    });
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

// Sign out
async function signOut() {
  if (!window.Clerk) {
    return;
  }
  
  try {
    await window.Clerk.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

// Open sign in modal
function openSignIn() {
  if (window.Clerk) {
    window.Clerk.openSignIn({
      redirectUrl: CLERK_AFTER_SIGN_IN_URL
    });
  }
}

// Open sign up modal
function openSignUp() {
  if (window.Clerk) {
    window.Clerk.openSignUp({
      redirectUrl: CLERK_AFTER_SIGN_UP_URL
    });
  }
}

// =============================================
// VIBEHUB USER SYNC
// =============================================

// Sync Clerk user to VibeHub database
async function syncClerkUserToVibeHub(clerkUser) {
  if (!clerkUser) return null;
  
  // Check if user exists in VibeHub
  const { user, error } = await window.vhDb.getUserByClerkId(clerkUser.id);
  
  if (error || !user) {
    // Create new user
    const username = clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0];
    const name = clerkUser.firstName + ' ' + clerkUser.lastName;
    
    const newUser = {
      clerk_id: clerkUser.id,
      username: username,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      name: name.trim() || username,
      bio: '',
      avatar_url: clerkUser.imageUrl || '',
      paid: false,
      role: 'user',
      created_at: new Date().toISOString()
    };
    
    const { user: created, error: createError } = await window.vhDb.createUser(newUser);
    if (createError) {
      console.error('Error creating user:', createError);
      return null;
    }
    
    return created;
  }
  
  return user;
}

// Get VibeHub user from Clerk
async function getVibeHubUser() {
  const clerkUser = await getCurrentUser();
  if (!clerkUser) return null;
  
  return await syncClerkUserToVibeHub(clerkUser);
}

// Check if user is admin
async function isAdmin() {
  const vhUser = await getVibeHubUser();
  return vhUser && vhUser.role === 'admin';
}

// =============================================
// DEMO MODE (Fallback)
// =============================================

let demoUser = null;

function initDemoMode() {
  if (!DEMO_MODE) {
    console.warn('initDemoMode() called while DEMO_MODE is disabled. No demo session will be created.');
    return null;
  }

  // Check for demo session
  const demoSession = localStorage.getItem('vibehub_demo_session');
  if (demoSession) {
    demoUser = JSON.parse(demoSession);
    return demoUser;
  }
  
  // Create new demo user
  demoUser = {
    clerk_id: 'demo_' + Date.now(),
    username: 'demo_user',
    name: 'Demo User',
    email: 'demo@vibehub.app',
    paid: true, // Demo users get full access
    role: 'user',
    isDemo: true
  };
  
  localStorage.setItem('vibehub_demo_session', JSON.stringify(demoUser));
  return demoUser;
}

function getDemoUser() {
  if (!DEMO_MODE) {
    return null;
  }

  if (!demoUser) {
    initDemoMode();
  }
  return demoUser;
}

function clearDemoSession() {
  if (!DEMO_MODE) {
    return;
  }
  localStorage.removeItem('vibehub_demo_session');
  demoUser = null;
}

// =============================================
// EXPORTS
// =============================================

window.vhAuth = {
  initClerk,
  getCurrentUser,
  isSignedIn,
  getUserId,
  getUserEmail,
  signIn,
  signUp,
  signOut,
  openSignIn,
  openSignUp,
  syncClerkUserToVibeHub,
  getVibeHubUser,
  isAdmin,
  // Demo mode
  initDemoMode,
  getDemoUser,
  clearDemoSession
};
