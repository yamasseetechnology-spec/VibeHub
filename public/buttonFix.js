// Homepage and admin-page button fix (Phase X5 readiness)
function fixButtons() {
  // Attach to any login/signup actions
  const loginOrSignup = document.querySelectorAll('[data-action="login"], [data-action="signup"], #loginBtn, #signupBtn');
  loginOrSignup.forEach((el) => {
    el.addEventListener('click', (e) => {
      const action = el.getAttribute('data-action');
      if (action === 'login') window.location.href = '/login';
      if (action === 'signup') window.location.href = '/login?signup=1';
    });
  });
  // If a login form exists, wire up submission
  const loginForm = document.querySelector('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(loginForm);
      const body = JSON.stringify({ username: fd.get('username'), password: fd.get('password') });
      try {
        const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if (!res.ok) {
          alert('Login failed. Server error: ' + res.status);
          return;
        }
        const data = await res.json();
        if (data.ok) {
          window.location.href = '/admin';
        } else {
          alert(data.error || 'Login failed');
        }
      } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Please try again.');
      }
    });
  }
}

window.addEventListener('load', fixButtons);
