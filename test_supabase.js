
const checkSupabase = async () => {
    if (window.supabaseClient) {
        console.log('Supabase client found');
        try {
            const { data, error } = await window.supabaseClient.from('users').select('*').limit(1);
            if (error) {
                console.error('Supabase query error:', error);
            } else {
                console.log('Supabase query success:', data);
            }
        } catch (e) {
            console.error('Supabase query exception:', e);
        }
    } else {
        console.error('Supabase client NOT found');
    }
};

checkSupabase();
