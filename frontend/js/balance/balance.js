// ===================================================================
// balance.js - Исправленная версия с API интеграцией
// ===================================================================

// === API ИНТЕГРАЦИЯ ДЛЯ ПЛАТЕЖЕЙ ===

/**
 * Инициализация страницы пополнения с API
 */
async function initializeBalancePageWithAPI() {
    try {
        // Обновляем текущий баланс
        await updateBalanceFromAPI();
        
        // Инициализируем платежные провайдеры
        initializePaymentProviders();
        
        // Обновляем курсы валют
        await updateExchangeRates();
        
        console.log('✅ Страница пополнения инициализирована');
        
    } catch (error) {
        console.error('Ошибка инициализации страницы пополнения:', error);
    }
}

/**
 * Инициализация платежных провайдеров
 */
function initializePaymentProviders() {
    // TON Connect инициализация (если доступен)
    if (window.TonConnect) {
        console.log('✅ TON Connect доступен');
    }
    
    // Telegram WebApp платежи
    if (window.Telegram?.WebApp) {
        console.log('✅ Telegram WebApp платежи доступны');
        setupTelegramPaymentHandlers();
    }
}

/**
 * ПЕРЕОПРЕДЕЛЕНИЕ функции processStarsPayment()
 */
window.processStarsPayment = async function(starsAmount) {
    if (!starsAmount || starsAmount <= 0) {
        showNotification('Неверное количество звёзд', 'error');
        return false;
    }
    
    // Валидация суммы
    const validation = validatePaymentAmount(starsAmount, 'stars');
    if (!validation.valid) {
        showNotification(validation.message, 'error');
        return false;
    }
    
    try {
        // Показываем лоадер
        showPaymentLoader('stars');
        
        // Используем обертку для создания Stars платежа
        const result = await createStarsPaymentWithAPI(starsAmount);
        
        if (result.success) {
            // Если есть ссылка на инвойс, открываем её
            if (result.invoice_link && result.invoice_link !== '#demo') {
                if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.openInvoice(result.invoice_link);
                } else {
                    window.open(result.invoice_link, '_blank');
                }
            }
            
            // Показываем успешное уведомление
            showNotification(`Инвойс на ${starsAmount} звёзд создан`, 'success');
            
            return true;
        } else {
            throw new Error(result.message || 'Не удалось создать платеж');
        }
        
    } catch (error) {
        console.error('Ошибка Stars платежа:', error);
        showNotification(error.message || 'Ошибка при создании платежа', 'error');
        return false;
    } finally {
        hidePaymentLoader('stars');
    }
};

/**
 * ПЕРЕОПРЕДЕЛЕНИЕ функции processTonPayment()
 */
window.processTonPayment = async function(tonAmount) {
    if (!tonAmount || tonAmount <= 0) {
        showNotification('Неверная сумма TON', 'error');
        return false;
    }
    
    // Валидация суммы
    const validation = validatePaymentAmount(tonAmount, 'ton');
    if (!validation.valid) {
        showNotification(validation.message, 'error');
        return false;
    }
    
    try {
        // Показываем лоадер
        showPaymentLoader('ton');
        
        // Используем обертку для создания TON платежа
        const result = await createTonPaymentWithAPI(tonAmount);
        
        if (result.success) {
            // Если есть транзакция для TON Connect
            if (result.ton_transaction && window.tonConnectUI) {
                try {
                    await window.tonConnectUI.sendTransaction(result.ton_transaction);
                    
                    showNotification('Транзакция отправлена в блокчейн', 'info');
                    
                    // Симуляция подтверждения для демо
                    setTimeout(() => {
                        simulatePaymentConfirmation(result.transaction_id, tonAmount);
                    }, 5000);
                    
                } catch (tonError) {
                    console.error('Ошибка TON транзакции:', tonError);
                    throw new Error('Пользователь отменил транзакцию');
                }
            } else {
                // Демо режим или TON Connect недоступен
                showNotification(`Демо TON платеж на ${tonAmount} TON`, 'info');
                
                // Симуляция успешного платежа в демо режиме
                setTimeout(() => {
                    simulatePaymentConfirmation('demo_' + Date.now(), tonAmount);
                }, 3000);
            }
            
            return true;
        } else {
            throw new Error(result.message || 'Не удалось создать TON транзакцию');
        }
        
    } catch (error) {
        console.error('Ошибка TON платежа:', error);
        showNotification(error.message || 'Ошибка при создании TON платежа', 'error');
        return false;
    } finally {
        hidePaymentLoader('ton');
    }
};

/**
 * Симуляция подтверждения платежа
 */
function simulatePaymentConfirmation(transactionId, amount) {
    // Обновляем баланс
    const starsToAdd = window.GameState?.demoMode ? 
        Math.floor(amount * 100) : // В демо режиме 1 TON = 100 stars
        0; // В API режиме баланс обновится с сервера
    
    if (window.GameState?.demoMode && starsToAdd > 0) {
        const newBalance = window.GameState.balance + starsToAdd;
        window.GameState.updateBalance(newBalance);
    }
    
    // Показываем успешное уведомление
    showNotification('Платеж успешно подтвержден!', 'success');
    
    // Обновляем баланс с сервера (если не в демо режиме)
    if (!window.GameState?.demoMode) {
        setTimeout(() => updateBalanceFromAPI(), 2000);
    }
}

/**
 * Показать лоадер платежа
 */
function showPaymentLoader(paymentType) {
    const buttonSelector = paymentType === 'stars' ? 
        '.stars-payment-button, .btn-stars' : 
        '.ton-payment-button, .btn-ton';
    
    const button = document.querySelector(buttonSelector);
    if (button) {
        button.textContent = paymentType === 'stars' ? 
            'Создаём инвойс...' : 
            'Создаём транзакцию...';
        button.disabled = true;
    }
    
    // Показываем глобальный лоадер если есть
    if (typeof showLoadingModal === 'function') {
        showLoadingModal();
    }
}

/**
 * Скрыть лоадер платежа
 */
function hidePaymentLoader(paymentType) {
    const buttonSelector = paymentType === 'stars' ? 
        '.stars-payment-button, .btn-stars' : 
        '.ton-payment-button, .btn-ton';
    
    const button = document.querySelector(buttonSelector);
    if (button) {
        button.textContent = paymentType === 'stars' ? 
            'Купить звёзды' : 
            'Пополнить TON';
        button.disabled = false;
    }
    
    // Скрываем глобальный лоадер если есть
    if (typeof hideLoadingModal === 'function') {
        hideLoadingModal();
    }
}

/**
 * Обработчик Telegram платежных событий
 */
function setupTelegramPaymentHandlers() {
    if (window.Telegram?.WebApp) {
        // Обработчик закрытия инвойса
        window.Telegram.WebApp.onEvent('invoiceClosed', (eventData) => {
            console.log('Invoice closed:', eventData);
            
            if (eventData.status === 'paid') {
                showNotification('Платеж успешен!', 'success');
                
                // Обновляем баланс через некоторое время
                setTimeout(() => {
                    if (!window.GameState?.demoMode) {
                        updateBalanceFromAPI();
                    }
                }, 3000);
            } else if (eventData.status === 'cancelled') {
                showNotification('Платеж отменён', 'info');
            } else if (eventData.status === 'failed') {
                showNotification('Ошибка платежа', 'error');
            }
        });
        
        console.log('✅ Telegram платежные обработчики настроены');
    }
}

/**
 * Валидация суммы платежа
 */
function validatePaymentAmount(amount, type) {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
        return { valid: false, message: 'Неверная сумма' };
    }
    
    if (type === 'stars') {
        if (numAmount < 1 || numAmount > 100000) {
            return { valid: false, message: 'Сумма должна быть от 1 до 100,000 звёзд' };
        }
    } else if (type === 'ton') {
        if (numAmount < 0.01 || numAmount > 1000) {
            return { valid: false, message: 'Сумма должна быть от 0.01 до 1000 TON' };
        }
    }
    
    return { valid: true };
}

/**
 * Получение текущих курсов валют
 */
async function updateExchangeRates() {
    try {
        // В реальном приложении здесь можно получать актуальные курсы
        const rates = {
            ton_to_stars: 100, // 1 TON = 100 Stars
            stars_to_ton: 0.01 // 1 Star = 0.01 TON
        };
        
        // Обновляем курсы в UI
        updateRatesInUI(rates);
        
    } catch (error) {
        console.error('Ошибка обновления курсов:', error);
    }
}

/**
 * Обновление курсов в интерфейсе
 */
function updateRatesInUI(rates) {
    const rateElements = document.querySelectorAll('.exchange-rate, .rate-info');
    rateElements.forEach(element => {
        if (element.dataset.rate === 'ton_to_stars') {
            element.textContent = `1 TON = ${rates.ton_to_stars} Stars`;
        }
    });
}

// === СУЩЕСТВУЮЩИЙ КОД (с изменениями) ===

// Global variables
let currentPaymentMethod = 'stars';
let isProcessingPayment = false;

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
        
        // Настройка кнопки "Назад"
        if (tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(goBack);
        }
    }
}

// Payment method selection
function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    
    // Обновляем активный метод в UI
    document.querySelectorAll('.payment-method').forEach(methodEl => {
        methodEl.classList.remove('active');
        if (methodEl.dataset.method === method) {
            methodEl.classList.add('active');
        }
    });
    
    // Показываем соответствующую форму
    document.querySelectorAll('.payment-form').forEach(form => {
        form.style.display = 'none';
    });
    
    const activeForm = document.querySelector(`[data-form="${method}"]`);
    if (activeForm) {
        activeForm.style.display = 'block';
    }
}

// Handle preset amount buttons
function selectPresetAmount(amount, type) {
    const input = document.querySelector(`input[data-type="${type}"]`);
    if (input) {
        input.value = amount;
        
        // Подсвечиваем выбранную кнопку
        const container = input.closest('.payment-form');
        if (container) {
            container.querySelectorAll('.preset-amount').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            event.target.classList.add('selected');
        }
    }
}

// Process payment based on current method
async function processPayment() {
    if (isProcessingPayment) return;
    
    const input = document.querySelector(`input[data-type="${currentPaymentMethod}"]`);
    if (!input) return;
    
    const amount = parseFloat(input.value);
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    isProcessingPayment = true;
    
    try {
        let success = false;
        
        if (currentPaymentMethod === 'stars') {
            success = await processStarsPayment(amount);
        } else if (currentPaymentMethod === 'ton') {
            success = await processTonPayment(amount);
        }
        
        if (success) {
            // Очищаем форму
            input.value = '';
            
            // Убираем выделение с preset кнопок
            document.querySelectorAll('.preset-amount').forEach(btn => {
                btn.classList.remove('selected');
            });
        }
        
    } catch (error) {
        console.error('Payment processing error:', error);
        showNotification('Ошибка обработки платежа', 'error');
    } finally {
        isProcessingPayment = false;
    }
}

// Update balance display
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

function navigateToHome() {
    window.location.href = 'index.html';
}

function navigateToProfile() {
    window.location.href = 'profile.html';
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

// Show/hide loading modal
function showLoadingModal(message = 'Обработка платежа...') {
    let modal = document.getElementById('loadingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loadingModal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="loader-spinner"></div>
                    <div class="loading-message">${message}</div>
                </div>
            </div>
        `;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
}

function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Input validation and formatting
function formatCurrencyInput(input, type) {
    let value = input.value.replace(/[^0-9.]/g, '');
    
    // Ограничиваем количество знаков после запятой
    if (type === 'ton') {
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts[1];
        }
        if (parts[1] && parts[1].length > 4) {
            value = parts[0] + '.' + parts[1].substring(0, 4);
        }
    } else if (type === 'stars') {
        value = value.split('.')[0]; // Только целые числа для звёзд
    }
    
    input.value = value;
}

// Calculate equivalent amounts
function calculateEquivalent(amount, fromType) {
    const rates = {
        ton_to_stars: 100,
        stars_to_ton: 0.01
    };
    
    if (fromType === 'ton') {
        return Math.floor(amount * rates.ton_to_stars);
    } else if (fromType === 'stars') {
        return (amount * rates.stars_to_ton).toFixed(4);
    }
    
    return 0;
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // API инициализация для страницы пополнения
    await initializeBalancePageWithAPI();
    
    // Существующая инициализация
    initTelegramApp();
    updateBalance();
    
    // Выбираем Stars как метод по умолчанию
    selectPaymentMethod('stars');
    
    // Обработчики методов платежа
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', () => {
            selectPaymentMethod(method.dataset.method);
        });
    });
    
    // Обработчики preset кнопок
    document.querySelectorAll('.preset-amount').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const amount = btn.dataset.amount;
            const type = btn.dataset.type;
            selectPresetAmount(amount, type);
        });
    });
    
    // Обработчики форм
    document.querySelectorAll('.payment-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            processPayment();
        });
    });
    
    // Форматирование ввода
    document.querySelectorAll('input[data-type]').forEach(input => {
        input.addEventListener('input', () => {
            formatCurrencyInput(input, input.dataset.type);
            
            // Показываем эквивалент в другой валюте
            const equivalent = calculateEquivalent(parseFloat(input.value) || 0, input.dataset.type);
            const equivalentElement = input.parentElement.querySelector('.equivalent-amount');
            if (equivalentElement) {
                if (input.dataset.type === 'ton') {
                    equivalentElement.textContent = `≈ ${equivalent} звёзд`;
                } else {
                    equivalentElement.textContent = `≈ ${equivalent} TON`;
                }
            }
        });
    });
    
    // Навигация
    const backButton = document.querySelector('.app-logo, .back-button');
    if (backButton) {
        backButton.addEventListener('click', goBack);
    }
    
    const homeButton = document.querySelector('.home-button');
    if (homeButton) {
        homeButton.addEventListener('click', navigateToHome);
    }
    
    // Обновление баланса каждые 30 секунд
    setInterval(() => {
        if (!window.GameState?.demoMode && window.GameState?.authenticated) {
            updateBalance();
        }
    }, 30000);
});