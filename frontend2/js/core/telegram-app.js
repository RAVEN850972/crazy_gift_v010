/**
 * Telegram WebApp Integration
 * Универсальная система для работы с Telegram WebApp API
 */

class TelegramAppManager {
    constructor() {
        this.isAvailable = false;
        this.version = null;
        this.features = {};
        this.user = null;
        this.callbacks = new Map();
        
        this.init();
    }

    /**
     * Инициализация Telegram WebApp
     */
    init() {
        if (!window.Telegram?.WebApp) {
            console.log('Telegram WebApp API недоступен');
            this.setupFallbacks();
            return;
        }

        const tg = window.Telegram.WebApp;
        this.isAvailable = true;
        this.version = parseFloat(tg.version || '6.0');
        
        console.log(`Telegram WebApp версия: ${this.version}`);
        
        // Базовая инициализация
        try {
            tg.ready();
            tg.expand();
            
            // Определяем доступные функции
            this.features = this.detectFeatures();
            
            // Настраиваем тему
            this.setupTheme();
            
            // Настраиваем кнопки
            this.setupButtons();
            
            // Получаем данные пользователя
            this.extractUserData();
            
            // Настраиваем обработчики событий
            this.setupEventHandlers();
            
            console.log('✅ Telegram WebApp успешно инициализирован');
            
        } catch (error) {
            console.error('Ошибка инициализации Telegram WebApp:', error);
            this.setupFallbacks();
        }
    }

    /**
     * Определение доступных функций
     */
    detectFeatures() {
        const tg = window.Telegram.WebApp;
        const version = this.version;
        
        return {
            version: this.version,
            backButton: version >= 6.1 && !!tg.BackButton,
            mainButton: !!tg.MainButton,
            hapticFeedback: version >= 6.1 && !!tg.HapticFeedback,
            cloudStorage: version >= 6.9 && !!tg.CloudStorage,
            biometric: version >= 7.2 && !!tg.BiometricManager,
            invoice: !!tg.openInvoice,
            setHeaderColor: version >= 6.1,
            isSupported: version >= 6.0,
            isFullySupported: version >= 6.1
        };
    }

    /**
     * Настройка темы
     */
    setupTheme() {
        const tg = window.Telegram.WebApp;
        
        if (tg.themeParams?.bg_color) {
            document.documentElement.style.setProperty('--bg-primary', tg.themeParams.bg_color);
        }
        
        if (tg.themeParams?.text_color) {
            document.documentElement.style.setProperty('--text-primary', tg.themeParams.text_color);
        }
        
        if (tg.themeParams?.hint_color) {
            document.documentElement.style.setProperty('--text-muted', tg.themeParams.hint_color);
        }
        
        if (tg.themeParams?.button_color) {
            document.documentElement.style.setProperty('--accent-yellow', tg.themeParams.button_color);
        }
        
        // Устанавливаем цвет header если поддерживается
        if (this.features.setHeaderColor) {
            try {
                tg.setHeaderColor('bg_color');
            } catch (error) {
                console.log('setHeaderColor не поддерживается:', error);
            }
        }
    }

    /**
     * Настройка кнопок Telegram
     */
    setupButtons() {
        const tg = window.Telegram.WebApp;
        
        // BackButton
        if (this.features.backButton) {
            tg.BackButton.onClick(() => {
                this.triggerCallback('backButton');
                this.defaultBackAction();
            });
        }
        
        // MainButton (скрываем по умолчанию)
        if (this.features.mainButton) {
            tg.MainButton.hide();
        }
    }

    /**
     * Извлечение данных пользователя
     */
    extractUserData() {
        const tg = window.Telegram.WebApp;
        
        if (tg.initDataUnsafe?.user) {
            this.user = tg.initDataUnsafe.user;
            console.log('Пользователь Telegram:', this.user);
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventHandlers() {
        const tg = window.Telegram.WebApp;
        
        // Обработчик закрытия invoice
        tg.onEvent('invoiceClosed', (eventData) => {
            this.triggerCallback('invoiceClosed', eventData);
        });
        
        // Обработчик изменения темы
        tg.onEvent('themeChanged', () => {
            this.setupTheme();
            this.triggerCallback('themeChanged');
        });
        
        // Обработчик изменения viewport
        tg.onEvent('viewportChanged', (eventData) => {
            this.triggerCallback('viewportChanged', eventData);
        });
    }

    /**
     * Настройка fallback для старых версий
     */
    setupFallbacks() {
        console.log('⚠️ Настройка fallback режима');
        
        // Добавляем кнопку "Назад" для навигации
        this.addFallbackBackButton();
        
        // Показываем уведомление о совместимости
        this.showCompatibilityNotice();
    }

    /**
     * Добавление fallback кнопки "Назад"
     */
    addFallbackBackButton() {
        const currentPage = window.location.pathname;
        const needsBackButton = !currentPage.includes('index.html') && currentPage !== '/';
        
        if (needsBackButton) {
            const appLogo = document.querySelector('.app-logo');
            if (appLogo && !appLogo.classList.contains('back-button-fallback')) {
                appLogo.classList.add('back-button-fallback');
                appLogo.onclick = () => this.defaultBackAction();
                
                // Поворачиваем иконку для индикации "Назад"
                const img = appLogo.querySelector('img');
                if (img && img.src.includes('triangle_icon')) {
                    img.style.transform = 'rotate(180deg)';
                }
            }
        }
    }

    /**
     * Показ уведомления о совместимости
     */
    showCompatibilityNotice() {
        if (!this.isAvailable) {
            this.showNotice(
                '🌐 Браузерный режим',
                'Приложение работает в браузере. Некоторые функции могут быть ограничены.',
                'info',
                5000
            );
        } else if (this.version < 6.1) {
            this.showNotice(
                '⚠️ Ограниченный режим',
                `Telegram v${this.version}. Обновите до 6.1+ для полного функционала.`,
                'warning',
                6000
            );
        }
    }

    /**
     * Показ Back Button
     */
    showBackButton(callback = null) {
        if (callback) {
            this.setCallback('backButton', callback);
        }
        
        if (this.features.backButton) {
            window.Telegram.WebApp.BackButton.show();
        } else {
            this.addFallbackBackButton();
        }
    }

    /**
     * Скрытие Back Button
     */
    hideBackButton() {
        if (this.features.backButton) {
            window.Telegram.WebApp.BackButton.hide();
        }
        
        // Убираем fallback кнопку
        const backButton = document.querySelector('.back-button-fallback');
        if (backButton) {
            backButton.classList.remove('back-button-fallback');
            backButton.onclick = null;
        }
    }

    /**
     * Показ Main Button
     */
    showMainButton(text, callback = null) {
        if (!this.features.mainButton) return;
        
        const tg = window.Telegram.WebApp;
        
        if (callback) {
            tg.MainButton.onClick(callback);
        }
        
        tg.MainButton.setText(text);
        tg.MainButton.show();
    }

    /**
     * Скрытие Main Button
     */
    hideMainButton() {
        if (this.features.mainButton) {
            window.Telegram.WebApp.MainButton.hide();
        }
    }

    /**
     * Haptic Feedback
     */
    hapticFeedback(type = 'light') {
        // Проверяем поддержку Telegram HapticFeedback
        if (this.features.hapticFeedback && window.Telegram.WebApp.HapticFeedback) {
            try {
                switch(type) {
                    case 'light':
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                        break;
                    case 'medium':
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                        break;
                    case 'heavy':
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
                        break;
                    case 'success':
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                        break;
                    case 'error':
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
                        break;
                    case 'warning':
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
                        break;
                }
                return;
            } catch (error) {
                console.log('Ошибка Telegram haptic feedback:', error);
            }
        }
        
        // Fallback на обычную вибрацию
        if (navigator.vibrate && window.hasUserInteracted) {
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
    }

    /**
     * Открытие Invoice
     */
    openInvoice(invoiceLink, callback = null) {
        if (!this.features.invoice) {
            // Fallback - открываем в новом окне
            window.open(invoiceLink, '_blank');
            return;
        }
        
        if (callback) {
            this.setCallback('invoiceClosed', callback);
        }
        
        window.Telegram.WebApp.openInvoice(invoiceLink);
    }

    /**
     * Отправка данных в бота
     */
    sendData(data) {
        if (this.isAvailable) {
            window.Telegram.WebApp.sendData(JSON.stringify(data));
        } else {
            console.log('Данные для отправки в бота:', data);
        }
    }

    /**
     * Закрытие приложения
     */
    close() {
        if (this.isAvailable) {
            window.Telegram.WebApp.close();
        } else {
            window.close();
        }
    }

    /**
     * Открытие ссылки
     */
    openLink(url) {
        if (this.isAvailable) {
            window.Telegram.WebApp.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    /**
     * Открытие Telegram ссылки
     */
    openTelegramLink(url) {
        if (this.isAvailable) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    /**
     * Установка callback функций
     */
    setCallback(event, callback) {
        this.callbacks.set(event, callback);
    }

    /**
     * Вызов callback функции
     */
    triggerCallback(event, data = null) {
        const callback = this.callbacks.get(event);
        if (callback && typeof callback === 'function') {
            callback(data);
        }
    }

    /**
     * Действие по умолчанию для кнопки "Назад"
     */
    defaultBackAction() {
        this.hapticFeedback('light');
        
        // Добавляем плавный переход
        document.body.style.opacity = '0.8';
        
        setTimeout(() => {
            const currentPage = window.location.pathname;
            
            if (currentPage.includes('settings')) {
                window.location.href = 'profile.html';
            } else if (currentPage.includes('balance') || 
                      currentPage.includes('case-detail') ||
                      currentPage.includes('upgrade')) {
                window.location.href = 'index.html';
            } else if (currentPage.includes('profile')) {
                window.location.href = 'index.html';
            } else {
                window.history.back();
            }
        }, 200);
    }

    /**
     * Показ уведомления
     */
    showNotice(title, message, type = 'info', duration = 4000) {
        const notice = document.createElement('div');
        notice.className = `telegram-version-notice telegram-version-notice-${type}`;
        
        const colors = {
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
            info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            success: 'linear-gradient(135deg, #10b981, #059669)'
        };

        notice.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            z-index: 9999;
            background: ${colors[type] || colors.info};
            border-radius: 12px;
            padding: 16px 20px;
            color: white;
            font-size: 13px;
            line-height: 1.4;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transform: translateY(-100px);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
            max-width: 400px;
            margin: 0 auto;
        `;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight: 600; margin-bottom: 4px; font-size: 14px;';
        titleEl.textContent = title;

        const messageEl = document.createElement('div');
        messageEl.style.cssText = 'opacity: 0.9;';
        messageEl.textContent = message;

        notice.appendChild(titleEl);
        notice.appendChild(messageEl);
        document.body.appendChild(notice);

        // Анимация появления
        setTimeout(() => {
            notice.style.transform = 'translateY(0)';
            notice.style.opacity = '1';
        }, 100);

        // Автоскрытие
        setTimeout(() => {
            notice.style.transform = 'translateY(-100px)';
            notice.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notice)) {
                    document.body.removeChild(notice);
                }
            }, 500);
        }, duration);
    }

    /**
     * Получение информации о пользователе
     */
    getUser() {
        return this.user;
    }

    /**
     * Получение информации о функциях
     */
    getFeatures() {
        return this.features;
    }

    /**
     * Проверка поддержки функции
     */
    isFeatureSupported(featureName) {
        return this.features[featureName] || false;
    }

    /**
     * Получение версии
     */
    getVersion() {
        return this.version;
    }

    /**
     * Проверка доступности Telegram WebApp
     */
    isAvailableAPI() {
        return this.isAvailable;
    }

    /**
     * Расширение до полного экрана
     */
    expand() {
        if (this.isAvailable) {
            window.Telegram.WebApp.expand();
        }
    }

    /**
     * Получение инициализационных данных
     */
    getInitData() {
        if (this.isAvailable) {
            return window.Telegram.WebApp.initData;
        }
        return null;
    }

    /**
     * Получение параметров запуска
     */
    getStartParam() {
        if (this.isAvailable && window.Telegram.WebApp.initDataUnsafe) {
            return window.Telegram.WebApp.initDataUnsafe.start_param;
        }
        return null;
    }

    /**
     * Cloud Storage (если поддерживается)
     */
    async setCloudStorage(key, value) {
        if (!this.features.cloudStorage) {
            // Fallback на localStorage
            localStorage.setItem(`tg_cloud_${key}`, value);
            return;
        }
        
        return new Promise((resolve, reject) => {
            window.Telegram.WebApp.CloudStorage.setItem(key, value, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        });
    }

    async getCloudStorage(key) {
        if (!this.features.cloudStorage) {
            // Fallback на localStorage
            return localStorage.getItem(`tg_cloud_${key}`);
        }
        
        return new Promise((resolve, reject) => {
            window.Telegram.WebApp.CloudStorage.getItem(key, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        });
    }
}

// Создаем глобальный экземпляр
window.telegramApp = new TelegramAppManager();

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramAppManager;
}

// Устаревшие алиасы для совместимости
window.initTelegramApp = () => window.telegramApp.init();
window.triggerHaptic = (type) => window.telegramApp.hapticFeedback(type);
window.goBack = () => window.telegramApp.defaultBackAction();