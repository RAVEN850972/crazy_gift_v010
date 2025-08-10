// ===================================================================
// profile.js - Исправленная версия с API интеграцией
// ===================================================================

// === API ИНТЕГРАЦИЯ ДЛЯ ИНВЕНТАРЯ ===

/**
 * Инициализация страницы профиля с API
 */
async function initializeProfilePageWithAPI() {
    try {
        // Обновляем баланс
        await updateBalanceFromAPI();
        
        // Загружаем реальный инвентарь
        await loadInventoryFromAPI();
        
        // Загружаем профиль пользователя
        await loadUserProfileFromAPI();
        
    } catch (error) {
        console.error('Ошибка инициализации страницы профиля:', error);
    }
}

/**
 * Загрузка инвентаря из API
 * ЗАМЕНЯЕТ захардкоженные массивы предметов
 */
async function loadInventoryFromAPI() {
    try {
        // Показываем лоадер
        showInventoryLoader();
        
        // Используем обертку для получения инвентаря
        const inventory = await loadInventoryWithAPI();
        
        // Рендерим реальный инвентарь
        renderInventoryGrid(inventory.items || []);
        
        // Обновляем статистику инвентаря
        updateInventoryStats(inventory);
        
        console.log('✅ Инвентарь загружен:', inventory.items?.length || 0, 'предметов');
        
    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        
        // Показываем сообщение об ошибке
        showInventoryError();
    } finally {
        hideInventoryLoader();
    }
}

/**
 * Рендер сетки инвентаря
 * ЗАМЕНЯЕТ старую логику с мок-данными
 */
function renderInventoryGrid(items) {
    const inventoryGrid = document.querySelector('.inventory-grid, .items-grid');
    if (!inventoryGrid) return;
    
    // Очищаем существующий контент
    inventoryGrid.innerHTML = '';
    
    if (!items || items.length === 0) {
        // Показываем сообщение о пустом инвентаре
        inventoryGrid.innerHTML = `
            <div class="empty-inventory">
                <div class="empty-icon">📦</div>
                <div class="empty-title">Инвентарь пуст</div>
                <div class="empty-subtitle">Откройте кейсы чтобы получить предметы</div>
                <button class="empty-button" onclick="window.location.href='index.html'">
                    Перейти к кейсам
                </button>
            </div>
        `;
        return;
    }
    
    // Рендерим предметы
    items.forEach((item, index) => {
        const itemCard = document.createElement('div');
        itemCard.className = 'inventory-item';
        itemCard.setAttribute('data-item-id', item.id);
        itemCard.style.animationDelay = `${index * 0.05}s`;
        
        itemCard.innerHTML = `
            <div class="item-rarity rarity-${item.rarity}"></div>
            <div class="item-image">
                <img src="${item.image_url || 'assets/items/default.png'}" 
                     alt="${item.item_name}"
                     onerror="this.src='assets/items/default.png'">
            </div>
            <div class="item-info">
                <div class="item-name">${item.item_name}</div>
                <div class="item-value">
                    ${item.item_stars.toLocaleString()}
                    <img src="assets/icons/star_icon.png" alt="Stars">
                </div>
            </div>
            <div class="item-actions">
                <button class="sell-button" onclick="sellInventoryItem(${item.id})">
                    Продать
                </button>
            </div>
        `;
        
        // Добавляем обработчик клика для деталей
        itemCard.addEventListener('click', (e) => {
            if (!e.target.closest('.sell-button')) {
                showItemDetails(item);
            }
        });
        
        inventoryGrid.appendChild(itemCard);
    });
}

/**
 * Обновление статистики инвентаря
 */
function updateInventoryStats(inventory) {
    // Общая стоимость
    const totalValueElement = document.querySelector('.total-value, .inventory-value');
    if (totalValueElement && inventory.total_value !== undefined) {
        totalValueElement.textContent = inventory.total_value.toLocaleString();
    }
    
    // Количество предметов
    const itemCountElement = document.querySelector('.item-count, .inventory-count');
    if (itemCountElement && inventory.items) {
        itemCountElement.textContent = inventory.items.length;
    }
}

/**
 * Продажа предмета из инвентаря
 * ПЕРЕОПРЕДЕЛЕНИЕ существующей функции
 */
window.sellInventoryItem = async function(itemId) {
    if (!itemId) {
        console.error('Item ID не указан');
        return;
    }
    
    try {
        // Показываем подтверждение
        const confirmed = await showSellConfirmation(itemId);
        if (!confirmed) return;
        
        // Показываем лоадер
        showSellLoader(itemId);
        
        // Используем обертку для продажи
        const result = await sellItemWithAPI(itemId);
        
        if (result.success) {
            // Показываем успешное уведомление
            showNotification(`Предмет продан за ${result.earned_stars} звёзд`, 'success');
            
            // Удаляем предмет из UI
            removeItemFromGrid(itemId);
            
            // Перезагружаем инвентарь для актуальности
            setTimeout(() => loadInventoryFromAPI(), 1000);
            
        } else {
            throw new Error(result.message || 'Не удалось продать предмет');
        }
        
    } catch (error) {
        console.error('Ошибка продажи предмета:', error);
        
        showNotification(error.message || 'Ошибка при продаже предмета', 'error');
    } finally {
        hideSellLoader(itemId);
    }
};

/**
 * Загрузка профиля пользователя
 */
async function loadUserProfileFromAPI() {
    try {
        // Используем обертку для получения профиля
        const profile = await getUserProfileWithAPI();
        
        // Обновляем информацию профиля в UI
        updateProfileInfo(profile);
        
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

/**
 * Обновление информации профиля в UI
 */
function updateProfileInfo(profile) {
    // Имя пользователя
    const usernameElement = document.querySelector('.username, .profile-name');
    if (usernameElement) {
        const displayName = profile.first_name || profile.username || 'Пользователь';
        usernameElement.textContent = displayName;
    }
    
    // Количество открытых кейсов
    const casesOpenedElement = document.querySelector('.cases-opened, .total-cases');
    if (casesOpenedElement && profile.total_cases_opened !== undefined) {
        casesOpenedElement.textContent = profile.total_cases_opened;
    }
    
    // Дата регистрации
    const joinDateElement = document.querySelector('.join-date, .member-since');
    if (joinDateElement && profile.created_at) {
        const joinDate = new Date(profile.created_at).toLocaleDateString('ru-RU');
        joinDateElement.textContent = `Участник с ${joinDate}`;
    }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

/**
 * Показать лоадер инвентаря
 */
function showInventoryLoader() {
    const inventoryGrid = document.querySelector('.inventory-grid, .items-grid');
    if (inventoryGrid) {
        inventoryGrid.innerHTML = `
            <div class="inventory-loader">
                <div class="loader-spinner"></div>
                <div class="loader-text">Загрузка инвентаря...</div>
            </div>
        `;
    }
}

/**
 * Скрыть лоадер инвентаря
 */
function hideInventoryLoader() {
    const loader = document.querySelector('.inventory-loader');
    if (loader) {
        loader.remove();
    }
}

/**
 * Показать ошибку загрузки инвентаря
 */
function showInventoryError() {
    const inventoryGrid = document.querySelector('.inventory-grid, .items-grid');
    if (inventoryGrid) {
        inventoryGrid.innerHTML = `
            <div class="inventory-error">
                <div class="error-icon">⚠️</div>
                <div class="error-title">Ошибка загрузки</div>
                <div class="error-subtitle">Не удалось загрузить инвентарь</div>
                <button class="retry-button" onclick="loadInventoryFromAPI()">
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

/**
 * Показать подтверждение продажи
 */
async function showSellConfirmation(itemId) {
    // Если есть существующая функция подтверждения, используем её
    if (typeof showConfirmModal === 'function') {
        return await showConfirmModal('Вы уверены что хотите продать этот предмет?');
    }
    
    // Простое подтверждение
    return confirm('Вы уверены что хотите продать этот предмет?');
}

/**
 * Показать лоадер продажи
 */
function showSellLoader(itemId) {
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemElement) {
        const sellButton = itemElement.querySelector('.sell-button');
        if (sellButton) {
            sellButton.textContent = 'Продаём...';
            sellButton.disabled = true;
        }
    }
}

/**
 * Скрыть лоадер продажи
 */
function hideSellLoader(itemId) {
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemElement) {
        const sellButton = itemElement.querySelector('.sell-button');
        if (sellButton) {
            sellButton.textContent = 'Продать';
            sellButton.disabled = false;
        }
    }
}

/**
 * Удалить предмет из сетки
 */
function removeItemFromGrid(itemId) {
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemElement) {
        itemElement.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            itemElement.remove();
        }, 300);
    }
}

/**
 * Показать детали предмета
 */
function showItemDetails(item) {
    // Если есть существующая функция модального окна, используем её
    if (typeof showItemModal === 'function') {
        showItemModal(item);
        return;
    }
    
    // Простой alert с информацией
    alert(`${item.item_name}\nСтоимость: ${item.item_stars} звёзд\nРедкость: ${item.rarity}`);
}

// === СУЩЕСТВУЮЩИЙ КОД (с изменениями) ===

// Global state
let currentFilter = 'all';
let sortBy = 'newest';

// Initialize Telegram WebApp
function initTelegramApp() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Настройка заголовка
        tg.setHeaderColor('bg_color');
        
        // Скрываем основную кнопку
        if (tg.MainButton) {
            tg.MainButton.hide();
        }
    }
}

// Filter inventory items
function filterItems(filter) {
    currentFilter = filter;
    
    // Обновляем активный фильтр в UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    // Перезагружаем инвентарь с фильтром (если API поддерживает)
    loadInventoryFromAPI();
}

// Sort inventory items
function sortItems(sortType) {
    sortBy = sortType;
    
    // Обновляем активную сортировку в UI
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sort === sortType) {
            btn.classList.add('active');
        }
    });
    
    // Перезагружаем инвентарь с сортировкой
    loadInventoryFromAPI();
}

// Update balance
function updateBalance() {
    const balanceElement = document.getElementById('balance');
    if (balanceElement && window.GameState?.balance) {
        balanceElement.textContent = window.GameState.balance.toLocaleString();
    }
}

// Navigation functions
function goBack() {
    if (window.Telegram?.WebApp?.close) {
        window.Telegram.WebApp.close();
    } else {
        window.history.back();
    }
}

function navigateToBalance() {
    window.location.href = 'balance.html';
}

function navigateToSettings() {
    window.location.href = 'settings.html';
}

function navigateToUpgrade() {
    window.location.href = 'upgrade.html';
}

// Show notification function
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#5352ed'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Удаление через 3 секунды
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Stats management
function updateStats() {
    const stats = {
        totalItems: 0,
        totalValue: 0,
        itemsByRarity: {
            common: 0,
            rare: 0,
            epic: 0,
            legendary: 0,
            mythic: 0
        }
    };
    
    // Обновляем статистику в UI
    document.querySelector('.stat-items .stat-value').textContent = stats.totalItems;
    document.querySelector('.stat-value .stat-value').textContent = stats.totalValue.toLocaleString();
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // API инициализация для страницы профиля
    await initializeProfilePageWithAPI();
    
    // Существующая инициализация
    initTelegramApp();
    updateBalance();
    updateStats();
    
    // Обработчики фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterItems(btn.dataset.filter);
        });
    });
    
    // Обработчики сортировки
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sortItems(btn.dataset.sort);
        });
    });
    
    // Навигация
    const backButton = document.querySelector('.app-logo, .back-button');
    if (backButton) {
        backButton.addEventListener('click', goBack);
    }
    
    const balanceWidget = document.querySelector('.balance-widget');
    if (balanceWidget) {
        balanceWidget.addEventListener('click', navigateToBalance);
    }
    
    const settingsButton = document.querySelector('.settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', navigateToSettings);
    }
    
    const upgradeButton = document.querySelector('.upgrade-button');
    if (upgradeButton) {
        upgradeButton.addEventListener('click', navigateToUpgrade);
    }
    
    // Обновление инвентаря каждые 30 секунд (если не в демо режиме)
    setInterval(() => {
        if (!window.GameState?.demoMode && window.GameState?.authenticated) {
            loadInventoryFromAPI();
        }
    }, 30000);
});