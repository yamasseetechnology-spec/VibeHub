// Admin FAB (Phase X5) - appears only on admin pages
(function(){
  // Only render on admin URL paths
  if (typeof window === 'undefined') return;
  const isAdminPath = window.location.pathname.startsWith('/admin');
  if (!isAdminPath) return;
  function ensureFab(){
    if (document.getElementById('admin-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'admin-fab';
    btn.textContent = 'Admin';
    btn.style.position = 'fixed';
    btn.style.bottom = '16px';
    btn.style.right = '16px';
    btn.style.zIndex = '9999';
    btn.style.borderRadius = '28px';
    btn.style.padding = '12px 18px';
    btn.style.background = 'linear-gradient(135deg, #7b3bd9 0%, #c14bd1 50%, #6f3bd9 100%)';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.boxShadow = '0 6px 16px rgba(0,0,0,.25)';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', async () => {
      const token = localStorage.getItem('VIBE_ADMIN_TOKEN');
      if (token) {
        try {
          const resp = await fetch('/me', { headers: { 'Authorization': 'Bearer ' + token } });
          if (resp.ok) {
            window.location.href = '/admin/dashboard';
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      window.location.href = '/auth/login?vibe-control-7x9kq2m';
    });
    document.body.appendChild(btn);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFab);
  } else {
    ensureFab();
  }
})();
