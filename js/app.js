// =====================
// Japan Stationery Shop
// Cart & Payment Logic
// =====================

const BASE_PRICE = 12.00;

// Shipping cost for the 1st item per region
const FIRST_ITEM_SHIPPING = {
  asia: 30.00,
  us: 70.00,
  europe: 50.00,
};

// Shipping cost for each additional item
const ADDITIONAL_SHIPPING = 10.00;

// Calculate total price (shipping included)
function calcTotal(qty, region) {
  if (qty <= 0) return 0;
  const itemCost = BASE_PRICE * qty;
  const shippingCost = FIRST_ITEM_SHIPPING[region] + Math.max(0, qty - 1) * ADDITIONAL_SHIPPING;
  return itemCost + shippingCost;
}

// Price per pack for display (1st pack)
function calcFirstPackPrice(region) {
  return BASE_PRICE + FIRST_ITEM_SHIPPING[region];
}

// Price per additional pack
function calcAdditionalPackPrice() {
  return BASE_PRICE + ADDITIONAL_SHIPPING;
}

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
const totalPriceEl = document.getElementById('totalPrice');
const cartRegion = document.getElementById('cartRegion');
const productRegion = document.getElementById('productRegion');
const displayPrice = document.getElementById('displayPrice');
const priceExtraNote = document.getElementById('priceExtraNote');
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

// --- Product Price Display ---
function updateProductPrice() {
  const region = productRegion.value;
  const qty = parseInt(document.querySelector('.qty-input').value) || 1;
  const total = calcTotal(qty, region);
  const firstPrice = calcFirstPackPrice(region);
  const additionalPrice = calcAdditionalPackPrice();

  displayPrice.textContent = `$${total.toFixed(2)}`;

  if (qty > 1) {
    priceExtraNote.textContent = `$${firstPrice.toFixed(2)} (1st) + $${additionalPrice.toFixed(2)} x ${qty - 1} additional`;
  } else {
    priceExtraNote.textContent = `+$${additionalPrice.toFixed(2)} per additional pack`;
  }
}

productRegion.addEventListener('change', () => {
  updateProductPrice();
  // Sync cart region selector
  cartRegion.value = productRegion.value;
  updateTotals();
});

// --- Quantity Controls ---
document.querySelectorAll('.product-card').forEach(card => {
  const input = card.querySelector('.qty-input');
  const decreaseBtn = card.querySelector('[data-action="decrease"]');
  const increaseBtn = card.querySelector('[data-action="increase"]');

  decreaseBtn.addEventListener('click', () => {
    const val = parseInt(input.value);
    if (val > 1) {
      input.value = val - 1;
      updateProductPrice();
    }
  });

  increaseBtn.addEventListener('click', () => {
    const val = parseInt(input.value);
    if (val < 5) {
      input.value = val + 1;
      updateProductPrice();
    }
  });

  input.addEventListener('change', () => {
    let val = parseInt(input.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 5) val = 5;
    input.value = val;
    updateProductPrice();
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
      basePrice: parseFloat(btn.dataset.basePrice),
      img: btn.dataset.img,
      qty: qty,
    };

    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 5);
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
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = totalQty;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartFooter.style.display = 'block';
  const region = cartRegion.value;

  cartItems.innerHTML = cart.map(item => {
    const itemTotal = calcTotal(item.qty, region);
    return `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.img}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${itemTotal.toFixed(2)} (${item.qty} pack${item.qty > 1 ? 's' : ''})</div>
        <div class="cart-item-qty">
          <button data-cart-action="decrease" data-id="${item.id}">-</button>
          <span>${item.qty}</span>
          <button data-cart-action="increase" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-cart-action="remove" data-id="${item.id}">Remove</button>
    </div>
  `;
  }).join('');

  // Cart item event listeners
  cartItems.querySelectorAll('[data-cart-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.cartAction;
      const item = cart.find(c => c.id === id);
      if (!item) return;

      if (action === 'increase') {
        if (item.qty < 5) item.qty++;
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
  const region = cartRegion.value;
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = calcTotal(totalQty, region);
  totalPriceEl.textContent = `$${total.toFixed(2)}`;
}

cartRegion.addEventListener('change', () => {
  productRegion.value = cartRegion.value;
  updateProductPrice();
  renderCart();
});

// --- Save Cart ---
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// --- Get Order Summary ---
function getOrderSummary() {
  const region = cartRegion.value;
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = calcTotal(totalQty, region);
  const regionLabels = { asia: 'Asia', us: 'United States', europe: 'Europe' };

  return {
    items: cart.map(item => ({
      name: item.name,
      qty: item.qty,
    })),
    totalQty,
    region: regionLabels[region],
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
          },
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
bybitPayBtn.addEventListener('click', () => {
  const order = getOrderSummary();

  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }

  const summary = [
    '=== Order Summary for Bybit Pay ===',
    '',
    ...order.items.map(i => `${i.name} x${i.qty}`),
    '',
    `Region: ${order.region}`,
    `Total: $${order.total.toFixed(2)} (shipping included)`,
    '',
    'Please send the exact amount via Bybit Pay.',
    'Contact us after payment with your transaction ID.',
  ].join('\n');

  alert(summary);
});

// --- Init ---
updateProductPrice();
renderCart();

// Delay PayPal init to ensure SDK is loaded
window.addEventListener('load', () => {
  setTimeout(initPayPal, 500);
});
