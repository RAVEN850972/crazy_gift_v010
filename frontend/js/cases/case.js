// ===================================================================
// case.js - Исправленная версия с API интеграцией
// ===================================================================

// === API ИНТЕГРАЦИЯ ДЛЯ КЕЙСОВ ===

/**
 * Инициализация страницы кейса с API данными
 */
async function initializeCasePageWithAPI() {
    const caseId = getCaseIdFromUrl();
    
    if (!caseId) {
        console.error('Case ID не найден в URL');
        return;
    }
    
    try {
        // Загружаем данные кейса из API
        await loadCaseDataFromAPI(caseId);
        
        // Обновляем баланс
        await updateBalanceFromAPI();
        
    } catch (error) {
        console.error('Ошибка инициализации страницы кейса:', error);
    }
}

/**
 * Загрузка данных кейса из API
 * ЗАМЕНЯЕТ захардкоженные данные кейса
 */
async function loadCaseDataFromAPI(caseId) {
    try {
        if (window.GameState?.demoMode) {
            // В демо режиме используем минимальные данные
            loadDemoCaseData(caseId);
            return;
        }
        
        // Загружаем реальные данные кейса
        const caseData = await window.apiClient.getCase(caseId);
        
        // Обновляем название кейса
        const caseTitleElement = document.getElementById('caseTitle');
        if (caseTitleElement) {
            caseTitleElement.textContent = caseData.name;
        }
        
        // Обновляем цену кейса
        const casePriceElements = document.querySelectorAll('.case-price, .price-amount');
        casePriceElements.forEach(element => {
            element.textContent = caseData.price_stars.toLocaleString();
        });
        
        // Генерируем рулетку с реальными предметами
        if (caseData.items) {
            generateRouletteWithRealItems(caseData.items);
        }
        
        console.log('✅ Данные кейса загружены:', caseData.name);
        
    } catch (error) {
        console.error('Ошибка загрузки данных кейса:', error);
        // Fallback в демо режим
        loadDemoCaseData(caseId);
    }
}

/**
 * Загрузка демо данных кейса
 */
function loadDemoCaseData(caseId) {
    const caseTitleElement = document.getElementById('caseTitle');
    if (caseTitleElement) {
        caseTitleElement.textContent = `Демо кейс #${caseId}`;
    }
    
    // Генерируем демо рулетку
    generateDemoRoulette();
    
    console.log('⚠️ Используются демо данные кейса');
}

/**
 * Генерация рулетки с реальными предметами
 * ЗАМЕНЯЕТ захардкоженные массивы предметов
 */
function generateRouletteWithRealItems(items) {
    const rouletteLine = document.getElementById('rouletteLine');
    if (!rouletteLine) return;
    
    // Очищаем существующие элементы
    rouletteLine.innerHTML = '';
    
    // Создаем расширенный массив для рулетки (дублируем предметы)
    const extendedItems = [];
    const totalSlots = 50; // Общее количество слотов в рулетке
    
    // Заполняем слоты на основе редкости предметов
    for (let i = 0; i < totalSlots; i++) {
        // Выбираем предмет на основе его веса/редкости
        const selectedItem = selectItemByRarity(items);
        extendedItems.push(selectedItem);
    }
    
    // Рендерим слоты рулетки
    extendedItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `roulette-item rarity-${item.rarity}`;
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${item.image_url || 'assets/items/default.png'}" 
                     alt="${item.name}"
                     onerror="this.src='assets/items/default.png'">
            </div>
            <div class="item-name">${item.name}</div>
        `;
        
        rouletteLine.appendChild(itemElement);
    });
}

/**
 * Генерация демо рулетки
 */
function generateDemoRoulette() {
    const rouletteLine = document.getElementById('rouletteLine');
    if (!rouletteLine) return;
    
    rouletteLine.innerHTML = '';
    
    // Создаем простую демо рулетку
    const demoItems = [
        { name: 'Демо предмет 1', rarity: 'common', image_url: 'assets/items/demo1.png' },
        { name: 'Демо предмет 2', rarity: 'rare', image_url: 'assets/items/demo2.png' },
        { name: 'Демо предмет 3', rarity: 'epic', image_url: 'assets/items/demo3.png' }
    ];
    
    for (let i = 0; i < 30; i++) {
        const item = demoItems[i % demoItems.length];
        const itemElement = document.createElement('div');
        itemElement.className = `roulette-item rarity-${item.rarity}`;
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${item.image_url}" alt="${item.name}" onerror="this.src='assets/items/default.png'">
            </div>
            <div class="item-name">${item.name}</div>
        `;
        
        rouletteLine.appendChild(itemElement);
    }
}

/**
 * Выбор предмета на основе редкости
 */
function selectItemByRarity(items) {
    // Создаем веса для разных редкостей
    const rarityWeights = {
        'common': 50,
        'rare': 25,
        'epic': 15,
        'legendary': 8,
        'mythic': 2
    };
    
    // Создаем взвешенный массив
    const weightedItems = [];
    items.forEach(item => {
        const weight = rarityWeights[item.rarity] || 30;
        for (let i = 0; i < weight; i++) {
            weightedItems.push(item);
        }
    });
    
    // Возвращаем случайный предмет
    return weightedItems[Math.floor(Math.random() * weightedItems.length)];
}

// === СУЩЕСТВУЮЩИЙ КОД (с изменениями) ===

// Global variables
let isSpinning = false;
let currentCaseId = null;

// Initialize page
function initializePage() {
    currentCaseId = getCaseIdFromUrl();
    
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Настройка кнопки "Назад"
        if (tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(goBack);
        }
    }
    
    // Обновляем баланс
    updateBalance();
}

// Get case ID from URL
function getCaseIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Update balance display
function updateBalance() {
    const balanceElement = document.getElementById('balance');
    if (balanceElement && window.GameState?.balance) {
        balanceElement.textContent = window.GameState.balance.toLocaleString();
    }
}

// ПЕРЕОПРЕДЕЛЕНИЕ функции openCase() - ГЛАВНОЕ ИЗМЕНЕНИЕ
async function openCase() {
    if (isSpinning) return;
    
    const caseId = getCaseIdFromUrl();
    if (!caseId) {
        console.error('Case ID не найден');
        return;
    }
    
    try {
        // Начинаем спин
        isSpinning = true;
        updateOpenButton('Открытие...');
        
        // Используем обертку для открытия кейса
        const result = await openCaseWithAPI(caseId);
        
        if (result.success) {
            // Анимируем рулетку к выигранному предмету
            animateRouletteToWin(result.item);
            
            // Показываем результат
            setTimeout(() => {
                showPrizeResult(result.item);
                updateOpenButton('Открыть ещё');
                isSpinning = false;
            }, 3000); // После окончания анимации
            
        } else {
            throw new Error(result.message || 'Не удалось открыть кейс');
        }
        
    } catch (error) {
        console.error('Ошибка открытия кейса:', error);
        
        // Показываем ошибку пользователю
        if (typeof showNotification === 'function') {
            showNotification(error.message || 'Ошибка при открытии кейса', 'error');
        } else {
            alert(error.message || 'Ошибка при открытии кейса');
        }
        
        // Сбрасываем состояние
        isSpinning = false;
        updateOpenButton('Открыть кейс');
    }
}

// Animate roulette to winning item
function animateRouletteToWin(wonItem) {
    const rouletteLine = document.getElementById('rouletteLine');
    if (!rouletteLine) return;
    
    // Находим элемент с выигранным предметом в рулетке
    const itemElements = rouletteLine.querySelectorAll('.roulette-item');
    let targetIndex = Math.floor(itemElements.length / 2); // Центральный элемент
    
    // Ищем подходящий предмет или создаем его в центре
    for (let i = 0; i < itemElements.length; i++) {
        const itemName = itemElements[i].querySelector('.item-name').textContent;
        if (itemName === wonItem.name || itemName === wonItem.item_name) {
            targetIndex = i;
            break;
        }
    }
    
    // Если не найден, обновляем центральный элемент
    if (targetIndex === Math.floor(itemElements.length / 2)) {
        const centerElement = itemElements[targetIndex];
        if (centerElement) {
            centerElement.className = `roulette-item rarity-${wonItem.rarity}`;
            centerElement.innerHTML = `
                <div class="item-image">
                    <img src="${wonItem.image_url || 'assets/items/default.png'}" 
                         alt="${wonItem.name || wonItem.item_name}"
                         onerror="this.src='assets/items/default.png'">
                </div>
                <div class="item-name">${wonItem.name || wonItem.item_name}</div>
            `;
        }
    }
    
    // Анимируем к целевому элементу
    const itemWidth = 120; // Ширина одного элемента
    const containerWidth = rouletteLine.parentElement.offsetWidth;
    const centerOffset = containerWidth / 2 - itemWidth / 2;
    const targetOffset = targetIndex * itemWidth - centerOffset;
    
    // Добавляем случайность для реалистичности
    const randomOffset = (Math.random() - 0.5) * 40;
    const finalOffset = targetOffset + randomOffset;
    
    rouletteLine.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    rouletteLine.style.transform = `translateX(-${finalOffset}px)`;
}

// Show prize result
function showPrizeResult(item) {
    // Показываем результат в модальном окне или специальной области
    const resultContainer = document.getElementById('prizeResult');
    if (resultContainer) {
        resultContainer.innerHTML = `
            <div class="prize-modal">
                <div class="prize-content">
                    <h3>Поздравляем!</h3>
                    <div class="prize-item rarity-${item.rarity}">
                        <img src="${item.image_url || 'assets/items/default.png'}" 
                             alt="${item.name || item.item_name}"
                             onerror="this.src='assets/items/default.png'">
                        <div class="prize-name">${item.name || item.item_name}</div>
                        <div class="prize-value">
                            ${(item.stars || item.item_stars || item.value || 0).toLocaleString()} ⭐
                        </div>
                    </div>
                    <button onclick="closePrizeResult()">Продолжить</button>
                </div>
            </div>
        `;
        resultContainer.style.display = 'flex';
    }
    
    // Обновляем баланс
    updateBalance();
    
    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
}

// Close prize result modal
function closePrizeResult() {
    const resultContainer = document.getElementById('prizeResult');
    if (resultContainer) {
        resultContainer.style.display = 'none';
    }
}

// Update open button text
function updateOpenButton(text) {
    const openButton = document.getElementById('openButton');
    if (openButton) {
        openButton.textContent = text;
        openButton.disabled = isSpinning;
    }
}

// Go back function
function goBack() {
    if (window.Telegram?.WebApp?.BackButton) {
        window.Telegram.WebApp.close();
    } else {
        window.history.back();
    }
}

// Show notification (если функция не определена)
function showNotification(message, type = 'info') {
    // Простая реализация уведомлений
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#5352ed'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // API инициализация для страницы кейса
    await initializeCasePageWithAPI();
    
    // Существующая инициализация
    initializePage();
    
    // Обработчик кнопки открытия кейса
    const openButton = document.getElementById('openButton');
    if (openButton) {
        openButton.addEventListener('click', openCase);
    }
    
    // Обработчик кнопки "Назад"
    const backButton = document.querySelector('.app-logo, .back-button');
    if (backButton) {
        backButton.addEventListener('click', goBack);
    }
    
    // Обработчик клика по балансу
    const balanceWidget = document.querySelector('.balance-widget');
    if (balanceWidget) {
        balanceWidget.addEventListener('click', () => {
            window.location.href = 'balance.html';
        });
    }
});