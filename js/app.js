// =====================
// Japan Stationery Shop
// Cart & Payment Logic
// =====================

const SHIPPING_RATES = {
  asia: { label: 'Asia', cost: 6.00 },
  us: { label: 'United States', cost: 12.00 },
  europe: { label: 'Europe', cost: 14.00 },
};

// --- Cart State ---
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// --- DOM Elements ---
const cartBtn = document.getElementById('cartBtn');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartFooter = document.getElementById('cartFooter');
const cartCount = document.getElementById('cartCount');
const subtotalEl = document.getElementById('subtotal');
const shippingCostEl = document.getElementById('shippingCost');
const totalPriceEl = document.getElementById('totalPrice');
const shippingRegion = document.getElementById('shippingRegion');
const bybitPayBtn = document.getElementById('bybitPayBtn');

// --- Cart Toggle ---
function openCart() {
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// --- Image Gallery ---
document.querySelectorAll('.product-card').forEach(card => {
  const imgs = card.querySelectorAll('.product-img');
  const dots = card.querySelectorAll('.img-dot');

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index);
      imgs.forEach(img => img.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      imgs[idx].classList.add('active');
      dot.classList.add('active');
    });
  });
});

// --- Quantity Controls ---
document.querySelectorAll('.product-card').forEach(card => {
  const input = card.querySelector('.qty-input');
  const decreaseBtn = card.querySelector('[data-action="decrease"]');
  const increaseBtn = card.querySelector('[data-action="increase"]');

  decreaseBtn.addEventListener('click', () => {
    const val = parseInt(input.value);
    if (val > 1) input.value = val - 1;
  });

  increaseBtn.addEventListener('click', () => {
    const val = parseInt(input.value);
    if (val < 20) input.value = val + 1;
  });
});

// --- Add to Cart ---
document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.product-card');
    const qty = parseInt(card.querySelector('.qty-input').value);
    const item = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: parseFloat(btn.dataset.price),
      img: btn.dataset.img,
      qty: qty,
    };

    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push(item);
    }

    saveCart();
    renderCart();
    openCart();

    // Button feedback
    const originalText = btn.textContent;
    btn.textContent = 'Added!';
    btn.style.background = '#27ae60';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 1000);
  });
});

// --- Render Cart ---
function renderCart() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartFooter.style.display = 'block';

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.img}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
        <div class="cart-item-qty">
          <button data-cart-action="decrease" data-id="${item.id}">-</button>
          <span>${item.qty}</span>
          <button data-cart-action="increase" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-cart-action="remove" data-id="${item.id}">Remove</button>
    </div>
  `).join('');

  // Cart item event listeners
  cartItems.querySelectorAll('[data-cart-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.cartAction;
      const item = cart.find(c => c.id === id);
      if (!item) return;

      if (action === 'increase') {
        item.qty++;
      } else if (action === 'decrease') {
        item.qty--;
        if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
      } else if (action === 'remove') {
        cart = cart.filter(c => c.id !== id);
      }

      saveCart();
      renderCart();
    });
  });

  updateTotals();
}

// --- Update Totals ---
function updateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const region = shippingRegion.value;
  const shipping = cart.length > 0 ? SHIPPING_RATES[region].cost : 0;
  const total = subtotal + shipping;

  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  shippingCostEl.textContent = `$${shipping.toFixed(2)}`;
  totalPriceEl.textContent = `$${total.toFixed(2)}`;
}

shippingRegion.addEventListener('change', updateTotals);

// --- Save Cart ---
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// --- Get Order Summary ---
function getOrderSummary() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const region = shippingRegion.value;
  const shipping = SHIPPING_RATES[region].cost;
  const total = subtotal + shipping;

  return {
    items: cart.map(item => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      amount: item.price * item.qty,
    })),
    subtotal,
    shipping,
    shippingRegion: SHIPPING_RATES[region].label,
    total,
    currency: 'USD',
  };
}

// --- PayPal Integration ---
function initPayPal() {
  if (typeof paypal === 'undefined') {
    console.warn('PayPal SDK not loaded. Replace YOUR_CLIENT_ID in index.html with your PayPal Client ID.');
    const container = document.getElementById('paypal-button-container');
    container.innerHTML = '<button class="btn btn-primary" style="width:100%;background:#0070ba;" disabled>PayPal (Configure Client ID)</button>';
    return;
  }

  paypal.Buttons({
    style: {
      layout: 'horizontal',
      color: 'blue',
      shape: 'rect',
      label: 'pay',
      height: 45,
    },
    createOrder: function(data, actions) {
      const order = getOrderSummary();
      return actions.order.create({
        purchase_units: [{
          description: 'Japan Stationery Shop Order',
          amount: {
            currency_code: 'USD',
            value: order.total.toFixed(2),
            breakdown: {
              item_total: { currency_code: 'USD', value: order.subtotal.toFixed(2) },
              shipping: { currency_code: 'USD', value: order.shipping.toFixed(2) },
            }
          },
          items: order.items.map(item => ({
            name: item.name,
            unit_amount: { currency_code: 'USD', value: item.price.toFixed(2) },
            quantity: item.qty.toString(),
          })),
        }],
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        alert('Payment successful! Thank you, ' + details.payer.name.given_name + '. Your order will be shipped from Japan soon.');
        cart = [];
        saveCart();
        renderCart();
        closeCart();
      });
    },
    onError: function(err) {
      console.error('PayPal error:', err);
      alert('Payment failed. Please try again.');
    },
  }).render('#paypal-button-container');
}

// --- Bybit Pay ---
// Bybit Pay uses payment links. Replace the URL below with your Bybit Pay merchant link.
// You can generate payment links from your Bybit Pay merchant dashboard.
bybitPayBtn.addEventListener('click', () => {
  const order = getOrderSummary();

  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }

  // Option 1: Redirect to Bybit Pay payment link (replace with your merchant URL)
  // window.location.href = 'https://www.bybit.com/fiat/trade/otc/pay/...';

  // Option 2: Show order summary for manual Bybit Pay
  const summary = [
    '=== Order Summary for Bybit Pay ===',
    '',
    ...order.items.map(i => `${i.name} x${i.qty} = $${i.amount.toFixed(2)}`),
    '',
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `Shipping (${order.shippingRegion}): $${order.shipping.toFixed(2)}`,
    `Total: $${order.total.toFixed(2)}`,
    '',
    'Please send the exact amount via Bybit Pay.',
    'Contact us after payment with your transaction ID.',
  ].join('\n');

  alert(summary);
});

// --- Init ---
renderCart();

// Delay PayPal init to ensure SDK is loaded
window.addEventListener('load', () => {
  setTimeout(initPayPal, 500);
});
