const CLERK_PUBLISHABLE_KEY = 'pk_test_ZmluZS10b2FkLTYzNDYuY2xlcmsuYWNjb3VudHMuZGV2JA';

async function initClerk() {
  try {
    if (!window.Clerk) {
      console.error('Clerk JS belum tersedia');
      return;
    }

    await window.Clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor }, publishableKey: CLERK_PUBLISHABLE_KEY
    });

    const loginButton = document.getElementById('login-button');

    if (window.Clerk.user) {
      console.log('CLERK USER:', window.Clerk.user);
      if (loginButton) loginButton.style.display = 'none';
      return;
    }

    if (loginButton) {
      loginButton.addEventListener('click', () => {
        let auth = document.getElementById('clerk-auth');

        auth.style.display = 'flex';
        auth.style.position = 'fixed';
        auth.style.inset = '0';
        auth.style.zIndex = '9999';
        auth.style.background = '#090a0c';
        auth.style.alignItems = 'center';
        auth.style.justifyContent = 'center';
        auth.style.padding = '20px';

        auth.innerHTML = '';

        try { window.Clerk.mountSignIn(auth); } catch (e) { auth.innerHTML = '<div style="color:white;font-size:18px">Clerk Error: ' + e.message + '</div>'; console.error(e); }
      });
    }

  } catch (error) {
    console.error('Clerk error:', error);
  }
}

window.addEventListener('load', initClerk);
