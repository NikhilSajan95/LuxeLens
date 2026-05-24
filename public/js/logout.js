document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault(); // prevent default anchor click
      try {
        const res = await fetch('/logout', { method: 'GET' });
        const data = await res.json();

        if (res.ok && data.success) {
            toastr.success(data.message || 'Logged out successfully');
            
            setTimeout(() => {
              window.location.href = '/auth/login'; 
            }, 1000);
          } else {
            toastr.error(data.message || 'Failed to log out');
          }
        } catch (err) {
          console.error("Logout error:", err);
          toastr.error("An error occurred during logout");
        }
    });
  }
});