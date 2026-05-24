function updateCartBadge(cartLength) {
  const badge = document.getElementById('cartText');
  if (!badge) return;
  if (cartLength && cartLength !== 0) {
    badge.textContent = cartLength;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function updateWishlistBadge(wishlistLength) {
  const badge = document.getElementById('wishlistText');
  if (!badge) return;
  if (wishlistLength && wishlistLength !== 0) {
    badge.textContent = wishlistLength;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function updateBadgesFromServer() {
  try {
    const res = await fetch('/wishlist/count');
    const data = await res.json();

    updateCartBadge(data.cartLength);
    updateWishlistBadge(data.wishlistLength);
  } catch (err) {
    console.error('Error updating badges:', err);
  }
}

// Auto-run on page load
document.addEventListener('DOMContentLoaded', updateBadgesFromServer);