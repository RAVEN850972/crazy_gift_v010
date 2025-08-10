/**
 * Profile Page Script
 * Страница профиля пользователя с статистикой и настройками
 */

class ProfilePageManager {
    constructor() {
        this.userProfile = null;
        this.userStats = null;
        this.referralData = null;
        this.apiAvailable = false;
        
        this.init();
    }

    async init() {
        console.log('👤 Инициализация страницы профиля...');
        
        try {
            this.apiAvailable = await window.apiClient.checkAvailability();
            this.setupBackButton();
            await this.loadData();
            this.setupUI();
            this.setupEventListeners();
            
            console.log('✅ Страница профиля инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации страницы профиля:', error);
            this.setupFallbackMode();
        }
    }

    setupBackButton() {
        if (window.telegramApp?.isAvailableAPI()) {
            window.telegramApp.showBackButton(() => {
                window.Utils.URL.navigateTo('index.html');
            });
        }
    }

    async loadData() {
        try {
            if (this.apiAvailable && window.GameState?.currentUserId) {
                await Promise.all([
                    this.loadUserProfile(),
                    this.loadUserStats(),
                    this.loadReferralData()
                ]);
            } else {
                this.setupDemoData();
            }
        } catch (error) {
            console.error('Ошибка загрузки данных профиля:', error);
            this.setupDemoData();
        }
    }

    async loadUserProfile() {
        try {
            this.userProfile = await window.apiClient.getUserProfile(window.GameState.currentUserId);
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            this.userProfile = this.getDemoProfile();
        }
    }

    async loadUserStats() {
        try {
            this.userStats = await window.apiClient.getUserStats(window.GameState.currentUserId);
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            this.userStats = this.getDemoStats();
        }
    }

    async loadReferralData() {
        try {
            this.referralData = await window.apiClient.getUserReferrals(window.GameState.currentUserId);
        } catch (error) {
            console.error('Ошибка загрузки рефералов:', error);
            this.referralData = this.getDemoReferralData();
        }
    }

    setupDemoData() {
        this.userProfile = this.getDemoProfile();
        this.userStats = this.getDemoStats();
        this.referralData = this.getDemoReferralData();
    }

    getDemoProfile() {
        const telegramUser = window.telegramApp?.getUser();
        
        return {
            id: 'demo_user',
            username: telegramUser?.username || 'DemoUser',
            first_name: telegramUser?.first_name || 'Demo',
            last_name: telegramUser?.last_name || 'User',
            photo_url: null,
            referral_code: 'CGDEMO123',
            created_at: '2024-01-01T00:00:00Z'
        };
    }

    getDemoStats() {
        return {
            total_cases_opened: 15,
            total_spent: 1500,
            rare_items_won: 5,
            days_active: 7
        };
    }

    getDemoReferralData() {
        return {
            referral_code: 'CGDEMO123',
            total_referrals: 3,
            total_earned: 150,
            referrals: [
                { username: 'friend1', earned: 50, joined_at: '2024-01-15T00:00:00Z' },
                { username: 'friend2', earned: 75, joined_at: '2024-01-20T00:00:00Z' },
                { username: 'friend3', earned: 25, joined_at: '2024-01-25T00:00:00Z' }
            ]
        };
    }

    setupUI() {
        this.updateProfileHeader();
        this.updateProfileStats();
        this.updateReferralSection();
        this.setupProfileMenu();
    }

    updateProfileHeader() {
        if (!this.userProfile) return;

        // Аватар
        const avatar = document.querySelector('.profile-avatar');
        if (avatar) {
            const img = avatar.querySelector('img');
            const placeholder = avatar.querySelector('.profile-avatar-placeholder');
            
            if (this.userProfile.photo_url) {
                if (img) img.src = this.userProfile.photo_url;
                if (placeholder) placeholder.style.display = 'none';
            } else {
                if (img) img.style.display = 'none';
                if (placeholder) {
                    placeholder.textContent = (this.userProfile.first_name?.[0] || 'U').toUpperCase();
                    placeholder.style.display = 'flex';
                }
            }
        }

        // Имя
        const nameElement = document.querySelector('.profile-name');
        if (nameElement) {
            nameElement.textContent = `${this.userProfile.first_name} ${this.userProfile.last_name}`.trim();
        }

        // Username
        const usernameElement = document.querySelector('.profile-username');
        if (usernameElement && this.userProfile.username) {
            usernameElement.textContent = `@${this.userProfile.username}`;
        }
    }

    updateProfileStats() {
        if (!this.userStats) return;

        const statsMap = {
            '.profile-stat:nth-child(1) .profile-stat-value': this.userStats.total_cases_opened,
            '.profile-stat:nth-child(2) .profile-stat-value': this.userStats.total_spent,
            '.profile-stat:nth-child(3) .profile-stat-value': this.userStats.rare_items_won
        };

        Object.entries(statsMap).forEach(([selector, value]) => {
            const element = document.querySelector(selector);
            if (element) {
                window.Utils.Animation.animateCounter(element, 0, value, 1000);
            }
        });
    }

    updateReferralSection() {
        if (!this.referralData) return;

        // Реферальный код
        const referralCode = document.querySelector('.referral-code');
        if (referralCode) {
            referralCode.textContent = this.referralData.referral_code;
        }

        // Статистика рефералов
        const referralStats = {
            '.referral-stat:nth-child(1) .referral-stat-value': this.referralData.total_referrals,
            '.referral-stat:nth-child(2) .referral-stat-value': this.referralData.total_earned
        };

        Object.entries(referralStats).forEach(([selector, value]) => {
            const element = document.querySelector(selector);
            if (element) {
                window.Utils.Animation.animateCounter(element, 0, value, 800);
            }
        });
    }

    setupProfileMenu() {
        const menuItems = document.querySelectorAll('.profile-menu-item');
        
        menuItems.forEach(item => {
            const href = item.getAttribute('href');
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                window.haptic?.ui.buttonPress();
                
                if (href) {
                    window.Utils.URL.navigateTo(href);
                }
            });
        });
    }

    setupEventListeners() {
        // Кнопка копирования реферального кода
        const copyBtn = document.querySelector('.copy-referral-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyReferralCode());
        }

        // Кнопка приглашения друзей
        const inviteBtn = document.querySelector('.invite-friends-btn');
        if (inviteBtn) {
            inviteBtn.addEventListener('click', () => this.inviteFriends());
        }

        // Переключатели настроек
        this.setupSettingsToggles();

        // Селектор языка
        const languageSelector = document.querySelector('.language-selector');
        if (languageSelector) {
            languageSelector.addEventListener('click', () => this.openLanguageModal());
        }

        // Кнопка выхода
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async copyReferralCode() {
        const code = this.referralData?.referral_code;
        if (!code) return;

        try {
            const success = await window.Utils.DOM.copyToClipboard(code);
            
            if (success) {
                window.notifications?.success('Код скопирован!', { duration: 2000 });
                window.haptic?.ui.success();
                
                // Анимация кнопки
                const copyBtn = document.querySelector('.copy-referral-btn');
                if (copyBtn) {
                    copyBtn.style.background = 'rgba(0, 255, 135, 0.2)';
                    setTimeout(() => {
                        copyBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                    }, 500);
                }
            } else {
                window.notifications?.error('Ошибка копирования');
            }
        } catch (error) {
            console.error('Ошибка копирования:', error);
            window.notifications?.error('Ошибка копирования');
        }
    }

    inviteFriends() {
        const referralCode = this.referralData?.referral_code;
        const referralLink = `https://t.me/CrazyGiftBot?start=${referralCode}`;
        const message = `🎁 Присоединяйся к CrazyGift и получи бонус! Используй мой код: ${referralCode}\n${referralLink}`;

        if (window.telegramApp?.isAvailableAPI()) {
            window.telegramApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
        } else {
            // Fallback - копируем в буфер обмена
            window.Utils.DOM.copyToClipboard(message).then(success => {
                if (success) {
                    window.notifications?.success('Ссылка скопирована! Поделитесь с друзьями');
                }
            });
        }
        
        window.haptic?.ui.buttonPress();
    }

    setupSettingsToggles() {
        const toggles = document.querySelectorAll('.settings-toggle');
        
        toggles.forEach(toggle => {
            const setting = toggle.dataset.setting;
            
            // Устанавливаем начальное состояние
            const currentValue = window.GameState?.settings?.[setting];
            if (currentValue) {
                toggle.classList.add('active');
            }
            
            toggle.addEventListener('click', () => {
                const isActive = toggle.classList.contains('active');
                
                if (isActive) {
                    toggle.classList.remove('active');
                } else {
                    toggle.classList.add('active');
                }
                
                // Сохраняем настройку
                this.updateSetting(setting, !isActive);
                
                window.haptic?.ui.toggleOn();
            });
        });
    }

    updateSetting(setting, value) {
        if (!window.GameState) return;
        
        if (!window.GameState.settings) {
            window.GameState.settings = {};
        }
        
        window.GameState.settings[setting] = value;
        window.gameStorage?.saveSettings(window.GameState.settings);
        
        // Применяем настройку немедленно
        this.applySetting(setting, value);
    }

    applySetting(setting, value) {
        switch (setting) {
            case 'sound':
                // Управление звуком
                console.log(`Sound ${value ? 'enabled' : 'disabled'}`);
                break;
            case 'vibration':
                // Управление вибрацией
                window.haptic?.setEnabled(value);
                break;
            case 'notifications':
                // Управление уведомлениями
                console.log(`Notifications ${value ? 'enabled' : 'disabled'}`);
                break;
        }
    }

    openLanguageModal() {
        const languages = [
            { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
            { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
            { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
        ];
        
        const currentLang = window.GameState?.settings?.language || 'en';
        
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
            size: 'medium',
            buttons: [{
                text: 'Отмена',
                type: 'secondary',
                action: () => true
            }]
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
        // Обновляем настройки
        this.updateSetting('language', langCode);
        
        // Обновляем отображение текущего языка
        const currentLangName = document.querySelector('.current-language-name');
        const languages = {
            'en': 'English',
            'ru': 'Русский', 
            'es': 'Español',
            'fr': 'Français'
        };
        
        if (currentLangName) {
            currentLangName.textContent = languages[langCode] || 'English';
        }
        
        window.notifications?.success('Язык изменен', { duration: 2000 });
        window.haptic?.ui.success();
        
        // В реальном приложении здесь бы была перезагрузка интерфейса
        console.log(`Language changed to: ${langCode}`);
    }

    logout() {
        window.modal?.confirm(
            'Выход из аккаунта',
            'Вы уверены, что хотите выйти? Несохраненные данные будут потеряны.',
            () => {
                this.performLogout();
                return true;
            }
        );
    }

    async performLogout() {
        try {
            // Очищаем локальные данные
            await window.gameStorage?.clearGameData();
            
            // Сбрасываем состояние игры
            if (window.GameState) {
                window.GameState = {
                    balance: 0,
                    demoMode: true,
                    currentUserId: null,
                    user: null
                };
            }
            
            // Показываем уведомление
            window.notifications?.success('Вы вышли из аккаунта', { duration: 2000 });
            
            // Перенаправляем на главную
            setTimeout(() => {
                window.Utils.URL.navigateTo('index.html');
            }, 1000);
            
            window.haptic?.ui.success();
            
        } catch (error) {
            console.error('Ошибка выхода:', error);
            window.notifications?.error('Ошибка выхода из аккаунта');
        }
    }

    setupFallbackMode() {
        console.log('⚠️ Настройка fallback режима для страницы профиля');
        
        this.setupDemoData();
        this.setupUI();
        this.setupEventListeners();
        
        window.notifications?.warning('Работаем в автономном режиме', {
            duration: 4000
        });
    }
}

// Создаем глобальный экземпляр
window.profilePage = new ProfilePageManager();