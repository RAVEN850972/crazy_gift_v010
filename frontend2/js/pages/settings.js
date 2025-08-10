/**
 * Settings Page Script
 * Страница настроек приложения
 */

class SettingsPageManager {
    constructor() {
        this.settings = {};
        this.hasChanges = false;
        this.apiAvailable = false;
        
        this.init();
    }

    async init() {
        console.log('⚙️ Инициализация страницы настроек...');
        
        try {
            this.apiAvailable = await window.apiClient.checkAvailability();
            this.setupBackButton();
            await this.loadSettings();
            this.setupUI();
            this.setupEventListeners();
            
            console.log('✅ Страница настроек инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации страницы настроек:', error);
            this.setupFallbackMode();
        }
    }

    setupBackButton() {
        if (window.telegramApp?.isAvailableAPI()) {
            window.telegramApp.showBackButton(() => {
                if (this.hasChanges) {
                    this.confirmExit();
                } else {
                    window.Utils.URL.navigateTo('profile.html');
                }
            });
        }
    }

    async loadSettings() {
        try {
            if (window.gameStorage) {
                this.settings = await window.gameStorage.loadSettings();
            } else {
                this.settings = this.getDefaultSettings();
            }
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            sound: true,
            vibration: false,
            notifications: true,
            language: 'en',
            autoSync: true,
            dataUsage: 'wifi',
            theme: 'auto'
        };
    }

    setupUI() {
        this.updateGeneralSettings();
        this.updateNotificationSettings();
        this.updatePrivacySettings();
        this.updateAboutSection();
    }

    updateGeneralSettings() {
        // Звук
        const soundToggle = document.querySelector('[data-setting="sound"]');
        if (soundToggle) {
            this.updateToggle(soundToggle, this.settings.sound);
        }

        // Вибрация
        const vibrationToggle = document.querySelector('[data-setting="vibration"]');
        if (vibrationToggle) {
            this.updateToggle(vibrationToggle, this.settings.vibration);
        }

        // Язык
        const languageValue = document.querySelector('.language-value');
        if (languageValue) {
            const languages = {
                'en': 'English',
                'ru': 'Русский',
                'es': 'Español', 
                'fr': 'Français'
            };
            languageValue.textContent = languages[this.settings.language] || 'English';
        }

        // Автосинхронизация
        const autoSyncToggle = document.querySelector('[data-setting="autoSync"]');
        if (autoSyncToggle) {
            this.updateToggle(autoSyncToggle, this.settings.autoSync);
        }
    }

    updateNotificationSettings() {
        const notificationToggles = {
            'notifications': this.settings.notifications,
            'caseUpdates': this.settings.caseUpdates !== false,
            'prizeAlerts': this.settings.prizeAlerts !== false,
            'referralNews': this.settings.referralNews !== false
        };

        Object.entries(notificationToggles).forEach(([setting, value]) => {
            const toggle = document.querySelector(`[data-notification="${setting}"]`);
            if (toggle) {
                this.updateToggle(toggle, value);
            }
        });
    }

    updatePrivacySettings() {
        const privacyToggles = {
            'shareStats': this.settings.shareStats !== false,
            'allowAnalytics': this.settings.allowAnalytics !== false
        };

        Object.entries(privacyToggles).forEach(([setting, value]) => {
            const toggle = document.querySelector(`[data-privacy="${setting}"]`);
            if (toggle) {
                this.updateToggle(toggle, value);
            }
        });
    }

    updateAboutSection() {
        // Версия приложения
        const versionElement = document.querySelector('.app-version');
        if (versionElement) {
            versionElement.textContent = 'v1.0.0 Beta';
        }

        // Информация о Telegram WebApp
        const telegramInfo = document.querySelector('.telegram-info');
        if (telegramInfo && window.telegramApp) {
            const features = window.telegramApp.getFeatures();
            telegramInfo.innerHTML = `
                <div class="settings-item-label">Telegram WebApp</div>
                <div class="settings-item-description">
                    Версия: ${features.version}<br>
                    Поддержка: ${features.isFullySupported ? 'Полная' : 'Частичная'}
                </div>
            `;
        }
    }

    updateToggle(toggle, value) {
        if (value) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }

    setupEventListeners() {
        // Основные настройки
        this.setupGeneralToggles();
        
        // Настройки уведомлений
        this.setupNotificationToggles();
        
        // Настройки приватности
        this.setupPrivacyToggles();
        
        // Селектор языка
        this.setupLanguageSelector();
        
        // Кнопки действий
        this.setupActionButtons();
        
        // Отслеживание изменений
        this.setupChangeTracking();
    }

    setupGeneralToggles() {
        const toggles = document.querySelectorAll('[data-setting]');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const setting = toggle.dataset.setting;
                const currentValue = this.settings[setting];
                const newValue = !currentValue;
                
                this.updateSetting(setting, newValue);
                this.updateToggle(toggle, newValue);
                
                window.haptic?.ui.toggleOn();
                this.showSaveIndicator();
            });
        });
    }

    setupNotificationToggles() {
        const toggles = document.querySelectorAll('[data-notification]');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const notification = toggle.dataset.notification;
                const currentValue = this.settings[notification] !== false;
                const newValue = !currentValue;
                
                this.updateSetting(notification, newValue);
                this.updateToggle(toggle, newValue);
                
                window.haptic?.ui.toggleOn();
                this.showSaveIndicator();
            });
        });
    }

    setupPrivacyToggles() {
        const toggles = document.querySelectorAll('[data-privacy]');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const privacy = toggle.dataset.privacy;
                const currentValue = this.settings[privacy] !== false;
                const newValue = !currentValue;
                
                this.updateSetting(privacy, newValue);
                this.updateToggle(toggle, newValue);
                
                window.haptic?.ui.toggleOn();
                this.showSaveIndicator();
            });
        });
    }

    setupLanguageSelector() {
        const languageItem = document.querySelector('.language-item');
        if (languageItem) {
            languageItem.addEventListener('click', () => {
                this.openLanguageModal();
            });
        }
    }

    setupActionButtons() {
        // Очистка кэша
        const clearCacheBtn = document.querySelector('.clear-cache-btn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => this.clearCache());
        }

        // Сброс настроек
        const resetBtn = document.querySelector('.reset-settings-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Экспорт данных
        const exportBtn = document.querySelector('.export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Обратная связь
        const feedbackBtn = document.querySelector('.feedback-btn');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => this.openFeedback());
        }

        // Поддержка
        const supportBtn = document.querySelector('.support-btn');
        if (supportBtn) {
            supportBtn.addEventListener('click', () => this.openSupport());
        }
    }

    setupChangeTracking() {
        // Сохранение при потере фокуса
        window.addEventListener('beforeunload', () => {
            if (this.hasChanges) {
                this.saveSettings();
            }
        });

        // Сохранение при скрытии страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.hasChanges) {
                this.saveSettings();
            }
        });
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.hasChanges = true;
        
        // Применяем настройку немедленно
        this.applySetting(key, value);
        
        // Автосохранение через 2 секунды
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveSettings();
        }, 2000);
    }

    applySetting(key, value) {
        switch (key) {
            case 'sound':
                console.log(`Sound ${value ? 'enabled' : 'disabled'}`);
                break;
            case 'vibration':
                window.haptic?.setEnabled(value);
                break;
            case 'notifications':
                console.log(`Notifications ${value ? 'enabled' : 'disabled'}`);
                break;
            case 'language':
                console.log(`Language changed to: ${value}`);
                break;
        }
    }

    async saveSettings() {
        if (!this.hasChanges) return;
        
        try {
            if (window.gameStorage) {
                await window.gameStorage.saveSettings(this.settings);
            }
            
            this.hasChanges = false;
            console.log('✅ Настройки сохранены');
            
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            window.notifications?.error('Ошибка сохранения настроек');
        }
    }

    showSaveIndicator() {
        let indicator = document.querySelector('.save-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'save-indicator';
            indicator.textContent = '✓ Сохранено';
            document.body.appendChild(indicator);
        }
        
        indicator.classList.add('show');
        
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    openLanguageModal() {
        const languages = [
            { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
            { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
            { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
        ];
        
        const currentLang = this.settings.language || 'en';
        
        const languageList = languages.map(lang => `
            <div class="language-option ${lang.code === currentLang ? 'active' : ''}" data-lang="${lang.code}">
                <span class="language-flag">${lang.flag}</span>
                <div class="language-info">
                    <div class="language-name">${lang.name}</div>
                    <div class="language-native-name">${lang.nativeName}</div>
                </div>
                <div class="language-check">✓</div>
            </div>
        `).join('');
        
        window.modal?.create('language-modal', {
            title: 'Выберите язык',
            content: `<div class="language-list">${languageList}</div>`,
            size: 'medium'
        });
        
        window.modal?.show('language-modal');
        
        // Обработчики для языков
        setTimeout(() => {
            const langOptions = document.querySelectorAll('.language-option');
            langOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const selectedLang = option.dataset.lang;
                    this.changeLanguage(selectedLang);
                    window.modal?.hide('language-modal');
                });
            });
        }, 100);
    }

    changeLanguage(langCode) {
        this.updateSetting('language', langCode);
        
        // Обновляем отображение
        const languageValue = document.querySelector('.language-value');
        const languages = {
            'en': 'English',
            'ru': 'Русский',
            'es': 'Español', 
            'fr': 'Français'
        };
        
        if (languageValue) {
            languageValue.textContent = languages[langCode] || 'English';
        }
        
        window.notifications?.success('Язык изменен', { duration: 2000 });
        window.haptic?.ui.success();
    }

    async clearCache() {
        const confirmed = await new Promise(resolve => {
            window.modal?.confirm(
                'Очистка кэша',
                'Это действие удалит все временные файлы. Продолжить?',
                () => resolve(true)
            );
        });
        
        if (!confirmed) return;
        
        try {
            if (window.storage) {
                await window.storage.clear();
            }
            
            // Очищаем кэш API
            if (window.apiClient) {
                window.apiClient.clearCache();
            }
            
            window.notifications?.success('Кэш очищен', { duration: 2000 });
            window.haptic?.ui.success();
            
        } catch (error) {
            console.error('Ошибка очистки кэша:', error);
            window.notifications?.error('Ошибка очистки кэша');
        }
    }

    async resetSettings() {
        const confirmed = await new Promise(resolve => {
            window.modal?.confirm(
                'Сброс настроек',
                'Все настройки будут сброшены до значений по умолчанию. Продолжить?',
                () => resolve(true)
            );
        });
        
        if (!confirmed) return;
        
        try {
            this.settings = this.getDefaultSettings();
            await this.saveSettings();
            
            // Обновляем UI
            this.setupUI();
            
            window.notifications?.success('Настройки сброшены', { duration: 2000 });
            window.haptic?.ui.success();
            
        } catch (error) {
            console.error('Ошибка сброса настроек:', error);
            window.notifications?.error('Ошибка сброса настроек');
        }
    }

    async exportData() {
        try {
            const backup = await window.storage?.backup();
            
            if (backup) {
                const dataStr = JSON.stringify(backup, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `crazygift-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                
                URL.revokeObjectURL(url);
                
                window.notifications?.success('Данные экспортированы', { duration: 2000 });
            }
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            window.notifications?.error('Ошибка экспорта данных');
        }
    }

    openFeedback() {
        const feedbackUrl = 'https://t.me/CrazyGiftSupport';
        
        if (window.telegramApp?.isAvailableAPI()) {
            window.telegramApp.openTelegramLink(feedbackUrl);
        } else {
            window.open(feedbackUrl, '_blank');
        }
        
        window.haptic?.ui.buttonPress();
    }

    openSupport() {
        const supportUrl = 'https://t.me/CrazyGiftHelp';
        
        if (window.telegramApp?.isAvailableAPI()) {
            window.telegramApp.openTelegramLink(supportUrl);
        } else {
            window.open(supportUrl, '_blank');
        }
        
        window.haptic?.ui.buttonPress();
    }

    confirmExit() {
        window.modal?.confirm(
            'Несохраненные изменения',
            'У вас есть несохраненные изменения. Сохранить перед выходом?',
            async () => {
                await this.saveSettings();
                window.Utils.URL.navigateTo('profile.html');
                return true;
            }
        );
    }

    setupFallbackMode() {
        console.log('⚠️ Настройка fallback режима для страницы настроек');
        
        this.settings = this.getDefaultSettings();
        this.setupUI();
        this.setupEventListeners();
        
        window.notifications?.warning('Работаем в автономном режиме', {
            duration: 4000
        });
    }
}

// Создаем глобальный экземпляр
window.settingsPage = new SettingsPageManager();