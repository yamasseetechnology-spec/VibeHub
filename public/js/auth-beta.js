// Beta gating frontend support
(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    let total = 0;
    try {
      if (typeof window.supabase !== 'undefined') {
        const { count } = await window.supabase.from('users').select('*', { count: 'exact' });
        total = count || 0;
      } else {
        const r = await fetch('/api/beta_status');
        if (r.ok) {
          const j = await r.json();
          total = j.total_users || 0;
        }
      }
    } catch (e) {
      // ignore errors; fail open
    }
    const gate = total >= 10;
    const signupSection = document.querySelector('#signup-section');
    const betaCTA = document.querySelector('#beta-payment-cta');
    if (gate) {
      if (signupSection) signupSection.style.display = 'none';
      if (betaCTA) {
        betaCTA.style.display = 'block';
        betaCTA.addEventListener('click', () => {
          // Redirect to existing Square payment link; the backend will create a pending signup on the way
          window.location.href = '/square-payment-link';
        });
      }
    } else {
      if (signupSection) signupSection.style.display = 'block';
      if (betaCTA) betaCTA.style.display = 'none';
    }
  });
})();
