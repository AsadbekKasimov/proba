let productsData = {};
let allProducts = [];

let currentProduct = null;
let modalMode = 'catalog'; // catalog | cart
let currentCartIndex = null;

async function fetchProducts() {
  const res = await fetch("https://script.google.com/macros/s/AKfycbw0OOkapBJF-aQXSGVYlPPLwRPXc5hS3XTfc43sWFmQcEcgFyZNw1bYm_oLirEBf9zB2w/exec");
  productsData = await res.json();
  console.log('productsData:', productsData);   // 👈 ВОТ СЮДА

  allProducts = Object.values(productsData).flat();
  console.log('allProducts:', allProducts);     // 👈 И СЮДА

  renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    let products =
        currentCategory === 'all'
            ? allProducts
            : productsData[currentCategory] || [];

    products.forEach(product => {
        grid.appendChild(createProductCard(product));
    });
}


// Telegram WebApp initialization
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();




// State Management
let currentCategory = 'all';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];




// Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
        });
    });

    // Category Buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;

            document.querySelectorAll('.category-btn')
                .forEach(b => b.classList.remove('active'));

            btn.classList.add('active');

            renderProducts(); // ✅ ВОТ ЭТО ЕДИНСТВЕННОЕ ИЗМЕНЕНИЕ
        });
    });


    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterProducts(query);
    });

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    
    // Закрытие модалки только при клике на фон (не при скролле)
    let modalTouchStart = null;
    const modal = document.getElementById('product-modal');
    
    modal.addEventListener('touchstart', (e) => {
        if (e.target.id === 'product-modal') {
            modalTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    
    modal.addEventListener('touchend', (e) => {
        if (e.target.id === 'product-modal' && modalTouchStart) {
            const deltaX = Math.abs(e.changedTouches[0].clientX - modalTouchStart.x);
            const deltaY = Math.abs(e.changedTouches[0].clientY - modalTouchStart.y);
            
            // Закрыть только если это был клик (не скролл)
            if (deltaX < 10 && deltaY < 10) {
                closeModal();
            }
        }
        modalTouchStart = null;
    });
    
    // Для мыши (десктоп)
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'product-modal') closeModal();
    });

    // Quantity Controls
    document.getElementById('qty-minus').addEventListener('click', () => {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value, 10) || 1;
    if (val > 1) input.value = val - 1;
});

document.getElementById('qty-plus').addEventListener('click', () => {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value, 10) || 1;
    input.value = val + 1;
});


    // Add to Cart from Modal
    document.getElementById('modal-add-to-cart')
  .addEventListener('click', () => {

    const qty = parseInt(document.getElementById('qty-input').value, 10) || 1;

    // если модалка открыта из каталога
    if (modalMode === 'catalog') {
        addToCartFromModal();
        return;
    }

    // если модалка открыта из корзины
    if (modalMode === 'cart' && currentCartIndex !== null) {
        cart[currentCartIndex].quantity = qty;
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
        closeModal();
    }
});


    // Checkout
    document.getElementById('checkout-btn').addEventListener('click', checkout);
document.getElementById('clear-cart-top')?.addEventListener('click', () => {
    if (!confirm('Очистить корзину?')) return;

    cart = [];
    saveCart();
    updateCartBadge();
    renderCart();
});


}

// Page Switching
function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`${page}-page`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    if (page === 'favorites') {
        loadFavorites();
    } else if (page === 'cart') {
        renderCart();
    } else if (page === 'profile') {
        loadUserOrders();
    }
}


function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const isFavorite = favorites.includes(product.id);
    
const images = product.images || [product.image];

// ===== БЕЙДЖ (ХИТ / НОВИНКА) =====
let badgeHTML = '';

if (product.badge === 'hit') {
    badgeHTML = '<div class="product-badge hit">Хит продаж</div>';
}

if (product.badge === 'new') {
    badgeHTML = '<div class="product-badge new">Новинка</div>';
}

    card.innerHTML = `
    ${badgeHTML}

    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${product.id}">
        <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    </button>

    <div class="slider" data-index="0">
        <div class="slides">
            ${images.map(img => `
                <img src="${img}" class="slide">
            `).join('')}
        </div>
        <div class="dots">
            ${images.map((_, i) => `
                <span class="dot ${i === 0 ? 'active' : ''}"></span>
            `).join('')}
        </div>
    </div>

    <div class="product-price">${formatPrice(product.price)}</div>
    <div class="product-name">${product.name}</div>

    <button class="product-add-btn">
        <span class="btn-text">Добавить в</span>
        <svg class="cart-icon" viewBox="0 0 24 24" fill="none">
            <path d="M7 4H3V6H5L8.6 13.6L7.25 15.05C6.47 15.83 7.02 17 8.12 17H19V15H8.42L9.1 14H15.55C16.3 14 16.96 13.59 17.3 12.97L21 6H7.42L6.7 4Z" fill="currentColor"/>
            <circle cx="9" cy="21" r="1" fill="currentColor"/>
            <circle cx="20" cy="21" r="1" fill="currentColor"/>
        </svg>
    </button>
`;

    

   
    
    card.querySelector('.favorite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(product.id);
    });
    
    card.addEventListener('click', () => {
        openModal(product);
    });
    
    return card;
}

function filterProducts(query) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    let products = currentCategory === 'all' 
        ? allProducts 
        : productsData[currentCategory];
    
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
    );
    
    filtered.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// Modal
function openModal(product) {
    currentProduct = product;
    
const images = product.images || [product.image];

const slides = document.getElementById('modal-slides');
const dots = document.getElementById('modal-dots');

slides.innerHTML = images.map(img => `
    <img src="${img}" class="slide zoomable">
`).join('');

dots.innerHTML = images.map((_, i) => `
    <span class="dot ${i === 0 ? 'active' : ''}"></span>
`).join('');

document.getElementById('modal-slider').dataset.index = 0;
slides.style.transform = 'translateX(0)';

    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-description').textContent = product.description;
    document.getElementById('modal-price').textContent = formatPrice(product.price);
    document.getElementById('qty-input').value = 1;

	const qtyInput = document.getElementById('qty-input');

// защита от букв, 0, -, e
qtyInput.oninput = () => {
    let val = parseInt(qtyInput.value, 10);
    if (isNaN(val) || val < 1) qtyInput.value = 1;
    else qtyInput.value = val;
};

	
	document.getElementById('product-modal').classList.remove('hidden');


}


function openModalFromCart(index) {
    const item = cart[index];

    modalMode = 'cart';
    currentCartIndex = index;
    currentProduct = item;

    // картинки
    const images = item.images || [item.image];

    const slides = document.getElementById('modal-slides');
    const dots = document.getElementById('modal-dots');

    slides.innerHTML = images.map(img => `
        <img src="${img}" class="slide zoomable">
    `).join('');

    dots.innerHTML = images.map((_, i) => `
        <span class="dot ${i === 0 ? 'active' : ''}"></span>
    `).join('');

    slides.style.transform = 'translateX(0)';
    document.getElementById('modal-slider').dataset.index = 0;

    // текст
    document.getElementById('modal-title').textContent = item.name;
    document.getElementById('modal-description').textContent = item.description;
    document.getElementById('modal-price').textContent = formatPrice(item.price);

    // ❗ ВАЖНО: просто показываем qty, НЕ меняем корзину
    document.getElementById('qty-input').value = item.quantity;


    // меняем текст кнопки
    document.getElementById('modal-add-to-cart').textContent = 'Обновить количество';

    document.getElementById('product-modal').classList.remove('hidden');
}



function closeModal() {
    document.getElementById('product-modal').classList.add('hidden');

    modalMode = 'catalog';
    currentCartIndex = null;
    currentProduct = null;

    document.getElementById('modal-add-to-cart').textContent = 'Добавить в корзину';
}


function addToCartFromModal() {
    if (!currentProduct) return;
    
    let quantity = parseInt(document.getElementById('qty-input').value, 10);
	if (isNaN(quantity) || quantity < 1) quantity = 1;

    addToCart(currentProduct, quantity);
    closeModal();
}

// Cart
function addToCart(product, quantity = 1) {
    // Определяем категорию товара по ID
    function getProductCategory(productId) {
        if (productId >= 10000 && productId < 20000) return 'cleaning';
        if (productId >= 20000 && productId < 30000) return 'plasticpe';
        if (productId >= 30000 && productId < 40000) return 'plasticpet';
        if (productId >= 40000 && productId < 50000) return 'plasticpp';
        if (productId >= 50000 && productId < 60000) return 'plastictd';
        if (productId >= 60000 && productId < 70000) return 'chemicals';
        if (productId >= 70000 && productId < 80000) return 'fragrances';
        return 'unknown';
    }
    
    // Получаем категорию добавляемого товара
    const newProductCategory = getProductCategory(product.id);
    
    // ПРОВЕРКА НА СМЕШИВАНИЕ КАТЕГОРИЙ УБРАНА - теперь можно добавлять товары из любых категорий
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            image: (product.images && product.images[0]) || product.image,
            category: newProductCategory
        });
    }
    
    saveCart();
    updateCartBadge();
    
    // Show feedback
    const btn = document.activeElement;
    const originalText = btn.textContent;
    btn.textContent = '✓ Добавлено';
    btn.style.background = '#ff0000';
    btn.style.color = 'white';
    setTimeout(() => {
        btn.textContent = originalText
	btn.style.background = '';
	btn.style.color = '';;
    }, 1000);
}


function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartBadge();
    renderCart();
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        renderCart();
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const summary = document.getElementById('cart-summary');
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Ваша корзина пуста</p></div>';
        summary.classList.add('hidden');
        return;
    }
    
    container.innerHTML = '';
    summary.classList.remove('hidden');

    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';

        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-controls">
                    <button class="cart-qty-btn" data-id="${item.id}" data-change="-1">-</button>
                    <span class="cart-qty">${item.quantity}</span>
                    <button class="cart-qty-btn" data-id="${item.id}" data-change="1">+</button>
                    <button class="cart-item-remove" data-id="${item.id}">Удалить</button>
                </div>
            </div>
        `;

        // ✅ КЛИК ПО КАРТОЧКЕ → ОТКРЫВАЕТ МОДАЛКУ
        cartItem.addEventListener('click', () => {
            openModalFromCart(index);
        });

        // ❌ КНОПКИ + / − НЕ ДОЛЖНЫ ОТКРЫВАТЬ МОДАЛКУ
        cartItem.querySelectorAll('.cart-qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // ⬅️ КЛЮЧЕВО
                const id = parseInt(btn.dataset.id);
                const change = parseInt(btn.dataset.change);
                updateCartQuantity(id, change);
            });
        });

        // ❌ КНОПКА УДАЛИТЬ НЕ ДОЛЖНА ОТКРЫВАТЬ МОДАЛКУ
        cartItem.querySelector('.cart-item-remove')
            .addEventListener('click', (e) => {
                e.stopPropagation(); // ⬅️ КЛЮЧЕВО
                const id = parseInt(e.target.dataset.id);
                removeFromCart(id);
            });

        container.appendChild(cartItem);
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cart-total-amount').textContent = formatPrice(total);
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    badge.textContent = count;
    
    if (count > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Favorites
function toggleFavorite(productId) {
    const index = favorites.indexOf(productId);
    
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(productId);
    }
    
    saveFavorites();

    if (document.getElementById('catalog-page').classList.contains('active')) {
        renderProducts();
    } else if (document.getElementById('favorites-page').classList.contains('active')) {
        loadFavorites();
    }
}


function loadFavorites() {
    const grid = document.getElementById('favorites-grid');
    
    if (favorites.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>У вас пока нет избранных товаров</p></div>';
        return;
    }
    
    grid.innerHTML = '';
    
    favorites.forEach(id => {
        const product = allProducts.find(p => p.id === id);
        if (product) {
            const card = createProductCard(product);
            grid.appendChild(card);
        }
    });
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Profile
function loadUserProfile() {
    const user = tg.initDataUnsafe?.user;
    
    if (user) {
        document.getElementById('user-name').textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        document.getElementById('user-phone').textContent = user.username ? '@' + user.username : 'Не указан';
        document.getElementById('user-city').textContent = 'Ташкент'; // Default or from backend
    } else {
        document.getElementById('user-name').textContent = 'Гость';
        document.getElementById('user-phone').textContent = 'Не указан';
        document.getElementById('user-city').textContent = 'Не указан';
    }
}

function loadUserOrders() {
    const ordersList = document.getElementById('orders-list');
    
    // Mock orders - в реальности данные будут приходить с бэкенда
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p class="empty-state">У вас пока нет заказов</p>';
        return;
    }
    
    ordersList.innerHTML = '';
    
    orders.forEach(order => {
        const orderEl = document.createElement('div');
        orderEl.className = 'order-item';
        orderEl.innerHTML = `
            <div class="order-id">Заказ #${order.id}</div>
            <div class="order-date">${order.date} • ${formatPrice(order.total)}</div>
        `;
        ordersList.appendChild(orderEl);
    });
}

// Checkout
function checkout() {
    if (cart.length === 0) return;
    
    // Show confirmation dialog
    showConfirmationDialog();
}

function showConfirmationDialog() {
    const modal = document.getElementById('confirmation-modal');
    modal.classList.remove('hidden');
    
    // Предотвратить закрытие при случайном скролле
    setTimeout(() => {
        const confirmModal = document.getElementById('confirmation-modal');
        let confirmTouchStart = null;
        
        const handleTouchStart = (e) => {
            if (e.target.id === 'confirmation-modal') {
                confirmTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };
        
        const handleTouchEnd = (e) => {
            if (e.target.id === 'confirmation-modal' && confirmTouchStart) {
                const deltaX = Math.abs(e.changedTouches[0].clientX - confirmTouchStart.x);
                const deltaY = Math.abs(e.changedTouches[0].clientY - confirmTouchStart.y);
                
                // Закрыть только если это был клик (не скролл)
                if (deltaX < 10 && deltaY < 10) {
                    closeConfirmationDialog();
                }
            }
            confirmTouchStart = null;
        };
        
        confirmModal.addEventListener('touchstart', handleTouchStart);
        confirmModal.addEventListener('touchend', handleTouchEnd);
    }, 100);
}

function closeConfirmationDialog() {
    const modal = document.getElementById('confirmation-modal');
    modal.classList.add('hidden');
}

function confirmCheckout() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Prepare order data - ИЗМЕНЕНО: Теперь включаем URL изображения
    const orderData = {
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.quantity,
            image: item.image  // ДОБАВЛЕНО: Включаем URL изображения в данные заказа
        })),
        total: total,
        user_id: tg.initDataUnsafe?.user?.id || 0
    };
    
    // Send data back to bot
    tg.sendData(JSON.stringify(orderData));
    
    // Save order to localStorage for history
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    orders.unshift({
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU'),
        total: total,
        items: cart.length
    });
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Clear cart
    cart = [];
    saveCart();
    updateCartBadge();
    
    // Close confirmation dialog
    closeConfirmationDialog();
    
    tg.close();
}

// Utils
function formatPrice(price) {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
}
/* ===== SLIDER SWIPE ===== */
document.addEventListener('touchstart', e => {
    const slider = e.target.closest('.slider');
    if (!slider) return;
    slider.startX = e.touches[0].clientX;
});

document.addEventListener('touchend', e => {
    const slider = e.target.closest('.slider');
    if (!slider) return;

    const slides = slider.querySelector('.slides');
    const dots = slider.querySelectorAll('.dot');
    const count = slides.children.length;

    let index = +slider.dataset.index;
    const diff = e.changedTouches[0].clientX - slider.startX;

    if (diff < -50 && index < count - 1) index++;
    if (diff > 50 && index > 0) index--;

    slider.dataset.index = index;
    slides.style.transform = `translateX(-${index * 100}%)`;

    dots.forEach((d, i) => d.classList.toggle('active', i === index));
});
// zoom on tap
document.addEventListener('click', e => {
    const img = e.target.closest('.zoomable');
    if (!img) return;
    img.classList.toggle('zoomed');
});

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
    updateCartBadge();
    loadUserProfile();
});
