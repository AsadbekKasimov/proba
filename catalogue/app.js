// ==================== ГРУППОВОЙ КАТАЛОГ С SCROLL SPY ====================


let productsData = {};
let allProducts = [];
let productsByGroup = {};    

let currentProduct = null;
let modalMode = 'catalog';
let currentCartIndex = null;

// Fetch products from Google Sheets
async function fetchProducts() {
    const res = await fetch("https://script.google.com/macros/s/AKfycbxgoLRxCH-sRFYarW2S2Sz15zZUCQETk8vG3HZdsdom0P-GZMcvfGEc7oBt4mrNhNQrDQ/exec");
    productsData = await res.json();
    allProducts = Object.values(productsData).flat().map(product => {

        if (product.image) {
            let urls = [];
            if (product.image.includes(',')) {
                urls = product.image.split(',');
            } else if (product.image.includes(';')) {
                urls = product.image.split(';');
            } else {
                urls = [product.image];
            }
            product.images = urls.map(i => i.trim());
        } else {
            product.images = [];
        }

        console.log(product.name, JSON.stringify(product.images)); // для отладки

        return product;
    });

    groupProductsByGroup();
    renderGroupedProducts();
    renderGroupButtons();
    setupScrollSpy();
    hideLoader();
}

// Группировка товаров по полю group
function groupProductsByGroup() {
    productsByGroup = {};
    
    allProducts.forEach(product => {
        const group = product.group || 'Без категории';
        if (!productsByGroup[group]) {
            productsByGroup[group] = [];
        }
        productsByGroup[group].push(product);
    });
}

// Рендер кнопок групп
function renderGroupButtons() {
    const nav = document.getElementById('groups-nav');
    nav.innerHTML = '';
    
    Object.keys(productsByGroup).forEach(group => {
        const btn = document.createElement('button');
        btn.className = 'group-btn';
        btn.textContent = group;
        btn.dataset.group = group;
        
        btn.addEventListener('click', () => {
            scrollToGroup(group);
        });
        
        nav.appendChild(btn);
    });
    
    // Сделать первую кнопку активной
    const firstBtn = nav.querySelector('.group-btn');
    if (firstBtn) {
        firstBtn.classList.add('active');
    }
}

// Рендер товаров по группам
function renderGroupedProducts() {
    const container = document.getElementById('products-by-groups');
    container.innerHTML = '';
    
    Object.entries(productsByGroup).forEach(([group, products]) => {
        const section = document.createElement('div');
        section.className = 'product-group-section';
        section.dataset.group = group;
        
        const title = document.createElement('h2');
        title.className = 'group-title';
        title.textContent = group;
        
        const grid = document.createElement('div');
        grid.className = 'products-grid';
        
        products.forEach(product => {
            grid.appendChild(createProductCard(product));
        });
        
        section.appendChild(title);
        section.appendChild(grid);
        container.appendChild(section);
    });
}

// Scroll Spy - отслеживание видимой группы
function setupScrollSpy() {
    const mainContent = document.querySelector('.main-content');
    const sections = document.querySelectorAll('.product-group-section');
    const groupButtons = document.querySelectorAll('.group-btn');
    
    let isScrollingProgrammatically = false;
    let scrollTimeout = null;
    
    function updateActiveGroup() {
        if (isScrollingProgrammatically) return;
        
        const scrollPosition = mainContent.scrollTop + 180; // Учитываем sticky header + немного отступа
        
        let activeSection = null;
        let minDistance = Infinity;
        
        // Находим секцию, которая ближе всего к верху видимой области
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const distance = Math.abs(scrollPosition - sectionTop);
            
            if (scrollPosition >= sectionTop - 50 && distance < minDistance) {
                minDistance = distance;
                activeSection = section;
            }
        });
        
        // Если не нашли, берём первую видимую
        if (!activeSection) {
            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const containerRect = mainContent.getBoundingClientRect();
                
                if (rect.top < containerRect.height / 2 && rect.bottom > 180) {
                    activeSection = section;
                }
            });
        }
        
        if (activeSection) {
            const group = activeSection.dataset.group;
            
            // Обновляем активную кнопку
            groupButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.group === group);
            });
            
            // Прокручиваем кнопку в видимую область
            const activeBtn = document.querySelector(`.group-btn[data-group="${group}"]`);
            if (activeBtn) {
                activeBtn.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest', 
                    inline: 'center' 
                });
            }
        }
    }
    
    // Слушаем скролл
    mainContent.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateActiveGroup, 50);
    });
    
    // Начальная установка
    updateActiveGroup();
    
    // Экспортируем функции для использования при программной прокрутке
    window.scrollSpySetProgrammaticScroll = (value) => {
        isScrollingProgrammatically = value;
    };
}

// Плавная прокрутка к группе
function scrollToGroup(group) {
    const section = document.querySelector(`.product-group-section[data-group="${group}"]`);
    const mainContent = document.querySelector('.main-content');
    
    if (section && mainContent) {
        // Отключаем scroll spy на время программной прокрутки
        if (window.scrollSpySetProgrammaticScroll) {
            window.scrollSpySetProgrammaticScroll(true);
        }
        
        const offset = section.offsetTop - 140; // Учитываем sticky header
        
        mainContent.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
        
        // Сразу обновляем активную кнопку
        document.querySelectorAll('.group-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.group === group);
        });
        
        // Включаем scroll spy обратно через небольшую задержку
        setTimeout(() => {
            if (window.scrollSpySetProgrammaticScroll) {
                window.scrollSpySetProgrammaticScroll(false);
            }
        }, 800);
    }
}

// Telegram WebApp initialization
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();


// State Management
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

    // Search with filtering
    document.getElementById('search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filterProductsInGroups(query);
    });

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
}

// Фильтрация товаров в группах
function filterProductsInGroups(query) {
    const sections = document.querySelectorAll('.product-group-section');
    
    if (!query) {
        // Показываем все группы и товары
        sections.forEach(section => {
            section.style.display = 'block';
            const cards = section.querySelectorAll('.product-card');
            cards.forEach(card => card.style.display = 'grid');
        });
        return;
    }
    
    sections.forEach(section => {
        const cards = section.querySelectorAll('.product-card');
        let hasVisibleProducts = false;
        
        cards.forEach(card => {
            const productName = card.querySelector('.product-name').textContent.toLowerCase();
            const matches = productName.includes(query);
            
            card.style.display = matches ? 'grid' : 'none';
            if (matches) hasVisibleProducts = true;
        });
        
        // Скрываем группу, если нет подходящих товаров
        section.style.display = hasVisibleProducts ? 'block' : 'none';
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
    } else if (page === 'profile') {
        loadUserOrders();
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const isFavorite = favorites.includes(product.id);
    
    const images = product.images || [product.image];

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

    <div class="product-name">${product.name}</div>

    ${product.pack_qty ? `
    <div class="product-pack">
    Упаковка: ${product.pack_qty} шт<br>
    Вес: ${product.weight} кг<br>
    Куб: ${product.cube} м³
    </div>
    ` : ''}
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

// Modal functions
function openModal(product) {
    currentProduct = product;
    modalMode = 'catalog';
    
    const modal = document.getElementById('product-modal');
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-description').textContent = product.description || '';
    
    const images = product.images || [product.image];
    const modalSlides = document.getElementById('modal-slides');
    const modalDots = document.getElementById('modal-dots');

    modalSlides.innerHTML = images.map(img => `<img src="${img}" class="slide">`).join('');
    modalDots.innerHTML = images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('');

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('product-modal').classList.add('hidden');
    currentProduct = null;
    modalMode = 'catalog';
    currentCartIndex = null;
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
        // Обновляем только кнопки избранного в текущих карточках
        updateFavoriteButtons();
    } else if (document.getElementById('favorites-page').classList.contains('active')) {
        loadFavorites();
    }
}

function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const productId = parseInt(btn.dataset.id);
        const isFavorite = favorites.includes(productId);
        
        btn.classList.toggle('active', isFavorite);
        const svg = btn.querySelector('svg');
        svg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    });
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
    const saved = JSON.parse(localStorage.getItem('userProfile')) || {};
    const user = tg.initDataUnsafe?.user;

    // Name: prefer saved, then Telegram, then default
    const name = saved.name || (user ? (user.first_name + (user.last_name ? ' ' + user.last_name : '')) : null) || 'Не указано';
    const phone = saved.phone || (user && user.username ? '@' + user.username : null) || 'Не указан';
    const city = saved.city || 'Не указан';

    document.getElementById('user-name').textContent = name;
    document.getElementById('user-phone').textContent = phone;
    document.getElementById('user-city').textContent = city;
}

function openProfileEdit() {
    const name = document.getElementById('user-name').textContent;
    const phone = document.getElementById('user-phone').textContent;
    const city = document.getElementById('user-city').textContent;

    document.getElementById('edit-name').value = (name === 'Не указано') ? '' : name;
    document.getElementById('edit-phone').value = (phone === 'Не указан') ? '' : phone;
    document.getElementById('edit-city').value = (city === 'Не указан') ? '' : city;

    document.getElementById('profile-view').classList.add('hidden');
    document.getElementById('profile-edit').classList.remove('hidden');
}

function closeProfileEdit() {
    document.getElementById('profile-edit').classList.add('hidden');
    document.getElementById('profile-view').classList.remove('hidden');
}

function saveProfileEdit() {
    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const city = document.getElementById('edit-city').value.trim();

    const profile = {
        name: name || null,
        phone: phone || null,
        city: city || null
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));

    document.getElementById('user-name').textContent = name || 'Не указано';
    document.getElementById('user-phone').textContent = phone || 'Не указан';
    document.getElementById('user-city').textContent = city || 'Не указан';

    closeProfileEdit();

    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
}

function loadUserOrders() {
    const ordersList = document.getElementById('orders-list');
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<p class="empty-state">У вас пока нет заказов</p>';
        return;
    }
    
    ordersList.innerHTML = '';
    
    [...orders].reverse().forEach(order => {
        const orderEl = document.createElement('div');
        orderEl.className = 'order-item';
        orderEl.innerHTML = `
            <div class="order-item-left">
                <div class="order-id">Заказ #${order.id}</div>
                <div class="order-date">${order.date}</div>
            </div>
            <svg class="order-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
        orderEl.addEventListener('click', () => openOrderModal(order));
        ordersList.appendChild(orderEl);
    });
}

let currentOpenOrder = null;

function openOrderModal(order) {
    currentOpenOrder = order;
    const modal = document.getElementById('order-detail-modal');
    const titleEl = document.getElementById('order-modal-title');
    const dateEl = document.getElementById('order-modal-date');
    const itemsEl = document.getElementById('order-modal-items');
    const totalEl = document.getElementById('order-modal-total');

    titleEl.textContent = `Заказ #${order.id}`;
    dateEl.textContent = order.date;

    itemsEl.innerHTML = '';

    const items = order.items || [];
    let totalWeight = 0;
    let totalCube = 0;

    items.forEach(cartItem => {
        const product = allProducts.find(p => p.id === cartItem.id);
        const name = product ? product.name : (cartItem.name || 'Товар');
        const price = product ? product.price : (cartItem.price || 0);
        const image = product ? (product.images?.[0] || product.image) : (cartItem.image || '');
        const qty = cartItem.quantity || cartItem.qty || 1;
        const itemTotal = price * qty;

        if (product) {
            totalWeight += (product.weight || 0) * qty;
            totalCube += (product.cube || 0) * qty;
        }

        const el = document.createElement('div');
        el.className = 'order-detail-item';
        el.innerHTML = `
            ${image ? `<img src="${image}" class="order-detail-img">` : '<div class="order-detail-img-placeholder"></div>'}
            <div class="order-detail-info">
                <div class="order-detail-name">${name}</div>
                ${product && product.pack_qty ? `<div class="order-detail-meta">Упаковка: ${product.pack_qty} шт</div>` : ''}
                <div class="order-detail-quantity">Количество: ${qty}</div>
            </div>
        `;
        itemsEl.appendChild(el);
    });

    let totalHTML = '';
    if (totalWeight > 0) totalHTML += `<div class="order-total-row secondary"><span>Вес:</span><span>${totalWeight.toFixed(2)} кг</span></div>`;
    if (totalCube > 0) totalHTML += `<div class="order-total-row secondary"><span>Куб:</span><span>${totalCube.toFixed(3)} м³</span></div>`;
    totalEl.innerHTML = totalHTML;

    modal.classList.remove('hidden');
}

function closeOrderModal() {
    document.getElementById('order-detail-modal').classList.add('hidden');
    currentOpenOrder = null;
}

// Utils
function formatPrice(price) {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
}

// Slider Swipe (touch + mouse)
let sliderMouseStart = null;

document.addEventListener('touchstart', e => {
    const slider = e.target.closest('.slider');
    if (!slider) return;
    slider.startX = e.touches[0].clientX;
});

document.addEventListener('touchend', e => {
    const slider = e.target.closest('.slider');
    if (!slider) return;
    moveSlider(slider, e.changedTouches[0].clientX - slider.startX);
});

document.addEventListener('mousedown', e => {
    const slider = e.target.closest('.slider');
    if (!slider) return;
    slider.startX = e.clientX;
    sliderMouseStart = slider;
});

document.addEventListener('mouseup', e => {
    if (!sliderMouseStart) return;
    moveSlider(sliderMouseStart, e.clientX - sliderMouseStart.startX);
    sliderMouseStart = null;
});

function moveSlider(slider, diff) {
    const slides = slider.querySelector('.slides');
    const dots = slider.querySelectorAll('.dot');
    const count = slides.children.length;
    let index = +slider.dataset.index;
    if (diff < -50 && index < count - 1) index++;
    if (diff > 50 && index > 0) index--;
    slider.dataset.index = index;
    slides.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
}

// Zoom on tap
document.addEventListener('click', e => {
    const img = e.target.closest('.zoomable');
    if (!img) return;
    img.classList.toggle('zoomed');
});

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
    loadUserProfile();
});

function hideLoader(){
   const loader = document.getElementById("loader");
   if(!loader) return;
   loader.style.opacity = "0";
   setTimeout(()=>{
      loader.style.display = "none";
   },500);
}
