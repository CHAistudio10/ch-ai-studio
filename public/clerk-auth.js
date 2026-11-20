const CLERK_PUBLISHABLE_KEY = 'pk_test_ZmluZS10b2FkLTYzNDYuY2xlcmsuYWNjb3VudHMuZGV2JA';

async function initClerk() {
  try {
    if (!window.Clerk) {
      console.error('Clerk JS belum tersedia');
      return;
    }

    await window.Clerk.load({
      ui: {
        ClerkUI: window.__internal_ClerkUICtor
      },
      publishableKey: CLERK_PUBLISHABLE_KEY
    });

    const loginButton = document.getElementById('login-button');
    const auth = document.getElementById('clerk-auth');

    function showLogin() {
      if (!loginButton) return;

      loginButton.style.display = 'flex';

      loginButton.onclick = () => {
        auth.style.display = 'flex';
        auth.style.position = 'fixed';
        auth.style.inset = '0';
        auth.style.zIndex = '9999';
        auth.style.background = '#090a0c';
        auth.style.alignItems = 'center';
        auth.style.justifyContent = 'center';
        auth.style.padding = '20px';

        auth.innerHTML = '';

        window.Clerk.mountSignIn(auth);
      };
    }

    function showUser() {
      if (!loginButton) return;

      loginButton.innerHTML = "👤 " + (window.Clerk.user?.firstName || window.Clerk.user?.username || "Akun");
      loginButton.style.display = "flex";

      loginButton.onclick = async () => {
        const keluar = confirm("Keluar dari akun ini?");
        if (keluar) await window.Clerk.signOut();
      };
    }

    if (window.Clerk.user) {
      console.log('CH AI Studio: LOGIN BERHASIL');
      showUser();
    } else {
      console.log('CH AI Studio: BELUM LOGIN');
      showLogin();
    }

    window.Clerk.addListener(({ user }) => {
      if (user) {
        console.log('CH AI Studio: USER LOGIN', user);
        showUser();

        if (auth) {
          auth.style.display = 'none';
          auth.innerHTML = '';
        }
      } else {
        showLogin();
      }
    });

  } catch (error) {
    console.error('Clerk error:', error);
  }
}

window.addEventListener('load', initClerk);
