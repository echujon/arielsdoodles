/**
 * Shopping Cart Manager for Ariel's Doodles
 * Client-side cart using localStorage
 * Only calls worker for Stripe checkout
 */

/**
 * Escape a value for safe interpolation into HTML (text or attribute context).
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class ShoppingCart {
  constructor(workerUrl) {
    this.workerUrl = workerUrl;
    this.storageKey = 'arielsdoodles_cart';
    this.cart = [];
    this.shippingCents = null;
    this._stripeElements = null;
    this._addressElement = null;

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
  async addItem(productId, priceId, name, price, quantity = 1, image = null, maxStock = null) {
    const existingIndex = this.cart.findIndex(item => item.priceId === priceId);
    const currentQty = existingIndex !== -1 ? this.cart[existingIndex].quantity : 0;

    // Fetch stock limit if not provided
    if (maxStock === null && productId) {
      try {
        const res = await fetch(`${this.workerUrl}/stock?productId=${productId}`);
        if (res.ok) {
          const data = await res.json();
          if (!data.available) {
            this.showNotification(`${name} is sold out`, 'error');
            return;
          }
          if (data.quantity != null) maxStock = data.quantity;
        }
      } catch (e) { /* fail open — allow add if stock check fails */ }
    }

    // Enforce stock limit
    if (maxStock != null) {
      const allowedToAdd = maxStock - currentQty;
      if (allowedToAdd <= 0) {
        this.showNotification(`You've reached the maximum available for ${name}`, 'error');
        return;
      }
      quantity = Math.min(quantity, allowedToAdd);
    }

    if (existingIndex !== -1) {
      this.cart[existingIndex].quantity += quantity;
      if (maxStock != null) this.cart[existingIndex].maxStock = maxStock;
    } else {
      this.cart.push({
        productId,
        priceId,
        name,
        price,
        quantity,
        image,
        maxStock,
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
      this.cart.splice(index, 1);
    } else {
      const maxStock = this.cart[index].maxStock;
      if (maxStock != null && quantity > maxStock) {
        this.showNotification(`Only ${maxStock} available`, 'error');
        quantity = maxStock;
      }
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

  renderOrderSummary() {
    const container = document.getElementById('orderSummaryItems');
    if (!container) return;
    container.innerHTML = this.cart.map(item => `
      <div class="order-summary-item">
        <span class="order-summary-name">${escapeHtml(item.name)}${item.quantity > 1 ? ` ×${escapeHtml(item.quantity)}` : ''}</span>
        <span class="order-summary-price">${this.formatPrice(item.price * item.quantity)}</span>
      </div>
    `).join('');
  }

  mountAddressElement() {
    this.renderOrderSummary();
    const container = document.getElementById('addressElement');
    if (!container) { console.warn('addressElement container not found'); return; }

    if (this._addressElement) return; // already mounted

    const stripeKey = window.STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      container.textContent = 'Stripe not configured.';
      console.warn('STRIPE_PUBLISHABLE_KEY not set');
      return;
    }

    if (typeof Stripe === 'undefined') {
      container.textContent = 'Stripe.js not loaded.';
      console.warn('Stripe global not available');
      return;
    }

    try {
      const stripe = Stripe(stripeKey);
      const elements = stripe.elements({ mode: 'payment', currency: 'usd', amount: 9999 });
      const addressEl = elements.create('address', {
        mode: 'shipping',
        allowedCountries: ['US'],
        fields: { phone: 'never' },
      });

      addressEl.mount(container);
      this._stripeElements = elements;
      this._addressElement = addressEl;
      console.log('Address element mounted successfully');
    } catch (e) {
      console.error('Failed to mount address element:', e);
      container.textContent = 'Could not load address form.';
    }
  }

  unmountAddressElement() {
    if (this._addressElement) {
      this._addressElement.unmount();
      this._addressElement = null;
      this._stripeElements = null;
    }
    const container = document.getElementById('addressElement');
    if (container) container.innerHTML = '';
  }

  async getShippingQuoteFromElement() {
    const resultEl = document.getElementById('shippingQuoteResult');
    const shippingLine = document.getElementById('shippingLine');
    const shippingDisplay = document.getElementById('shippingDisplay');
    const quoteBtn = document.getElementById('quoteBtn');

    if (!this._addressElement) {
      if (resultEl) {
        resultEl.textContent = 'Address element not ready. Please try again.';
        resultEl.className = 'shipping-quote-result shipping-quote-error';
        resultEl.style.display = 'block';
      }
      return;
    }

    if (quoteBtn) { quoteBtn.disabled = true; quoteBtn.textContent = 'Getting rate…'; }

    try {
      const { complete, value } = await this._addressElement.getValue();
      console.log('Address element value:', JSON.stringify(value));
      if (!complete) {
        throw new Error('Please fill in your full shipping address.');
      }

      const address = value.address;
      const items = this.cart.map(item => ({ priceId: item.priceId, quantity: item.quantity }));

      const response = await fetch(`${this.workerUrl}/shipping-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationZIPCode: address.postal_code, destinationAddress: address, items }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not retrieve shipping rate');

      this.shippingCents = data.totalCents;
      this._shippingAddress = address;

      if (resultEl) {
        resultEl.textContent = `Shipping: ${data.displayRate} (1–3 business days)`;
        resultEl.className = 'shipping-quote-result shipping-quote-ok';
        resultEl.style.display = 'block';
      }
      if (shippingLine) { shippingLine.style.display = 'flex'; }
      if (shippingDisplay) { shippingDisplay.textContent = data.displayRate; }

      const payBtn = document.getElementById('payBtn');
      if (payBtn) { payBtn.disabled = false; }
    } catch (error) {
      console.error('Shipping quote error:', error);
      this.shippingCents = null;
      if (resultEl) {
        resultEl.textContent = error.message || 'Could not retrieve shipping rate. Please try again.';
        resultEl.className = 'shipping-quote-result shipping-quote-error';
        resultEl.style.display = 'block';
      }
    } finally {
      if (quoteBtn) { quoteBtn.disabled = false; quoteBtn.textContent = 'Get Rate'; }
    }
  }

  /**
   * Proceed to Stripe checkout
   */
  async checkout() {
    if (this.cart.length === 0) {
      this.showNotification('Your cart is empty', 'error');
      return;
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) { checkoutBtn.disabled = true; checkoutBtn.textContent = 'Loading…'; }

    try {
      window.location.href = '/shop/checkout';
    } catch (error) {
      console.error('Checkout error:', error);
      this.showNotification('Failed to proceed to checkout', 'error');
      if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.textContent = 'Checkout'; }
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
      <div class="cart-item" data-price-id="${escapeHtml(item.priceId)}">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-item-image">` : ''}
        <div class="cart-item-details">
          <h4>${escapeHtml(item.name)}</h4>
          <p class="cart-item-price">${this.formatPrice(item.price)}</p>
          <div class="cart-item-quantity">
            <button class="qty-decrease" data-price-id="${escapeHtml(item.priceId)}" aria-label="Decrease quantity">−</button>
            <input type="number" value="${escapeHtml(item.quantity)}" min="0" class="qty-input" data-price-id="${escapeHtml(item.priceId)}" aria-label="Quantity">
            <button class="qty-increase" data-price-id="${escapeHtml(item.priceId)}" aria-label="Increase quantity">+</button>
          </div>
        </div>
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
        const priceId = e.target.closest('button').dataset.priceId;
        const item = this.cart.find(i => i.priceId === priceId);
        if (item && item.quantity === 1) {
          this.removeItem(priceId);
          return;
        }
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
        const quantity = parseInt(e.target.value);
        if (!quantity || quantity <= 0) {
          this.removeItem(priceId);
        } else {
          this.updateItem(priceId, quantity);
        }
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
