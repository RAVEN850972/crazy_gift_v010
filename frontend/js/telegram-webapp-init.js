// Универсальная функция инициализации Telegram WebApp
function initTelegramApp() {
    if (!window.Telegram?.WebApp) {
        console.log('Telegram WebApp API недоступен');
        return;
    }

    const tg = window.Telegram.WebApp;
    
    try {
        // Базовая инициализация
        tg.ready();
        tg.expand();
        
        // Проверяем версию для BackButton (доступен с версии 6.1+)
        const version = tg.version || '6.0';
        const versionNumber = parseFloat(version);
        
        console.log(`Telegram WebApp версия: ${version}`);
        
        // BackButton доступен только с версии 6.1+
        if (versionNumber >= 6.1 && tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(goBack);
        } else {
            console.log('BackButton не поддерживается в текущей версии');
            // Добавляем альтернативную кнопку "Назад" в UI
            addFallbackBackButton();
        }
        
        // Настройка темы (безопасно для всех версий)
        if (tg.themeParams?.bg_color) {
            document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color);
        }
        
        if (tg.themeParams?.text_color) {
            document.documentElement.style.setProperty('--text-primary', tg.themeParams.text_color);
        }
        
        // MainButton скрываем по умолчанию
        if (tg.MainButton) {
            tg.MainButton.hide();
        }
        
        // Получаем данные пользователя
        if (tg.initDataUnsafe?.user) {
            window.GameState = window.GameState || {};
            window.GameState.user = tg.initDataUnsafe.user;
            console.log('Пользователь:', tg.initDataUnsafe.user);
        }
        
        // Настройка цветов интерфейса (если поддерживается)
        if (versionNumber >= 6.1 && tg.setHeaderColor) {
            try {
                tg.setHeaderColor('bg_color');
            } catch (error) {
                console.log('setHeaderColor не поддерживается:', error);
            }
        }
        
        // Включаем haptic feedback если доступен (версия 6.1+)
        if (versionNumber >= 6.1 && tg.HapticFeedback) {
            window.hapticFeedback = tg.HapticFeedback;
        }
        
        console.log('Telegram WebApp успешно инициализирован');
        
    } catch (error) {
        console.error('Ошибка инициализации Telegram WebApp:', error);
    }
}

// Добавляем fallback кнопку "Назад" для старых версий
function addFallbackBackButton() {
    // Проверяем, нужна ли кнопка "Назад" на текущей странице
    const currentPage = window.location.pathname;
    const needsBackButton = !currentPage.includes('index.html') && currentPage !== '/';
    
    if (needsBackButton) {
        // Модифицируем существующий app-logo для работы как кнопка "Назад"
        const appLogo = document.querySelector('.app-logo');
        if (appLogo && !appLogo.classList.contains('back-button-fallback')) {
            appLogo.classList.add('back-button-fallback');
            appLogo.onclick = goBack;
            
            // Добавляем визуальную индикацию что это кнопка "Назад"
            const img = appLogo.querySelector('img');
            if (img && img.src.includes('triangle_icon')) {
                img.style.transform = 'rotate(180deg)';
            }
        }
    }
}

// Универсальная функция для haptic feedback
function triggerHaptic(type = 'light') {
    try {
        // Проверяем поддержку Telegram HapticFeedback (версия 6.1+)
        if (window.hapticFeedback && window.isTelegramFeatureSupported && window.isTelegramFeatureSupported('hapticFeedback')) {
            switch(type) {
                case 'light':
                    window.hapticFeedback.impactOccurred('light');
                    break;
                case 'medium':
                    window.hapticFeedback.impactOccurred('medium');
                    break;
                case 'heavy':
                    window.hapticFeedback.impactOccurred('heavy');
                    break;
                case 'success':
                    window.hapticFeedback.notificationOccurred('success');
                    break;
                case 'error':
                    window.hapticFeedback.notificationOccurred('error');
                    break;
                case 'warning':
                    window.hapticFeedback.notificationOccurred('warning');
                    break;
            }
        } else if (navigator.vibrate && window.canUseVibration && window.canUseVibration()) {
            // Fallback на обычную вибрацию только если разрешено
            const patterns = {
                light: 50,
                medium: 100,
                heavy: 200,
                success: [100, 50, 100],
                error: [200, 100, 200],
                warning: [100, 100, 100]
            };
            navigator.vibrate(patterns[type] || 50);
        }
    } catch (error) {
        // Полностью тихо игнорируем все ошибки haptic feedback
    }
}

// Улучшенная функция goBack с haptic feedback
function goBack() {
    triggerHaptic('light');
    
    // Добавляем плавный переход
    document.body.style.opacity = '0.8';
    
    setTimeout(() => {
        // Определяем куда возвращаться
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('settings')) {
            window.location.href = 'profile.html';
        } else if (currentPage.includes('balance')) {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 200);
}

// Настройка отслеживания взаимодействия пользователя
function setupUserInteractionTracking() {
    // Инициализируем флаг как false
    window.hasUserInteracted = false;
    
    const events = ['touchstart', 'touchend', 'click', 'keydown', 'mousedown'];
    
    function markUserInteraction() {
        if (window.hasUserInteracted) return; // Предотвращаем повторное срабатывание
        
        window.hasUserInteracted = true;
        
        // Удаляем обработчики после первого взаимодействия
        events.forEach(eventType => {
            document.removeEventListener(eventType, markUserInteraction, true);
        });
        
        console.log('✅ Пользовательское взаимодействие зарегистрировано - haptic feedback активирован');
    }
    
    // Добавляем обработчики для всех типов взаимодействия
    events.forEach(eventType => {
        document.addEventListener(eventType, markUserInteraction, true);
    });
}

// Проверка поддержки различных API
function checkTelegramFeatures() {
    if (!window.Telegram?.WebApp) return {};
    
    const tg = window.Telegram.WebApp;
    const version = parseFloat(tg.version || '6.0');
    
    return {
        version: tg.version,
        backButton: version >= 6.1 && !!tg.BackButton,
        mainButton: !!tg.MainButton,
        hapticFeedback: version >= 6.1 && !!tg.HapticFeedback,
        cloudStorage: version >= 6.9 && !!tg.CloudStorage,
        biometric: version >= 7.2 && !!tg.BiometricManager,
        invoice: !!tg.openInvoice,
        share: !!tg.shareToStory,
        setHeaderColor: version >= 6.1 && !!tg.setHeaderColor
    };
}

// Логируем доступные функции при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Сначала настраиваем отслеживание взаимодействия
    setupUserInteractionTracking();
    
    // Затем логируем функции
    const features = checkTelegramFeatures();
    console.log('Доступные Telegram WebApp функции:', features);
});

// Экспорт функций для глобального использования
window.initTelegramApp = initTelegramApp;
window.triggerHaptic = triggerHaptic;
window.goBack = goBack;