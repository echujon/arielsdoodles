/**
 * Shopping Cart Manager for Ariel's Doodles
 * Client-side cart using localStorage
 * Only calls worker for Stripe checkout
 */

class ShoppingCart {
  constructor(workerUrl) {
    this.workerUrl = workerUrl;
    this.storageKey = 'arielsdoodles_cart';
    this.cart = [];

    // Initialize cart from localStorage
    this.loadCart();
    this.updateUI();

    // Listen for storage events (multi-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey) {
        this.loadCart();
        this.updateUI();
      }
    });
  }

  /**
   * Load cart from localStorage
   */
  loadCart() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      this.cart = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading cart:', error);
      this.cart = [];
    }
  }

  /**
   * Save cart to localStorage
   */
  saveCart() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
      this.dispatchCartUpdate();
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  /**
   * Add item to cart
   * @param {string} productId - Product ID from Stripe
   * @param {string} priceId - Price ID from Stripe
   * @param {string} name - Product name
   * @param {number} price - Price in cents
   * @param {number} quantity - Quantity to add
   * @param {string} image - Product image URL
   */
  addItem(productId, priceId, name, price, quantity = 1, image = null) {
    // Check if item already exists
    const existingIndex = this.cart.findIndex(item => item.priceId === priceId);

    if (existingIndex !== -1) {
      // Update quantity
      this.cart[existingIndex].quantity += quantity;
    } else {
      // Add new item
      this.cart.push({
        productId,
        priceId,
        name,
        price,
        quantity,
        image,
        addedAt: Date.now(),
      });
    }

    this.saveCart();
    this.updateUI();
    this.showNotification(`Added ${name} to cart!`);
  }

  /**
   * Update item quantity
   */
  updateItem(priceId, quantity) {
    const index = this.cart.findIndex(item => item.priceId === priceId);

    if (index === -1) {
      console.error('Item not found in cart');
      return;
    }

    if (quantity <= 0) {
      // Remove item
      this.cart.splice(index, 1);
    } else {
      this.cart[index].quantity = quantity;
    }

    this.saveCart();
    this.updateUI();
  }

  /**
   * Remove item from cart
   */
  removeItem(priceId) {
    const index = this.cart.findIndex(item => item.priceId === priceId);

    if (index === -1) {
      console.error('Item not found in cart');
      return;
    }

    this.cart.splice(index, 1);
    this.saveCart();
    this.updateUI();
    this.showNotification('Item removed from cart');
  }

  /**
   * Clear entire cart
   */
  clearCart() {
    if (this.cart.length === 0) {
      return;
    }

    if (!confirm('Are you sure you want to clear your cart?')) {
      return;
    }

    this.cart = [];
    this.saveCart();
    this.updateUI();
    this.showNotification('Cart cleared');
  }

  /**
   * Get cart totals
   */
  getTotals() {
    const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return { itemCount, total };
  }

  /**
   * Proceed to Stripe checkout
   */
  async checkout() {
    if (this.cart.length === 0) {
      this.showNotification('Your cart is empty', 'error');
      return;
    }

    // Prepare items for Stripe (only priceId and quantity needed)
    const items = this.cart.map(item => ({
      priceId: item.priceId,
      quantity: item.quantity,
    }));

    const successUrl = `${window.location.origin}/shop/success`;
    const cancelUrl = `${window.location.origin}/shop/cancel`;

    try {
      // Show loading state
      this.showNotification('Redirecting to checkout...', 'info');

      const response = await fetch(`${this.workerUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      this.showNotification(error.message || 'Failed to proceed to checkout', 'error');
    }
  }

  /**
   * Format price in cents to dollars
   */
  formatPrice(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Update all cart UI elements
   */
  updateUI() {
    const { itemCount, total } = this.getTotals();

    // Update cart count badges
    const cartBadges = document.querySelectorAll('.cart-count');
    cartBadges.forEach(badge => {
      badge.textContent = itemCount;
      badge.style.display = itemCount > 0 ? 'inline-flex' : 'none';
    });

    // Update cart total
    const cartTotals = document.querySelectorAll('.cart-total');
    cartTotals.forEach(totalEl => {
      totalEl.textContent = this.formatPrice(total);
    });

    // Update cart items list
    const cartLists = document.querySelectorAll('.cart-items');
    cartLists.forEach(list => this.renderCartItems(list));

    // Update checkout button state
    const checkoutButtons = document.querySelectorAll('.checkout-button');
    checkoutButtons.forEach(button => {
      button.disabled = this.cart.length === 0;
    });

    // Update empty cart message
    const emptyMessages = document.querySelectorAll('.cart-empty-message');
    emptyMessages.forEach(msg => {
      msg.style.display = this.cart.length === 0 ? 'block' : 'none';
    });
  }

  /**
   * Render cart items in a container
   */
  renderCartItems(container) {
    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
      return;
    }

    container.innerHTML = this.cart.map(item => `
      <div class="cart-item" data-price-id="${item.priceId}">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-image">` : ''}
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <p class="cart-item-price">${this.formatPrice(item.price)}</p>
          <div class="cart-item-quantity">
            <button class="qty-decrease" data-price-id="${item.priceId}" aria-label="Decrease quantity">−</button>
            <input type="number" value="${item.quantity}" min="1" class="qty-input" data-price-id="${item.priceId}" aria-label="Quantity">
            <button class="qty-increase" data-price-id="${item.priceId}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-item-total">
          ${this.formatPrice(item.price * item.quantity)}
        </div>
        <button class="cart-item-remove" data-price-id="${item.priceId}" title="Remove" aria-label="Remove item">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    // Attach event listeners
    this.attachCartItemListeners(container);
  }

  /**
   * Attach event listeners to cart item controls
   */
  attachCartItemListeners(container) {
    // Quantity decrease
    container.querySelectorAll('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const priceId = e.target.dataset.priceId;
        const item = this.cart.find(i => i.priceId === priceId);
        if (item && item.quantity > 1) {
          this.updateItem(priceId, item.quantity - 1);
        }
      });
    });

    // Quantity increase
    container.querySelectorAll('.qty-increase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const priceId = e.target.dataset.priceId;
        const item = this.cart.find(i => i.priceId === priceId);
        if (item) {
          this.updateItem(priceId, item.quantity + 1);
        }
      });
    });

    // Quantity input change
    container.querySelectorAll('.qty-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const priceId = e.target.dataset.priceId;
        const quantity = parseInt(e.target.value) || 1;
        this.updateItem(priceId, quantity);
      });
    });

    // Remove button
    container.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const priceId = e.target.closest('button').dataset.priceId;
        this.removeItem(priceId);
      });
    });
  }

  /**
   * Dispatch cart update event
   */
  dispatchCartUpdate() {
    const { itemCount, total } = this.getTotals();
    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: {
        cart: this.cart,
        itemCount,
        total,
      },
    }));
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `cart-notification cart-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);

    // Hide and remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize cart when DOM is ready
let cart;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCart);
} else {
  initCart();
}

function initCart() {
  // Get worker URL from window (set by Hugo template)
  const workerUrl = window.CART_WORKER_URL || 'https://arielsdoodles-cart.YOUR_SUBDOMAIN.workers.dev';
  cart = new ShoppingCart(workerUrl);

  // Make cart globally available
  window.shoppingCart = cart;
}
