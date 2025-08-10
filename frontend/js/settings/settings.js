// ===================================================================
// settings.js - Исправленная версия с минимальной API интеграцией
// ===================================================================

// === МИНИМАЛЬНАЯ API ИНТЕГРАЦИЯ ===

/**
 * Инициализация страницы настроек с API
 */
async function initializeSettingsPageWithAPI() {
    try {
        // Обновляем баланс
        await updateBalanceFromAPI();
        
        // Загружаем настройки пользователя (если есть в API)
        await loadUserSettingsFromAPI();
        
        console.log('✅ Страница настроек инициализирована');
        
    } catch (error) {
        console.error('Ошибка инициализации страницы настроек:', error);
    }
}

/**
 * Загрузка настроек пользователя из API (опционально)
 */
async function loadUserSettingsFromAPI() {
    if (window.GameState?.demoMode) {
        console.log('⚠️ Настройки пользователя недоступны в демо режиме');
        return;
    }
    
    try {
        // В будущем здесь можно загружать персональные настройки
        // const userSettings = await window.apiClient.getUserSettings(window.GameState.currentUserId);
        // mergeSettings(userSettings);
        
    } catch (error) {
        console.warn('Не удалось загрузить настройки пользователя:', error);
    }
}

/**
 * Обновление баланса (используем общую функцию)
 */
async function updateBalanceFromAPI() {
    if (typeof updateBalanceWithAPI === 'function') {
        await updateBalanceWithAPI();
    }
}

// === СУЩЕСТВУЮЩИЙ КОД (с минимальными изменениями) ===

// Settings State
let settings = {
    sound: true,
    vibration: false,
    language: 'ru', // Изменено с 'en' на 'ru'
    referralCode: null // Будет генерироваться динамически
};

// Initialize page
function initPage() {
    initTelegramApp();
    updateBalance();
    loadSettings();
    updateUI();
    generateReferralCode(); // Добавлено
    
    // Показываем уведомление о версии если нужно
    showVersionNotice();
}

/**
 * Генерация реферального кода
 * ОБНОВЛЕНО: теперь использует API или локальную генерацию
 */
function generateReferralCode() {
    if (window.GameState?.demoMode || !window.GameState?.currentUserId) {
        // В демо режиме генерируем локально
        settings.referralCode = 'DEMO' + Math.random().toString(36).substr(2, 6).toUpperCase();
    } else {
        // В API режиме используем ID пользователя
        settings.referralCode = 'CG' + window.GameState.currentUserId.toString().padStart(6, '0');
    }
    
    // Обновляем отображение реферального кода
    updateReferralCodeDisplay();
}

/**
 * Обновление отображения реферального кода
 */
function updateReferralCodeDisplay() {
    const referralElements = document.querySelectorAll('.referral-code, .invite-code');
    referralElements.forEach(element => {
        if (element && settings.referralCode) {
            element.textContent = settings.referralCode;
        }
    });
}

// Показать уведомление о совместимости версии
function showVersionNotice() {
    if (window.Telegram?.WebApp) {
        const version = parseFloat(window.Telegram.WebApp.version || '6.0');
        if (version < 6.1) {
            const notice = document.createElement('div');
            notice.className = 'telegram-fallback-notice';
            notice.textContent = `Telegram версия ${window.Telegram.WebApp.version}. Некоторые функции могут быть ограничены.`;
            document.body.appendChild(notice);
            
            setTimeout(() => {
                if (document.body.contains(notice)) {
                    document.body.removeChild(notice);
                }
            }, 4000);
        }
    }
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    
    // В будущем можно синхронизировать с API
    // if (!window.GameState?.demoMode) {
    //     syncSettingsWithAPI();
    // }
}

// Update UI based on current settings
function updateUI() {
    // Update toggle switches
    const soundToggle = document.getElementById('soundToggle');
    const vibrationToggle = document.getElementById('vibrationToggle');
    
    if (soundToggle) {
        if (settings.sound) {
            soundToggle.classList.add('active');
            soundToggle.parentElement.classList.add('active');
        } else {
            soundToggle.classList.remove('active');
            soundToggle.parentElement.classList.remove('active');
        }
    }
    
    if (vibrationToggle) {
        if (settings.vibration) {
            vibrationToggle.classList.add('active');
            vibrationToggle.parentElement.classList.add('active');
        } else {
            vibrationToggle.classList.remove('active');
            vibrationToggle.parentElement.classList.remove('active');
        }
    }
    
    // Обновляем реферальный код
    updateReferralCodeDisplay();
}

// Toggle sound setting
function toggleSound() {
    settings.sound = !settings.sound;
    updateUI();
    saveSettings();
    
    // Play feedback sound if enabled
    if (settings.sound) {
        playSound('toggle');
    }
    
    // Haptic feedback
    triggerHaptic('light');
    
    showNotification(settings.sound ? 'Звук включен' : 'Звук выключен', 'info');
}

// Toggle vibration setting
function toggleVibration() {
    settings.vibration = !settings.vibration;
    updateUI();
    saveSettings();
    
    // Vibrate if enabled
    if (settings.vibration) {
        triggerHaptic('medium');
    }
    
    showNotification(settings.vibration ? 'Вибрация включена' : 'Вибрация выключена', 'info');
}

// Copy referral link
function copyReferralLink() {
    if (!settings.referralCode) {
        generateReferralCode();
    }
    
    const referralLink = `https://t.me/CrazyGiftBot?start=${settings.referralCode}`;
    
    // Try to copy to clipboard
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(referralLink).then(() => {
            showNotification('Ссылка скопирована!', 'success');
            triggerHaptic('light');
        }).catch(() => {
            fallbackCopyText(referralLink);
        });
    } else {
        fallbackCopyText(referralLink);
    }
}

// Fallback copy method
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('Ссылка скопирована!', 'success');
        triggerHaptic('light');
    } catch (err) {
        showNotification('Не удалось скопировать', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Invite friends
function inviteFriends() {
    if (!settings.referralCode) {
        generateReferralCode();
    }
    
    const referralLink = `https://t.me/CrazyGiftBot?start=${settings.referralCode}`;
    const message = `🎁 Попробуй CrazyGift - открывай кейсы и выигрывай призы!\n\n${referralLink}`;
    
    if (window.Telegram?.WebApp) {
        // Используем Telegram Share API если доступен
        if (window.Telegram.WebApp.openTelegramLink) {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;
            window.Telegram.WebApp.openTelegramLink(shareUrl);
        } else {
            // Fallback - копируем в буфер
            copyReferralLink();
        }
    } else {
        // Веб версия - открываем стандартный share
        if (navigator.share) {
            navigator.share({
                title: 'CrazyGift',
                text: message,
                url: referralLink
            });
        } else {
            copyReferralLink();
        }
    }
    
    triggerHaptic('medium');
}

// Show promo code modal
function showPromoModal() {
    const modal = document.getElementById('promoModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Focus на input
        const input = modal.querySelector('input');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    }
    
    triggerHaptic('light');
}

// Close promo code modal
function closePromoModal() {
    const modal = document.getElementById('promoModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Очищаем input
        const input = modal.querySelector('input');
        if (input) {
            input.value = '';
            input.classList.remove('error');
        }
    }
}

// Apply promo code
async function applyPromoCode() {
    const input = document.querySelector('#promoModal input');
    if (!input) return;
    
    const promoCode = input.value.trim().toUpperCase();
    
    if (!promoCode) {
        input.classList.add('error');
        showNotification('Введите промокод', 'error');
        return;
    }
    
    try {
        // В API режиме отправляем на сервер
        if (!window.GameState?.demoMode && window.apiClient) {
            // В будущем можно добавить API для промокодов
            // const result = await window.apiClient.applyPromoCode(window.GameState.currentUserId, promoCode);
            // if (result.success) { ... }
        }
        
        // Пока что простая проверка промокодов
        const validPromoCodes = ['GIFT2025', 'WELCOME', 'BONUS100'];
        
        if (validPromoCodes.includes(promoCode)) {
            closePromoModal();
            showNotification('Промокод применен! +100 звёзд', 'success');
            
            // Добавляем бонус к балансу
            if (window.GameState?.demoMode) {
                const newBalance = window.GameState.balance + 100;
                window.GameState.updateBalance(newBalance);
            }
            
            triggerHaptic('success');
        } else {
            input.classList.add('error');
            showNotification('Неверный промокод', 'error');
            triggerHaptic('error');
        }
        
    } catch (error) {
        console.error('Ошибка применения промокода:', error);
        showNotification('Ошибка применения промокода', 'error');
        input.classList.add('error');
    }
}

// Show language modal
function showLanguageModal() {
    const modal = document.getElementById('languageModal');
    if (modal) {
        modal.style.display = 'flex';
    }
    
    triggerHaptic('light');
}

// Close language modal
function closeLanguageModal() {
    const modal = document.getElementById('languageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Change language
function changeLanguage(lang) {
    settings.language = lang;
    saveSettings();
    closeLanguageModal();
    
    // В реальном приложении здесь была бы смена языка интерфейса
    showNotification('Язык изменен', 'success');
    triggerHaptic('light');
}

// Clear game data
function clearGameData() {
    const confirmed = confirm('Вы уверены что хотите очистить все данные игры? Это действие нельзя отменить.');
    
    if (confirmed) {
        // Очищаем localStorage
        localStorage.removeItem('gameSettings');
        localStorage.removeItem('gameData');
        localStorage.removeItem('userInventory');
        
        showNotification('Данные очищены', 'success');
        
        // Перезагружаем страницу
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
    
    triggerHaptic('medium');
}

// Connect TON wallet
async function connectTonWallet() {
    try {
        if (window.tonConnectUI) {
            await window.tonConnectUI.connectWallet();
            showNotification('TON кошелек подключен', 'success');
        } else {
            showNotification('TON Connect недоступен', 'error');
        }
    } catch (error) {
        console.error('Ошибка подключения TON кошелька:', error);
        showNotification('Ошибка подключения кошелька', 'error');
    }
    
    triggerHaptic('light');
}

// Initialize Telegram WebApp
function initTelegramApp() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Настройка заголовка
        if (tg.setHeaderColor) {
            tg.setHeaderColor('bg_color');
        }
        
        // Настройка кнопки "Назад"
        if (tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(goBack);
        }
        
        // Скрываем основную кнопку
        if (tg.MainButton) {
            tg.MainButton.hide();
        }
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
        window.location.href = 'profile.html';
    }
}

// Play sound effect
function playSound(soundType) {
    if (!settings.sound) return;
    
    // Простая реализация звуковых эффектов
    try {
        const audio = new Audio(`assets/sounds/${soundType}.mp3`);
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Игнорируем ошибки воспроизведения
        });
    } catch (error) {
        // Звуки недоступны
    }
}

// Trigger haptic feedback
function triggerHaptic(type = 'light') {
    if (!settings.vibration || !window.hasUserInteracted) return;
    
    if (window.Telegram?.WebApp?.HapticFeedback) {
        const hf = window.Telegram.WebApp.HapticFeedback;
        
        switch (type) {
            case 'light':
                hf.impactOccurred('light');
                break;
            case 'medium':
                hf.impactOccurred('medium');
                break;
            case 'heavy':
                hf.impactOccurred('heavy');
                break;
            case 'success':
                hf.notificationOccurred('success');
                break;
            case 'error':
                hf.notificationOccurred('error');
                break;
            default:
                hf.impactOccurred('light');
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
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

// Simulate referral data loading
function loadReferralData() {
    let referralData;
    
    if (window.GameState?.demoMode) {
        // Демо данные
        referralData = {
            friendsInvited: 5,
            totalEarnings: 500,
            pendingRewards: 100
        };
    } else {
        // В API режиме можно загружать реальные данные
        referralData = {
            friendsInvited: 0,
            totalEarnings: 0,
            pendingRewards: 0
        };
    }
    
    // Update UI with referral data
    const statValue = document.querySelector('.stat-value');
    if (statValue) {
        statValue.textContent = referralData.friendsInvited;
    }
    
    const earningsElements = document.querySelectorAll('.earnings-amount');
    earningsElements.forEach(element => {
        element.textContent = referralData.totalEarnings.toLocaleString();
    });
}

// Event listeners
document.addEventListener('keydown', (e) => {
    // ESC для закрытия модальных окон
    if (e.key === 'Escape') {
        closePromoModal();
        closeLanguageModal();
    }
    
    // Enter для применения промокода
    if (e.key === 'Enter') {
        const promoModal = document.getElementById('promoModal');
        if (promoModal && promoModal.style.display === 'flex') {
            applyPromoCode();
        }
    }
});

// Handle modal backdrop clicks
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.closest('#promoModal')) {
            closePromoModal();
        } else if (e.target.closest('#languageModal')) {
            closeLanguageModal();
        }
    }
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // API инициализация для страницы настроек (ДОБАВЛЕНО)
    await initializeSettingsPageWithAPI();
    
    // Существующая инициализация
    initPage();
    loadReferralData();
    
    // Add subtle entrance animations
    setTimeout(() => {
        document.querySelectorAll('.settings-section').forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 100);
    
    // Обработчики для кнопок и элементов
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', toggleSound);
    }
    
    const vibrationToggle = document.getElementById('vibrationToggle');
    if (vibrationToggle) {
        vibrationToggle.addEventListener('click', toggleVibration);
    }
    
    // Навигация
    const backButton = document.querySelector('.app-logo, .back-button');
    if (backButton) {
        backButton.addEventListener('click', goBack);
    }
    
    const balanceWidget = document.querySelector('.balance-widget');
    if (balanceWidget) {
        balanceWidget.addEventListener('click', () => {
            window.location.href = 'balance.html';
        });
    }
});