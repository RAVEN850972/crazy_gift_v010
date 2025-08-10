/**
 * Global Game State Manager
 * Централизованное управление состоянием игры
 */

class GameStateManager {
    constructor() {
        this.state = this.getDefaultState();
        this.listeners = new Map();
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализация менеджера состояния
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Загружаем сохраненное состояние
            await this.loadState();
            
            // Инициализируем Telegram WebApp данные
            await this.initTelegramData();
            
            // Проверяем API и обновляем статус
            await this.checkAPIStatus();
            
            this.isInitialized = true;
            
            // Уведомляем подписчиков об инициализации
            this.emit('initialized', this.state);
            
            console.log('🎮 Game State Manager инициализирован:', this.state);
            
        } catch (error) {
            console.error('Ошибка инициализации Game State Manager:', error);
            this.isInitialized = true; // Продолжаем работу с дефолтным состоянием
        }
    }

    /**
     * Получение состояния по умолчанию
     */
    getDefaultState() {
        return {
            // Основные данные
            balance: 0,
            currentUserId: null,
            user: null,
            
            // Режим работы
            demoMode: true,
            apiAvailable: false,
            
            // Настройки
            settings: {
                sound: true,
                vibration: false,
                language: 'en',
                notifications: true,
                autoSync: true,
                theme: 'auto'
            },
            
            // Статистика
            stats: {
                casesOpened: 0,
                totalSpent: 0,
                rareItemsWon: 0,
                daysActive: 0,
                lastActiveDate: null
            },
            
            // Реферальная система
            referral: {
                code: null,
                totalReferrals: 0,
                totalEarned: 0
            },
            
            // Метаданные
            version: '1.0.0',
            lastSync: null,
            created: new Date().toISOString()
        };
    }

    /**
     * Загрузка сохраненного состояния
     */
    async loadState() {
        try {
            if (window.gameStorage) {
                const savedState = await window.gameStorage.loadGameState();
                if (savedState) {
                    // Мержим с дефолтным состоянием для совместимости
                    this.state = { ...this.state, ...savedState };
                    
                    // Обновляем статистику активности
                    this.updateActivityStats();
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки состояния:', error);
        }
    }

    /**
     * Сохранение состояния
     */
    async saveState() {
        try {
            if (window.gameStorage) {
                await window.gameStorage.saveGameState(this.state);
                this.state.lastSync = new Date().toISOString();
            }
        } catch (error) {
            console.error('Ошибка сохранения состояния:', error);
        }
    }

    /**
     * Инициализация данных Telegram
     */
    async initTelegramData() {
        if (window.telegramApp?.isAvailableAPI()) {
            const telegramUser = window.telegramApp.getUser();
            
            if (telegramUser) {
                // Генерируем ID пользователя на основе Telegram ID
                this.state.currentUserId = `tg_${telegramUser.id}`;
                this.state.user = {
                    id: telegramUser.id,
                    first_name: telegramUser.first_name,
                    last_name: telegramUser.last_name,
                    username: telegramUser.username,
                    photo_url: telegramUser.photo_url,
                    language_code: telegramUser.language_code
                };
                
                // Обновляем язык из Telegram
                if (telegramUser.language_code) {
                    this.state.settings.language = telegramUser.language_code;
                }
                
                // Генерируем реферальный код если его нет
                if (!this.state.referral.code) {
                    this.state.referral.code = this.generateReferralCode();
                }
                
                console.log('👤 Данные Telegram пользователя загружены:', this.state.user);
            }
        }
    }

    /**
     * Проверка статуса API
     */
    async checkAPIStatus() {
        try {
            if (window.apiClient) {
                this.state.apiAvailable = await window.apiClient.checkAvailability();
                this.state.demoMode = !this.state.apiAvailable;
                
                console.log(`🌐 API статус: ${this.state.apiAvailable ? 'доступен' : 'недоступен'}`);
                
                // Если API доступен, пытаемся авторизоваться
                if (this.state.apiAvailable && this.state.currentUserId) {
                    await this.authenticateUser();
                }
            }
        } catch (error) {
            console.error('Ошибка проверки API:', error);
            this.state.apiAvailable = false;
            this.state.demoMode = true;
        }
    }

    /**
     * Авторизация пользователя через API
     */
    async authenticateUser() {
        try {
            const authResult = await window.apiClient.authenticateUser();
            
            if (authResult.success) {
                // Обновляем данные пользователя из API
                this.state.balance = authResult.user.balance || 0;
                this.state.demoMode = false;
                
                console.log('✅ Пользователь авторизован через API');
                this.emit('authenticated', authResult.user);
            }
        } catch (error) {
            console.error('Ошибка авторизации:', error);
            // Остаемся в демо режиме
        }
    }

    /**
     * Обновление статистики активности
     */
    updateActivityStats() {
        const today = new Date().toDateString();
        const lastActive = this.state.stats.lastActiveDate;
        
        if (lastActive !== today) {
            this.state.stats.daysActive += 1;
            this.state.stats.lastActiveDate = today;
        }
    }

    /**
     * Генерация реферального кода
     */
    generateReferralCode() {
        const prefix = 'CG';
        const suffix = Math.random().toString(36).substr(2, 6).toUpperCase();
        return prefix + suffix;
    }

    /**
     * Получение состояния
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Получение конкретного значения
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    /**
     * Установка значения
     */
    set(path, value, save = true) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.state);
        
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // Уведомляем подписчиков
        this.emit('change', { path, value, oldValue });
        this.emit(`change:${path}`, { value, oldValue });
        
        // Автосохранение
        if (save) {
            this.debouncedSave();
        }
    }

    /**
     * Обновление баланса
     */
    updateBalance(newBalance) {
        const oldBalance = this.state.balance;
        this.set('balance', newBalance);
        
        // Специальное событие для изменения баланса
        this.emit('balanceChanged', { newBalance, oldBalance, diff: newBalance - oldBalance });
    }

    /**
     * Добавление к балансу
     */
    addBalance(amount) {
        this.updateBalance(this.state.balance + amount);
    }

    /**
     * Вычитание из баланса
     */
    subtractBalance(amount) {
        const newBalance = Math.max(0, this.state.balance - amount);
        this.updateBalance(newBalance);
        return this.state.balance >= amount; // Возвращаем успешность операции
    }

    /**
     * Обновление настроек
     */
    updateSetting(key, value) {
        this.set(`settings.${key}`, value);
        
        // Применяем настройку немедленно
        this.applySetting(key, value);
    }

    /**
     * Применение настройки
     */
    applySetting(key, value) {
        switch (key) {
            case 'vibration':
                window.haptic?.setEnabled(value);
                break;
            case 'language':
                // Здесь можно добавить смену языка интерфейса
                break;
            case 'theme':
                // Здесь можно добавить смену темы
                break;
        }
    }

    /**
     * Обновление статистики
     */
    updateStats(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(`stats.${key}`, value, false);
        });
        
        this.debouncedSave();
    }

    /**
     * Увеличение статистики
     */
    incrementStat(statName, amount = 1) {
        const currentValue = this.get(`stats.${statName}`) || 0;
        this.set(`stats.${statName}`, currentValue + amount);
    }

    /**
     * Сброс состояния
     */
    async reset() {
        const oldState = { ...this.state };
        this.state = this.getDefaultState();
        
        // Сохраняем некоторые настройки
        this.state.settings = { ...oldState.settings };
        
        await this.saveState();
        this.emit('reset', { oldState, newState: this.state });
    }

    /**
     * Подписка на события
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        return () => this.off(event, callback);
    }

    /**
     * Отписка от событий
     */
    off(event, callback) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
    }

    /**
     * Вызов события
     */
    emit(event, data) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
    }

    /**
     * Отложенное сохранение (debounced)
     */
    debouncedSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveState();
        }, 1000);
    }

    /**
     * Немедленное сохранение
     */
    async forceSave() {
        clearTimeout(this.saveTimeout);
        await this.saveState();
    }

    /**
     * Получение информации о состоянии
     */
    getInfo() {
        return {
            initialized: this.isInitialized,
            demoMode: this.state.demoMode,
            apiAvailable: this.state.apiAvailable,
            userId: this.state.currentUserId,
            balance: this.state.balance,
            version: this.state.version,
            lastSync: this.state.lastSync
        };
    }
}

// Создаем глобальный экземпляр
window.GameStateManager = new GameStateManager();

// Устанавливаем алиас для обратной совместимости
window.GameState = new Proxy({}, {
    get(target, prop) {
        return window.GameStateManager.get(prop) || window.GameStateManager.state[prop];
    },
    set(target, prop, value) {
        window.GameStateManager.set(prop, value);
        return true;
    }
});

// Экспорт для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateManager;
}