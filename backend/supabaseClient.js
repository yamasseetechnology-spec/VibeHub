// =============================================
// VIBEHUB - SUPABASE CLIENT SINGLETON
// =============================================
// Centralized, env-driven Supabase client used
// by both SPA logic and backend helpers.
// =============================================

(function () {
  // Read Supabase config from runtime globals.
  // In production, these should be injected by a non-committed config script.
  const SUPABASE_URL =
    window.VIBEHUB_SUPABASE_URL || 'https://your-project.supabase.co';
  const SUPABASE_ANON_KEY =
    window.VIBEHUB_SUPABASE_ANON_KEY || 'public-anon-key-placeholder';

  let client = null;

  function ensureClient() {
    if (!window.supabase) {
      console.error(
        'Supabase library not loaded. Ensure the Supabase script tag is included before supabaseClient.js.'
      );
      return null;
    }

    if (!client) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase client initialized');
    }

    return client;
  }

  window.vhSupabase = {
    getClient() {
      return ensureClient();
    },
  };
})();

